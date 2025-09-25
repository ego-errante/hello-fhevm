"use client";

import { ethers } from "ethers";
import { useFhevm, FhevmDecryptionSignature } from "@fhevm/react";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useRockPaperScissors } from "../hooks/useRockPaperScissors";
import { errorNotDeployed } from "./ErrorNotDeployed";
import { RockPaperScissorsABI } from "@/abi/RockPaperScissorsABI";
import { useState, useMemo } from "react";
import {
  FaHandRock,
  FaHandPaper,
  FaHandScissors,
  FaRegHandScissors,
  FaRegHandPaper,
  FaRegHandRock,
  FaRegHourglass,
  FaQuestion,
  FaLock,
} from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";

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

  // Get detailed message from hook
  const message = rockPaperScissors.message;

  // Get loading state for game data
  const isLoadingGameData = rockPaperScissors.isLoadingGames;

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

  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [showMoveSelector, setShowMoveSelector] = useState(false);
  const [modalMode, setModalMode] = useState<"join" | "submit">("submit");

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
      setShowMoveSelector(false);
      setSelectedMove(null);
      setModalMode("submit");
      // Start the async operation but close modal immediately (optimistic UI)
      rockPaperScissors.submitEncryptedMove(selectedMove);
    }
  };

  const handleJoinGame = async () => {
    // When joining a game, show move selector first
    setModalMode("join");
    setShowMoveSelector(true);
  };

  return (
    <div className="grid w-full gap-4">
      <div className="col-span-full mx-20 bg-black text-white">
        <p className="font-bold  text-2xl m-5">
          <span className="font-mono font-normal text-gray-400">
            Encrypted Rock-Paper-Scissors powered by Zama FHEVM
          </span>
        </p>
      </div>

      <GameStatusBoxSection
        gameData={rockPaperScissors.latestGame?.data}
        gameId={rockPaperScissors.latestGame?.gameId ?? null}
        userAddress={accounts?.[0] as `0x${string}` | undefined}
        userGameRole={rockPaperScissors.userGameRole}
        onCreateGame={rockPaperScissors.createGame}
        onSubmitMove={() => setShowMoveSelector(true)}
        canCreateGame={rockPaperScissors.canCreateGame ?? false}
        canSubmitMove={rockPaperScissors.canSubmitMove ?? false}
        gameResult={rockPaperScissors.gameResult}
        myMove={rockPaperScissors.myMove}
        isViewingResults={rockPaperScissors.isViewingResults}
        onViewResults={rockPaperScissors.viewResults}
        setModalMode={setModalMode}
        setShowMoveSelector={setShowMoveSelector}
        isSubmittingMove={rockPaperScissors.isSubmittingMove}
        isCreatingGame={rockPaperScissors.isCreatingGame}
        isLoadingGameData={isLoadingGameData}
      />

      <MessageSection message={message} />

      <h3 className="font-semibold text-black text-2xl mt-4 mx-auto">
        TECHNICAL DETAILS AND HOW TO PLAY
      </h3>

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
          <HowToPlaySection />
        </div>
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
          isSubmittingMove={rockPaperScissors.isSubmittingMove}
        />
      )}
    </div>
  );
};

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

function HowToPlaySection() {
  return (
    <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
      <p className="font-semibold text-black text-lg mt-4">How to Play</p>

      <div className="mt-3 space-y-6">
        <div>
          <p className="font-semibold mb-1">Game Rules:</p>
          <p>
            This is an onchain implementation of the classic Rock Paper Scissors
            game using FHE. Only the final result is available to both players.
          </p>
        </div>

        <div>
          <p className="font-semibold mb-1">Privacy Features:</p>
          <ul className="text-gray-700 space-y-1">
            <li>• Moves are encrypted using FHE</li>
            <li>• Individual moves stay private</li>
            <li>• Only the final result is revealed</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold mb-1">How to Play:</p>
          <ol className="text-gray-700 space-y-1">
            <li>1. Player 1 creates a new game</li>
            <li>2. Player 1 submits their encrypted move</li>
            <li>3. Player 2 joins and submits their move</li>
            <li>4. Game automatically resolves</li>
            <li>5. Both players can view the result</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function RoleIndicator({ userGameRole }: { userGameRole: string }) {
  if (userGameRole === "player1") {
    return (
      <div>
        <span className="font-medium">Your Role:</span> Player 1
      </div>
    );
  }

  if (userGameRole === "player2") {
    return (
      <div>
        <span className="font-medium">Your Role:</span> Player 2
      </div>
    );
  }

  // Check if user can join (when game status is 1 and player2 slot is empty)
  // This is handled by the hook's canSubmitMove logic, but we show "Available to join" for no_role users
  if (userGameRole === "no_role") {
    return (
      <div>
        <span className="font-medium">Available to join</span>
      </div>
    );
  }

  return null;
}

function OpponentInfo({
  gameData,
  userAddress,
  userGameRole,
}: {
  gameData: any;
  userAddress: `0x${string}` | undefined;
  userGameRole: string;
}) {
  if (!gameData) return null;

  if (userGameRole === "player1") {
    const hasOpponent =
      gameData.player2 &&
      gameData.player2 !== "0x0000000000000000000000000000000000000000";
    return (
      <div>
        <span className="font-medium">Opponent:</span>
        <p className="font-mono break-all mt-1">
          {hasOpponent ? gameData.player2 : "Waiting for opponent"}
        </p>
      </div>
    );
  }

  if (userGameRole === "player2") {
    return (
      <div>
        <span className="font-medium">Opponent:</span>
        <p className="font-mono break-all mt-1">{gameData.player1}</p>
      </div>
    );
  }

  // Can join view - show creator
  return (
    <div>
      <span className="font-medium">Created by:</span>
      <p className="font-mono break-all mt-1">{gameData.player1}</p>
    </div>
  );
}

function StatusIndicator({
  gameData,
  userAddress,
  userGameRole,
}: {
  gameData: any;
  userAddress: `0x${string}` | undefined;
  userGameRole: string;
}) {
  if (!gameData) {
    return <div className="text-gray-600">No active games available</div>;
  }

  if (gameData.status === BigInt(0)) {
    return (
      <div>
        <span className="font-medium">Status:</span>
        <p className="mt-1">
          {userGameRole === "player1"
            ? "Submit your move"
            : "Waiting for Player 1's move"}
        </p>
      </div>
    );
  }

  if (gameData.status === BigInt(1)) {
    if (userGameRole === "player2") {
      return (
        <div>
          <span className="font-medium">Status:</span>
          <p className="mt-1">Move submitted - waiting for results</p>
        </div>
      );
    }
    return (
      <div>
        <span className="font-medium">Status:</span>
        <p className="mt-1">Waiting for Player 2</p>
      </div>
    );
  }

  if (gameData.status === BigInt(2)) {
    return (
      <div>
        <span className="font-medium">Status:</span>
        <p className="mt-1">Game resolved</p>
      </div>
    );
  }

  // Fallback for no game state
  return <div>Create a new game to start playing</div>;
}

// Add these helper components before ActionButtons
function GameButton({
  onClick,
  disabled = false,
  variant = "primary",
  fullWidth = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "success" | "join" | "waiting";
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  const baseClasses =
    "px-4 py-2 rounded font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed";
  const widthClass = fullWidth ? "w-full" : "flex-1";

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400",
    secondary: "bg-slate-600 text-white hover:bg-slate-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    join: "bg-blue-600 text-white hover:bg-blue-700",
    waiting:
      "bg-gray-100 border border-gray-300 text-gray-600 text-center cursor-default",
  };

  if (variant === "waiting") {
    return (
      <div
        className={`${baseClasses} ${widthClass} ${variantClasses[variant]}`}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${widthClass} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}

function ButtonContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-2 space-y-2">
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function ActionButtons({
  gameData,
  userAddress,
  userGameRole,
  onCreateGame,
  onSubmitMove,
  canCreateGame,
  canSubmitMove,

  onViewResults,
  isViewingResults,
  setModalMode,
  setShowMoveSelector,
  isSubmittingMove,
  isCreatingGame,
}: {
  gameData: any;
  userAddress: `0x${string}` | undefined;
  userGameRole: string;
  onCreateGame: () => void;
  onSubmitMove: () => void;
  canCreateGame: boolean;
  canSubmitMove: boolean;
  onViewResults: () => void;
  isViewingResults: boolean;
  setModalMode: (mode: "join" | "submit") => void;
  setShowMoveSelector: (show: boolean) => void;
  isSubmittingMove: boolean;
  isCreatingGame: boolean;
}) {
  // Helper to create join game action
  const handleJoinGame = () => {
    setModalMode("join");
    setShowMoveSelector(true);
  };

  // No game state
  if (!gameData) {
    return (
      <ButtonContainer>
        <GameButton
          onClick={onCreateGame}
          disabled={!canCreateGame || isCreatingGame}
          variant="primary"
          fullWidth
        >
          {isCreatingGame ? "Creating Game..." : "Start New Game"}
        </GameButton>
      </ButtonContainer>
    );
  }

  const userHasRole = userGameRole === "player2" || userGameRole === "player1";
  if (userHasRole && gameData.status === BigInt(2)) {
    return (
      <ButtonContainer>
        <GameButton
          onClick={onViewResults}
          disabled={isViewingResults}
          variant="secondary"
        >
          {isViewingResults ? "Decrypting..." : "View Results"}
        </GameButton>
        <GameButton
          onClick={onCreateGame}
          disabled={!canCreateGame || isCreatingGame}
          variant="primary"
        >
          {isCreatingGame ? "Creating Game..." : "New Game"}
        </GameButton>
      </ButtonContainer>
    );
  }

  // Player 1 logic based on game status
  if (userGameRole === "player1") {
    const status = gameData.status;

    if (status === BigInt(0)) {
      return (
        <ButtonContainer>
          <GameButton
            onClick={onSubmitMove}
            disabled={!canSubmitMove || isSubmittingMove}
            variant="success"
            fullWidth
          >
            {isSubmittingMove ? "Submitting Move..." : "Submit Your Move"}
          </GameButton>
        </ButtonContainer>
      );
    }

    // Status == 1 => Waiting for Player 2 to join
    return (
      <ButtonContainer>
        <GameButton variant="waiting" onClick={() => {}} disabled>
          Waiting for Player 2 to join...
        </GameButton>
      </ButtonContainer>
    );
  }

  // Last case: no role logic
  if (gameData.status === BigInt(0)) {
    return (
      <ButtonContainer>
        <GameButton onClick={() => {}} disabled variant="waiting" fullWidth>
          Waiting for Player 1 move...
        </GameButton>
      </ButtonContainer>
    );
  }

  if (gameData.status === BigInt(1)) {
    return (
      <ButtonContainer>
        <GameButton
          onClick={handleJoinGame}
          disabled={isSubmittingMove}
          variant="join"
          fullWidth
        >
          {isSubmittingMove ? "Joining Game..." : "Join This Game"}
        </GameButton>
      </ButtonContainer>
    );
  }
}

function GameResultDetails({
  gameResult,
  myMove,
  userGameRole,
}: {
  gameResult: string | null;
  myMove: string | null;
  userGameRole: string;
}) {
  if (!gameResult) return null;

  // Determine the outcome from user's perspective
  const getOutcomeType = (result: string, userRole: string) => {
    if (result.includes("Failed") || result.includes("Unknown")) {
      return "error";
    }
    if (result.includes("Draw")) {
      return "draw";
    }
    if (result.includes("Player 1 Wins")) {
      return userRole === "player1" ? "win" : "lose";
    }
    if (result.includes("Player 2 Wins")) {
      return userRole === "player2" ? "win" : "lose";
    }
    return "unknown";
  };

  const outcomeType = getOutcomeType(gameResult, userGameRole);

  // Get appropriate styling based on outcome - matching existing color scheme
  const getOutcomeStyles = (type: string) => {
    switch (type) {
      case "win":
        return {
          container:
            "bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400",
          accent: "text-yellow-800",
          badge: "bg-yellow-400 text-black",
          message: "You Won!",
        };
      case "lose":
        return {
          container:
            "bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-400",
          accent: "text-slate-700",
          badge: "bg-slate-600 text-white",
          message: "You Lost",
        };
      case "draw":
        return {
          container:
            "bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400",
          accent: "text-blue-700",
          badge: "bg-blue-600 text-white",
          message: "Draw!",
        };
      case "error":
        return {
          container:
            "bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-400",
          accent: "text-gray-600",
          badge: "bg-gray-500 text-white",
          message: "Error",
        };
      default:
        return {
          container: "bg-white border-2 border-black",
          accent: "text-gray-700",
          badge: "bg-black text-white",
          message: "Game Result",
        };
    }
  };

  const styles = getOutcomeStyles(outcomeType);

  // Get move emoji
  const getMoveIcon = (move: string) => {
    switch (move?.toLowerCase()) {
      case "rock":
        return <FaHandRock />;
      case "paper":
        return <FaHandPaper />;
      case "scissors":
        return <FaHandScissors className="rotate-90" />;
      default:
        return <FaQuestion />;
    }
  };

  return (
    <div className={`w-full rounded-lg p-4 text-center ${styles.container}`}>
      <div className="flex items-center justify-center gap-3">
        <div className="flex flex-col items-center">
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold ${styles.badge}`}
          >
            {outcomeType === "error" ? "ERROR" : styles.message}
          </span>
        </div>
      </div>

      {outcomeType === "error" && (
        <p className={`text-sm ${styles.accent} my-3`}>{gameResult}</p>
      )}

      {myMove && outcomeType !== "error" && (
        <div className="p-3 rounded-md">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`font-semibold text-black`}>
              Your move: {myMove}
            </span>
            <span className="text-lg">{getMoveIcon(myMove)}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <FaLock />
            <span className={styles.accent}>Opponent's move: Hidden</span>
          </div>
        </div>
      )}
    </div>
  );
}

function GameStatusBox({
  gameData,
  gameId,
  userAddress,
  userGameRole,
  onCreateGame,
  onSubmitMove,
  canCreateGame,
  canSubmitMove,

  gameResult,
  myMove,
  isViewingResults,
  onViewResults,
  setModalMode,
  setShowMoveSelector,
  isSubmittingMove,
  isCreatingGame,
  isLoadingGameData,
}: {
  gameData: any;
  gameId: bigint | null;
  userAddress: `0x${string}` | undefined;
  userGameRole: string;
  onCreateGame: () => void;
  onSubmitMove: () => void;
  canCreateGame: boolean;
  canSubmitMove: boolean;
  gameResult: string | null;
  myMove: string | null;
  isViewingResults: boolean;
  onViewResults: () => void;
  setModalMode: (mode: "join" | "submit") => void;
  setShowMoveSelector: (show: boolean) => void;
  isSubmittingMove: boolean;
  isCreatingGame: boolean;
  isLoadingGameData: boolean;
}) {
  // Show loading spinner when game data is loading and no game data available
  if (isLoadingGameData && !gameData) {
    return (
      <>
        <h4 className="font-semibold mb-4 text-center flex items-center justify-center gap-2">
          <FaRegHourglass />
          <span>GAME STATUS</span>
        </h4>
        <div className="flex items-center justify-center pb-8 pt-4">
          <LuLoaderCircle className="animate-spin size-12 text-yellow-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <h4 className="font-semibold mb-4 text-center flex items-center justify-center gap-2">
        <FaRegHourglass />
        <span>GAME STATUS</span>
      </h4>
      <div className="space-y-3">
        <RoleIndicator userGameRole={userGameRole} />
        <OpponentInfo
          gameData={gameData}
          userAddress={userAddress}
          userGameRole={userGameRole}
        />
        <StatusIndicator
          gameData={gameData}
          userAddress={userAddress}
          userGameRole={userGameRole}
        />
        <ActionButtons
          gameData={gameData}
          userAddress={userAddress}
          userGameRole={userGameRole}
          onCreateGame={onCreateGame}
          onSubmitMove={onSubmitMove}
          canCreateGame={canCreateGame}
          canSubmitMove={canSubmitMove}
          onViewResults={onViewResults}
          isViewingResults={isViewingResults}
          setModalMode={setModalMode}
          setShowMoveSelector={setShowMoveSelector}
          isSubmittingMove={isSubmittingMove}
          isCreatingGame={isCreatingGame}
        />
        <GameResultDetails
          userGameRole={userGameRole}
          gameResult={gameResult}
          myMove={myMove}
        />
      </div>
      {gameData && (
        <div className="mt-4 pt-3 border-t text-sm text-gray-500 font-semibold text-center">
          Game ID: #{gameId ? gameId.toString() : "N/A"}
        </div>
      )}
    </>
  );
}

function GameStatusBoxSection({
  gameData,
  gameId,
  userAddress,
  userGameRole,
  onCreateGame,
  onSubmitMove,
  canCreateGame,
  canSubmitMove,

  gameResult,
  myMove,
  isViewingResults,
  onViewResults,
  setModalMode,
  setShowMoveSelector,
  isSubmittingMove,
  isCreatingGame,
  isLoadingGameData,
}: {
  gameData: any;
  gameId: bigint | null;
  userAddress: `0x${string}` | undefined;
  userGameRole: string;
  onCreateGame: () => void;
  onSubmitMove: () => void;
  canCreateGame: boolean;
  canSubmitMove: boolean;

  gameResult: string | null;
  myMove: string | null;
  isViewingResults: boolean;
  onViewResults: () => void;
  setModalMode: (mode: "join" | "submit") => void;
  setShowMoveSelector: (show: boolean) => void;
  isSubmittingMove: boolean;
  isCreatingGame: boolean;
  isLoadingGameData: boolean;
}) {
  return (
    <div className="col-span-full mx-20 px-4 py-4 rounded-lg bg-white border-2 border-black">
      <GameStatusBox
        gameData={gameData}
        gameId={gameId}
        userAddress={userAddress}
        userGameRole={userGameRole}
        onCreateGame={onCreateGame}
        onSubmitMove={onSubmitMove}
        canCreateGame={canCreateGame}
        canSubmitMove={canSubmitMove}
        gameResult={gameResult}
        myMove={myMove}
        isViewingResults={isViewingResults}
        onViewResults={onViewResults}
        setModalMode={setModalMode}
        setShowMoveSelector={setShowMoveSelector}
        isSubmittingMove={isSubmittingMove}
        isCreatingGame={isCreatingGame}
        isLoadingGameData={isLoadingGameData}
      />
    </div>
  );
}

function MessageSection({ message }: { message: string }) {
  return (
    <div className="col-span-full mx-20 p-4 rounded-lg bg-white border-2 border-black overflow-auto">
      {printProperty("Message", message)}
    </div>
  );
}

function MoveButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 transform hover:scale-105 
        ${
          active
            ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100"
            : "border-gray-200 hover:border-yellow-300 hover:bg-gradient-to-br hover:from-yellow-25 hover:to-yellow-50"
        }`}
    >
      {children}
    </button>
  );
}

function MoveSelectorModal({
  modalMode,
  setSelectedMove,
  setModalMode,
  selectedMove,
  setShowMoveSelector,
  handleSubmitMove,
  isSubmittingMove,
}: {
  modalMode: "join" | "submit";
  setSelectedMove: (move: number) => void;
  setModalMode: (mode: "join" | "submit") => void;
  selectedMove: number | null;
  setShowMoveSelector: (show: boolean) => void;
  handleSubmitMove: () => void;
  isSubmittingMove: boolean;
}) {
  const moves = [
    {
      icon: FaHandRock,
      label: "Rock",
    },
    {
      icon: FaHandPaper,
      label: "Paper",
    },
    {
      icon: FaHandScissors,
      label: "Scissors",
      className: "rotate-90",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-black">
        <h3 className="text-xl font-bold mb-6 text-center text-black">
          {modalMode === "join"
            ? "Choose Your Move to Join Game"
            : "Choose Your Move"}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {moves.map((move, index) => {
            const isActive = selectedMove === index;
            return (
              <MoveButton
                key={index}
                onClick={() => setSelectedMove(index)}
                active={isActive}
              >
                <move.icon
                  className={`text-4xl mb-2 transition-colors ${isActive ? "text-yellow-700" : "text-gray-600"} ${move.className}`}
                />
                <span className="font-semibold text-black">{move.label}</span>
              </MoveButton>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowMoveSelector(false);
              setSelectedMove(0);
              setModalMode("submit");
            }}
            className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 hover:border-slate-400 font-semibold transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitMove}
            disabled={selectedMove === null || isSubmittingMove}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-500 hover:to-green-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            {isSubmittingMove
              ? modalMode === "join"
                ? "Joining Game..."
                : "Submitting..."
              : "Submit Move"}
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
