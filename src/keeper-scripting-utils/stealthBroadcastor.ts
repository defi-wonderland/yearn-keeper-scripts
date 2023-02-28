import {getStealthHash} from '@keep3r-network/keeper-scripting-utils';
import type {TransactionRequest, Block} from '@ethersproject/abstract-provider';
import type {Wallet, Overrides, Contract} from 'ethers';
import type {FlashbotsBundleTransaction, FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import {calculateTargetBlocks, getMainnetGasType2Parameters, populateTx, sendAndHandleResponse} from './utils/misc';

/**
 * @notice Creates and populate a transaction for work in a determinated job using flashbots
 *
 * @param flashbotsProvider The flashbots provider. It contains a JSON or WSS provider
 * @param flashbots			    The flashbot that will send the bundle
 * @param burstSize 		    The amount of transactions for future blocks to be broadcast each time
 * @param priorityFeeInWei  The priority fee in wei
 * @param gasLimit			    The gas limit determines the maximum gas that can be spent in the transaction
 * @param doStaticCall		  Flag to determinate whether to perform a callStatic to work or not. Defaults to true.
 *
 */
export class StealthBroadcastor {
  public chainId: number;

  constructor(
    public flashbotsProvider: FlashbotsBundleProvider,
    public stealthRelayer: Contract,
    public priorityFeeInWei: number,
    public gasLimit: number,
    public burstSize: number,
    public doStaticCall = true,
  ) {
    this.chainId = flashbotsProvider.network.chainId;
  }

  async tryToWorkOnStealthRelayer(jobContract: Contract, workMethod: string, workArguments: any[], block: Block) {
    const stealthHash = getStealthHash();
    const workData = jobContract.interface.encodeFunctionData(workMethod, [...workArguments]);

    if (this.doStaticCall) {
      try {
        await this.stealthRelayer.callStatic.execute(jobContract.address, workData, stealthHash, block.number);
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new TypeError(`Static call failed with ${error.message}`);
        }

        throw error;
      }
    }

    console.log(`Attempting to work strategy statically succeeded. Preparing real transaction...`);

    const nextBlock = ++block.number;

    const targetBlocks = calculateTargetBlocks(this.burstSize, nextBlock);

    const {priorityFee, maxFeePerGas} = getMainnetGasType2Parameters(block, this.priorityFeeInWei, this.burstSize);

    const txSigner = jobContract.signer as Wallet;

    const currentNonce = await txSigner.getTransactionCount();

    const options: Overrides = {
      gasLimit: this.gasLimit,
      nonce: currentNonce,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      type: 2,
    };

    for (const targetBlock of targetBlocks) {
      const tx: TransactionRequest = await populateTx(
        this.stealthRelayer,
        'execute',
        [jobContract.address, workData, stealthHash, targetBlock],
        options,
        this.chainId,
      );

      const privateTx: FlashbotsBundleTransaction = {
        transaction: tx,
        signer: txSigner,
      };

      console.log('Transaction populated successfully. Sending bundle...');

      await sendAndHandleResponse(this.flashbotsProvider, privateTx, targetBlock);
    }
  }
}
