import type {UnsubscribeFunction} from '@keep3r-network/keeper-scripting-utils';
import type {BigNumber} from 'ethers';

// TODO: review useful types
export type Address = string;
export type LastWorkAtMap = Record<string, BigNumber>;
export type UnsubscribeStrategyMap = Record<string, UnsubscribeFunction>;
export type WorkDataMap = Record<string, string>;
export type StrategyWorkInProgressMap = Record<string, boolean>;
export type CooldownWrapper = Record<string, BigNumber>;