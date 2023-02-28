import {getStealthHash} from '@keep3r-network/keeper-scripting-utils';
import type {TransactionRequest, Block} from '@ethersproject/abstract-provider';
import type {Wallet, Overrides, Contract} from 'ethers';
import type {FlashbotsBundleTransaction, FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import {calculateTargetBlocks, getMainnetGasType2Parameters, populateTx, sendAndHandleResponse} from './utils/misc';

/**
 * @notice Creates and populate a transaction for work in a determinated job using flashbots
 *
 * @param provider			The provider which can be Json or Wss
 * @param flashbots			The flashbot that will send the bundle
 * @param burstSize 		The amount of transactions for future blocks to be broadcast each time
 * @param futureBlocks		The amount of future blocks.
 * @param priorityFeeInWei 	The priority fee in wei
 * @param gasLimit			The gas limit determines the maximum gas that can be spent in the transaction
 *
 */
export class StealthBroadcastor {
  public chainId: number;

  constructor(
    public flashbotsProvider: FlashbotsBundleProvider,
    public stealthRelayer: Contract,
    public priorityFeeInGwei: number,
    public gasLimit: number,
    public burstSize: number,
    public doStaticCall = true,
  ) {
    this.flashbotsProvider = flashbotsProvider;
    this.chainId = flashbotsProvider.network.chainId;
    this.priorityFeeInGwei = priorityFeeInGwei;
    this.gasLimit = gasLimit;
    this.stealthRelayer = stealthRelayer;
    this.burstSize = burstSize;
    this.doStaticCall = doStaticCall;
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

    const {priorityFee, maxFeePerGas} = getMainnetGasType2Parameters(block, this.priorityFeeInGwei, this.burstSize);

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
