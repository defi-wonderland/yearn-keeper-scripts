import {getMainnetSdk} from '@dethcrypto/eth-sdk-client';
import {providers, Wallet} from 'ethers';
import {PrivateBroadcastor, getEnvVariable} from '@keep3r-network/keeper-scripting-utils';
import {factoryHarvestV1Run} from './shared/factory-harvest-v1-run';

// SETUP
const WORK_FUNCTION = 'work';
const GAS_LIMIT = 10_000_000;
const PRIORITY_FEE = 2e9;
const builders = ['https://rpc.titanbuilder.xyz/', 'https://rpc.beaverbuild.org/'];

(async () => {
  // ENVIRONMENT
  const provider = new providers.JsonRpcProvider(getEnvVariable('RPC_HTTP_MAINNET_URI'));
  const providerForLogs = new providers.JsonRpcProvider(getEnvVariable('RPC_HTTP_MAINNET_URI_FOR_LOGS'));
  const txSigner = new Wallet(getEnvVariable('TX_SIGNER_PRIVATE_KEY'), provider);
  const chainId = 1;

  // CONTRACTS
  const job = getMainnetSdk(txSigner).publicKeeperJob;

  // PROVIDERS
  const broadcastor = new PrivateBroadcastor(builders, PRIORITY_FEE, GAS_LIMIT, true, chainId);

  // INITIALIZE
  await factoryHarvestV1Run(job, provider, providerForLogs, WORK_FUNCTION, broadcastor.tryToWork.bind(broadcastor));
})();
