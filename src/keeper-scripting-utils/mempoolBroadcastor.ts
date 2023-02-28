import type {Block} from '@ethersproject/abstract-provider';
import {sendTx} from '@keep3r-network/keeper-scripting-utils';
import type {providers, Overrides, Contract} from 'ethers';

/**
 * @notice Creates and populate a transaction for work in a determinated job using mempool
 *
 * @param provider			The provider which can be Json or Wss
 * @param gasLimit			The gas limit determines the maximum gas that can be spent in the transaction
 *
 */
export class MempoolBroadcastor {
  public provider: providers.JsonRpcProvider | providers.WebSocketProvider;
  public gasLimit: number;
  public doStaticCall: boolean;

  // TODO: add doStaticCall to other broadcastors (KMC-206)
  constructor(provider: providers.JsonRpcProvider | providers.WebSocketProvider, gasLimit: number, doStaticCall = true) {
    this.provider = provider;
    this.gasLimit = gasLimit;
    this.doStaticCall = doStaticCall;
  }

  /**
   *
   * @param jobContract needs to implement the txSigner
   * @param workMethod
   * @param methodArguments
   * @param block
   */
  tryToWorkOnMempool = async (jobContract: Contract, workMethod: string, methodArguments: Array<number | string>, block: Block) => {
    const gasFees = await block.baseFeePerGas!;

    // Create an object containing the fields we would like to add to our transaction.
    const options: Overrides = {
      gasLimit: this.gasLimit,
      gasPrice: gasFees.mul(11).div(10).toNumber(),
      // MaxPriorityFeePerGas:
      // TODO: add support for type2 mempool txs
      type: 0,
    };

    if (this.doStaticCall) {
      try {
        await jobContract.callStatic[workMethod](...methodArguments);
      } catch (error: unknown) {
        throw error;
      }
    }

    // Send the transaction
    await sendTx({
      contractCall: () =>
        jobContract[workMethod](...methodArguments, {
          ...options,
        }),
    });

    console.log(`===== Tx SUCCESS =====`);
  };
}
