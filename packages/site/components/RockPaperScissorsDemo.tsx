"use client";

import { ethers } from "ethers";
import { useFhevm, FhevmDecryptionSignature } from "@fhevm/react";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useRockPaperScissors } from "../hooks/useRockPaperScissors";
import { errorNotDeployed } from "./ErrorNotDeployed";
import { RockPaperScissorsABI } from "@/abi/RockPaperScissorsABI";
import { useState } from "react";
import {
  FaHandRock,
  FaHandPaper,
  FaRegHandScissors,
  FaRegHandPaper,
  FaRegHandRock,
} from "react-icons/fa";

/*
 * Main RockPaperScissors React component with game status and controls
 *  - "Create Game" button: allows you to create a new game
 *  - "Join Game" button: allows you to join an existing game
 *  - "Submit Move" button: allows you to submit an encrypted move
 *  - "Resolve Game" button: allows you to resolve the game and reveal results
 */
export const RockPaperScissorsDemo = () => {
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
  } = useMetaMaskEthersSigner();

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM instance
  //////////////////////////////////////////////////////////////////////////////

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains: [],
    enabled: true,
  });

  //////////////////////////////////////////////////////////////////////////////
  // useRockPaperScissors is a custom hook containing all the Rock Paper Scissors logic, including
  // - calling the RockPaperScissors contract
  // - encrypting FHE inputs
  // - game state management
  //////////////////////////////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////////////////////////////
  // UI Stuff:
  // --------
  // A basic page containing
  // - A bunch of debug values allowing you to better visualize the React state
  // - Game status box with dynamic content based on user role
  // - Move selector modal for submitting moves
  //////////////////////////////////////////////////////////////////////////////

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-black px-4 py-4 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const titleClass = "font-semibold text-black text-lg mt-4";

  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [showMoveSelector, setShowMoveSelector] = useState(false);
  const [modalMode, setModalMode] = useState<"join" | "submit">("submit");
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [isViewingResults, setIsViewingResults] = useState(false);

  if (!isConnected) {
    return (
      <div className="mx-auto">
        <button
          className={buttonClass}
          disabled={isConnected}
          onClick={connect}
        >
          <span className="text-4xl p-6">Connect to MetaMask</span>
        </button>
      </div>
    );
  }

  if (rockPaperScissors.isDeployed === false) {
    return errorNotDeployed(chainId);
  }

  const handleSubmitMove = async () => {
    if (selectedMove !== null) {
      if (modalMode === "join") {
        await rockPaperScissors.joinGame();
      } else {
        await rockPaperScissors.submitEncryptedMove(selectedMove);
      }
      setShowMoveSelector(false);
      setSelectedMove(null);
      setModalMode("submit");
    }
  };

  const handleJoinGame = async () => {
    // When joining a game, show move selector first
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
      const gameId = rockPaperScissors.latestGame.gameId;

      // Use ethers.js to call the contract's getResult function
      const contract = new ethers.Contract(
        rockPaperScissors.contractAddress,
        RockPaperScissorsABI.abi,
        ethersSigner
      );

      const encryptedResult = await contract.getResult(gameId);

      // Generate/ensure decryption signature exists (only when viewing results)
      await rockPaperScissors.generateDecryptionSignature();

      // Load decryption signature from storage
      const decryptionSignature =
        await FhevmDecryptionSignature.loadFromGenericStringStorage(
          fhevmDecryptionSignatureStorage,
          fhevmInstance,
          [rockPaperScissors.contractAddress],
          ethersSigner.address
        );

      if (!decryptionSignature) {
        setGameResult(
          "No decryption signature found. Please generate one first."
        );
        return;
      }

      // Decrypt the result using FHEVM with the loaded signature
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

      // Convert to human-readable format
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

  // console.log(
  //   "[RockPaperScissorsDemo] rockPaperScissors.gameDisplayState",
  //   rockPaperScissors.gameDisplayState
  // );

  // GameStatusBox component
  function GameStatusBox({
    displayState,
    gameData,
    gameId,
    onCreateGame,
    onJoinGame,
    onSubmitMove,
    onResolveGame,
    canCreateGame,
    canJoinGame,
    canSubmitMove,
    canResolveGame,
    gameResult,
    isViewingResults,
    onViewResults,
  }: {
    displayState: string;
    gameData: any;
    gameId: bigint | null;
    onCreateGame: () => void;
    onJoinGame: () => void;
    onSubmitMove: () => void;
    onResolveGame: () => void;
    canCreateGame: boolean;
    canJoinGame: boolean;
    canSubmitMove: boolean;
    canResolveGame: boolean;
    gameResult: string | null;
    isViewingResults: boolean;
    onViewResults: () => void;
  }) {
    const renderContent = (onViewResults: () => void) => {
      switch (displayState) {
        case "player1":
          return (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">Your Role:</span> Player 1
              </div>
              <div className="text-sm">
                <span className="font-medium">Opponent:</span>
                <p className="text-xs font-mono break-all mt-1">
                  {gameData.player2 &&
                  gameData.player2 !==
                    "0x0000000000000000000000000000000000000000"
                    ? gameData.player2
                    : "Waiting for opponent"}
                </p>
              </div>
              <div className="text-sm">
                <span className="font-medium">Status:</span>
                <p className="text-xs mt-1">
                  {gameData.status === BigInt(0) && "Waiting for moves"}
                  {gameData.status === BigInt(1) &&
                    "Moves submitted - can resolve"}
                  {gameData.status === BigInt(2) && "Game resolved"}
                </p>
              </div>
              <div className="pt-2 space-y-2">
                {gameData.status === BigInt(0) && (
                  <button
                    onClick={onSubmitMove}
                    disabled={!canSubmitMove}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Submit Your Move
                  </button>
                )}
                {gameData.status === BigInt(1) && (
                  <button
                    onClick={onResolveGame}
                    disabled={!canResolveGame}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Resolve Game
                  </button>
                )}
                {gameData.status === BigInt(2) && (
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
                )}
                {gameResult && (
                  <div className="w-full bg-green-100 border border-green-300 rounded p-3 text-center">
                    <p className="text-green-800 font-semibold text-lg">
                      {gameResult}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );

        case "player2":
          return (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">Your Role:</span> Player 2
              </div>
              <div className="text-sm">
                <span className="font-medium">Opponent:</span>
                <p className="text-xs font-mono break-all mt-1">
                  {gameData.player1}
                </p>
              </div>
              <div className="text-sm">
                <span className="font-medium">Status:</span>
                <p className="text-xs mt-1">
                  Move submitted - waiting for results
                </p>
              </div>
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
                {gameResult && (
                  <div className="w-full bg-green-100 border border-green-300 rounded p-3 text-center">
                    <p className="text-green-800 font-semibold text-lg">
                      {gameResult}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );

        case "can_join":
          return (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">Created by:</span>
                <p className="text-xs font-mono break-all mt-1">
                  {gameData.player1}
                </p>
              </div>
              <div className="text-sm">
                <span className="font-medium">Status:</span>
                <p className="text-xs mt-1">Waiting for second player</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onJoinGame}
                  disabled={!canJoinGame}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 disabled:bg-gray-400"
                >
                  Join This Game
                </button>
              </div>
            </div>
          );

        case "no_game":
        default:
          return (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                No active games available
              </div>
              <div className="text-sm">Create a new game to start playing</div>
              <div className="pt-2">
                <button
                  onClick={onCreateGame}
                  disabled={!canCreateGame}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:bg-primary/90 disabled:bg-gray-400"
                >
                  Start New Game
                </button>
              </div>
            </div>
          );
      }
    };

    return (
      <>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h4 className="font-semibold mb-4 text-center">🎮 GAME STATUS</h4>
          {renderContent(onViewResults)}
          {displayState !== "no_game" && (
            <div className="mt-4 pt-3 border-t text-xs text-gray-500 text-center">
              Game ID: #{gameId ? gameId.toString() : "N/A"}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="grid w-full gap-4">
      <div className="col-span-full mx-20 bg-black text-white">
        <p className="font-semibold  text-3xl m-5">
          <span className="font-mono font-normal text-gray-400">
            RockPaperScissors.sol
          </span>
        </p>
      </div>
      <div className="col-span-full mx-20 mt-4 px-5 pb-4 rounded-lg bg-white border-2 border-black">
        <p className={titleClass}>Chain Infos</p>
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
          ethersSigner ? ethersSigner.address : "No signer"
        )}

        <p className={titleClass}>Contract</p>
        {printProperty("RockPaperScissors", rockPaperScissors.contractAddress)}
        {printProperty("isDeployed", rockPaperScissors.isDeployed)}
      </div>
      <div className="col-span-full mx-20">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
            <p className={titleClass}>FHEVM instance</p>
            {printProperty(
              "Fhevm Instance",
              fhevmInstance ? "OK" : "undefined"
            )}
            {printProperty("Fhevm Status", fhevmStatus)}
            {printProperty("Fhevm Error", fhevmError ?? "No Error")}
          </div>
          <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
            <p className={titleClass}>Game Status</p>
            {printProperty(
              "Game Display State",
              rockPaperScissors.gameDisplayState
            )}
            {printProperty(
              "Latest Game ID",
              rockPaperScissors.latestGame?.gameId?.toString()
            )}
            {printProperty(
              "Is Creating Game",
              rockPaperScissors.isCreatingGame
            )}
            {printProperty(
              "Is Submitting Move",
              rockPaperScissors.isSubmittingMove
            )}
            {printProperty(
              "Is Resolving Game",
              rockPaperScissors.isResolvingGame
            )}
          </div>
        </div>
      </div>

      {/* Game Status Box */}
      <div className="col-span-full mx-20 px-4 pb-4 rounded-lg bg-white border-2 border-black">
        <GameStatusBox
          displayState={rockPaperScissors.gameDisplayState}
          gameData={rockPaperScissors.latestGame?.data}
          gameId={rockPaperScissors.latestGame?.gameId ?? null}
          onCreateGame={rockPaperScissors.createGame}
          onJoinGame={handleJoinGame}
          onSubmitMove={() => setShowMoveSelector(true)}
          onResolveGame={rockPaperScissors.resolveGame}
          canCreateGame={rockPaperScissors.canCreateGame ?? false}
          canJoinGame={rockPaperScissors.canJoinGame ?? false}
          canSubmitMove={rockPaperScissors.canSubmitMove ?? false}
          canResolveGame={rockPaperScissors.canResolveGame ?? false}
          gameResult={gameResult}
          isViewingResults={isViewingResults}
          onViewResults={handleViewResults}
        />
      </div>

      <div className="col-span-full mx-20 p-4 rounded-lg bg-white border-2 border-black">
        {printProperty("Message", rockPaperScissors.message)}
      </div>

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
