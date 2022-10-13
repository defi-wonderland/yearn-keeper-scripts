# Yearn Keeper Scripts

This repository enables keepers of the Keep3r Network to execute Yearn's jobs on Ethereum.

## How to run

1. Clone the repository

```
  git clone https://github.com/yearn/keeper-scripts
```

2. Install dependencies

```
  yarn install
```

3. Create and complete the `.env` file using `env.example` as an example

4. Fine-tune the constants in `src/constants.ts` to your liking. Read [the docs](https://docs.keep3r.network/keeper-scripts) for a technical in-depth explanation.

5. Try out the scripts

```
  yarn start:harvest-v2: ts-node src/scripts/mainnet/yearn/harvest-v2-keep3r-v2.ts
  yarn start:harvest: ts-node src/scripts/mainnet/yearn/harvest-v2
  yarn start:tend-keep3r-v2: ts-node src/scripts/mainnet/yearn/tend-v2-keep3r-v2.ts
  yarn start:tend-beta: ts-node src/scripts/mainnet/yearn/tend-v2-beta.ts
  yarn start:tend: ts-node src/scripts/mainnet/yearn/tend-v2.ts
```

## Run in production

1. Build the typescript into javascript

```
  yarn build
```

2. Run the jobs directly from javascript (using [PM2](https://github.com/Unitech/pm2) is highly recommended)

```
  node dist/harvest-v2.js
  node dist/harvest.js
  node dist/tend-keep3r-v2.js
  node dist/tend-beta.js
  node dist/tend.js
```

## Keeper Requirements

**Harvest Jobs**:

- To work Harvest Keep3r V1, the keeper must be a valid keeper on [Keep3r V1](https://etherscan.io/address/0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44). To work Harvest Keep3r V2, the keeper must be a valid keeper on [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)
- Have at least 50 KP3R bonded on Keep3r V1
- Should not be a contract
- Should at least have 1 ETH bonded on the Stealth Vault
- Should enable Stealth Relayer through the Stealth Vault. This should be done by calling the Vault's method enableStealthContract

**Tend V2 Beta and Tend V2 Jobs**

- To work TendV2 Beta and Tend V2, the keeper must be a valid keeper on [Keep3r V1](https://etherscan.io/address/0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44). To work Tend V2 Keep3rV2, the keeper must be a valid keeper on [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)
- Have at least 50 KP3R bonded on Keep3r V1
- Should not be a contract

## Useful Links

- [Harvest Keep3rV2 Job](https://etherscan.io/address/0x220a85bCd2212ab0b27EFd0de8b5e03175f0adee)
- [Harvest Keep3rV1 Job](https://etherscan.io/address/0x2150b45626199CFa5089368BDcA30cd0bfB152D6)
- [Tend V2 Keep3rV2 Job](https://etherscan.io/address/0xdeE991cbF8527A33E84a2aAb8a65d68D5D591bAa)
- [Tend V2 Beta Job](https://etherscan.io/address/0xf72D7E44ec3F79379912B8d0f661bE954a101159)
- [Tend V2 Job](https://etherscan.io/address/0x2ef7801c6A9d451EF20d0F513c738CC012C57bC3)
- [Stealth Relayer](https://etherscan.io/address/0x0a61c2146A7800bdC278833F21EBf56Cd660EE2a)
- [Stealth Vault](https://etherscan.io/address/0xde2fe402a285363283853bec903d134426db3ff7)
- [Stealth Relayer & Vault docs](https://github.com/yearn/keep3r-jobs/blob/master/doc/working-stealth-jobs.md)
- [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)
- [Keep3r V1](https://etherscan.io/address/0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44)
