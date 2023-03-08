# CrossFuel With Fantom

CrossFuel is a payment system that simplifies gas fees for dApps on different blockchains using Account Abstraction.
It eliminates the need to swap or bridge tokens, making transactions across multiple chains effortless.

## Newly Developped Function for Fantom Hackathon

This project is brand new for this hackathon period, but most of its development actually happened during ETHDenver. The similar time frame of ETHDenver's hackathon gave us the opportunity to integrate Fantom into the project.

Please note this point when evaluating/judging.

The new functions are as follows.

![banner](./docs/banner_wide.png)

## Submission

### Live Demo

https://cross-fuel-with-fantom.vercel.app/

### Demo Video

TBD

## How It Works

![how-it-works](./docs/how-it-works.jpg)

Our system involves two user operations: one for paying the gas fee, and the other for executing the actual transaction. The backend automatically verifies the deposit amount of the paymaster and adjusts the balance using a cross-chain bridge and swap mechanism. By batching transactions, we achieve cost efficiency and can benefit from the resulting savings.

## Account Abstraction

Our smart contract and bundler are fully compatible with the newly released version of the Account Abstraction contract from Ethereum Foundation, which was activated during ETHDenver 2023.

[Ethereum Says ERC-4337 Deployed, Tested, Beginning Era of Smart Accounts](https://www.coindesk.com/tech/2023/03/01/ethereum-activates-account-abstraction-touted-by-founder-buterin-as-key-advance/)

With its compatibility with the latest version of Account Abstraction, CrossFuel provides a secure and easy-to-use platform for cross-chain gas payments. It is an ideal solution for anyone looking to make cross-chain transactions with ease.

By working together, these services provide a seamless and secure user experience, allowing users to interact with dApps across multiple chains without worrying about managing tokens across different chains.

## Bounties

### Metamask Snap

Metamask Snap is an extension feature of Metamask that adds the Account Abstraction function, which was previously cumbersome to use and required multiple signatures, making it difficult to comprehend the transaction process. By automating the Account Abstraction signature and providing a transaction simulator for improved security, Metamask Snap simplifies and enhances the user experience.

### Infura

Our team utilizes Infura, a multichain node service, for deploying multichain contracts, including the Account Abstraction infrastructure contract, which we are deploying to each chain. Meanwhile, Truffle, a core development tool, provides a starter kit for Metamask Snap and smart contract.

### Defender

Defender is an automated tool that verifies the signature within the paymaster contract, checks the paymaster deposit balance, and facilitates any necessary fund transfers. CrossFuel has chosen Defender because it requires a stable infrastructure for signing and health checks.

### Axelar

Axelar Network is a crucial component of our cross-chain gas payment service. In the event of insufficient funds, we leverage the cross-chain bridge to transfer funds from a chain with a surplus. Additionally, we utilize Squid, the cross-chain swap and liquidity routing protocol, on the Axelar Network to facilitate our operations.

### Tenderly

Communicating the inner workings of Account Abstraction to users is challenging. To enhance the user experience, we're using Tenderly to simulate transaction results. This allows users to review the transaction outcome before submitting it to the bundler, thereby ensuring the security of the process. This security feature is critical in making the Account Abstraction wallet widely accepted.

### Covalent

In our data retrieval process across multiple chains, Covalent plays a pivotal role. On the frontend, we gather supported tokens across various chains, while on the backend, we use Covalent to obtain balance data to ensure validation prior to conducting swaps and cross-chain bridge transfers.

### Truffle Snaps Box

We utilized Truffle Snaps Box to create a Metamask boilerplate

## Development

To proceed with testing, it is necessary to obtain the Defender API key for both Goerli and Mumbai networks. Additionally, it is important to ensure that the contract is strongly connected to our Defender verifier address. To ensure a smooth testing process, I recommend testing in a deployed environment.

### Backend

```
cd implementations/backend
yarn
yarn dev
```

### Frontend

```
cd implementations/metamask-snap
yarn
yarn start
```

## Deployment

### Backend

https://cross-fuel-fantom-backend.onrender.com/

### Frontend

https://cross-fuel-fantom-.vercel.app/

### Metamask Snap

https://www.npmjs.com/package/crossfuel-snap-with-fantom
