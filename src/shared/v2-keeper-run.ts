import type {providers, Contract} from 'ethers';
import type {Block} from '@ethersproject/abstract-provider';
import {BlockListener} from '@keep3r-network/keeper-scripting-utils';
import {getStrategies} from './batch-requests';

export async function testV2Keep3rRun(
  jobContract: Contract,
  provider: providers.WebSocketProvider | providers.JsonRpcProvider,
  workFunction: string,
  broadcastMethod: (job: Contract, workMethod: string, workArguments: any[], block: Block) => Promise<void>,
) {
  const blockListener = new BlockListener(provider);

  blockListener.stream(async (block: Block) => {
    const allStrategies = await jobContract.strategies();
    const workableStrategies = await getStrategies(jobContract, allStrategies);
    if (workableStrategies.length === 0) {
      console.info('Found no workable strategies.');
    }

    for (const [_, strategy] of workableStrategies.entries()) {
      try {
        await broadcastMethod(jobContract, workFunction, [strategy], block);
        break;
      } catch (error: unknown) {
        if (error instanceof Error) console.log(`Strategy: ${strategy} failed with:`, error.message);
      }
    }
  });
}
