import type {providers, Contract} from 'ethers';
import type {Block} from '@ethersproject/abstract-provider';
import {BlockListener} from '@keep3r-network/keeper-scripting-utils';
import type {Address} from 'src/keeper-scripting-utils/utils/types';

export async function testRun(
  jobContract: Contract,
  provider: providers.WebSocketProvider | providers.JsonRpcProvider,
  workFunction: string,
  broadcastMethod: (job: Contract, workMethod: string, workArguments: any[], block: Block) => Promise<void>,
) {
  const blockListener = new BlockListener(provider);

  blockListener.stream(async (block) => {
    const workableStrategies: Address[] = await jobContract.strategies();
    for (const [_, strategy] of workableStrategies.entries()) {
      try {
        await broadcastMethod(jobContract, workFunction, [strategy, true, 5], block);
        break;
      } catch (error: unknown) {
        console.log('===== Tx FAILED =====', strategy);
        if (error instanceof Error) console.log(`Strategy: ${strategy} failed with:`, error.message);
      }
    }
  });
}
