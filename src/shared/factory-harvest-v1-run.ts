import type {Event, providers} from 'ethers';
import {Contract} from 'ethers';
import type {Block} from '@ethersproject/abstract-provider';
import {defaultAbiCoder} from 'ethers/lib/utils';
import type {BroadcastorProps} from '@keep3r-network/keeper-scripting-utils';
import {BlockListener} from '@keep3r-network/keeper-scripting-utils';
import VaultFactoryABI from '../../abis/VaultFactory.json';

import {getStrategies} from './batch-requests';

const VAULT_FACTORY_ADDRESS = '0x21b1FC8A52f179757bf555346130bF27c0C2A17A';
const VAULT_FACTORY_DEPLOYMENT_BLOCK = '0xF76E83';

const TOPIC_STRATEGY_ADDED = '0x5a6abd2af9fe6c0554fa08649e2d86e4393ff19dc304d072d38d295c9291d4dc'; // StrategyAdded(address,uint256,uint256,uint256,uint256)
const TOPIC_STRATEGY_ADDED_TO_QUEUE = '0xa8727d412c6fa1e2497d6d6f275e2d9fe4d9318d5b793632e60ad9d38ee8f1fa'; // StrategyAddedToQueue(address)
const TOPIC_STRATEGY_REMOVED_FROM_QUEUE = '0x8e1ec3c16d6a67ea8effe2ac7adef9c2de0bc0dc47c49cdf18f6a8b0048085be'; // StrategyRemovedFromQueue(address)
const TOPIC_STRATEGY_MIGRATED = '0x100b69bb6b504e1252e36b375233158edee64d071b399e2f81473a695fd1b021'; // StrategyMigrated(address,address)
const TOPIC_STRATEGY_REVOKED = '0x4201c688d84c01154d321afa0c72f1bffe9eef53005c9de9d035074e71e9b32a'; // StrategyRevoked(address)
const TOPICS = [
  TOPIC_STRATEGY_ADDED,
  TOPIC_STRATEGY_ADDED_TO_QUEUE,
  TOPIC_STRATEGY_MIGRATED,
  TOPIC_STRATEGY_REMOVED_FROM_QUEUE,
  TOPIC_STRATEGY_REVOKED,
];

export async function factoryHarvestV1Run(
  jobContract: Contract,
  provider: providers.WebSocketProvider | providers.JsonRpcProvider,
  providerForLogs: providers.WebSocketProvider | providers.JsonRpcProvider,
  workMethod: string,
  broadcastMethod: (props: BroadcastorProps) => Promise<void>,
): Promise<void> {
  const blockListener = new BlockListener(provider);

  const vaultFactory = new Contract(VAULT_FACTORY_ADDRESS, VaultFactoryABI, provider);
  let currentStrategies: string[] = await getCurrentStrategies(vaultFactory, providerForLogs);

  blockListener.stream(async (block: Block) => {
    const workableStrategies = await getStrategies(jobContract, currentStrategies);

    for (const strategy of workableStrategies) {
      await broadcastMethod({jobContract, workMethod, workArguments: [strategy], block});
    }
  });

  // Listens if a new strategy is added to the job. If it is, then try to work it.
  provider.on({topics: [TOPIC_STRATEGY_ADDED]}, async (eventData) => {
    const strategy = defaultAbiCoder.decode(['address', 'uint256', 'uint256', 'uint256', 'uint256'], eventData.data)[0] as string;
    console.log('^^^^^^^^^^^^^^^^^ NEW STRATEGY ADDED TO JOB ^^^^^^^^^^^^^^^^^', strategy);

    addStrategy(currentStrategies, strategy);
  });

  provider.on({topics: [TOPIC_STRATEGY_ADDED_TO_QUEUE]}, async (eventData) => {
    const strategy = defaultAbiCoder.decode(['address'], eventData.data)[0] as string;
    console.log('^^^^^^^^^^^^^^^^^ NEW STRATEGY ADDED TO JOB ^^^^^^^^^^^^^^^^^', strategy);

    addStrategy(currentStrategies, strategy);
  });

  provider.on({topics: [TOPIC_STRATEGY_MIGRATED]}, async (eventData) => {
    const [strategyRemoved, strategyAdded] = defaultAbiCoder.decode(['address', 'address'], eventData.data) as string[];
    console.log('^^^^^^^^^^^^^^^^^ STRATEGY REMOVED FROM JOB ^^^^^^^^^^^^^^^^^', strategyRemoved);

    removeStrategy(currentStrategies, strategyRemoved);

    console.log('^^^^^^^^^^^^^^^^^ NEW STRATEGY ADDED TO JOB ^^^^^^^^^^^^^^^^^', strategyAdded);

    addStrategy(currentStrategies, strategyAdded);
  });

  provider.on({topics: [TOPIC_STRATEGY_REMOVED_FROM_QUEUE]}, async (eventData) => {
    const strategy = defaultAbiCoder.decode(['address'], eventData.data)[0] as string;
    console.log('^^^^^^^^^^^^^^^^^ STRATEGY REMOVED FROM JOB ^^^^^^^^^^^^^^^^^', strategy);

    removeStrategy(currentStrategies, strategy);
  });

  provider.on({topics: [TOPIC_STRATEGY_REVOKED]}, (eventData) => {
    const strategy = defaultAbiCoder.decode(['address'], eventData.data)[0] as string;
    console.log('^^^^^^^^^^^^^^^^^ STRATEGY REMOVED FROM JOB ^^^^^^^^^^^^^^^^^', strategy);

    removeStrategy(currentStrategies, strategy);
  });

  provider.on(vaultFactory.filters.NewAutomatedVault(), async () => {
    console.log('^^^^^^^^^^^^^^^^^ NEW AUTOMATED VAULT ^^^^^^^^^^^^^^^^^');
    // When a new vault is deployed, reload the strategies to work
    currentStrategies = await getCurrentStrategies(vaultFactory, providerForLogs);
  });
}

function addStrategy(strategiesArray: string[], strategy: string) {
  strategiesArray.push(strategy);
}

function removeStrategy(strategiesArray: string[], strategy: string) {
  const indexOfStrategyToRemove = strategiesArray.indexOf(strategy);
  if (indexOfStrategyToRemove === -1) {
    console.log("Strategy to remove not found in array. This can only happen if there's an error in the script");
  }

  strategiesArray.splice(indexOfStrategyToRemove, 1);
}

async function getCurrentStrategies(
  vaultFactory: Contract,
  providerForLogs: providers.WebSocketProvider | providers.JsonRpcProvider,
): Promise<string[]> {
  const allVaults: string[] = await vaultFactory.allDeployedVaults();
  console.log(`Fetching current strategies from ${allVaults.length} vaults`);

  const logsByTopic: Record<string, Event[]> = {};
  for (const topic of TOPICS) {
    const filter = {
      address: allVaults,
      topics: [topic],
      fromBlock: VAULT_FACTORY_DEPLOYMENT_BLOCK,
    };
    logsByTopic[topic] = await providerForLogs.send('eth_getLogs', [filter]);
  }

  const strategyAdded = logsByTopic[TOPIC_STRATEGY_ADDED].map((event) => event.topics[1]);
  const strategyAddedToQueue = logsByTopic[TOPIC_STRATEGY_ADDED_TO_QUEUE].map((event) => event.topics[1]);
  const strategyMigratedFrom = logsByTopic[TOPIC_STRATEGY_MIGRATED].map((event) => event.topics[1]);
  const strategyMigratedTo = logsByTopic[TOPIC_STRATEGY_MIGRATED].map((event) => event.topics[2]);
  const strategyRemovedFromQueue = logsByTopic[TOPIC_STRATEGY_REMOVED_FROM_QUEUE].map((event) => event.topics[1]);
  const strategyRevoked = logsByTopic[TOPIC_STRATEGY_REVOKED].map((event) => event.topics[1]);

  const allAddedStrategies = strategyAdded.concat(strategyMigratedTo).concat(strategyAddedToQueue);
  const allRemovedStrategies = new Set(strategyRevoked.concat(strategyMigratedFrom).concat(strategyRemovedFromQueue));
  const currentStrategies = allAddedStrategies.filter((x) => !allRemovedStrategies.has(x)).map((x) => '0x'.concat(x.slice(26, 256)));

  console.log(`Found ${currentStrategies.length} strategies`);

  return currentStrategies;
}
