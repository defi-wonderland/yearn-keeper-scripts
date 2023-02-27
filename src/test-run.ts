import { getGoerliSdk } from '@dethcrypto/eth-sdk-client';
import { testRun } from './shared/test-run';
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';
import { FlashbotsBroadcastor } from './shared/flashbotsBroadcastor';
import { providers, Wallet } from 'ethers';
import { getEnvVariable } from './utils/misc';

const WORK_FUNCTION = 'work';
const PRIORITY_FEE = 2e9; // TODO: changed this only for the test runs, the original still remain expressed as single decimals (so 2 instead of 2e9)
const GAS_LIMIT = 5_000_000;

(async () => {
  const provider = new providers.JsonRpcProvider(getEnvVariable('NODE_URI_GOERLI'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const bundleSigner = new Wallet(getEnvVariable('BUNDLE_SIGNER_PRIVATE_KEY'), provider);

  const testJob = getGoerliSdk(txSigner).testFakeStrategiesJob;

  const relay = 'https://relay-goerli.flashbots.net';

  // Flashbots provider requires passing in a standard provider
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, bundleSigner, relay);

  // One time setup
  const rpcStrategiesBroacastor = new FlashbotsBroadcastor(provider, bundleSigner, flashbotsProvider, PRIORITY_FEE, GAS_LIMIT);

  await testRun(testJob, provider, WORK_FUNCTION, rpcStrategiesBroacastor.tryToWorkOnFlashbots.bind(rpcStrategiesBroacastor));
})();
