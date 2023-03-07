import type {providers, Contract} from 'ethers';
import type {Block} from '@ethersproject/abstract-provider';
import type {BroadcastorProps} from '@keep3r-network/keeper-scripting-utils';
import {BlockListener} from '@keep3r-network/keeper-scripting-utils';
import {getStrategies} from './batch-requests';

export async function testV2Keep3rRun(
  jobContract: Contract,
  provider: providers.WebSocketProvider | providers.JsonRpcProvider,
  workMethod: string,
  broadcastMethod: (props: BroadcastorProps) => Promise<void>,
) {
  const blockListener = new BlockListener(provider);

  blockListener.stream(async (block: Block) => {
    const allStrategies = await jobContract.strategies();
    const workableStrategies = await getStrategies(jobContract, allStrategies);
    if (workableStrategies.length === 0) {
      console.info('Found no workable strategies.');
      return;
    }

    for (const [_, strategy] of workableStrategies.entries()) {
      try {
        await broadcastMethod({jobContract, workMethod, workArguments: [strategy], block});
        continue;
      } catch (error: unknown) {
        if (error instanceof Error) console.log(`Strategy: ${strategy} failed with:`, error.message);
      }
    }
  });
}
