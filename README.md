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
  yarn start:factory-harvest-v1
  yarn start:tend-v2
  yarn start:harvest-v2
```

## Run in production

1. Build the typescript into javascript

```
  yarn build
```

2. Run the jobs directly from javascript (using [PM2](https://github.com/Unitech/pm2) is highly recommended)

```
  node dist/src/factory-harvest-v1.js
  node dist/src/tend-v2.js
  node dist/src/harvest-v2.js
```

## Keeper Requirements

**Factory-Harvest-V1 Job**:

- Must be a valid keeper on [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)

**Tend-V2 Job**

- Must be a valid keeper on [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)
- Have at least 50 KP3R bonded on Keep3r V2
- Should not be a contract

**Harvest-V2 Job**:

- Must be a valid keeper on [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)
- Have at least 50 KP3R bonded on Keep3r V2
- Should not be a contract
- Should at least have 1 ETH bonded on the Stealth Vault
- Should enable Stealth Relayer through the Stealth Vault. This should be done by calling the Vault's method enableStealthContract

## Useful Links

- [Factory-Harvest-V1 Job](https://etherscan.io/address/0xf4F748D45E03a70a9473394B28c3C7b5572DfA82)
- [Tend-V2 Job](https://etherscan.io/address/0xdeE991cbF8527A33E84a2aAb8a65d68D5D591bAa)
- [Harvest-V2 Job](https://etherscan.io/address/0x220a85bCd2212ab0b27EFd0de8b5e03175f0adee)
- [Stealth Relayer](https://etherscan.io/address/0x0a61c2146A7800bdC278833F21EBf56Cd660EE2a)
- [Stealth Vault](https://etherscan.io/address/0xde2fe402a285363283853bec903d134426db3ff7)
- [Stealth Relayer & Vault docs](https://github.com/yearn/keep3r-jobs/blob/master/doc/working-stealth-jobs.md)
- [Keep3r V2](https://etherscan.io/address/0xeb02addCfD8B773A5FFA6B9d1FE99c566f8c44CC)
- [Keep3r V1](https://etherscan.io/address/0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44)
