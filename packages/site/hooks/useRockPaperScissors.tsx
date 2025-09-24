"use client";

import { ethers } from "ethers";
import { RefObject, useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FhevmDecryptionSignature,
  type FhevmInstance,
  type GenericStringStorage,
} from "@fhevm/react";

/*
  The following two files are automatically generated when `npx hardhat deploy` is called
  The <root>/packages/<contracts package dir>/deployments directory is parsed to retrieve
  deployment information for RockPaperScissors.sol and the following files are generated:

  - <root>/packages/site/abi/RockPaperScissorsABI.ts
  - <root>/packages/site/abi/RockPaperScissorsAddresses.ts
*/
import { RockPaperScissorsAddresses } from "@/abi/RockPaperScissorsAddresses";
import { RockPaperScissorsABI } from "@/abi/RockPaperScissorsABI";

// Sub-hooks for better organization
function useGameState(parameters: {
  chainId: number | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  userAddress: `0x${string}` | undefined;
}) {
  const { chainId, ethersReadonlyProvider, userAddress } = parameters;

  //////////////////////////////////////////////////////////////////////////////
  // RockPaperScissors Contract
  //////////////////////////////////////////////////////////////////////////////

  const rockPaperScissorsRef = useRef<RockPaperScissorsInfoType | undefined>(
    undefined
  );

  const rockPaperScissors = useMemo(() => {
    const c = getRockPaperScissorsByChainId(chainId);

    rockPaperScissorsRef.current = c;

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!rockPaperScissors) {
      return undefined;
    }
    return (
      Boolean(rockPaperScissors.address) &&
      rockPaperScissors.address !== ethers.ZeroAddress
    );
  }, [rockPaperScissors]);

  //////////////////////////////////////////////////////////////////////////////
  // Game Detection Logic - Find the latest game
  //////////////////////////////////////////////////////////////////////////////

  const { data: latestGame, isLoading: isLoadingGames } = useQuery({
    queryKey: [
      "rock-paper-scissors",
      "latest-game",
      chainId,
      rockPaperScissors.address,
    ],
    queryFn: async (): Promise<LatestGame | null> => {
      if (
        !rockPaperScissorsRef.current ||
        !rockPaperScissorsRef.current?.chainId ||
        !rockPaperScissorsRef.current?.address ||
        !ethersReadonlyProvider
      ) {
        return null;
      }

      const thisRockPaperScissorsContract = new ethers.Contract(
        rockPaperScissorsRef.current.address,
        rockPaperScissorsRef.current.abi,
        ethersReadonlyProvider
      );

      try {
        // Get the next game ID and check the latest game (nextGameId - 1)
        const nextGameId = await thisRockPaperScissorsContract.getNextGameId();
        const latestGameId = nextGameId - BigInt(1);

        if (latestGameId <= BigInt(0)) {
          // No games exist yet
          return null;
        }

        const gameDataResult =
          await thisRockPaperScissorsContract.getGame(latestGameId);

        // Convert ethers.Result to a proper object to ensure consistency
        const gameData: GameData = {
          player1: gameDataResult[0] as `0x${string}`,
          player2: gameDataResult[1] as `0x${string}`,
          move1: gameDataResult[2] as string,
          move2: gameDataResult[3] as string,
          result: gameDataResult[4] as string,
          status: gameDataResult[5] as number,
          createdAt: gameDataResult[6] as bigint,
          resolvedAt: gameDataResult[7] as bigint,
        };

        return {
          gameId: latestGameId,
          data: gameData,
          isLoading: false,
        };
      } catch (error) {
        console.error("Failed to fetch latest game:", error);
        throw error;
      }
    },
    enabled: !!rockPaperScissors.address && !!ethersReadonlyProvider,
    refetchInterval: 3000, // Auto-refresh every 3 seconds
    retry: 3,
  });

  //////////////////////////////////////////////////////////////////////////////
  // Game State Determination
  //////////////////////////////////////////////////////////////////////////////

  const userGameRole = useMemo(() => {
    if (!userAddress || !latestGame?.data) {
      return "no_role";
    }

    const { data: gameData } = latestGame;

    const isPlayer1 =
      gameData.player1?.toLowerCase() === userAddress?.toLowerCase();
    const isPlayer2 =
      gameData.player2 &&
      gameData.player2?.toLowerCase() === userAddress?.toLowerCase();

    if (isPlayer1) {
      return "player1";
    }
    if (isPlayer2) {
      return "player2";
    }

    return "no_role";
  }, [userAddress, latestGame]);

  return {
    rockPaperScissors,
    isDeployed,
    latestGame,
    userGameRole,
    isLoadingGames,
  };
}

function useGameActions(parameters: {
  instance: FhevmInstance | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  rockPaperScissors: RockPaperScissorsInfoType;
  latestGame: LatestGame | null | undefined;
  userGameRole: string;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const {
    instance,
    ethersSigner,
    rockPaperScissors,
    latestGame,
    userGameRole,
    queryClient,
  } = parameters;

  const [message, setMessage] = useState<string>("");

  //////////////////////////////////////////////////////////////////////////////
  // Contract Interaction State
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // Game Actions
  //////////////////////////////////////////////////////////////////////////////

  const canCreateGame = useMemo(() => {
    return (
      rockPaperScissors.address &&
      ethersSigner &&
      Number(latestGame?.data?.result) !== 0
    );
  }, [rockPaperScissors.address, ethersSigner, latestGame?.data?.result]);

  const createGameMutation = useMutation({
    mutationFn: async () => {
      if (!rockPaperScissors.address || !ethersSigner) {
        throw new Error("Contract or signer not available");
      }

      if (!canCreateGame) {
        throw new Error("Cannot create game");
      }

      setMessage("Creating new game...");

      const contract = new ethers.Contract(
        rockPaperScissors.address,
        rockPaperScissors.abi,
        ethersSigner
      );

      const tx = await contract.createGame();

      setMessage(`Waiting for transaction: ${tx.hash}...`);

      const receipt = await tx.wait();

      setMessage(`Game created! Status: ${receipt?.status}`);

      return receipt;
    },
    onSuccess: () => {
      // Invalidate and refetch the latest game query
      queryClient.invalidateQueries({
        queryKey: ["rock-paper-scissors", "latest-game"],
      });
    },
    onError: (error) => {
      setMessage("Failed to create game: " + (error as Error).message);
    },
  });

  const canJoinGame = useMemo((): boolean => {
    if (
      !rockPaperScissors.address ||
      !latestGame?.data ||
      userGameRole !== "no_role"
    ) {
      return false;
    }

    const gameStatus = Number(latestGame.data.status);

    return (
      gameStatus === 1 &&
      latestGame.data.player2 === "0x0000000000000000000000000000000000000000"
    );
  }, [rockPaperScissors.address, latestGame?.data, userGameRole]);

  const canSubmitMove = useMemo((): boolean => {
    if (
      !rockPaperScissors.address ||
      !instance ||
      !ethersSigner ||
      !latestGame?.gameId ||
      !latestGame?.data
    ) {
      return false;
    }

    const gameStatus = Number(latestGame.data.status);

    // Player1 can submit when game is Created (status = 0)
    if (userGameRole === "player1" && gameStatus === 0) {
      return true;
    }

    // Player2 can submit when Player1 has submitted (status = 1)
    if (userGameRole === "no_role" && gameStatus === 1) {
      return true;
    }

    return false;
  }, [
    rockPaperScissors.address,
    instance,
    ethersSigner,
    userGameRole,
    latestGame?.gameId,
    latestGame?.data?.status,
  ]);

  const submitMoveMutation = useMutation({
    mutationFn: async (move: number) => {
      if (
        !rockPaperScissors.address ||
        !instance ||
        !ethersSigner ||
        !latestGame?.gameId
      ) {
        throw new Error("Prerequisites not met for submitting move");
      }

      if (!canSubmitMove) {
        throw new Error("Cannot submit move");
      }

      setMessage("Encrypting your move...");

      const contract = new ethers.Contract(
        rockPaperScissors.address!,
        rockPaperScissors.abi,
        ethersSigner
      );

      const encryptedMove = await instance
        .createEncryptedInput(rockPaperScissors.address, ethersSigner.address)
        .add8(move)
        .encrypt();

      setMessage("Submitting encrypted move...");

      const tx = await contract.submitEncryptedMove(
        latestGame.gameId,
        `0x${Buffer.from(encryptedMove.handles[0]).toString("hex")}`,
        `0x${Buffer.from(encryptedMove.inputProof).toString("hex")}`
      );

      setMessage(`Waiting for transaction: ${tx.hash}...`);

      const receipt = await tx.wait();

      setMessage(`Move submitted! Status: ${receipt?.status}`);

      return receipt;
    },
    onSuccess: () => {
      // Invalidate and refetch the latest game query
      queryClient.invalidateQueries({
        queryKey: ["rock-paper-scissors", "latest-game"],
      });
    },
    onError: (error) => {
      setMessage("Failed to submit move: " + (error as Error).message);
    },
  });

  // Create a combined loading state for all operations
  const isProcessing =
    createGameMutation.isPending || submitMoveMutation.isPending;

  return {
    message,
    canCreateGame,
    createGameMutation,
    canJoinGame,
    canSubmitMove,
    submitMoveMutation,
    isProcessing,
  };
}

function useGameResults(parameters: {
  instance: FhevmInstance | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  rockPaperScissors: RockPaperScissorsInfoType;
  latestGame: LatestGame | null | undefined;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const {
    instance,
    ethersSigner,
    fhevmDecryptionSignatureStorage,
    rockPaperScissors,
    latestGame,
    queryClient,
  } = parameters;

  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isViewingResults, setIsViewingResults] = useState(false);

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

  const viewResultsMutation = useMutation({
    mutationFn: async () => {
      if (
        !latestGame?.gameId ||
        !instance ||
        !rockPaperScissors.address ||
        !ethersSigner ||
        !fhevmDecryptionSignatureStorage
      ) {
        throw new Error("Prerequisites not met for viewing results");
      }

      setIsViewingResults(true);
      setGameResult(null);

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
        const decryptedResult = await instance.userDecrypt(
          [
            {
              handle: encryptedResult,
              contractAddress: rockPaperScissors.address,
            },
          ],
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

        const resultKey = Number(decryptedResult[encryptedResult]);
        const result = resultMap[resultKey] || "Unknown result";

        setGameResult(result);
        return result;
      } catch (error) {
        const errorMessage =
          "Failed to load results: " + (error as Error).message;
        setGameResult(errorMessage);
        throw error;
      } finally {
        setIsViewingResults(false);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch the latest game query to get updated state
      queryClient.invalidateQueries({
        queryKey: ["rock-paper-scissors", "latest-game"],
      });
    },
  });

  const canViewResults = useMemo(() => {
    if (
      !latestGame?.data ||
      !rockPaperScissors.address ||
      !instance ||
      !ethersSigner
    ) {
      return false;
    }

    const gameStatus = Number(latestGame.data.status);
    const userGameRole = (() => {
      if (!ethersSigner?.address) return "no_role";

      const isPlayer1 =
        latestGame.data.player1?.toLowerCase() ===
        ethersSigner.address?.toLowerCase();
      const isPlayer2 =
        latestGame.data.player2 &&
        latestGame.data.player2?.toLowerCase() ===
          ethersSigner.address?.toLowerCase();

      if (isPlayer1) return "player1";
      if (isPlayer2) return "player2";
      return "no_role";
    })();

    // Can view results when game is resolved (status = 2) or when you're a player and game is in progress
    return gameStatus === 2 || (userGameRole !== "no_role" && gameStatus >= 1);
  }, [latestGame?.data, rockPaperScissors.address, instance, ethersSigner]);

  return {
    gameResult,
    isViewingResults,
    viewResultsMutation,
    canViewResults,
    generateDecryptionSignature,
  };
}

export type GameData = {
  player1: `0x${string}`;
  player2: `0x${string}`;
  move1: string;
  move2: string;
  result: string;
  status: number;
  createdAt: bigint;
  resolvedAt: bigint;
};

export type LatestGame = {
  gameId: bigint;
  data: GameData | null;
  isLoading: boolean;
};

type RockPaperScissorsInfoType = {
  abi: typeof RockPaperScissorsABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

/**
 * Resolves RockPaperScissors contract metadata for the given EVM `chainId`.
 */
function getRockPaperScissorsByChainId(
  chainId: number | undefined
): RockPaperScissorsInfoType {
  if (!chainId) {
    return { abi: RockPaperScissorsABI.abi };
  }

  const entry =
    RockPaperScissorsAddresses[
      chainId.toString() as keyof typeof RockPaperScissorsAddresses
    ];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: RockPaperScissorsABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: RockPaperScissorsABI.abi,
  };
}

export const useRockPaperScissors = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
  userAddress: `0x${string}` | undefined;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    userAddress,
  } = parameters;

  const queryClient = useQueryClient();

  //////////////////////////////////////////////////////////////////////////////
  // Sub-hooks for organized logic
  //////////////////////////////////////////////////////////////////////////////

  const gameState = useGameState({
    chainId,
    ethersReadonlyProvider,
    userAddress,
  });

  const gameActions = useGameActions({
    instance,
    ethersSigner,
    rockPaperScissors: gameState.rockPaperScissors,
    latestGame: gameState.latestGame,
    userGameRole: gameState.userGameRole,
    queryClient,
  });

  const gameResults = useGameResults({
    instance,
    ethersSigner,
    fhevmDecryptionSignatureStorage,
    rockPaperScissors: gameState.rockPaperScissors,
    latestGame: gameState.latestGame,
    queryClient,
  });

  //////////////////////////////////////////////////////////////////////////////
  // Combined return interface
  //////////////////////////////////////////////////////////////////////////////

  return {
    // Contract info
    contractAddress: gameState.rockPaperScissors.address,
    isDeployed: gameState.isDeployed,

    // Game state
    latestGame: gameState.latestGame,
    userGameRole: gameState.userGameRole,

    // Game actions
    canCreateGame: gameActions.canCreateGame,
    createGame: gameActions.createGameMutation.mutate,
    canSubmitMove: gameActions.canSubmitMove,
    canJoinGame: gameActions.canJoinGame,
    submitEncryptedMove: gameActions.submitMoveMutation.mutate,

    // Game results
    gameResult: gameResults.gameResult,
    isViewingResults: gameResults.isViewingResults,
    canViewResults: gameResults.canViewResults,
    viewResults: gameResults.viewResultsMutation.mutate,
    generateDecryptionSignature: gameResults.generateDecryptionSignature,

    // Status - unified loading states
    message: gameActions.message,
    isCreatingGame: gameActions.createGameMutation.isPending,
    isSubmittingMove: gameActions.submitMoveMutation.isPending,
    isLoadingGames: gameState.isLoadingGames,
    isProcessing: gameActions.isProcessing,

    // Error states
    createGameError: gameActions.createGameMutation.error,
    submitMoveError: gameActions.submitMoveMutation.error,
    viewResultsError: gameResults.viewResultsMutation.error,
  };
};
