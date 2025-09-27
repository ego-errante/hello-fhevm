import { ethers } from "ethers";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type FhevmInstance } from "@fhevm/react";
import { GAME_ROLE, GAME_STATUS } from "@/lib/constants";
import { RockPaperScissorsInfoType, LatestGame, GameRole } from "@/lib/types";

//////////////////////////////////////////////////////////////////////////////
// Hook that handles all game actions and mutations for Rock Paper Scissors.
// Manages creating new games, encrypting and submitting moves using FHE,
// and provides loading states and error handling for game operations.
//////////////////////////////////////////////////////////////////////////////
export function useGameActions(parameters: {
  instance: FhevmInstance | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  rockPaperScissors: RockPaperScissorsInfoType;
  latestGame: LatestGame | null | undefined;
  userGameRole: GameRole;
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

      queryClient.resetQueries({
        queryKey: ["rock-paper-scissors", "game-results"],
      });

      setMessage("[FHE::Arena] Initializing encrypted battleground...");

      const contract = new ethers.Contract(
        rockPaperScissors.address,
        rockPaperScissors.abi,
        ethersSigner
      );

      const tx = await contract.createGame();

      setMessage(
        `{Chain::Referee} Sealing battleground on-chain: ${tx.hash}...`
      );

      const receipt = await tx.wait();

      setMessage(
        `{FHE::Arena} Battleground sealed (status ${receipt?.status})`
      );

      return receipt;
    },
    onSuccess: () => {
      // Invalidate and refetch the latest game query
      queryClient.invalidateQueries({
        queryKey: ["rock-paper-scissors", "latest-game"],
      });
    },
    onError: (error) => {
      setMessage("[Error::Arena] Setup failed - " + (error as Error).message);
    },
  });

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

    // Player1 can submit when game is Created
    if (
      userGameRole === GAME_ROLE.PLAYER1 &&
      gameStatus === GAME_STATUS.CREATED
    ) {
      return true;
    }

    // Player2 can submit when Player1 has submitted
    if (
      userGameRole === GAME_ROLE.NO_ROLE &&
      gameStatus === GAME_STATUS.PLAYER1_SUBMITTED
    ) {
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

      setMessage("[FHE::Vault] Wrapping your move in ciphertext...");

      const contract = new ethers.Contract(
        rockPaperScissors.address!,
        rockPaperScissors.abi,
        ethersSigner
      );

      const encryptedMove = await instance
        .createEncryptedInput(rockPaperScissors.address, ethersSigner.address)
        .add8(move)
        .encrypt();

      setMessage("{Arena::Gate} Dispatching encrypted throw into the arena...");

      const tx = await contract.submitEncryptedMove(
        latestGame.gameId,
        `0x${Buffer.from(encryptedMove.handles[0]).toString("hex")}`,
        `0x${Buffer.from(encryptedMove.inputProof).toString("hex")}`
      );

      setMessage(
        `{Chain::Referee} Recording encrypted throw on-chain: ${tx.hash}...`
      );

      const receipt = await tx.wait();

      setMessage(`{Scoreboard} Encrypted throw confirmed`);

      return receipt;
    },
    onSuccess: () => {
      // Invalidate and refetch the latest game query
      queryClient.invalidateQueries({
        queryKey: ["rock-paper-scissors", "latest-game"],
      });
    },
    onError: (error) => {
      setMessage(
        "[Error::Throw] Encrypted throw failed - " + (error as Error).message
      );
    },
  });

  // Create a combined loading state for all operations
  const isProcessing =
    createGameMutation.isPending || submitMoveMutation.isPending;

  return {
    message,
    canCreateGame,
    createGameMutation,
    canSubmitMove,
    submitMoveMutation,
    isProcessing,
  };
}
