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
    sameChain,
    sameSigner,
    userAddress,
  } = parameters;

  const queryClient = useQueryClient();

  //////////////////////////////////////////////////////////////////////////////
  // States + Refs
  //////////////////////////////////////////////////////////////////////////////

  const rockPaperScissorsRef = useRef<RockPaperScissorsInfoType | undefined>(
    undefined
  );

  const [message, setMessage] = useState<string>("");

  //////////////////////////////////////////////////////////////////////////////
  // RockPaperScissors Contract
  //////////////////////////////////////////////////////////////////////////////

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
    console.log("============");
    console.log("got here 1");
    console.log("userAddress", userAddress);
    console.log("latestGame data", latestGame?.data);
    if (!userAddress || !latestGame?.data) {
      return "no_role";
    }

    console.log("got here 2");
    const { data: gameData } = latestGame;

    console.log("gameData.player1", gameData.player1);
    console.log("gameData.player2", gameData.player2);

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

    console.log("got here 3");
    return "no_role";
  }, [userAddress, latestGame]);

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

  // Create a combined loading state for all operations
  const isProcessing =
    createGameMutation.isPending || submitMoveMutation.isPending;

  return {
    // Contract info
    contractAddress: rockPaperScissors.address,
    isDeployed,

    // Game state
    latestGame,
    userGameRole,

    // Actions
    canCreateGame,
    createGame: createGameMutation.mutate,
    canSubmitMove,
    canJoinGame,
    submitEncryptedMove: submitMoveMutation.mutate,
    generateDecryptionSignature,

    // Status - unified loading states
    message,
    isCreatingGame: createGameMutation.isPending,
    isSubmittingMove: submitMoveMutation.isPending,
    isLoadingGames,
    isProcessing,

    // Error states
    createGameError: createGameMutation.error,
    submitMoveError: submitMoveMutation.error,
  };
};
