import {getGoerliSdk} from '@dethcrypto/eth-sdk-client';
import {FlashbotsBundleProvider} from '@flashbots/ethers-provider-bundle';
import {providers, Wallet} from 'ethers';
import {testRun} from './shared/test-run';
import {FlashbotsBroadcastor} from './keeper-scripting-utils/flashbotsBroadcastor';
import {getEnvVariable} from './keeper-scripting-utils/utils/misc';

// SETUP
const WORK_FUNCTION = 'work';
const PRIORITY_FEE = 2e9;
const GAS_LIMIT = 5_000_000;
const GOERLI_FLASHBOTS_RPC = 'https://api.blocknative.com/v1/auction?network=goerli'; // Added as example on how to change relayers

(async () => {
  // ENVIRONMENT
  const provider = new providers.JsonRpcProvider(getEnvVariable('NODE_URI_GOERLI'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const bundleSigner = new Wallet(getEnvVariable('BUNDLE_SIGNER_PRIVATE_KEY'), provider);

  // CONTRACTS
  const testJob = getGoerliSdk(txSigner).testFakeStrategiesJob;

  // PROVIDERS
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, bundleSigner, GOERLI_FLASHBOTS_RPC);
  const rpcStrategiesBroacastor = new FlashbotsBroadcastor(flashbotsProvider, PRIORITY_FEE, GAS_LIMIT);

  // INITIALIZE
  await testRun(testJob, provider, WORK_FUNCTION, rpcStrategiesBroacastor.tryToWorkOnFlashbots.bind(rpcStrategiesBroacastor));
})();
