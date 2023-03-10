import {getMainnetSdk} from '@dethcrypto/eth-sdk-client';
import {providers, Wallet} from 'ethers';
import {FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import {FlashbotsBroadcastor, getEnvVariable} from '@keep3r-network/keeper-scripting-utils';
import {publicKeeperRun} from './shared/public-keeper-run';

// SETUP
const WORK_FUNCTION = 'work';
const GAS_LIMIT = 10_000_000;
const PRIORITY_FEE = 1.5e9;

(async () => {
  // ENVIRONMENT
  const provider = new providers.JsonRpcProvider(getEnvVariable('RPC_HTTP_MAINNET_URI'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const bundleSigner = new Wallet(getEnvVariable('BUNDLE_SIGNER_PRIVATE_KEY'), provider);

  // CONTRACTS
  const job = getMainnetSdk(txSigner).publicKeeperJob;

  // PROVIDERS
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, bundleSigner);

  const flashbotBroadcastor = new FlashbotsBroadcastor(flashbotsProvider, PRIORITY_FEE, GAS_LIMIT);

  // INITIALIZE
  await publicKeeperRun(job, provider, WORK_FUNCTION, flashbotBroadcastor.tryToWorkOnFlashbots.bind(flashbotBroadcastor));
})();
