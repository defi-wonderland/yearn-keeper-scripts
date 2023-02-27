import type { TransactionRequest } from '@ethersproject/abstract-provider';
import { providers, Wallet, Overrides } from 'ethers';
import { Contract } from 'ethers';
import { FlashbotsBundleProvider, FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle';
import { Block } from '@ethersproject/abstract-provider';
import { getGasParametersNextBlock, populateTx, Relays, sendAndHandleResponse } from '../utils/misc';
import { DEFAULT_RELAYS } from '../utils/constants';

/**
 * @notice Creates and populate a transaction for work in a determinated job using flashbots
 *
 * @param provider			The provider which can be Json or Wss
 * @param flashbots			The flashbot that will send the bundle
 * @param burstSize 		The burst size
 * @param futureBlocks		The amount of future blocks.
 * @param priorityFeeInWei 	The priority fee in wei
 * @param gasLimit			The gas limit determines the maximum gas that can be spent in the transaction
 *
 */
export class FlashbotsBroadcastor {
  public provider: providers.JsonRpcProvider | providers.WebSocketProvider;
  public bundleSigner: Wallet;
  public flashbotsProvider: FlashbotsBundleProvider;
  public priorityFeeInGwei: number;
  public gasLimit: number;
  public relays: Relays[];

  constructor(
    provider: providers.JsonRpcProvider,
    bundleSigner: Wallet,
    flashbotsProvider: FlashbotsBundleProvider,
    priorityFeeInGwei: number,
    gasLimit: number,
    relays: Relays[] = DEFAULT_RELAYS
  ) {
    this.provider = provider;
    this.bundleSigner = bundleSigner;
    this.flashbotsProvider = flashbotsProvider;
    this.priorityFeeInGwei = priorityFeeInGwei;
    this.gasLimit = gasLimit;
    this.relays = relays;
  }

  async tryToWorkOnFlashbots(jobContract: Contract, workMethod: string, workArguments: any[], block: Block): Promise<void> {
    try {
      await jobContract.callStatic[workMethod](...workArguments);
    } catch (error: unknown) {
      throw error;
    }

    const { priorityFee, maxFeePerGas } = getGasParametersNextBlock(block, this.priorityFeeInGwei);

    const txSigner = jobContract.signer as Wallet;

    const currentNonce = await txSigner.getTransactionCount();

    const options: Overrides = {
      gasLimit: this.gasLimit,
      nonce: currentNonce,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      type: 2,
    };

    const { chainId } = await this.provider.getNetwork();

    const relayEndpoint = this.relays.find((obj) => obj.chainId === chainId)?.endpoint;

    if (!relayEndpoint) {
      return console.info('No relay endpoint has been found for this network.');
    }

    const flashbotsProvider = await FlashbotsBundleProvider.create(this.provider, this.bundleSigner, relayEndpoint);

    const tx: TransactionRequest = await populateTx(jobContract, workMethod, [...workArguments], options, chainId);

    const privateTx: FlashbotsBundleTransaction = {
      transaction: tx,
      signer: txSigner,
    };

    console.log('Transaction populated successfully. Sending bundle...');

    await sendAndHandleResponse(flashbotsProvider, privateTx);
  }
}
