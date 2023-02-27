import type { providers, Contract } from 'ethers';
import { loadRunSetup } from './setup';
import { Block } from '@ethersproject/abstract-provider';
import { getStrategies } from '../utils/misc';

export async function testRun(
  jobContract: Contract,
  provider: providers.WebSocketProvider | providers.JsonRpcProvider,
  workFunction: string,
  broadcastMethod: (job: Contract, workMethod: string, workArguments: any[], block: Block) => Promise<void>
) {
  const { blockListener } = loadRunSetup(provider);

  blockListener.stream(async (block) => {
    // const workableStrategies = await getStrategies(jobContract); // doesn't work on goerli
    const workableStrategies = await jobContract.strategies();
    for (const [_, strategy] of workableStrategies.entries()) {
      try {
        await tryToWorkFunc(strategy, block);
        break;
      } catch (error: unknown) {
        if (error instanceof Error) console.log(`Strategy: ${strategy} failed with:`, error.message);
      }
    }
  });

  async function tryToWorkFunc(strategy: string, block: Block) {
    try {
      await broadcastMethod(jobContract, workFunction, [strategy, true, 5], block);
    } catch (error: unknown) {
      console.log('===== Tx FAILED =====', strategy);
      if (error instanceof Error) console.log(`Strategy: ${strategy} failed with:`, error.message);
    }
  }
}
