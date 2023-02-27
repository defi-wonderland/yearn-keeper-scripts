import { Relays } from './misc';

// Flashbots RPC. Taken from https://docs.flashbots.net
export const FLASHBOTS_RPC = 'https://relay.flashbots.net';
export const GOERLI_FLASHBOTS_RPC = 'https://relay-goerli.flashbots.net';
//'https://api.blocknative.com/v1/auction?network=mainnet';
//'https://relay.flashbots.net';

// How many minutes to wait until we fetch the cooldown of a job to see if it changed
export const COOLDOWN_INTERNAL_MINUTES = 120;

export const DEFAULT_RELAYS: Relays[] = [
  {
    chainId: 1,
    endpoint: FLASHBOTS_RPC,
  },
  {
    chainId: 5,
    endpoint: GOERLI_FLASHBOTS_RPC,
  },
];
