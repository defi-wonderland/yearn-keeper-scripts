import dotenv from 'dotenv';
import type { UnsubscribeFunction } from '@keep3r-network/keeper-scripting-utils';
import { BlockListener } from '@keep3r-network/keeper-scripting-utils';
import type { Contract } from 'ethers';
import { BigNumber, providers, Wallet } from 'ethers';
import { COOLDOWN_INTERNAL_MINUTES } from '../utils/constants';
import { getEnvVariable } from '../utils/misc';
import type { CooldownWrapper, InitialSetup, RunSetup } from '../utils/types';

dotenv.config();

export function loadInitialSetup(): InitialSetup {
  const provider = new providers.JsonRpcProvider(getEnvVariable('NODE_URI_MAINNET'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const bundleSigner = new Wallet(getEnvVariable('BUNDLE_SIGNER_PRIVATE_KEY'), provider);
  return {
    provider,
    txSigner,
    bundleSigner,
  };
}

export function loadRunSetup(provider: providers.WebSocketProvider | providers.JsonRpcProvider): RunSetup {
  const blockListener = new BlockListener(provider);
  const lastWorkAt: Record<string, BigNumber> = {};
  const strategyWorkInProgress: Record<string, boolean> = {};
  const unsubscribeStrategy: Record<string, UnsubscribeFunction> = {};
  const workData: Record<string, string> = {};
  return {
    blockListener,
    lastWorkAt,
    strategyWorkInProgress,
    unsubscribeStrategy,
    workData,
  };
}

export async function fetchAndUpdateCooldown(job: Contract): Promise<CooldownWrapper> {
  const wrapper = { value: BigNumber.from(0) };

  wrapper.value = await job.workCooldown();

  setInterval(async () => {
    wrapper.value = await job.workCooldown();
  }, COOLDOWN_INTERNAL_MINUTES * 60 * 1000);

  return wrapper;
}
