import { ethers } from "ethers";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FhevmDecryptionSignature,
  type FhevmInstance,
  type GenericStringStorage,
} from "@fhevm/react";

import { GAME_ROLE } from "@/lib/constants";
import { RockPaperScissorsInfoType, LatestGame, GameRole } from "@/lib/types";

//////////////////////////////////////////////////////////////////////////////
// Hook that manages viewing and decrypting game results using FHEVM.
// Handles decryption signature generation, fetches encrypted game outcomes,
// decrypts results and player moves, and converts them to human-readable format.
//////////////////////////////////////////////////////////////////////////////
export function useGameResults(parameters: {
  instance: FhevmInstance | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  rockPaperScissors: RockPaperScissorsInfoType;
  latestGame: LatestGame | null | undefined;
  userGameRole: GameRole;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const {
    instance,
    ethersSigner,
    fhevmDecryptionSignatureStorage,
    rockPaperScissors,
    latestGame,
    userGameRole,
    queryClient,
  } = parameters;

  // Generate decryption signature when needed (called from component)
  const generateDecryptionSignature = useCallback(async () => {
    if (
      !instance ||
      !ethersSigner ||
      !rockPaperScissors.address ||
      !fhevmDecryptionSignatureStorage
    ) {
      return;
    }

    try {
      // Try to load existing signature first
      const existingSignature =
        await FhevmDecryptionSignature.loadFromGenericStringStorage(
          fhevmDecryptionSignatureStorage,
          instance,
          [rockPaperScissors.address],
          ethersSigner.address
        );

      if (!existingSignature) {
        // Generate new signature if none exists
        await FhevmDecryptionSignature.loadOrSign(
          instance,
          [rockPaperScissors.address],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );
        console.log("Generated new decryption signature");
      } else {
        console.log("Using existing decryption signature");
      }
    } catch (error) {
      console.error("Failed to generate/load decryption signature:", error);
    }
  }, [
    instance,
    ethersSigner,
    rockPaperScissors.address,
    fhevmDecryptionSignatureStorage,
  ]);

  const gameResultsQuery = useQuery({
    queryKey: [
      "rock-paper-scissors",
      "game-results",
      latestGame?.gameId.toString(),
      userGameRole,
    ],
    queryFn: async () => {
      if (
        !latestGame?.gameId ||
        !instance ||
        !rockPaperScissors.address ||
        !ethersSigner ||
        !fhevmDecryptionSignatureStorage
      ) {
        throw new Error("Prerequisites not met for viewing results");
      }

      try {
        const gameId = latestGame.gameId;

        // Use ethers.js to call the contract's getGame function
        const contract = new ethers.Contract(
          rockPaperScissors.address,
          rockPaperScissors.abi,
          ethersSigner
        );

        const gameData = await contract.getGame(gameId);
        const encryptedResult = gameData.result;
        const encryptedMove1 = gameData.move1;
        const encryptedMove2 = gameData.move2;

        // Generate/ensure decryption signature exists (only when viewing results)
        await generateDecryptionSignature();

        // Load decryption signature from storage
        const decryptionSignature =
          await FhevmDecryptionSignature.loadFromGenericStringStorage(
            fhevmDecryptionSignatureStorage,
            instance,
            [rockPaperScissors.address],
            ethersSigner.address
          );

        if (!decryptionSignature) {
          throw new Error(
            "No decryption signature found. Please generate one first."
          );
        }

        // Decrypt the result using FHEVM with the loaded signature
        const handlesToDecrypt = [
          {
            handle: encryptedResult,
            contractAddress: rockPaperScissors.address,
          },
        ];

        if (userGameRole === GAME_ROLE.PLAYER1) {
          handlesToDecrypt.push({
            handle: encryptedMove1,
            contractAddress: rockPaperScissors.address,
          });
        } else if (userGameRole === GAME_ROLE.PLAYER2) {
          handlesToDecrypt.push({
            handle: encryptedMove2,
            contractAddress: rockPaperScissors.address,
          });
        }

        const decryptedValues = await instance.userDecrypt(
          handlesToDecrypt,
          decryptionSignature.privateKey,
          decryptionSignature.publicKey,
          decryptionSignature.signature,
          decryptionSignature.contractAddresses,
          decryptionSignature.userAddress,
          decryptionSignature.startTimestamp,
          decryptionSignature.durationDays
        );

        // Convert to human-readable format
        const resultMap: { [key: number]: string } = {
          0: "Draw!",
          1: "Player 1 Wins!",
          2: "Player 2 Wins!",
        };

        const resultKey = Number(decryptedValues[encryptedResult]);
        const result = resultMap[resultKey] || "Unknown result";

        const moveMap: { [key: number]: string } = {
          0: "Rock",
          1: "Paper",
          2: "Scissors",
        };

        let myMove: string | null = null;
        if (userGameRole === GAME_ROLE.PLAYER1) {
          const moveKey = Number(decryptedValues[encryptedMove1]);
          myMove = moveMap[moveKey] || "Unknown move";
        } else if (userGameRole === GAME_ROLE.PLAYER2) {
          const moveKey = Number(decryptedValues[encryptedMove2]);
          myMove = moveMap[moveKey] || "Unknown move";
        }

        return { result, myMove };
      } catch (error) {
        const errorMessage =
          "Failed to load results: " + (error as Error).message;
        throw new Error(errorMessage);
      }
    },
    enabled: false,
  });

  return {
    gameResult: gameResultsQuery.data?.result ?? null,
    myMove: gameResultsQuery.data?.myMove ?? null,
    isViewingResults: gameResultsQuery.isLoading,
    fetchGameResults: gameResultsQuery.refetch,
    error: gameResultsQuery.error,
    generateDecryptionSignature,
  };
}
