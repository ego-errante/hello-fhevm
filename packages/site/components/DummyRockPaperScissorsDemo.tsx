"use client";

import { ethers } from "ethers";
import { useState } from "react";
import {
  FaHandRock,
  FaHandPaper,
  FaHandScissors,
  FaRegHandScissors,
  FaRegHandPaper,
  FaRegHandRock,
} from "react-icons/fa";

// Mock Types
interface MockFhevmInstance {
  userDecrypt: (
    handles: any[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number
  ) => Promise<any>;
}

interface MockDecryptionSignature {
  privateKey: string;
  publicKey: string;
  signature: string;
  contractAddresses: string[];
  userAddress: string;
  startTimestamp: number;
  durationDays: number;
}

interface MockGenericStringStorage {
  setItem: (key: string, value: string) => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
}

// Mock useInMemoryStorage
const useInMemoryStorage = () => {
  const [storage] = useState<Map<string, string>>(new Map());

  const mockStorage: MockGenericStringStorage = {
    setItem: (key: string, value: string) => storage.set(key, value),
    getItem: (key: string) => storage.get(key) || null,
    removeItem: (key: string) => storage.delete(key),
  };

  return { storage: mockStorage };
};

// Mock useMetaMaskEthersSigner
const useMetaMaskEthersSigner = (
  currentPlayer: "player1" | "player2" = "player1"
) => {
  const [isConnected, setIsConnected] = useState(true);

  const playerAddresses = {
    player1: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    player2: "0x9876543210987654321098765432109876543210",
  };

  const currentAddress = playerAddresses[currentPlayer];

  const mockProvider = {
    request: async (args: any) => {
      if (args.method === "eth_accounts") {
        return [currentAddress];
      }
      return null;
    },
  };

  const mockSigner = {
    address: currentAddress,
    getAddress: () => Promise.resolve(currentAddress),
  } as any;

  return {
    provider: mockProvider,
    chainId: 31337, // Hardhat network
    accounts: [currentAddress],
    isConnected,
    connect: () => setIsConnected(true),
    ethersSigner: mockSigner,
    ethersReadonlyProvider: mockProvider as any,
    sameChain: { current: () => true },
    sameSigner: { current: () => true },
  };
};

// Mock useFhevm
const useFhevm = (params: any) => {
  const mockInstance: MockFhevmInstance = {
    userDecrypt: async (
      handles: any[],
      privateKey: string,
      publicKey: string,
      signature: string,
      contractAddresses: string[],
      userAddress: string,
      startTimestamp: number,
      durationDays: number
    ) => {
      // Simulate decryption delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return mock decrypted results based on the encrypted handle
      const handle = handles[0].handle;
      if (handle === "mock_draw") return [0];
      if (handle === "mock_player1_win") return [1];
      if (handle === "mock_player2_win") return [2];
      return [0]; // Default to draw
    },
  };

  return {
    instance: mockInstance,
    status: "ready" as const,
    error: null,
  };
};

// Mock FhevmDecryptionSignature
const FhevmDecryptionSignature = {
  loadFromGenericStringStorage: async (
    storage: MockGenericStringStorage,
    instance: MockFhevmInstance,
    contractAddresses: string[],
    userAddress: string
  ): Promise<MockDecryptionSignature | null> => {
    // Check if we have a stored signature
    const key = `decryption_sig_${userAddress}`;
    const stored = storage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }

    return null;
  },

  generate: async (
    instance: MockFhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    durationDays: number = 30
  ): Promise<MockDecryptionSignature> => {
    // Generate mock signature
    const signature: MockDecryptionSignature = {
      privateKey: "mock_private_key_" + Math.random().toString(36).substr(2, 9),
      publicKey: "mock_public_key_" + Math.random().toString(36).substr(2, 9),
      signature: "mock_signature_" + Math.random().toString(36).substr(2, 9),
      contractAddresses,
      userAddress,
      startTimestamp: Date.now(),
      durationDays,
    };

    return signature;
  },
};

// Mock useRockPaperScissors
const useRockPaperScissors = (params: any) => {
  const [gameState, setGameState] = useState<
    "no_game" | "waiting_player2" | "waiting_moves" | "resolved"
  >("no_game");
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [message, setMessage] = useState("");
  const [latestGameId, setLatestGameId] = useState<bigint | null>(null);
  const [userRole, setUserRole] = useState<"player1" | "player2" | "none">(
    "none"
  );

  const userAddress = params.userAddress;
  const mockContractAddress = "0x1234567890123456789012345678901234567890";

  // Mock game data
  const getMockGameData = () => {
    if (gameState === "no_game") return null;

    const baseData = {
      player1: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as `0x${string}`,
      player2:
        gameState === "waiting_player2"
          ? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
          : ("0x9876543210987654321098765432109876543210" as `0x${string}`),
      move1: gameState === "resolved" ? "encrypted_move_1" : "",
      move2: gameState === "resolved" ? "encrypted_move_2" : "",
      result: gameState === "resolved" ? "mock_draw" : "",
      status: BigInt(
        gameState === "waiting_player2"
          ? 1
          : gameState === "waiting_moves"
            ? 0
            : 2
      ),
      createdAt: Date.now() / 1000,
      resolvedAt:
        gameState === "resolved" ? BigInt(Date.now() / 1000) : BigInt(0),
    };

    return baseData;
  };

  const createGame = async () => {
    setIsCreatingGame(true);
    setMessage("Creating game...");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLatestGameId(BigInt(Math.floor(Math.random() * 1000)));
    setGameState("waiting_player2");
    setUserRole("player1");
    setIsCreatingGame(false);
    setMessage("Game created! Waiting for another player to join.");
  };

  const submitEncryptedMove = async (move: number) => {
    setIsSubmittingMove(true);
    setMessage("Submitting encrypted move...");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (gameState === "waiting_player2") {
      // Joining game
      setGameState("waiting_moves");
      setUserRole("player2");
      setMessage("Joined game! Waiting for both players to submit moves.");
    } else if (gameState === "waiting_moves") {
      // Submitting move in active game
      setGameState("resolved");
      setMessage("Move submitted! Game resolved.");
    }

    setIsSubmittingMove(false);
  };

  const generateDecryptionSignature = async () => {
    setMessage("Generating decryption signature...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    setMessage("Decryption signature generated successfully.");
  };

  const latestGame = {
    gameId: latestGameId,
    data: getMockGameData(),
    isLoading: false,
  };

  const gameDisplayState =
    gameState === "no_game"
      ? "No Game"
      : gameState === "waiting_player2"
        ? "Waiting for Player 2"
        : gameState === "waiting_moves"
          ? "Waiting for Moves"
          : "Game Resolved";

  const canCreateGame = gameState === "no_game" && !isCreatingGame;
  const canSubmitMove =
    (gameState === "waiting_moves" && userRole === "player1") ||
    (gameState === "waiting_player2" && userRole === "none");

  return {
    contractAddress: mockContractAddress,
    isDeployed: true,
    latestGame,
    gameDisplayState,
    canCreateGame,
    createGame,
    canSubmitMove,
    submitEncryptedMove,
    generateDecryptionSignature,
    message,
    isCreatingGame,
    isSubmittingMove,
    isLoadingGames: false,
  };
};

// Mock RockPaperScissorsABI
const RockPaperScissorsABI = {
  abi: [], // Mock ABI
};

// Helper Components (copied from original)
function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <p className="text-black">
      {name}:{" "}
      <span className="font-mono font-semibold text-black">{displayValue}</span>
    </p>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  if (value) {
    return (
      <p className="text-black">
        {name}:{" "}
        <span className="font-mono font-semibold text-green-500">true</span>
      </p>
    );
  }

  return (
    <p className="text-black">
      {name}:{" "}
      <span className="font-mono font-semibold text-red-500">false</span>
    </p>
  );
}

function ChainInfoSection({
  chainId,
  accounts,
  ethersSigner,
  contractAddress,
  isDeployed,
}: {
  chainId: number | undefined;
  accounts: string[] | undefined;
  ethersSigner: ethers.Signer | undefined;
  contractAddress: string | undefined;
  isDeployed: boolean | undefined;
}) {
  return (
    <div className="col-span-full mx-20 mt-4 px-5 pb-4 rounded-lg bg-white border-2 border-black">
      <p className="font-semibold text-black text-lg mt-4">Chain Infos</p>
      {printProperty("ChainId", chainId)}
      {printProperty(
        "Metamask accounts",
        accounts
          ? accounts.length === 0
            ? "No accounts"
            : `{ length: ${accounts.length}, [${accounts[0]}, ...] }`
          : "undefined"
      )}
      {printProperty(
        "Signer",
        ethersSigner
          ? (ethersSigner as any).address || "Signer available"
          : "No signer"
      )}

      <p className="font-semibold text-black text-lg mt-4">Contract</p>
      {printProperty("RockPaperScissors", contractAddress)}
      {printProperty("isDeployed", isDeployed)}
    </div>
  );
}

function FhevmInstanceSection({
  fhevmInstance,
  fhevmStatus,
  fhevmError,
}: {
  fhevmInstance: any;
  fhevmStatus: string;
  fhevmError: Error | null;
}) {
  return (
    <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
      <p className="font-semibold text-black text-lg mt-4">FHEVM instance</p>
      {printProperty("Fhevm Instance", fhevmInstance ? "OK" : "undefined")}
      {printProperty("Fhevm Status", fhevmStatus)}
      {printProperty("Fhevm Error", fhevmError ?? "No Error")}
    </div>
  );
}

function GameStatusSection({
  gameDisplayState,
  latestGameId,
  isCreatingGame,
  isSubmittingMove,
}: {
  gameDisplayState: string;
  latestGameId: string | undefined;
  isCreatingGame: boolean;
  isSubmittingMove: boolean;
}) {
  return (
    <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
      <p className="font-semibold text-black text-lg mt-4">Game Status</p>
      {printProperty("Game Display State", gameDisplayState)}
      {printProperty("Latest Game ID", latestGameId)}
      {printProperty("Is Creating Game", isCreatingGame)}
      {printProperty("Is Submitting Move", isSubmittingMove)}
    </div>
  );
}

function RoleIndicator({
  gameData,
  userAddress,
}: {
  gameData: any;
  userAddress: `0x${string}` | undefined;
}) {
  const isPlayer1 = gameData?.player1 === userAddress;
  const isPlayer2 = gameData?.player2 === userAddress;
  const canJoin =
    gameData &&
    gameData.status === BigInt(1) &&
    gameData.player2 === "0x0000000000000000000000000000000000000000";

  if (isPlayer1) {
    return (
      <div className="text-sm">
        <span className="font-medium">Your Role:</span> Player 1
      </div>
    );
  }

  if (isPlayer2) {
    return (
      <div className="text-sm">
        <span className="font-medium">Your Role:</span> Player 2
      </div>
    );
  }

  if (canJoin) {
    return (
      <div className="text-sm">
        <span className="font-medium">Available to join</span>
      </div>
    );
  }

  return null; // No role indicator for "no game" state
}

function OpponentInfo({
  gameData,
  userAddress,
}: {
  gameData: any;
  userAddress: `0x${string}` | undefined;
}) {
  const isPlayer1 = gameData?.player1 === userAddress;
  const isPlayer2 = gameData?.player2 === userAddress;

  if (!gameData) return null;

  if (isPlayer1) {
    const hasOpponent =
      gameData.player2 &&
      gameData.player2 !== "0x0000000000000000000000000000000000000000";
    return (
      <div className="text-sm">
        <span className="font-medium">Opponent:</span>
        <p className="text-xs font-mono break-all mt-1">
          {hasOpponent ? gameData.player2 : "Waiting for opponent"}
        </p>
      </div>
    );
  }

  if (isPlayer2) {
    return (
      <div className="text-sm">
        <span className="font-medium">Opponent:</span>
        <p className="text-xs font-mono break-all mt-1">{gameData.player1}</p>
      </div>
    );
  }

  // Can join view - show creator
  return (
    <div className="text-sm">
      <span className="font-medium">Created by:</span>
      <p className="text-xs font-mono break-all mt-1">{gameData.player1}</p>
    </div>
  );
}

function StatusIndicator({
  gameData,
  userAddress,
}: {
  gameData: any;
  userAddress: `0x${string}` | undefined;
}) {
  if (!gameData) {
    return (
      <div className="text-sm text-gray-600">No active games available</div>
    );
  }

  const isPlayer1 = gameData.player1 === userAddress;
  const isPlayer2 = gameData.player2 === userAddress;

  if (gameData.status === BigInt(0)) {
    return (
      <div className="text-sm">
        <span className="font-medium">Status:</span>
        <p className="text-xs mt-1">
          {isPlayer1 ? "Submit your move" : "Waiting for Player 1's move"}
        </p>
      </div>
    );
  }

  if (gameData.status === BigInt(1)) {
    if (isPlayer2) {
      return (
        <div className="text-sm">
          <span className="font-medium">Status:</span>
          <p className="text-xs mt-1">Move submitted - waiting for results</p>
        </div>
      );
    }
    return (
      <div className="text-sm">
        <span className="font-medium">Status:</span>
        <p className="text-xs mt-1">Waiting for Player 2</p>
      </div>
    );
  }

  if (gameData.status === BigInt(2)) {
    return (
      <div className="text-sm">
        <span className="font-medium">Status:</span>
        <p className="text-xs mt-1">Game resolved</p>
      </div>
    );
  }

  // Fallback for no game state
  return <div className="text-sm">Create a new game to start playing</div>;
}

function ActionButtons({
  gameData,
  userAddress,
  onCreateGame,
  onSubmitMove,
  canCreateGame,
  canSubmitMove,
  onViewResults,
  isViewingResults,
  setModalMode,
  setShowMoveSelector,
  isSubmittingMove,
}: {
  gameData: any;
  userAddress: `0x${string}` | undefined;
  onCreateGame: () => void;
  onSubmitMove: () => void;
  canCreateGame: boolean;
  canSubmitMove: boolean;
  onViewResults: () => void;
  isViewingResults: boolean;
  setModalMode: (mode: "join" | "submit") => void;
  setShowMoveSelector: (show: boolean) => void;
  isSubmittingMove: boolean;
}) {
  if (isSubmittingMove) {
    return (
      <div className="pt-2 space-y-2">
        <div className="text-center text-gray-500 text-sm">
          Submitting move...
        </div>
      </div>
    );
  }

  const isPlayer1 = gameData?.player1 === userAddress;
  const isPlayer2 = gameData?.player2 === userAddress;
  const canJoin =
    gameData?.status === BigInt(1) &&
    gameData?.player2 === "0x0000000000000000000000000000000000000000" &&
    !isPlayer1;

  if (canJoin) {
    // Can join existing game
    return (
      <div className="pt-2">
        <button
          onClick={() => {
            setModalMode("join");
            setShowMoveSelector(true);
          }}
          className="w-full bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700"
        >
          Join This Game
        </button>
      </div>
    );
  }

  if (isPlayer2) {
    // Player 2 - always show view results and new game buttons
    return (
      <div className="pt-2 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onViewResults}
            disabled={isViewingResults}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
          >
            {isViewingResults ? "Decrypting..." : "View Results"}
          </button>
          <button
            onClick={onCreateGame}
            disabled={!canCreateGame}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400"
          >
            New Game
          </button>
        </div>
      </div>
    );
  }

  // Player 1 logic based on status
  if (gameData?.status === BigInt(0)) {
    // Waiting for moves - show submit move
    return (
      <div className="pt-2 space-y-2">
        <button
          onClick={onSubmitMove}
          disabled={!canSubmitMove}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
        >
          Submit Your Move
        </button>
      </div>
    );
  }

  if (gameData?.status === BigInt(1)) {
    // Waiting for Player 2 - show waiting status
    return (
      <div className="pt-2 space-y-2">
        <div className="text-center text-gray-500 text-sm">
          Waiting for Player 2 to join...
        </div>
      </div>
    );
  }

  if (gameData?.status === BigInt(2)) {
    // Game resolved - show view results and new game
    return (
      <div className="pt-2 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onViewResults}
            disabled={isViewingResults}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
          >
            {isViewingResults ? "Decrypting..." : "View Results"}
          </button>
          <button
            onClick={onCreateGame}
            disabled={!canCreateGame}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400"
          >
            New Game
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="pt-2">
      <button
        onClick={onCreateGame}
        disabled={!canCreateGame}
        className="w-full bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:bg-primary/90 disabled:bg-gray-400"
      >
        Start New Game
      </button>
    </div>
  );
}

function GameResult({ gameResult }: { gameResult: string | null }) {
  if (!gameResult) return null;

  return (
    <div className="w-full bg-green-100 border border-green-300 rounded p-3 text-center">
      <p className="text-green-800 font-semibold text-lg">{gameResult}</p>
    </div>
  );
}

function GameStatusBox({
  gameData,
  gameId,
  userAddress,
  onCreateGame,
  onSubmitMove,
  canCreateGame,
  canSubmitMove,
  gameResult,
  isViewingResults,
  onViewResults,
  setModalMode,
  setShowMoveSelector,
  isSubmittingMove,
}: {
  gameData: any;
  gameId: bigint | null;
  userAddress: `0x${string}` | undefined;
  onCreateGame: () => void;
  onSubmitMove: () => void;
  canCreateGame: boolean;
  canSubmitMove: boolean;
  gameResult: string | null;
  isViewingResults: boolean;
  onViewResults: () => void;
  setModalMode: (mode: "join" | "submit") => void;
  setShowMoveSelector: (show: boolean) => void;
  isSubmittingMove: boolean;
}) {
  return (
    <>
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h4 className="font-semibold mb-4 text-center">🎮 GAME STATUS</h4>
        <div className="space-y-3">
          <RoleIndicator gameData={gameData} userAddress={userAddress} />
          <OpponentInfo gameData={gameData} userAddress={userAddress} />
          <StatusIndicator gameData={gameData} userAddress={userAddress} />
          <ActionButtons
            gameData={gameData}
            userAddress={userAddress}
            onCreateGame={onCreateGame}
            onSubmitMove={onSubmitMove}
            canCreateGame={canCreateGame}
            canSubmitMove={canSubmitMove}
            onViewResults={onViewResults}
            isViewingResults={isViewingResults}
            setModalMode={setModalMode}
            setShowMoveSelector={setShowMoveSelector}
            isSubmittingMove={isSubmittingMove}
          />
          <GameResult gameResult={gameResult} />
        </div>
        {gameData && (
          <div className="mt-4 pt-3 border-t text-xs text-gray-500 text-center">
            Game ID: #{gameId ? gameId.toString() : "N/A"}
          </div>
        )}
      </div>
    </>
  );
}

function GameStatusBoxSection({
  gameData,
  gameId,
  userAddress,
  onCreateGame,
  onSubmitMove,
  canCreateGame,
  canSubmitMove,
  gameResult,
  isViewingResults,
  onViewResults,
  setModalMode,
  setShowMoveSelector,
  isSubmittingMove,
}: {
  gameData: any;
  gameId: bigint | null;
  userAddress: `0x${string}` | undefined;
  onCreateGame: () => void;
  onSubmitMove: () => void;
  canCreateGame: boolean;
  canSubmitMove: boolean;
  gameResult: string | null;
  isViewingResults: boolean;
  onViewResults: () => void;
  setModalMode: (mode: "join" | "submit") => void;
  setShowMoveSelector: (show: boolean) => void;
  isSubmittingMove: boolean;
}) {
  return (
    <div className="col-span-full mx-20 px-4 pb-4 rounded-lg bg-white border-2 border-black">
      <GameStatusBox
        gameData={gameData}
        gameId={gameId}
        userAddress={userAddress}
        onCreateGame={onCreateGame}
        onSubmitMove={onSubmitMove}
        canCreateGame={canCreateGame}
        canSubmitMove={canSubmitMove}
        gameResult={gameResult}
        isViewingResults={isViewingResults}
        onViewResults={onViewResults}
        setModalMode={setModalMode}
        setShowMoveSelector={setShowMoveSelector}
        isSubmittingMove={isSubmittingMove}
      />
    </div>
  );
}

function MessageSection({ message }: { message: string }) {
  return (
    <div className="col-span-full mx-20 p-4 rounded-lg bg-white border-2 border-black">
      {printProperty("Message", message)}
    </div>
  );
}

function MoveSelectorModal({
  modalMode,
  setSelectedMove,
  setModalMode,
  selectedMove,
  setShowMoveSelector,
  handleSubmitMove,
}: {
  modalMode: "join" | "submit";
  setSelectedMove: (move: number) => void;
  setModalMode: (mode: "join" | "submit") => void;
  selectedMove: number | null;
  setShowMoveSelector: (show: boolean) => void;
  handleSubmitMove: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-center">
          {modalMode === "join"
            ? "Choose Your Move to Join Game"
            : "Choose Your Move"}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setSelectedMove(0)}
            className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
              selectedMove === 0
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FaHandRock className="text-3xl mb-2" />
            <span className="text-sm font-medium">Rock</span>
          </button>
          <button
            onClick={() => setSelectedMove(1)}
            className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
              selectedMove === 1
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FaHandPaper className="text-3xl mb-2" />
            <span className="text-sm font-medium">Paper</span>
          </button>
          <button
            onClick={() => setSelectedMove(2)}
            className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
              selectedMove === 2
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FaRegHandScissors className="text-3xl mb-2 rotate-90" />
            <span className="text-sm font-medium">Scissors</span>
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowMoveSelector(false);
              setSelectedMove(0);
              setModalMode("submit");
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitMove}
            disabled={selectedMove === null}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Submit Move
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Dummy Component
export const DummyRockPaperScissorsDemo = () => {
  const [currentPlayerView, setCurrentPlayerView] = useState<
    "player1" | "player2"
  >("player1");

  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = useMetaMaskEthersSigner(currentPlayerView);

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains: {},
    enabled: true,
  });

  const rockPaperScissors = useRockPaperScissors({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    userAddress: accounts?.[0] as `0x${string}` | undefined,
  });

  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [showMoveSelector, setShowMoveSelector] = useState(false);
  const [modalMode, setModalMode] = useState<"join" | "submit">("submit");
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isViewingResults, setIsViewingResults] = useState(false);

  const handleSubmitMove = async () => {
    if (selectedMove !== null) {
      rockPaperScissors.submitEncryptedMove(selectedMove);
      setShowMoveSelector(false);
      setSelectedMove(null);
      setModalMode("submit");
    }
  };

  const handleJoinGame = async () => {
    setModalMode("join");
    setShowMoveSelector(true);
  };

  const handleViewResults = async () => {
    if (
      !rockPaperScissors.latestGame?.gameId ||
      !fhevmInstance ||
      !rockPaperScissors.contractAddress ||
      !ethersSigner
    ) {
      return;
    }

    setIsViewingResults(true);
    setGameResult(null);

    try {
      // Mock contract call - in real app this would call getResult
      const encryptedResult =
        rockPaperScissors.latestGame.data?.result || "mock_draw";

      await rockPaperScissors.generateDecryptionSignature();

      const decryptionSignature = await FhevmDecryptionSignature.generate(
        fhevmInstance,
        [rockPaperScissors.contractAddress],
        ethersSigner.address,
        30
      );

      const decryptedResult = await fhevmInstance.userDecrypt(
        [
          {
            handle: encryptedResult,
            contractAddress: rockPaperScissors.contractAddress,
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

      const resultMap: { [key: number]: string } = {
        0: "Draw!",
        1: "Player 1 Wins!",
        2: "Player 2 Wins!",
      };

      const resultKey = Number(decryptedResult[encryptedResult]);
      setGameResult(resultMap[resultKey] || "Unknown result");
    } catch (error) {
      console.error("Failed to view results:", error);
      setGameResult("Failed to load results: " + (error as Error).message);
    } finally {
      setIsViewingResults(false);
    }
  };

  // Demo Controls Component
  const DemoControls = () => (
    <div className="col-span-full mx-20 mt-4 px-5 pb-4 rounded-lg bg-yellow-100 border-2 border-yellow-400">
      <p className="font-semibold text-yellow-800 text-lg mt-4">
        🎭 DEMO CONTROLS
      </p>
      <p className="text-sm text-yellow-700 mt-2">
        This is a dummy implementation - no real blockchain calls are made. Use
        the buttons below to simulate different game states and switch between
        player views.
      </p>
      <div className="mt-4 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
          >
            🔄 Reset Demo
          </button>
          <button
            onClick={() =>
              setCurrentPlayerView(
                currentPlayerView === "player1" ? "player2" : "player1"
              )
            }
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            👤 Switch to{" "}
            {currentPlayerView === "player1" ? "Player 2" : "Player 1"} View
          </button>
        </div>
        <p className="text-xs text-yellow-600 mt-2">
          Current View:{" "}
          <strong>
            {currentPlayerView === "player1" ? "Player 1" : "Player 2"}
          </strong>
        </p>
      </div>
    </div>
  );

  if (!isConnected) {
    return (
      <div className="mx-auto">
        <button
          className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-4 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
          disabled={isConnected}
          onClick={connect}
        >
          <span className="text-4xl p-6">Connect to MetaMask (Mock)</span>
        </button>
      </div>
    );
  }

  if (rockPaperScissors.isDeployed === false) {
    return (
      <div className="text-center text-red-500">
        Contract not deployed (this shouldn't happen in demo)
      </div>
    );
  }

  return (
    <div className="grid w-full gap-4">
      <div className="col-span-full mx-20 bg-black text-white">
        <p className="font-semibold text-3xl m-5">
          <span className="font-mono font-normal text-gray-400">
            RockPaperScissors.sol
          </span>
          <span className="ml-4 text-yellow-400">🎭 DUMMY MODE</span>
        </p>
      </div>

      <DemoControls />

      <ChainInfoSection
        chainId={chainId}
        accounts={accounts}
        ethersSigner={ethersSigner}
        contractAddress={rockPaperScissors.contractAddress}
        isDeployed={rockPaperScissors.isDeployed}
      />

      <div className="col-span-full mx-20">
        <div className="grid grid-cols-2 gap-4">
          <FhevmInstanceSection
            fhevmInstance={fhevmInstance}
            fhevmStatus={fhevmStatus}
            fhevmError={fhevmError ?? null}
          />
          <GameStatusSection
            gameDisplayState={rockPaperScissors.gameDisplayState}
            latestGameId={rockPaperScissors.latestGame?.gameId?.toString()}
            isCreatingGame={rockPaperScissors.isCreatingGame}
            isSubmittingMove={rockPaperScissors.isSubmittingMove}
          />
        </div>
      </div>

      <GameStatusBoxSection
        gameData={rockPaperScissors.latestGame?.data}
        gameId={rockPaperScissors.latestGame?.gameId ?? null}
        userAddress={accounts?.[0] as `0x${string}` | undefined}
        onCreateGame={rockPaperScissors.createGame}
        onSubmitMove={() => setShowMoveSelector(true)}
        canCreateGame={rockPaperScissors.canCreateGame ?? false}
        canSubmitMove={rockPaperScissors.canSubmitMove ?? false}
        gameResult={gameResult}
        isViewingResults={isViewingResults}
        onViewResults={handleViewResults}
        setModalMode={setModalMode}
        setShowMoveSelector={setShowMoveSelector}
        isSubmittingMove={rockPaperScissors.isSubmittingMove}
      />

      <MessageSection message={rockPaperScissors.message} />

      {/* Move Selector Modal */}
      {showMoveSelector && (
        <MoveSelectorModal
          modalMode={modalMode}
          setSelectedMove={setSelectedMove}
          setModalMode={setModalMode}
          selectedMove={selectedMove}
          setShowMoveSelector={setShowMoveSelector}
          handleSubmitMove={handleSubmitMove}
        />
      )}
    </div>
  );
};
