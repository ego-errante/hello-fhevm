"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  status: bigint;
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

  //////////////////////////////////////////////////////////////////////////////
  // States + Refs
  //////////////////////////////////////////////////////////////////////////////

  const [isCreatingGame, setIsCreatingGame] = useState<boolean>(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [latestGameData, setLatestGameData] = useState<LatestGame | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);

  const rockPaperScissorsRef = useRef<RockPaperScissorsInfoType | undefined>(
    undefined
  );
  const isCreatingGameRef = useRef<boolean>(isCreatingGame);
  const isSubmittingMoveRef = useRef<boolean>(isSubmittingMove);
  const isLoadingGamesRef = useRef<boolean>(isLoadingGames);

  //////////////////////////////////////////////////////////////////////////////
  // RockPaperScissors Contract
  //////////////////////////////////////////////////////////////////////////////

  const rockPaperScissors = useMemo(() => {
    const c = getRockPaperScissorsByChainId(chainId);

    rockPaperScissorsRef.current = c;

    if (!c.address) {
      setMessage(
        `RockPaperScissors deployment not found for chainId=${chainId}.`
      );
    } else {
      setMessage("");
    }

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
  const updateLatestGameData = useCallback(
    (
      gameId: bigint | null,
      data: GameData | null,
      isLoading: boolean = false,
      thisChainId: number,
      thisRockPaperScissorsAddress: string
    ) => {
      if (
        sameChain.current(thisChainId) &&
        thisRockPaperScissorsAddress === rockPaperScissorsRef.current?.address
      ) {
        if (gameId && data) {
          setLatestGameData({ gameId, data, isLoading });
        } else {
          setLatestGameData(null);
        }
      }
    },
    [sameChain]
  );

  const refreshLatestGame = useCallback(() => {
    if (isLoadingGamesRef.current) {
      return;
    }

    if (
      !rockPaperScissorsRef.current ||
      !rockPaperScissorsRef.current?.chainId ||
      !rockPaperScissorsRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setLatestGameData(null);
      return;
    }

    isLoadingGamesRef.current = true;
    setIsLoadingGames(true);

    const thisChainId = rockPaperScissorsRef.current.chainId;
    const thisRockPaperScissorsAddress = rockPaperScissorsRef.current.address;

    const thisRockPaperScissorsContract = new ethers.Contract(
      thisRockPaperScissorsAddress,
      rockPaperScissorsRef.current.abi,
      ethersReadonlyProvider
    );

    // Get the most recent game using the public getter
    const checkGames = async () => {
      try {
        // Get the next game ID and check the latest game (nextGameId - 1)
        const nextGameId = await thisRockPaperScissorsContract.getNextGameId();
        const latestGameId = nextGameId - BigInt(1);

        if (latestGameId <= BigInt(0)) {
          // No games exist yet
          updateLatestGameData(
            null,
            null,
            false,
            thisChainId,
            thisRockPaperScissorsAddress
          );
          return;
        }

        const gameData = (await thisRockPaperScissorsContract.getGame(
          latestGameId
        )) as GameData;

        updateLatestGameData(
          latestGameId,
          gameData,
          false,
          thisChainId,
          thisRockPaperScissorsAddress
        );
      } catch (error) {
        setMessage("Failed to fetch latest game: " + (error as Error).message);
        updateLatestGameData(
          null,
          null,
          false,
          thisChainId,
          thisRockPaperScissorsAddress
        );
      } finally {
        isLoadingGamesRef.current = false;
        setIsLoadingGames(false);
      }
    };

    checkGames();
  }, [ethersReadonlyProvider, sameChain, updateLatestGameData]);

  // Auto refresh the latest game
  useEffect(() => {
    refreshLatestGame();
  }, [refreshLatestGame]);

  const latestGame = latestGameData;

  //////////////////////////////////////////////////////////////////////////////
  // Game State Determination
  //////////////////////////////////////////////////////////////////////////////

  const gameDisplayState = useMemo(() => {
    if (!userAddress || !latestGame) {
      return "no_game";
    }

    const { data: gameData } = latestGame;
    if (!gameData) {
      console.log("gameDisplayState: no_game (no gameData)");
      return "no_game";
    }

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

    return "no_game";
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
      !isCreatingGame &&
      Number(latestGame?.data?.result) !== 0
    );
  }, [
    rockPaperScissors.address,
    ethersSigner,
    isCreatingGame,
    gameDisplayState,
  ]);

  const createGame = useCallback(async () => {
    if (!canCreateGame || !ethersSigner) return;

    const thisChainId = chainId;
    const thisRockPaperScissorsAddress = rockPaperScissors.address!;
    const thisEthersSigner = ethersSigner;

    const thisRockPaperScissorsContract = new ethers.Contract(
      thisRockPaperScissorsAddress,
      rockPaperScissors.abi,
      thisEthersSigner
    );

    isCreatingGameRef.current = true;
    setIsCreatingGame(true);
    setMessage("Creating new game...");

    try {
      const isStale = () =>
        thisRockPaperScissorsAddress !==
          rockPaperScissorsRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      const tx: ethers.TransactionResponse =
        await thisRockPaperScissorsContract.createGame();

      setMessage(`Waiting for transaction: ${tx.hash}...`);

      const receipt = await tx.wait();

      setMessage(`Game created! Status: ${receipt?.status}`);

      if (!isStale()) {
        refreshLatestGame();
      }
    } catch (error) {
      setMessage("Failed to create game: " + (error as Error).message);
    } finally {
      isCreatingGameRef.current = false;
      setIsCreatingGame(false);
    }
  }, [
    canCreateGame,
    ethersSigner,
    rockPaperScissors.address,
    rockPaperScissors.abi,
    chainId,
    sameChain,
    sameSigner,
    refreshLatestGame,
  ]);

  const canSubmitMove = useMemo((): boolean => {
    return Boolean(
      rockPaperScissors.address &&
        instance &&
        ethersSigner &&
        !isSubmittingMove &&
        gameDisplayState === "player1" &&
        latestGame?.gameId
    );
  }, [
    rockPaperScissors.address,
    instance,
    ethersSigner,
    isSubmittingMove,
    gameDisplayState,
    latestGame?.gameId,
  ]);

  const submitEncryptedMove = useCallback(
    async (move: number) => {
      if (!canSubmitMove || !latestGame?.gameId || !instance || !ethersSigner)
        return;

      const thisChainId = chainId;
      const thisRockPaperScissorsAddress = rockPaperScissors.address!;
      const thisEthersSigner = ethersSigner;
      const thisGameId = latestGame.gameId;

      const thisRockPaperScissorsContract = new ethers.Contract(
        thisRockPaperScissorsAddress,
        rockPaperScissors.abi,
        thisEthersSigner
      );

      isSubmittingMoveRef.current = true;
      setIsSubmittingMove(true);
      setMessage("Encrypting your move...");

      try {
        const isStale = () =>
          thisRockPaperScissorsAddress !==
            rockPaperScissorsRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        console.log("move: ", move);
        const encryptedMove = await instance
          .createEncryptedInput(
            thisRockPaperScissorsAddress,
            thisEthersSigner.address
          )
          .add8(move)
          .encrypt();

        if (isStale()) {
          setMessage("Ignore submit move");
          return;
        }

        setMessage("Submitting encrypted move...");

        const tx: ethers.TransactionResponse =
          await thisRockPaperScissorsContract.submitEncryptedMove(
            thisGameId,
            `0x${Buffer.from(encryptedMove.handles[0]).toString("hex")}`,
            `0x${Buffer.from(encryptedMove.inputProof).toString("hex")}`
          );

        setMessage(`Waiting for transaction: ${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Move submitted! Status: ${receipt?.status}`);

        if (!isStale()) {
          refreshLatestGame();
        }
      } catch (error) {
        setMessage("Failed to submit move: " + (error as Error).message);
      } finally {
        isSubmittingMoveRef.current = false;
        setIsSubmittingMove(false);
      }
    },
    [
      canSubmitMove,
      latestGame?.gameId,
      instance,
      ethersSigner,
      rockPaperScissors.address,
      rockPaperScissors.abi,
      chainId,
      sameChain,
      sameSigner,
      refreshLatestGame,
    ]
  );

  //////////////////////////////////////////////////////////////////////////////
  // Status Updates
  //////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    isCreatingGameRef.current = isCreatingGame;
  }, [isCreatingGame]);

  useEffect(() => {
    isSubmittingMoveRef.current = isSubmittingMove;
  }, [isSubmittingMove]);

  useEffect(() => {
    isLoadingGamesRef.current = isLoadingGames;
  }, [isLoadingGames]);

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

  return {
    // Contract info
    contractAddress: rockPaperScissors.address,
    isDeployed,

    // Game state
    latestGame,
    gameDisplayState,

    // Actions
    canCreateGame,
    createGame,
    canSubmitMove,
    submitEncryptedMove,
    generateDecryptionSignature,

    // Status
    message,
    isCreatingGame,
    isSubmittingMove,
    isLoadingGames,
  };
};
