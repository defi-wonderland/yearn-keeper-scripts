import {getMainnetSdk} from '@dethcrypto/eth-sdk-client';
import {Flashbots} from '@keep3r-network/keeper-scripting-utils';
import {harvestRun} from './shared/harvest-run';
import {tryToWorkHarvestStrategy} from './shared/harvest-work';
import {loadInitialSetup} from './shared/setup';
import {CHAIN_ID, FLASHBOTS_RPC} from './utils/constants';

(async () => {
  const {provider, txSigner, bundleSigner} = loadInitialSetup();

  const harvestJob = getMainnetSdk(txSigner).harvestV2Job;
  const stealthRelayer = getMainnetSdk(txSigner).stealthRelayer;

  // One time setup
  const flashbots = await Flashbots.init(txSigner, bundleSigner, provider, [FLASHBOTS_RPC], true, CHAIN_ID);

  await harvestRun({
    flashbots,
    provider,
    job: harvestJob,
    stealthRelayer,
    txSigner,
    tryToWorkFunc: tryToWorkHarvestStrategy,
  });
})();
