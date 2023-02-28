import {config} from 'dotenv';
import type {UnsubscribeFunction} from '@keep3r-network/keeper-scripting-utils';
import type {TransactionRequest, Block} from '@ethersproject/abstract-provider';
import type {Contract, Overrides, PopulatedTransaction} from 'ethers';
import {BigNumber} from 'ethers';
import type {FlashbotsBundleTransaction} from '@flashbots/ethers-provider-bundle';
import {FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import type {Address} from './types';

config();

export function getEnvVariable(name: string): string {
  const value: string | undefined = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} not found`);
  return value;
}

// TODO: move to setup or delete completely?
export function stopSubscription(storage: Record<string, UnsubscribeFunction>, strategy: Address): void {
  if (storage[strategy]) {
    storage[strategy]();
    delete storage[strategy];
  }
}

export async function populateTx(
  contract: Contract,
  functionName: string,
  functionArgs: any[],
  options: Overrides,
  chainId: number,
): Promise<TransactionRequest> {
  const populatedTx: PopulatedTransaction = await contract.populateTransaction[functionName](...functionArgs, {
    ...options,
  });

  const formattedTx = {
    ...populatedTx,
    chainId,
  };

  return formattedTx;
}

export async function sendAndHandleResponse(
  flashbotsProvider: FlashbotsBundleProvider,
  privateTx: FlashbotsBundleTransaction,
  maxBlockNumber?: number,
) {
  try {
    const response = await flashbotsProvider.sendPrivateTransaction(privateTx, {
      maxBlockNumber,
    });

    if ('error' in response) {
      console.warn(`Transaction execution error`, response.error);
      return;
    }

    const simulation = await response.simulate();
    if ('error' in simulation || simulation.firstRevert) {
      console.error(`Transaction simulation error`, simulation);
      return;
    }

    console.debug(`Transaction simulation success`, simulation);

    const resolution = await response.wait();
    console.log(resolution);

    if (resolution === 0) {
      console.log(`=================== TX INCLUDED =======================`);
    } else if (resolution === 1) {
      console.log(`==================== TX DROPPED =======================`);
    }
  } catch (error: unknown) {
    if (error === 'Timed out') {
      console.debug('One of the sent Transactions timed out. This means around 20 blocks have passed and Flashbots has ceased retrying it.');
    }

    console.log(error);
  }
}

/**
 * @notice The required gas parameters to include in a transaction of type 2.
 *
 * @param priorityFee The priority fee to send with the transaction expressed in Gwei.
 * @param maxFeePerGas The max fee per gas to send with the transaction.
 */

export type GasType2Parameters = {
  priorityFee: BigNumber;
  maxFeePerGas: BigNumber;
};

export function getGasParametersNextBlock(block: Block, priorityFeeInGwei: number): GasType2Parameters {
  if (!block.baseFeePerGas) {
    throw new Error('Missing property baseFeePerGas on block');
  }

  const maxBaseFee = FlashbotsBundleProvider.getBaseFeeInNextBlock(block.baseFeePerGas, block.gasUsed, block.gasLimit);
  const priorityFee = BigNumber.from(priorityFeeInGwei);
  const maxFeePerGas = maxBaseFee.add(priorityFee);
  return {
    priorityFee,
    maxFeePerGas,
  };
}

export function getMainnetGasType2Parameters(block: Block, priorityFeeInGwei: number, burstSize: number): GasType2Parameters {
  if (!block.baseFeePerGas) {
    throw new Error('Missing property baseFeePerGas on block');
  }

  if (burstSize === 0 || burstSize === 1) {
    return getGasParametersNextBlock(block, priorityFeeInGwei);
  }

  const maxBaseFee = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas, burstSize);

  const priorityFee = BigNumber.from(priorityFeeInGwei);
  const maxFeePerGas = maxBaseFee.add(priorityFee);
  return {
    priorityFee,
    maxFeePerGas,
  };
}

export function calculateTargetBlocks(burstSize: number, nextBlock: number): number[] {
  if (burstSize === 0 || burstSize === 1) {
    return [nextBlock];
  }

  const targetBlocks: number[] = [];

  for (let i = 0; i < burstSize; i++) {
    targetBlocks[i] = nextBlock + i;
  }

  return targetBlocks;
}
