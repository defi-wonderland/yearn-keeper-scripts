import type {TransactionRequest, Block} from '@ethersproject/abstract-provider';
import {Wallet, Overrides, Contract} from 'ethers';
import type {FlashbotsBundleTransaction} from '@flashbots/ethers-provider-bundle';
import {FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import {getGasParametersNextBlock, populateTx, sendAndHandleResponse} from './utils/misc';

/**
 * @notice Creates and populate a transaction for work in a determinated job using flashbots
 *
 * @param flashbotsProvider			The flashbot provider that will send the bundle
 * @param priorityFeeInGwei 	The priority fee in wei // TODO: change to `wei`
 * @param gasLimit			The gas limit determines the maximum gas that can be spent in the transaction
 *
 */
export class FlashbotsBroadcastor {
  public flashbotsProvider: FlashbotsBundleProvider;
  public chainId: number;
  public priorityFeeInGwei: number;
  public gasLimit: number;
  public doStaticCall: boolean;

  constructor(
    flashbotsProvider: FlashbotsBundleProvider,
    priorityFeeInGwei: number,
    gasLimit: number,
    doStaticCall: boolean = true
  ) {
    this.flashbotsProvider = flashbotsProvider;
    this.chainId = flashbotsProvider.network.chainId;
    this.priorityFeeInGwei = priorityFeeInGwei;
    this.gasLimit = gasLimit;
    this.doStaticCall = doStaticCall
  }

  async tryToWorkOnFlashbots(jobContract: Contract, workMethod: string, workArguments: any[], block: Block): Promise<void> {
    if(this.doStaticCall){
      try {
        await jobContract.callStatic[workMethod](...workArguments);
      } catch (error: unknown) {
        throw error;
      }
    }

    const {priorityFee, maxFeePerGas} = getGasParametersNextBlock(block, this.priorityFeeInGwei);

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
