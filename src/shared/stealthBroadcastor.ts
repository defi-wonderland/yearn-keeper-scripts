import { getStealthHash } from '@keep3r-network/keeper-scripting-utils';
import type { TransactionRequest, Block } from '@ethersproject/abstract-provider';
import { providers, Wallet, Overrides } from 'ethers';
import { Contract } from 'ethers';
import { FlashbotsBundleProvider, FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle';
import { calculateTargetBlocks, getEnvVariable, getMainnetGasType2Parameters, populateTx, Relays, sendAndHandleResponse } from '../utils/misc';
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
export class StealthBroadcastor {
  public provider: providers.JsonRpcProvider | providers.WebSocketProvider;
  public bundleSigner: Wallet;
  public stealthRelayer: Contract;
  public priorityFeeInGwei: number;
  public gasLimit: number;
  public burstSize: number;
  public relays: Relays[];

  constructor(
    provider: providers.JsonRpcProvider,
    bundleSigner: Wallet,
    stealthRelayer: Contract,
    priorityFeeInGwei: number,
    gasLimit: number,
    burstSize: number,
    relays: Relays[] = DEFAULT_RELAYS
  ) {
    this.provider = provider;
    this.bundleSigner = bundleSigner;
    this.priorityFeeInGwei = priorityFeeInGwei;
    this.gasLimit = gasLimit;
    this.stealthRelayer = stealthRelayer;
    this.burstSize = burstSize;
    this.relays = relays;
  }

  async tryToWorkOnStealthRelayer(jobContract: Contract, workMethod: string, workArguments: any[], block: Block) {
    const stealthHash = getStealthHash();
    const workData = jobContract.interface.encodeFunctionData(workMethod, [...workArguments]);

    try {
      await this.stealthRelayer.callStatic.execute(jobContract.address, workData, stealthHash, block.number);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw Error(`Static call failed with ${error.message}`);
      }
      throw error;
    }

    console.log(`Attempting to work strategy statically succeeded. Preparing real transaction...`);

    const nextBlock = ++block.number;

    const targetBlocks = calculateTargetBlocks(this.burstSize, nextBlock);

    const { priorityFee, maxFeePerGas } = getMainnetGasType2Parameters(block, this.priorityFeeInGwei, this.burstSize);

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

    for (const targetBlock of targetBlocks) {
      const tx: TransactionRequest = await populateTx(
        this.stealthRelayer,
        'execute',
        [jobContract.address, workData, stealthHash, targetBlock],
        options,
        chainId
      );

      const privateTx: FlashbotsBundleTransaction = {
        transaction: tx,
        signer: txSigner,
      };

      console.log('Transaction populated successfully. Sending bundle...');

      await sendAndHandleResponse(flashbotsProvider, privateTx, targetBlock);
    }
  }
}
