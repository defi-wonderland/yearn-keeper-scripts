import '@nomiclabs/hardhat-ethers';
import type {HardhatUserConfig} from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.13',
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
};

export default config;
