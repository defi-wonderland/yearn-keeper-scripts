import type {Contract} from 'ethers';
import {ethers} from 'ethers';
import * as BatchWorkable from '../../solidity/artifacts/contracts/BatchWorkable.sol/BatchWorkable.json';

export async function getStrategies(job: Contract): Promise<string[]> {
  const inputData = ethers.utils.defaultAbiCoder.encode(['address'], [job.address]);
  const contractCreationCode = BatchWorkable.bytecode.concat(inputData.slice(2));
  const encodedStrategies = await job.provider.call({data: contractCreationCode});
  const [workableStrategies] = ethers.utils.defaultAbiCoder.decode(['address[]'], encodedStrategies) as [string[]];
  return workableStrategies;
}
