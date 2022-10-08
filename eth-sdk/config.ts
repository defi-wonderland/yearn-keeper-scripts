import {defineConfig} from '@dethcrypto/eth-sdk';

export default defineConfig({
  contracts: {
    mainnet: {
      harvestV2Job: '0x2150b45626199CFa5089368BDcA30cd0bfB152D6',
      harvestV2Keep3rV2: '0x220a85bCd2212ab0b27EFd0de8b5e03175f0adee',
      stealthRelayer: '0x0a61c2146A7800bdC278833F21EBf56Cd660EE2a',
      tendV2: '0x2ef7801c6A9d451EF20d0F513c738CC012C57bC3',
      tendV2Beta: '0xf72D7E44ec3F79379912B8d0f661bE954a101159',
      tendV2Keep3rV2: '0xdeE991cbF8527A33E84a2aAb8a65d68D5D591bAa',
    },
  },
});
