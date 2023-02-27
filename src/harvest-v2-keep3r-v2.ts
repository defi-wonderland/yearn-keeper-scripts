import { getMainnetSdk } from '@dethcrypto/eth-sdk-client';
import { testV2Keep3rRun } from './shared/v2-keeper-run';
import { StealthBroadcastor } from './shared/stealthBroadcastor';
import { providers, Wallet } from 'ethers';
import { getEnvVariable, Relays } from './utils/misc';

const WORK_FUNCTION = 'work';
const PRIORITY_FEE = 2e9; // TODO: changed this only for the test runs, the original still remain expressed as single decimals (so 2 instead of 2e9)
const GAS_LIMIT = 5_000_000;
const BURST_SIZE = 2; // How many private transactions to send. If we are in block 100, and BURST_SIZE=2, it will send to block 101 and 102

(async () => {
  const provider = new providers.JsonRpcProvider(getEnvVariable('NODE_URI_MAINNET'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const bundleSigner = new Wallet(getEnvVariable('BUNDLE_SIGNER_PRIVATE_KEY'), provider);

  const harvestJob = getMainnetSdk(txSigner).harvestV2Keep3rV2;
  const stealthRelayer = getMainnetSdk(txSigner).stealthRelayer;

  // One time setup
  const rpcStealthBroacastor = new StealthBroadcastor(provider, bundleSigner, stealthRelayer, PRIORITY_FEE, GAS_LIMIT, BURST_SIZE);

  await testV2Keep3rRun(harvestJob, provider, WORK_FUNCTION, rpcStealthBroacastor.tryToWorkOnStealthRelayer.bind(rpcStealthBroacastor));
})();
