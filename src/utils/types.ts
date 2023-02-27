import type { BlockListener, Flashbots, UnsubscribeFunction } from '@keep3r-network/keeper-scripting-utils';
import type { BigNumber, Contract, providers, Wallet } from 'ethers';

export type Address = string;
export type LastWorkAtMap = Record<string, BigNumber>;
export type UnsubscribeStrategyMap = Record<string, UnsubscribeFunction>;
export type WorkDataMap = Record<string, string>;
export type StrategyWorkInProgressMap = Record<string, boolean>;
export type CooldownWrapper = Record<string, BigNumber>;

export type InitialSetup = {
  provider: providers.WebSocketProvider | providers.JsonRpcProvider;
  txSigner: Wallet;
  bundleSigner: Wallet;
};

export type RunSetup = {
  blockListener: BlockListener;
  lastWorkAt: LastWorkAtMap;
  strategyWorkInProgress: StrategyWorkInProgressMap;
  unsubscribeStrategy: UnsubscribeStrategyMap;
  workData: WorkDataMap;
};

export type BaseTryToWorkProps = {
  strategy: string;
  flashbots: Flashbots;
  unsubscribeStrategy: UnsubscribeStrategyMap;
  lastWorkAt: LastWorkAtMap;
  cooldown: CooldownWrapper;
  blockListener: BlockListener;
  strategyWorkInProgress: StrategyWorkInProgressMap;
  job: Contract;
  provider: providers.WebSocketProvider | providers.JsonRpcProvider;
  txSigner: Wallet;
};
