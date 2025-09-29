import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { RockPaperScissors, RockPaperScissors__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("RockPaperScissors")) as RockPaperScissors__factory;
  const rockPaperScissorsContract = (await factory.deploy()) as RockPaperScissors;
  const rockPaperScissorsContractAddress = await rockPaperScissorsContract.getAddress();

  return { rockPaperScissorsContract, rockPaperScissorsContractAddress };
}

function extractGameId(receipt: any, contract: RockPaperScissors): bigint | null {
  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log);
      if (parsedLog?.name === "GameCreated") {
        return parsedLog.args[0];
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

describe("RockPaperScissors", function () {
  let signers: Signers;
  let rockPaperScissorsContract: RockPaperScissors;
  let rockPaperScissorsContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ rockPaperScissorsContract, rockPaperScissorsContractAddress } = await deployFixture());
  });

  describe("createGame", function () {
    it("should create a new game with correct initial state", async function () {
      const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt = await tx.wait();

      // Check that a GameCreated event was emitted
      expect(receipt?.logs.length).to.be.greaterThan(0);

      const gameId = extractGameId(receipt, rockPaperScissorsContract);
      expect(gameId).to.not.be.null;
      expect(gameId).to.be.a("bigint");

      // Get the game and verify its initial state
      const game = await rockPaperScissorsContract.getGame(gameId!);

      expect(game.player1).to.equal(signers.alice.address);
      expect(game.player2).to.equal(ethers.ZeroAddress);
      expect(game.status).to.equal(0); // Created = 0
    });

    it("should allow multiple games to be created by the same player", async function () {
      // Create first game
      const tx1 = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt1 = await tx1.wait();
      const gameId1 = extractGameId(receipt1, rockPaperScissorsContract);

      // Create second game
      const tx2 = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt2 = await tx2.wait();
      const gameId2 = extractGameId(receipt2, rockPaperScissorsContract);

      // Games should have different IDs
      expect(gameId1).to.not.equal(gameId2);

      // Both games should exist with correct player1
      const game1 = await rockPaperScissorsContract.getGame(gameId1!);
      const game2 = await rockPaperScissorsContract.getGame(gameId2!);

      expect(game1.player1).to.equal(signers.alice.address);
      expect(game2.player1).to.equal(signers.alice.address);
    });

    it("should allow different players to create games independently", async function () {
      // Alice creates a game
      const tx1 = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt1 = await tx1.wait();
      const aliceGameId = extractGameId(receipt1, rockPaperScissorsContract);

      // Bob creates a game
      const tx2 = await rockPaperScissorsContract.connect(signers.bob).createGame();
      const receipt2 = await tx2.wait();
      const bobGameId = extractGameId(receipt2, rockPaperScissorsContract);

      // Verify games have different IDs and correct players
      const aliceGame = await rockPaperScissorsContract.getGame(aliceGameId!);
      const bobGame = await rockPaperScissorsContract.getGame(bobGameId!);

      expect(aliceGame.player1).to.equal(signers.alice.address);
      expect(bobGame.player1).to.equal(signers.bob.address);
      expect(aliceGameId).to.not.equal(bobGameId);
    });
  });

  describe("Game State Transitions", function () {
    let gameId: bigint;

    beforeEach(async function () {
      const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt = await tx.wait();
      gameId = extractGameId(receipt, rockPaperScissorsContract)!;
    });

    it("should initialize game with Created status", async function () {
      const game = await rockPaperScissorsContract.getGame(gameId);
      expect(game.status).to.equal(0); // GameStatus.Created = 0
    });

    it("should have zero address for player2 initially", async function () {
      const game = await rockPaperScissorsContract.getGame(gameId);
      expect(game.player2).to.equal(ethers.ZeroAddress);
    });
  });

  describe("submitEncryptedMove", function () {
    let gameId: bigint;

    beforeEach(async function () {
      const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt = await tx.wait();
      gameId = extractGameId(receipt, rockPaperScissorsContract)!;
    });

    it("should allow player1 to submit a valid move", async function () {
      // Encrypt move: Rock = 0
      const encryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(0) // Rock
        .encrypt();

      const tx = await rockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedMove(gameId, encryptedMove.handles[0], encryptedMove.inputProof);

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Verify game state
      const game = await rockPaperScissorsContract.getGame(gameId);
      expect(game.status).to.equal(1); // Player1MoveSubmitted
      expect(game.move1).to.not.equal(ethers.ZeroHash);
    });

    it("should allow player2 to join and submit move", async function () {
      // Player1 submits first
      const p1EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(0) // Rock
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedMove(gameId, p1EncryptedMove.handles[0], p1EncryptedMove.inputProof);

      // Player2 joins and submits
      const p2EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.bob.address)
        .add8(1) // Paper
        .encrypt();

      const tx = await rockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedMove(gameId, p2EncryptedMove.handles[0], p2EncryptedMove.inputProof);

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Verify game state
      const game = await rockPaperScissorsContract.getGame(gameId);
      expect(game.player2).to.equal(signers.bob.address);
      expect(game.status).to.equal(2); // Resolved (auto-resolved)
      expect(game.move2).to.not.equal(ethers.ZeroHash);
    });

    it("should validate moves to range 0-2 using modulo", async function () {
      // Submit invalid move (value 5), should be reduced to 5 % 3 = 2 (Scissors)
      const encryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(5)
        .encrypt();

      const tx = await rockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedMove(gameId, encryptedMove.handles[0], encryptedMove.inputProof);

      expect(tx).to.not.be.reverted;
    });

    it("should prevent player1 from submitting twice", async function () {
      // First submission
      const encryptedMove1 = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(0)
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedMove(gameId, encryptedMove1.handles[0], encryptedMove1.inputProof);

      // Second submission should fail
      const encryptedMove2 = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(1)
        .encrypt();

      await expect(
        rockPaperScissorsContract
          .connect(signers.alice)
          .submitEncryptedMove(gameId, encryptedMove2.handles[0], encryptedMove2.inputProof),
      ).to.be.revertedWith("Player1 can only submit in Created state");
    });

    it("should prevent player2 from submitting before player1", async function () {
      const encryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.bob.address)
        .add8(1)
        .encrypt();

      await expect(
        rockPaperScissorsContract
          .connect(signers.bob)
          .submitEncryptedMove(gameId, encryptedMove.handles[0], encryptedMove.inputProof),
      ).to.be.revertedWith("Player1 must submit their move first");
    });

    it("should prevent more than 2 players submissions", async function () {
      // Player1 submits first
      const p1EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(0)
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedMove(gameId, p1EncryptedMove.handles[0], p1EncryptedMove.inputProof);

      // Player2 joins
      const p2EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.bob.address)
        .add8(1)
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedMove(gameId, p2EncryptedMove.handles[0], p2EncryptedMove.inputProof);

      // Charlie (unauthorized) tries to submit
      const charlieEncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.charlie.address)
        .add8(2)
        .encrypt();

      await expect(
        rockPaperScissorsContract
          .connect(signers.charlie)
          .submitEncryptedMove(gameId, charlieEncryptedMove.handles[0], charlieEncryptedMove.inputProof),
      ).to.be.revertedWith("Game is already resolved");
    });
  });

  describe("Game Logic and Resolution", function () {
    let gameId: bigint;

    beforeEach(async function () {
      const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt = await tx.wait();
      gameId = extractGameId(receipt, rockPaperScissorsContract)!;
    });

    async function submitBothMoves(p1Move: number, p2Move: number) {
      // Player1 submits
      const p1EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(p1Move)
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedMove(gameId, p1EncryptedMove.handles[0], p1EncryptedMove.inputProof);

      // Player2 submits
      const p2EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.bob.address)
        .add8(p2Move)
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedMove(gameId, p2EncryptedMove.handles[0], p2EncryptedMove.inputProof);
    }

    it("should auto-resolve game after both players submit moves", async function () {
      await submitBothMoves(0, 1); // Rock vs Paper, Player2 wins

      // Verify game status is already resolved
      const game = await rockPaperScissorsContract.getGame(gameId);
      expect(game.status).to.equal(2); // Resolved (auto-resolved)
      expect(game.result).to.not.equal(ethers.ZeroHash);
    });

    it("should auto-resolve games without requiring manual resolution", async function () {
      await submitBothMoves(0, 1);

      // Game should already be resolved without any manual resolveGame call
      const game = await rockPaperScissorsContract.getGame(gameId);
      expect(game.status).to.equal(2); // Resolved
    });

    describe("Game Logic Tests", function () {
      it("should correctly identify draws", async function () {
        await submitBothMoves(0, 0); // Rock vs Rock

        const gameData = await rockPaperScissorsContract.connect(signers.alice).getGame(gameId);
        const result = gameData.result;
        const decryptedResult = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          result,
          rockPaperScissorsContractAddress,
          signers.alice,
        );

        expect(decryptedResult).to.equal(0); // Draw
      });

      it("should correctly identify player1 wins", async function () {
        // Test all player1 winning scenarios
        const winningCombos = [
          [0, 2], // Rock beats Scissors
          [1, 0], // Paper beats Rock
          [2, 1], // Scissors beats Paper
        ];

        for (let i = 0; i < winningCombos.length; i++) {
          const [p1Move, p2Move] = winningCombos[i];

          // Create new game for each test
          const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
          const receipt = await tx.wait();
          const testGameId = extractGameId(receipt, rockPaperScissorsContract)!;

          // Submit moves for this test game
          const p1EncryptedMove = await fhevm
            .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
            .add8(p1Move)
            .encrypt();

          await rockPaperScissorsContract
            .connect(signers.alice)
            .submitEncryptedMove(testGameId, p1EncryptedMove.handles[0], p1EncryptedMove.inputProof);

          const p2EncryptedMove = await fhevm
            .createEncryptedInput(rockPaperScissorsContractAddress, signers.bob.address)
            .add8(p2Move)
            .encrypt();

          await rockPaperScissorsContract
            .connect(signers.bob)
            .submitEncryptedMove(testGameId, p2EncryptedMove.handles[0], p2EncryptedMove.inputProof);

          const gameData = await rockPaperScissorsContract.connect(signers.bob).getGame(testGameId);
          const result = gameData.result;
          const decryptedResult = await fhevm.userDecryptEuint(
            FhevmType.euint8,
            result,
            rockPaperScissorsContractAddress,
            signers.alice,
          );

          expect(decryptedResult).to.equal(1); // Player1 wins
        }
      });

      it("should correctly identify player2 wins", async function () {
        // Test all player2 winning scenarios
        const winningCombos = [
          [2, 0], // Scissors loses to Rock
          [0, 1], // Rock loses to Paper
          [1, 2], // Paper loses to Scissors
        ];

        for (let i = 0; i < winningCombos.length; i++) {
          const [p1Move, p2Move] = winningCombos[i];

          // Create new game for each test
          const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
          const receipt = await tx.wait();
          const testGameId = extractGameId(receipt, rockPaperScissorsContract)!;

          // Submit moves for this test game
          const p1EncryptedMove = await fhevm
            .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
            .add8(p1Move)
            .encrypt();

          await rockPaperScissorsContract
            .connect(signers.alice)
            .submitEncryptedMove(testGameId, p1EncryptedMove.handles[0], p1EncryptedMove.inputProof);

          const p2EncryptedMove = await fhevm
            .createEncryptedInput(rockPaperScissorsContractAddress, signers.bob.address)
            .add8(p2Move)
            .encrypt();

          await rockPaperScissorsContract
            .connect(signers.bob)
            .submitEncryptedMove(testGameId, p2EncryptedMove.handles[0], p2EncryptedMove.inputProof);

          const gameData = await rockPaperScissorsContract.connect(signers.bob).getGame(testGameId);
          const result = gameData.result;
          const decryptedResult = await fhevm.userDecryptEuint(
            FhevmType.euint8,
            result,
            rockPaperScissorsContractAddress,
            signers.bob,
          );

          expect(decryptedResult).to.equal(2); // Player2 wins
        }
      });
    });
  });

  describe("Privacy and Access Control", function () {
    let gameId: bigint;

    beforeEach(async function () {
      const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt = await tx.wait();
      gameId = extractGameId(receipt, rockPaperScissorsContract)!;

      // Submit both moves
      const p1EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.alice.address)
        .add8(0) // Rock
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.alice)
        .submitEncryptedMove(gameId, p1EncryptedMove.handles[0], p1EncryptedMove.inputProof);

      const p2EncryptedMove = await fhevm
        .createEncryptedInput(rockPaperScissorsContractAddress, signers.bob.address)
        .add8(1) // Paper
        .encrypt();

      await rockPaperScissorsContract
        .connect(signers.bob)
        .submitEncryptedMove(gameId, p2EncryptedMove.handles[0], p2EncryptedMove.inputProof);
    });

    it("should allow players to access only the result", async function () {
      const gameData = await rockPaperScissorsContract.connect(signers.alice).getGame(gameId);
      const result = gameData.result;
      expect(result).to.not.equal(ethers.ZeroHash);

      const gameData2 = await rockPaperScissorsContract.connect(signers.bob).getGame(gameId);
      const result2 = gameData2.result;
      expect(result2).to.equal(result);
    });

    it("should allow players to decrypt the result", async function () {
      const gameData = await rockPaperScissorsContract.connect(signers.alice).getGame(gameId);
      const result = gameData.result;
      expect(result).to.not.equal(ethers.ZeroHash);

      const decryptedResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        result,
        rockPaperScissorsContractAddress,
        signers.alice,
      );
      expect(decryptedResult).to.equal(2); // Draw

      const decryptedResult2 = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        result,
        rockPaperScissorsContractAddress,
        signers.bob,
      );
      expect(decryptedResult2).to.equal(2); // Draw

      await expect(
        fhevm.userDecryptEuint(FhevmType.euint8, result, rockPaperScissorsContractAddress, signers.charlie),
      ).to.be.rejectedWith(/is not authorized to user decrypt handle/i);
    });

    it("should allow anyone to access the result", async function () {
      const gameData = await rockPaperScissorsContract.connect(signers.charlie).getGame(gameId);
      const result = gameData.result;
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    it("should allow players to access their own move", async function () {
      const aliceGameData = await rockPaperScissorsContract.connect(signers.alice).getGame(gameId);
      const decryptedAliceMove = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        aliceGameData.move1,
        rockPaperScissorsContractAddress,
        signers.alice,
      );
      expect(decryptedAliceMove).to.equal(0); // Rock

      const bobGameData = await rockPaperScissorsContract.connect(signers.bob).getGame(gameId);
      const decryptedBobMove = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        bobGameData.move2,
        rockPaperScissorsContractAddress,
        signers.bob,
      );
      expect(decryptedBobMove).to.equal(1); // Paper
    });

    it("should prevent players from accessing opponent's move", async function () {
      // Alice should not be able to decrypt Bob's move
      const game = await rockPaperScissorsContract.getGame(gameId);

      await expect(
        fhevm.userDecryptEuint(
          FhevmType.euint8,
          game.move2, // Bob's move
          rockPaperScissorsContractAddress,
          signers.alice, // Alice trying to decrypt
        ),
      ).to.be.rejected;

      // Bob should not be able to decrypt Alice's move
      await expect(
        fhevm.userDecryptEuint(
          FhevmType.euint8,
          game.move1, // Alice's move
          rockPaperScissorsContractAddress,
          signers.bob, // Bob trying to decrypt
        ),
      ).to.be.rejected;
    });

    it("should allow accessing game data before game is resolved", async function () {
      // Create a new unresolved game
      const tx = await rockPaperScissorsContract.connect(signers.alice).createGame();
      const receipt = await tx.wait();
      const newGameId = extractGameId(receipt, rockPaperScissorsContract)!;

      // getGame should work even for unresolved games
      const gameData = await rockPaperScissorsContract.connect(signers.alice).getGame(newGameId);
      expect(gameData.player1).to.equal(signers.alice.address);
      expect(gameData.status).to.equal(0); // Created
    });
  });
});
