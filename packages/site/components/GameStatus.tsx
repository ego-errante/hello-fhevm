import { FaCube, FaLock } from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { GAME_STATUS, GAME_ROLE } from "@/lib/constants";
import { GameButton, ButtonContainer } from "./GameButton";
import { GameResultDetails } from "./GameResult";
import { GameRole } from "@/lib/types";

export function GameStatusBoxSection({
  gameState,
  uiState,
  actions,
  modalControls,
}: GameStatusBoxSectionProps) {
  const {
    gameData,
    gameId,
    userGameRole,
    gameResult,
    myMove,
    isLoadingGameData,
  } = gameState;

  const { canCreateGame, isCreatingGame } = uiState;

  const { onCreateGame } = actions;

  // Show loading spinner when game data is loading and no game data available
  if (isLoadingGameData && !gameData) {
    return (
      <div className="col-span-full mx-20 px-4 py-4 rounded-lg bg-white border-2 border-black">
        <h4 className="font-bold mb-4  text-xl text-center flex items-center justify-center gap-2">
          <FaCube />
          <span>GAME STATUS</span>
        </h4>
        <div className="flex items-center justify-center pb-8 pt-4">
          <LuLoaderCircle className="animate-spin size-12 text-yellow-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-full mx-20 px-4 py-4 rounded-lg bg-white border-2 border-black">
      <h4 className="font-bold mb-4  text-xl text-center flex items-center justify-center gap-2">
        <FaCube />
        <span>GAME STATUS</span>
      </h4>
      <div className="space-y-3">
        {!gameData && (
          <>
            <div className="text-gray-600">No active games available</div>
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
          </>
        )}

        {gameData && userGameRole === GAME_ROLE.PLAYER1 && (
          <Player1View
            gameData={gameData}
            actions={actions}
            uiState={uiState}
          />
        )}
        {gameData && userGameRole === GAME_ROLE.PLAYER2 && (
          <Player2View
            gameData={gameData}
            actions={actions}
            uiState={uiState}
          />
        )}
        {gameData && userGameRole === GAME_ROLE.NO_ROLE && (
          <SpectatorView
            gameData={gameData}
            modalControls={modalControls}
            uiState={uiState}
          />
        )}
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
    </div>
  );
}

export function Player1View({ gameData, actions, uiState }: Player1ViewProps) {
  const { onSubmitMove, onViewResults, onCreateGame } = actions;
  const {
    canSubmitMove,
    isSubmittingMove,
    isViewingResults,
    canCreateGame,
    isCreatingGame,
  } = uiState;
  const hasOpponent =
    gameData.player2 &&
    gameData.player2 !== "0x0000000000000000000000000000000000000000";

  return (
    <>
      <div>
        <span className="font-medium">Your Role:</span> Player 1
      </div>
      <div>
        <span className="font-medium">Opponent:</span>
        <p className="font-mono break-all mt-1">
          {hasOpponent ? gameData.player2 : "No opponent yet"}
        </p>
      </div>

      {gameData.status === GAME_STATUS.RESOLVED && (
        <div>
          <span className="font-medium">Opponent's move:</span>
          <div className="flex items-center gap-1">
            <FaLock className="size-3" />
            <p>Hidden</p>
          </div>
        </div>
      )}

      <div>
        <span className="font-medium">Status:</span>
        <p className="mt-1">
          {gameData.status === GAME_STATUS.CREATED && "Submit your move"}
          {gameData.status === GAME_STATUS.PLAYER1_SUBMITTED &&
            "Waiting for Player 2"}
          {gameData.status === GAME_STATUS.RESOLVED && "Game resolved"}
        </p>
      </div>

      {gameData.status === GAME_STATUS.CREATED && (
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
      )}

      {gameData.status === GAME_STATUS.PLAYER1_SUBMITTED && (
        <ButtonContainer>
          <GameButton variant="waiting" onClick={() => {}} disabled>
            Waiting for Player 2 to join...
          </GameButton>
        </ButtonContainer>
      )}

      {gameData.status === GAME_STATUS.RESOLVED && (
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
      )}
    </>
  );
}

export function Player2View({ gameData, actions, uiState }: Player2ViewProps) {
  const { onViewResults, onCreateGame } = actions;
  const { isViewingResults, canCreateGame, isCreatingGame } = uiState;

  return (
    <>
      <div>
        <span className="font-medium">Your Role:</span> Player 2
      </div>
      <div>
        <span className="font-medium">Opponent:</span>
        <p className="font-mono break-all mt-1">{gameData.player1}</p>
      </div>
      <div>
        <span className="font-medium">Opponent's move:</span>
        <div className="flex items-center gap-1">
          <FaLock className="size-3" />
          <p>Hidden</p>
        </div>
      </div>
      <div>
        <span className="font-medium">Status:</span>
        <p className="mt-1">
          {gameData.status === GAME_STATUS.RESOLVED && "Game resolved"}
        </p>
      </div>
      {gameData.status === GAME_STATUS.RESOLVED && (
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
      )}
    </>
  );
}

export function SpectatorView({
  gameData,
  modalControls,
  uiState,
}: SpectatorViewProps) {
  const { setModalMode, setShowMoveSelector } = modalControls;
  const { isSubmittingMove } = uiState;
  const handleJoinGame = () => {
    setModalMode("join");
    setShowMoveSelector(true);
  };
  return (
    <>
      <div>
        <span className="font-medium">Available to join</span>
      </div>
      <div>
        <span className="font-medium">Created by:</span>
        <p className="font-mono break-all mt-1">{gameData.player1}</p>
      </div>
      <div>
        <span className="font-medium">Status:</span>
        <p className="mt-1">
          {gameData.status === GAME_STATUS.CREATED &&
            "Waiting for Player 1's move"}
          {gameData.status === GAME_STATUS.PLAYER1_SUBMITTED &&
            "Waiting for Player 2"}
        </p>
      </div>

      {gameData.status === GAME_STATUS.CREATED && (
        <ButtonContainer>
          <GameButton onClick={() => {}} disabled variant="waiting" fullWidth>
            Waiting for Player 1 move...
          </GameButton>
        </ButtonContainer>
      )}
      {gameData.status === GAME_STATUS.PLAYER1_SUBMITTED && (
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
      )}
    </>
  );
}

interface GameState {
  gameData: any;
  gameId: bigint | null;
  userGameRole: GameRole;
  gameResult: string | null;
  myMove: string | null;
  isLoadingGameData: boolean;
}

interface GameUiState {
  canCreateGame: boolean;
  canSubmitMove: boolean;
  isSubmittingMove: boolean;
  isCreatingGame: boolean;
  isViewingResults: boolean;
}

interface GameActions {
  onCreateGame: () => void;
  onSubmitMove: () => void;
  onViewResults: () => void;
}

interface ModalControls {
  setModalMode: (mode: "join" | "submit") => void;
  setShowMoveSelector: (show: boolean) => void;
}

interface Player1ViewProps {
  gameData: any;
  actions: GameActions;
  uiState: GameUiState;
}

interface Player2ViewProps {
  gameData: any;
  actions: GameActions;
  uiState: GameUiState;
}

interface SpectatorViewProps {
  gameData: any;
  modalControls: ModalControls;
  uiState: GameUiState;
}

interface GameStatusBoxSectionProps {
  gameState: GameState;
  uiState: GameUiState;
  actions: GameActions;
  modalControls: ModalControls;
}
