import { GameRole } from "@/lib/types";
import {
  FaHandRock,
  FaHandPaper,
  FaHandScissors,
  FaQuestion,
} from "react-icons/fa";

export function GameResultDetails({
  gameResult,
  myMove,
  userGameRole,
}: {
  gameResult: string | null;
  myMove: string | null;
  userGameRole: GameRole;
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
        <div className="flex items-center justify-center gap-2 pt-3 rounded-md">
          <span className={`font-semibold text-black`}>
            Your move: {myMove}
          </span>
          <span className="text-lg">{getMoveIcon(myMove)}</span>
        </div>
      )}
    </div>
  );
}
