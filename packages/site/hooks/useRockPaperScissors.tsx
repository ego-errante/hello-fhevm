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
  player1Submitted: boolean;
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
  const [isJoiningGame, setIsJoiningGame] = useState<boolean>(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState<boolean>(false);
  const [isResolvingGame, setIsResolvingGame] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [latestGameData, setLatestGameData] = useState<LatestGame | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);

  const rockPaperScissorsRef = useRef<RockPaperScissorsInfoType | undefined>(
    undefined
  );
  const isCreatingGameRef = useRef<boolean>(isCreatingGame);
  const isJoiningGameRef = useRef<boolean>(isJoiningGame);
  const isSubmittingMoveRef = useRef<boolean>(isSubmittingMove);
  const isResolvingGameRef = useRef<boolean>(isResolvingGame);
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

  const refreshLatestGame = useCallback(() => {
    console.log("[useRockPaperScissors] call refreshLatestGame()");
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

    // Check games from ID 10 down to 1 to find the latest one
    const checkGames = async () => {
      try {
        for (let i = 10; i >= 1; i--) {
          const gameId = BigInt(i);
          try {
            const gameData = (await thisRockPaperScissorsContract.getGame(
              gameId
            )) as GameData;

            if (
              gameData &&
              gameData.player1 &&
              gameData.player1 !== ethers.ZeroAddress
            ) {
              if (
                sameChain.current(thisChainId) &&
                thisRockPaperScissorsAddress ===
                  rockPaperScissorsRef.current?.address
              ) {
                setLatestGameData({
                  gameId,
                  data: gameData,
                  isLoading: false,
                });
              }
              return;
            }
          } catch (error) {
            // Game doesn't exist, continue to next
            continue;
          }
        }

        // No games found
        if (
          sameChain.current(thisChainId) &&
          thisRockPaperScissorsAddress === rockPaperScissorsRef.current?.address
        ) {
          setLatestGameData(null);
        }
      } catch (error) {
        setMessage("Failed to fetch games: " + (error as Error).message);
        if (
          sameChain.current(thisChainId) &&
          thisRockPaperScissorsAddress === rockPaperScissorsRef.current?.address
        ) {
          setLatestGameData(null);
        }
      } finally {
        isLoadingGamesRef.current = false;
        setIsLoadingGames(false);
      }
    };

    checkGames();
  }, [ethersReadonlyProvider, sameChain]);

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
    const canJoin =
      gameData.status === BigInt(0) &&
      (!gameData.player2 || gameData.player2 === ethers.ZeroAddress);

    if (isPlayer1) {
      return "player1";
    }
    if (isPlayer2) {
      return "player2";
    }
    if (canJoin) {
      return "can_join";
    }

    return "no_game";
  }, [userAddress, latestGame]);

  // console.log("[useRockPaperScissors] ======");
  // console.log("[useRockPaperScissors] gameDisplayState", gameDisplayState);

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

  const canJoinGame = useMemo((): boolean => {
    return Boolean(
      rockPaperScissors.address &&
        ethersSigner &&
        !isJoiningGame &&
        gameDisplayState === "can_join" &&
        latestGame?.gameId
    );
  }, [
    rockPaperScissors.address,
    ethersSigner,
    isJoiningGame,
    gameDisplayState,
    latestGame?.gameId,
  ]);

  const joinGame = useCallback(async () => {
    if (!canJoinGame || !latestGame?.gameId || !instance || !ethersSigner)
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

    isJoiningGameRef.current = true;
    setIsJoiningGame(true);
    setMessage("Joining game and encrypting your move...");

    try {
      const isStale = () =>
        thisRockPaperScissorsAddress !==
          rockPaperScissorsRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      // For joining a game, we need to submit a move immediately
      // Use move 0 (Rock) as default when joining
      const encryptedMove = await instance
        .createEncryptedInput(
          thisRockPaperScissorsAddress,
          thisEthersSigner.address
        )
        .add8(0) // Default move when joining
        .encrypt();

      if (isStale()) {
        setMessage("Ignore join game");
        return;
      }

      setMessage("Submitting join and move...");

      const tx: ethers.TransactionResponse =
        await thisRockPaperScissorsContract.submitEncryptedMove(
          thisGameId,
          `0x${Buffer.from(encryptedMove.handles[0]).toString("hex")}`,
          `0x${Buffer.from(encryptedMove.inputProof).toString("hex")}`
        );

      setMessage(`Waiting for transaction: ${tx.hash}...`);

      const receipt = await tx.wait();

      setMessage(`Joined game! Status: ${receipt?.status}`);

      if (!isStale()) {
        refreshLatestGame();
      }
    } catch (error) {
      setMessage("Failed to join game: " + (error as Error).message);
    } finally {
      isJoiningGameRef.current = false;
      setIsJoiningGame(false);
    }
  }, [
    canJoinGame,
    rockPaperScissors.address,
    rockPaperScissors.abi,
    latestGame?.gameId,
    instance,
    ethersSigner,
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
        (gameDisplayState === "player1" || gameDisplayState === "can_join") &&
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

  const canResolveGame = useMemo(() => {
    return (
      rockPaperScissors.address &&
      ethersSigner &&
      !isResolvingGame &&
      gameDisplayState === "player1" &&
      latestGame?.data &&
      latestGame.data.status === BigInt(1) // Moves submitted
    );
  }, [
    rockPaperScissors.address,
    ethersSigner,
    isResolvingGame,
    gameDisplayState,
    latestGame,
  ]);

  const resolveGame = useCallback(async () => {
    if (!canResolveGame || !latestGame?.gameId || !ethersSigner) return;

    const thisChainId = chainId;
    const thisRockPaperScissorsAddress = rockPaperScissors.address!;
    const thisEthersSigner = ethersSigner;
    const thisGameId = latestGame.gameId;

    const thisRockPaperScissorsContract = new ethers.Contract(
      thisRockPaperScissorsAddress,
      rockPaperScissors.abi,
      thisEthersSigner
    );

    isResolvingGameRef.current = true;
    setIsResolvingGame(true);
    setMessage("Resolving game...");

    try {
      const isStale = () =>
        thisRockPaperScissorsAddress !==
          rockPaperScissorsRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      const tx: ethers.TransactionResponse =
        await thisRockPaperScissorsContract.resolveGame(thisGameId);

      setMessage(`Waiting for transaction: ${tx.hash}...`);

      const receipt = await tx.wait();

      setMessage(`Game resolved! Status: ${receipt?.status}`);

      if (!isStale()) {
        refreshLatestGame();
      }
    } catch (error) {
      setMessage("Failed to resolve game: " + (error as Error).message);
    } finally {
      isResolvingGameRef.current = false;
      setIsResolvingGame(false);
    }
  }, [
    canResolveGame,
    rockPaperScissors.address,
    rockPaperScissors.abi,
    latestGame?.gameId,
    ethersSigner,
    chainId,
    sameChain,
    sameSigner,
    refreshLatestGame,
  ]);

  //////////////////////////////////////////////////////////////////////////////
  // Status Updates
  //////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    isCreatingGameRef.current = isCreatingGame;
  }, [isCreatingGame]);

  useEffect(() => {
    isJoiningGameRef.current = isJoiningGame;
  }, [isJoiningGame]);

  useEffect(() => {
    isSubmittingMoveRef.current = isSubmittingMove;
  }, [isSubmittingMove]);

  useEffect(() => {
    isResolvingGameRef.current = isResolvingGame;
  }, [isResolvingGame]);

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
    canJoinGame,
    joinGame,
    canSubmitMove,
    submitEncryptedMove,
    canResolveGame,
    resolveGame,
    generateDecryptionSignature,

    // Status
    message,
    isCreatingGame,
    isJoiningGame,
    isSubmittingMove,
    isResolvingGame,
    isLoadingGames,
  };
};
