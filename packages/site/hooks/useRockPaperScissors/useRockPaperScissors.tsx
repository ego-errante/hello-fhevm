"use client";

import { ethers } from "ethers";
import { RefObject, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { RockPaperScissorsAddresses } from "@/abi/RockPaperScissorsAddresses";
import { RockPaperScissorsABI } from "@/abi/RockPaperScissorsABI";
import { type FhevmInstance, type GenericStringStorage } from "@fhevm/react";
import { useGameState } from "./useGameState";
import { useGameActions } from "./useGameActions";
import { useGameResults } from "./useGameResults";

//////////////////////////////////////////////////////////////////////////////
// Main orchestrating hook for the Rock Paper Scissors game that combines all
// game functionality into a unified interface. Handles contract interactions,
// FHE encryption/decryption, game state management, and provides methods for
// creating games, submitting moves, and viewing results.
//////////////////////////////////////////////////////////////////////////////
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
  // Event Listeners
  //////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    if (!ethersReadonlyProvider || !chainId) return;

    const contractAddress =
      RockPaperScissorsAddresses[
        String(chainId) as keyof typeof RockPaperScissorsAddresses
      ]?.address;
    if (!contractAddress) return;

    const contract = new ethers.Contract(
      contractAddress,
      RockPaperScissorsABI.abi,
      ethersReadonlyProvider
    );

    const invalidateQuery = () => {
      queryClient.invalidateQueries({
        queryKey: ["rock-paper-scissors", "latest-game"],
      });
    };

    contract.on("GameCreated", () => {
      console.log("GameCreated");
      invalidateQuery();
    });
    contract.on("MoveSubmitted", () => {
      console.log("MoveSubmitted");
      invalidateQuery();
    });
    contract.on("GameResolved", () => {
      console.log("GameResolved");
      invalidateQuery();
    });

    return () => {
      contract.off("GameCreated", invalidateQuery);
      contract.off("MoveSubmitted", invalidateQuery);
      contract.off("GameResolved", invalidateQuery);
    };
  }, [ethersReadonlyProvider, chainId, queryClient]);

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
    userGameRole: gameState.userGameRole,
    queryClient,
  });

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
    submitEncryptedMove: gameActions.submitMoveMutation.mutate,

    // Game results
    gameResult: gameResults.gameResult,
    myMove: gameResults.myMove,
    isViewingResults: gameResults.isViewingResults,
    viewResults: gameResults.fetchGameResults,
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
    viewResultsError: gameResults.error,
  };
};
