import { getMainnetSdk } from '@dethcrypto/eth-sdk-client';
import { providers, Wallet } from 'ethers';
import { getEnvVariable } from './utils/misc';
import { FlashbotsBroadcastor } from './shared/flashbotsBroadcastor';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import { testV2Keep3rRun } from './shared/v2-keeper-run';

const WORK_FUNCTION = 'work';
const GAS_LIMIT = 10_000_000;
const PRIORITY_FEE = 1.5e9; // TODO: changed this only for the test runs, the original still remain expressed as single decimals (so 2 instead of 2e9)

(async () => {
  const provider = new providers.JsonRpcProvider(getEnvVariable('NODE_URI_MAINNET'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const bundleSigner = new Wallet(getEnvVariable('BUNDLE_SIGNER_PRIVATE_KEY'), provider);

  const tendJob = getMainnetSdk(txSigner).tendV2Keep3rV2;

  // Flashbots provider requires passing in a standard provider
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, bundleSigner);

  const flashbotBroadcastor = new FlashbotsBroadcastor(provider,  bundleSigner, flashbotsProvider, PRIORITY_FEE, GAS_LIMIT);

  await testV2Keep3rRun(tendJob, provider, WORK_FUNCTION, flashbotBroadcastor.tryToWorkOnFlashbots.bind(flashbotBroadcastor));
})();
