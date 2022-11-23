import {
  createBundlesWithSameTxs,
  getMainnetGasType2Parameters,
  makeid,
  populateTransactions,
  sendAndRetryUntilNotWorkable,
} from '@keep3r-network/keeper-scripting-utils';
import type {BigNumber, Overrides} from 'ethers';
import type {TransactionRequest} from '@ethersproject/abstract-provider';
import {BURST_SIZE, CHAIN_ID, FUTURE_BLOCKS, PRIORITY_FEE} from '../utils/constants';
import type {TryToWorkTendProps} from '../utils/types';
import {stopSubscription} from '../utils/misc';

export function tryToWorkTendStrategy(props: TryToWorkTendProps): void {
  const {strategy, workFunction, flashbots, unsubscribeStrategy, lastWorkAt, blockListener, strategyWorkInProgress, job, provider, txSigner} =
    props;
  console.log('Start Working on strategy:', strategy);

  const cooldown = props.cooldown.value;

  stopSubscription(unsubscribeStrategy, strategy);

  const readyTime = lastWorkAt[strategy].add(cooldown);
  const notificationTime = readyTime;
  const time = notificationTime.mul(1000).sub(Date.now()).toNumber();

  setTimeout(() => {
    unsubscribeStrategy[strategy] = blockListener.stream(async (block) => {
      if (strategyWorkInProgress[strategy]) return;

      try {
        await job.callStatic[workFunction](strategy);
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          !error.message.includes('StrategyNotWorkable()') &&
          !error.message.includes('V2Keep3rJob::work:not-workable')
        ) {
          console.log(`Failed when attempting to call work statically. Strategy: ${strategy}. Message: ${error.message}. Returning.`);
        }

        const temporaryLastWorkAt: BigNumber = await job.lastWorkAt(strategy);
        if (!temporaryLastWorkAt.eq(lastWorkAt[strategy])) {
          lastWorkAt[strategy] = temporaryLastWorkAt;
          tryToWorkTendStrategy(props);
        }

        return;
      }

      strategyWorkInProgress[strategy] = true;

      try {
        const currentNonce = await provider.getTransactionCount(txSigner.address);

        const blocksAhead = FUTURE_BLOCKS + BURST_SIZE;

        const {priorityFeeInGwei, maxFeePerGas} = getMainnetGasType2Parameters({
          block,
          blocksAhead,
          priorityFeeInWei: PRIORITY_FEE,
        });

        const options: Overrides = {
          gasLimit: 1_000_000,
          nonce: currentNonce,
          maxFeePerGas,
          maxPriorityFeePerGas: priorityFeeInGwei,
          type: 2,
        };

        const txs: TransactionRequest[] = await populateTransactions({
          chainId: CHAIN_ID,
          contract: job,
          functionArgs: [[strategy]],
          functionName: workFunction,
          options,
        });

        const firstBlockOfBatch = block.number + FUTURE_BLOCKS;
        const bundles = createBundlesWithSameTxs({
          unsignedTxs: txs,
          burstSize: BURST_SIZE,
          firstBlockOfBatch,
        });

        const result = await sendAndRetryUntilNotWorkable({
          txs,
          provider,
          priorityFeeInWei: PRIORITY_FEE,
          signer: txSigner,
          bundles,
          newBurstSize: BURST_SIZE,
          flashbots,
          isWorkableCheck: async () => job.workable(strategy),
          staticDebugId: strategy,
          dynamicDebugId: makeid(5),
        });

        if (result) console.log('===== Tx SUCCESS =====', strategy);
        lastWorkAt[strategy] = await job.lastWorkAt(strategy);
        tryToWorkTendStrategy(props);
      } catch (error: unknown) {
        console.error(error);
      } finally {
        strategyWorkInProgress[strategy] = false;
      }
    });
  }, time);
}
