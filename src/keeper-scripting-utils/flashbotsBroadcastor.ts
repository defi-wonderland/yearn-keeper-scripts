import type {TransactionRequest, Block} from '@ethersproject/abstract-provider';
import type {Wallet, Overrides, Contract} from 'ethers';
import type {FlashbotsBundleTransaction, FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import {getGasParametersNextBlock, populateTx, sendAndHandleResponse} from './utils/misc';

/**
 * @notice Creates and populate a transaction for work in a determinated job using flashbots
 *
 * @param flashbotsProvider The flashbot provider that will send the bundle
 * @param priorityFeeInWei 	The priority fee in wei
 * @param gasLimit			    The gas limit determines the maximum gas that can be spent in the transaction
 * @param doStaticCall			Flag to determinate whether to perform a callStatic to work or not. Defaults to true.
 *
 */
export class FlashbotsBroadcastor {
  public chainId: number;

  constructor(
    public flashbotsProvider: FlashbotsBundleProvider,
    public priorityFeeInWei: number,
    public gasLimit: number,
    public doStaticCall = true,
  ) {
    this.chainId = flashbotsProvider.network.chainId;
  }

  async tryToWorkOnFlashbots(jobContract: Contract, workMethod: string, workArguments: any[], block: Block): Promise<void> {
    if (this.doStaticCall) {
      try {
        await jobContract.callStatic[workMethod](...workArguments);
      } catch (error: unknown) {
        throw error;
      }
    }

    const {priorityFee, maxFeePerGas} = getGasParametersNextBlock(block, this.priorityFeeInWei);

    const txSigner = jobContract.signer as Wallet;

    const currentNonce = await txSigner.getTransactionCount();

    const options: Overrides = {
      gasLimit: this.gasLimit,
      nonce: currentNonce,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      type: 2,
    };

    const tx: TransactionRequest = await populateTx(jobContract, workMethod, [...workArguments], options, this.chainId);

    const privateTx: FlashbotsBundleTransaction = {
      transaction: tx,
      signer: txSigner,
    };

    console.log('Transaction populated successfully. Sending bundle...');

    await sendAndHandleResponse(this.flashbotsProvider, privateTx);
  }
}
