# Magus Contracts

This repo contains the protocol side for the Magus project.

## Install & Setup

Install the dependencies with:
```bash
npm install
```

Create a `.env` file with your private key like:
```
PRIVATE_KEY=
```

## Run tests

You can run the tests:
```bash
npx hardhat test
```

## Deploy & Setup

First deploy with:
```bash
npx hardhat run scripts/deploy.ts --network monadTestnet
```

If you want to verify the contracts:
```bash
npx hardhat verify <contract-address> --network monadTestnet <constructor-parameters>
```

If you want to setup an inital template (required if you want to request weapons from this family). Check the templates in `metadata/InitialWeaponsData.json` then run:
```bash
npx hardhat run scripts/setupTemplate.ts --network monadTestnet
```

And finally if you want to request (mint) a weapon:
```bash
npx hardhat run scripts/requestWeapon.ts --network monadTestnet
```