import {getMainnetSdk} from '@dethcrypto/eth-sdk-client';
import {Flashbots} from '@keep3r-network/keeper-scripting-utils';
import {loadInitialSetup} from './shared/setup';
import {tendRun} from './shared/tend-run';
import {tryToWorkTendStrategy} from './shared/tend-work';
import {CHAIN_ID, FLASHBOTS_RPC} from './utils/constants';

(async () => {
  const {provider, txSigner, bundleSigner} = loadInitialSetup();

  const job = getMainnetSdk(txSigner).tendV2Beta;

  // One time setup
  const flashbots = await Flashbots.init(txSigner, bundleSigner, provider, [FLASHBOTS_RPC], true, CHAIN_ID);
  const workFunction = 'work';

  await tendRun({
    flashbots,
    provider,
    job,
    txSigner,
    workFunction,
    tryToWorkFunc: tryToWorkTendStrategy,
  });
})();
