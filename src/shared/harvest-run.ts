import {BigNumber} from 'ethers';
import {defaultAbiCoder} from 'ethers/lib/utils';
import {stopSubscription} from '../utils/misc';
import type {HarvestRunProps} from '../utils/types';
import {fetchAndUpdateCooldown, loadRunSetup} from './setup';

export async function harvestRun(props: HarvestRunProps): Promise<void> {
  const {job, provider, tryToWorkFunc} = props;
  const {lastWorkAt, workData, unsubscribeStrategy, strategyWorkInProgress, blockListener} = loadRunSetup(provider);
  // Not unwrapping due to needing to pass a pointer to the object instead of the value
  const cooldownWrapper = await fetchAndUpdateCooldown(job);

  const strategies: string[] = await job.strategies();

  const allLastWorksAt: BigNumber[] = await Promise.all(strategies.map(async (strategy) => job.lastWorkAt(strategy)));

  const allWorkData: string[] = await Promise.all(strategies.map((strategy) => job.interface.encodeFunctionData('work', [strategy])));

  for (const [i, strategy] of strategies.entries()) {
    lastWorkAt[strategy] = allLastWorksAt[i];
    workData[strategy] = allWorkData[i];
  }

  for (const strategy of strategies) {
    tryToWorkFunc({
      ...props,
      strategy,
      lastWorkAt,
      workData,
      unsubscribeStrategy,
      blockListener,
      cooldown: cooldownWrapper,
      strategyWorkInProgress,
    });
  }

  // Listens if a new strategy is added to the job. If it is, then try to work it.
  provider.on(job.filters.StrategyAdded(), async (eventData) => {
    const strategy = defaultAbiCoder.decode(['address', 'uint256'], eventData.data)[0] as string;
    console.log('^^^^^^^^^^^^^^^^^ NEW STRATEGY ADDED TO JOB ^^^^^^^^^^^^^^^^^', strategy);
    // Contract sets lastWorkAt as 0 when adding a new strategy to the job.
    lastWorkAt[strategy] = BigNumber.from(0);
    tryToWorkFunc({
      ...props,
      strategy,
      lastWorkAt,
      workData,
      unsubscribeStrategy,
      blockListener,
      cooldown: cooldownWrapper,
      strategyWorkInProgress,
    });
  });

  // Listens if a strategy is removed from the job and stops trying to work it.
  provider.on(job.filters.StrategyRemoved(), (eventData) => {
    const strategy = defaultAbiCoder.decode(['address'], eventData.data)[0] as string;
    console.log('^^^^^^^^^^^^^^^^^ STRATEGY REMOVED FROM JOB ^^^^^^^^^^^^^^^^^', strategy);

    if (!unsubscribeStrategy[strategy]) console.log('Untracked strategy was removed:', strategy);
    stopSubscription(unsubscribeStrategy, strategy);
  });
}
