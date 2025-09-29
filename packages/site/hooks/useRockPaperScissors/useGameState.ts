import { ethers } from "ethers";
import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { RockPaperScissorsAddresses } from "@/abi/RockPaperScissorsAddresses";
import { RockPaperScissorsABI } from "@/abi/RockPaperScissorsABI";
import { GAME_ROLE } from "@/lib/constants";
import { RockPaperScissorsInfoType, LatestGame, GameData } from "@/lib/types";

//////////////////////////////////////////////////////////////////////////////
// Hook that manages the current state of the Rock Paper Scissors game.
// Handles contract connection, automatically detects the latest active game,
// and determines the user's role (Player 1, Player 2, or spectator).
//////////////////////////////////////////////////////////////////////////////
export function useGameState(parameters: {
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
      console.log("latestGame queryFn");
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
          status: Number(gameDataResult[5]),
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
    retry: 3,
  });

  //////////////////////////////////////////////////////////////////////////////
  // Game State Determination
  //////////////////////////////////////////////////////////////////////////////

  const userGameRole = useMemo(() => {
    if (!userAddress || !latestGame?.data) {
      return GAME_ROLE.NO_ROLE;
    }

    const { data: gameData } = latestGame;

    const isPlayer1 =
      gameData.player1?.toLowerCase() === userAddress?.toLowerCase();
    const isPlayer2 =
      gameData.player2 &&
      gameData.player2?.toLowerCase() === userAddress?.toLowerCase();

    if (isPlayer1) {
      return GAME_ROLE.PLAYER1;
    }
    if (isPlayer2) {
      return GAME_ROLE.PLAYER2;
    }

    return GAME_ROLE.NO_ROLE;
  }, [userAddress, latestGame]);

  return {
    rockPaperScissors,
    isDeployed,
    latestGame,
    userGameRole,
    isLoadingGames,
  };
}

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
