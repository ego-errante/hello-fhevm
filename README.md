# Hello FHEVM - Rock Paper Scissors

This project is a decentralized Rock-Paper-Scissors game that uses Zama's FHEVM technology to allow for confidential on-chain gameplay. It started as a fork of the [FHEVM React Template](https://github.com/zama-ai/fhevm-react-template) and has been extended to showcase a complete dApp.

## Project Overview

The application demonstrates a privacy-preserving implementation of the classic Rock-Paper-Scissors game on the blockchain. Key features include:

- **Confidential Moves**: Players' moves are encrypted on the client-side before being sent to the smart contract.
- **On-Chain Encrypted Logic**: The game's winner is determined on-chain using homomorphic encryption, ensuring that individual moves are never revealed.
- **Verifiable Results**: Players can decrypt the final game result to verify the outcome without exposing their initial move.

## Components

The project is a monorepo containing two main packages: a Hardhat project for the smart contracts and a Next.js project for the frontend.

### Smart Contracts (`packages/fhevm-hardhat-template`)

- **`contracts/RockPaperScissors.sol`**: The core smart contract for the game. It manages game creation, encrypted move submission, and confidential winner determination using FHEVM.
- **`contracts/FHECounter.sol`**: A simple counter contract from the original template that demonstrates basic FHEVM operations on encrypted integers.

### Frontend (`packages/site`)

The frontend is a Next.js application that provides a user-friendly interface for the Rock-Paper-Scissors game.

- **UI Components**: Built with React and Tailwind CSS for a modern user experience.
- **Wallet Integration**: Connects to MetaMask to interact with the Ethereum blockchain.
- **FHEVM Interaction**: Uses the `@fhevm/react` library to handle encryption of player moves and decryption of game results.
- **Game Flow**: Allows users to create games, submit moves, and view results in a seamless manner.

## Install

1. Clone this repository.
2. From the repo root, run:

```sh
npm install
```

## Quickstart

1. Setup your hardhat environment variables:

Follow the detailed instructions in the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) to setup `MNEMONIC` + `INFURA_API_KEY` Hardhat environment variables

2. Start a local Hardhat node (new terminal):

```sh
# Default RPC: http://127.0.0.1:8545  | chainId: 31337
npm run hardhat-node
```

3. Launch the frontend in mock mode:

```sh
npm run dev:mock
```

4. Start your browser with the Metamask extension installed and open http://localhost:3000

5. Open the Metamask extension to connect to the local Hardhat node
   i. Select Add network.
   ii. Select Add a network manually.
   iii. Enter your Hardhat Network RPC URL, http://127.0.0.1:8545 (or http://localhost:8545).
   iv. Enter your Hardhat Network chain ID, 31337 (or 0x539 in hexadecimal format).
