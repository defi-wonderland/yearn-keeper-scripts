import {getMainnetSdk} from '@dethcrypto/eth-sdk-client';
import {providers, Wallet} from 'ethers';
import {FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import {getEnvVariable, StealthBroadcastor} from '@keep3r-network/keeper-scripting-utils/';
import {testV2Keep3rRun} from './shared/v2-keeper-run';

// SETUP
const WORK_FUNCTION = 'work';
const PRIORITY_FEE = 2e9;
const GAS_LIMIT = 5_000_000;
const BURST_SIZE = 2;

(async () => {
  // ENVIRONMENT
  const provider = new providers.JsonRpcProvider(getEnvVariable('NODE_URI_MAINNET'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const bundleSigner = new Wallet(getEnvVariable('BUNDLE_SIGNER_PRIVATE_KEY'), provider);

  // CONTRACTS
  const harvestJob = getMainnetSdk(txSigner).harvestV2Keep3rV2;
  const stealthRelayer = getMainnetSdk(txSigner).stealthRelayer;

  // PROVIDERS
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, bundleSigner);
  const rpcStealthBroacastor = new StealthBroadcastor(flashbotsProvider, stealthRelayer, PRIORITY_FEE, GAS_LIMIT, BURST_SIZE);

  // INITIALIZE
  await testV2Keep3rRun(harvestJob, provider, WORK_FUNCTION, rpcStealthBroacastor.tryToWorkOnStealthRelayer.bind(rpcStealthBroacastor));
})();
