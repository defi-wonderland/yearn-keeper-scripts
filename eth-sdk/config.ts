import { defineConfig } from '@dethcrypto/eth-sdk';

export default defineConfig({
  contracts: {
    mainnet: {
      harvestV2Keep3rV2: '0x220a85bCd2212ab0b27EFd0de8b5e03175f0adee',
      stealthRelayer: '0x0a61c2146A7800bdC278833F21EBf56Cd660EE2a',
      tendV2Keep3rV2: '0xdeE991cbF8527A33E84a2aAb8a65d68D5D591bAa',
    },
    goerli: {
      testFakeStrategiesJob: '0xbA3ae0D23D3CFb74d829615b304F02C366e75d5E',
    },
  },
});
