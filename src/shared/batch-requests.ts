import type {Contract} from 'ethers';
import {ethers} from 'ethers';
import * as BatchWorkable from '../../solidity/artifacts/contracts/BatchWorkable.sol/BatchWorkable.json';

export async function getStrategies(job: Contract, strategies: string[]): Promise<string[]> {
  let workableStrategies: string[] = [];

  const batches = chunkArray(strategies, 150);
  for (const batch of batches) {
    const inputData = ethers.utils.defaultAbiCoder.encode(['address', 'address[]'], [job.address, batch]);
    const contractCreationCode = BatchWorkable.bytecode.concat(inputData.slice(2));
    const encodedStrategies = await job.provider.call({data: contractCreationCode});
    const [batchWorkableStrategies] = ethers.utils.defaultAbiCoder.decode(['address[]'], encodedStrategies) as [string[]];
    workableStrategies = workableStrategies.concat(batchWorkableStrategies);
  }

  return workableStrategies;
}

/**
 * Splits an array into smaller chunks of a specified maximum size.
 *
 * @param array The array to be split.
 * @param chunkSize The maximum size of each chunk.
 * @returns An array of arrays, each of which is a chunk of the original array.
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}
