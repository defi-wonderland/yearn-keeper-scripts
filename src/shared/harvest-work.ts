import {
  createBundlesWithDifferentTxs,
  getMainnetGasType2Parameters,
  getStealthHash,
  makeid,
  populateTransactions,
  sendAndRetryUntilNotWorkable,
} from '@keep3r-network/keeper-scripting-utils';
import type {BigNumber, Overrides} from 'ethers';
import type {TransactionRequest} from '@ethersproject/abstract-provider';
import {stopSubscription} from '../utils/misc';
import type {TryToWorkHarvestProps} from '../utils/types';
import {BURST_SIZE, CHAIN_ID, FUTURE_BLOCKS, PRIORITY_FEE} from '../utils/constants';

export function tryToWorkHarvestStrategy(props: TryToWorkHarvestProps): void {
  const {
    strategy,
    flashbots,
    unsubscribeStrategy,
    lastWorkAt,
    blockListener,
    strategyWorkInProgress,
    stealthRelayer,
    job,
    workData,
    provider,
    txSigner,
  } = props;
  console.log('Start Working on strategy:', strategy);

  stopSubscription(unsubscribeStrategy, strategy);

  const cooldown = props.cooldown.value;

  // Calculate how long to wait until the strategy is workable by doing: currentTimeStamp - (lastWorkAt + cooldown)
  const readyTime = lastWorkAt[strategy].add(cooldown);
  const notificationTime = readyTime;
  const time = notificationTime.mul(1000).sub(Date.now()).toNumber();

  setTimeout(() => {
    unsubscribeStrategy[strategy] = blockListener.stream(async (block) => {
      // If a block arrives and there are bundles in progress, we return
      if (strategyWorkInProgress[strategy]) return;

      // Create a unique stealthHash for this strategy
      const stealthHash = getStealthHash();

      // Try to work it statically. If it fails, we know something is wrong either with the stragegy, or with our logic.
      // Otherwise, we can send prepare and send the bundle with confidence.
      // Note: due to the amount of yearn strategies, sometimes one or two fail with errors that are outside our control
      //       in these case we want to avoid sending a large amount of bundles to avoid spamming flashbots.
      try {
        await stealthRelayer.callStatic.execute(job.address, workData[strategy], stealthHash, block.number);
      } catch (error: unknown) {
        // To ensure we don't get an absurd amount of logs, we only log the error if the error is not related with the strategy not being
        // workable.
        if (error instanceof Error && !error.message.includes('reason=null') && !error.message.includes('V2Keep3rJob::work:not-workable')) {
          console.log(`Failed when attempting to call work statically. Strategy: ${strategy}. Message: ${error.message}. Returning.`);
        }

        /*
         If the call static failed to work the strategy we check whether it is because the variable component has not been fulfilled yet,
         or due to another keeper having worked it.
         To do this we check whether lastWorkAt has changed. If it changed then another keeper worked the strategy, meaning
         we need to update the last time it was worked on in our mapping.
         Lastly, we remove our subscriptions and listeners, and we restart the process by calling tryToWorkStrategy() again.
         Otherwise, if the strategy is not workable because the variable component hasn't been fulfilled, we simply return and wait
         for the next block to check again.
      */
        const temporaryLastWorkAt: BigNumber = await job.lastWorkAt(strategy);
        if (!temporaryLastWorkAt.eq(lastWorkAt[strategy])) {
          lastWorkAt[strategy] = temporaryLastWorkAt;

          tryToWorkHarvestStrategy(props);
        }

        return;
      }

      // If the strategy is workable, we optimistically set the strategyWorkInProgress[strategy] mapping to true, as we will send a bundle
      strategyWorkInProgress[strategy] = true;
      // Get the signer's (keeper) current nonce
      const currentNonce = await provider.getTransactionCount(txSigner.address);
      /*
         We are going to send this through Flashbots, which means we will be sending multiple bundles to different
         blocks inside a batch. Here we are calculating which will be the last block we will be sending the
         last bundle of our first batch to. This information is needed to calculate what will the maximum possible base
         fee be in that block, so we can calculate the maxFeePerGas parameter for all our transactions.
         For example: we are in block 100 and we send to 100, 101, 102. We would like to know what is the maximum possible
         base fee at block 102 to make sure we don't populate our transactions with a very low maxFeePerGas, as this would
         cause our transaction to not be mined until the max base fee lowers.
      */
      const blocksAhead = FUTURE_BLOCKS + BURST_SIZE;

      // We calculate the first block that the first bundle in our batch will target.
      // Example, if future blocks is 2, and we are in block 100, it will send a bundle to blocks 102, 103, 104 (assuming a burst size of 3)
      // and 102 would be the firstBlockOfBatch
      const firstBlockOfBatch = block.number + FUTURE_BLOCKS;

      // Fetch the priorityFeeInGwei and maxFeePerGas parameters from the getMainnetGasType2Parameters function
      // NOTE: this just returns our priorityFee in GWEI, it doesn't calculate it, so if we pass a priority fee of 10 wei
      //       this will return a priority fee of 10 GWEI. We need to pass it so that it properly calculated the maxFeePerGas
      const {priorityFeeInGwei, maxFeePerGas} = getMainnetGasType2Parameters({
        block,
        blocksAhead,
        priorityFeeInWei: PRIORITY_FEE,
      });

      // We declare what options we would like our transaction to have
      const options: Overrides = {
        gasLimit: 5_000_000,
        nonce: currentNonce,
        maxFeePerGas,
        maxPriorityFeePerGas: priorityFeeInGwei,
        type: 2,
      };

      // We populate the transactions we will use in our bundles. Notice we are calling the stealthRelayer's execute function
      // Note: when the txs we are going to include in our batch are different between one another, we must ensure BURST_SIZE = len(functionArgs)
      //       this is why we populate the functionArgs like this
      const txs: TransactionRequest[] = await populateTransactions({
        chainId: CHAIN_ID,
        contract: stealthRelayer,
        functionArgs: [
          new Array(BURST_SIZE).fill(null).map((_, index) => [job.address, workData[strategy], stealthHash, firstBlockOfBatch + index]),
        ],
        functionName: 'execute',
        options,
      });

      /*
         We create our batch of bundles. In this case this will be a batch of two bundles that will contain different transactions.
         The transactions will be different due to stealthRelayer's requirement of the block passed a parameter
         being the same as the block in which the transaction is included and mined.
      */
      const bundles = createBundlesWithDifferentTxs({
        unsignedTxs: txs,
        burstSize: BURST_SIZE,
        firstBlockOfBatch,
      });

      /*
         We send our batch of bundles and recreate new ones until we or another keeper works the strategy.
         One very important detail here is that we need to provide the sendAndRetryUntilNotWorkable strategy with
         instructions as to how to regenerate the transactions to include in the new batches in case the first one fails.
         In this case, this is necessary because stealthRelayer has the requirement that one of the parameters we pass to its
         execute function is the block number in which our transaction will be mined.
         This means that with every bundle, the transaction to pass to execute will change.
         For example: The first bundle is sent to blocks 100 and 101, so inside the bundle that goes to block 100 we include a transaction that
         has block 100 as an argument and inside the bundle that goes to block 101, we include a transaction that has bock 101 as an argument.
         When we apply our retry mechanism, we need to indicate whether it should use the same txs as before, or if should use new ones.
         If it should use new ones, we need to provide the function with the logic as to how to create those new transactions.
         We do that through the regenerateTxs callback. In this case we are telling the script: "Hey, when creating a new batch for retrying,
         generate new transactions with the following function and arguments."
         If we do this, we also need to tell the function what method to use to create the batches. In this case, we know each transaction will be
         different so we just tell it to use the createBundlesWithDifferentTxs function by passing it in the bundleRegenerationMethod parameter.
         It's also worth noting that for ease of debugging we are passing the strategy address as static id, and a random 5 digit id to identify each batch.
         Each batch would look something like this in the console: STRATEGY_ADDRESS#12345
      */
      const result = await sendAndRetryUntilNotWorkable({
        txs,
        provider,
        priorityFeeInWei: PRIORITY_FEE,
        signer: txSigner,
        bundles,
        newBurstSize: BURST_SIZE,
        flashbots,
        isWorkableCheck: async () => job.workable(strategy),
        async regenerateTxs(burstSize, firstBlockOfNextBatch) {
          const populateTxsPromises = new Array(burstSize).fill(null).map(async (_, index) => {
            return stealthRelayer.populateTransaction.execute(job.address, workData[strategy], stealthHash, firstBlockOfNextBatch + index, {
              ...options,
            });
          });

          const txs = await Promise.all(populateTxsPromises);
          const formattedTxs = txs.map((tx) => ({...tx, chainId: CHAIN_ID}));
          return formattedTxs;
        },
        bundleRegenerationMethod: 'createBundlesWithDifferentTxs',
        staticDebugId: strategy,
        dynamicDebugId: makeid(5),
      });
      // If the bundle was included, we console log the success
      if (result) console.log('===== Tx SUCCESS =====', strategy);
      // Whether us or another keeper worked, we need to update the lastWorkAt mapping for this strategy
      lastWorkAt[strategy] = await job.lastWorkAt(strategy);
      // We also need to set strategy as not in progress anymore.
      strategyWorkInProgress[strategy] = false;

      // Restart the entire process
      tryToWorkHarvestStrategy(props);
    });
  }, time);
}
