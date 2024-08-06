import {getMainnetSdk} from '@dethcrypto/eth-sdk-client';
import {providers, Wallet} from 'ethers';
import {getEnvVariable, StealthBroadcastor} from '@keep3r-network/keeper-scripting-utils/';
import {v2Keep3rRun} from './shared/v2-keeper-run';

// SETUP
const WORK_FUNCTION = 'work';
const GAS_LIMIT = 10_000_000;
const PRIORITY_FEE = 2e9;
const builders = ['https://rpc.titanbuilder.xyz/', 'https://rpc.beaverbuild.org/'];

(async () => {
  // ENVIRONMENT
  const provider = new providers.JsonRpcProvider(getEnvVariable('RPC_HTTP_MAINNET_URI'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const chainId = 1;

  // CONTRACTS
  const harvestJob = getMainnetSdk(txSigner).harvestV2Keep3rV2;
  const stealthRelayer = getMainnetSdk(txSigner).stealthRelayer;

  // PROVIDERS
  const broadcastor = new StealthBroadcastor(builders, stealthRelayer, PRIORITY_FEE, GAS_LIMIT, true, chainId);

  // INITIALIZE
  await v2Keep3rRun(harvestJob, provider, WORK_FUNCTION, broadcastor.tryToWork.bind(broadcastor));
})();
