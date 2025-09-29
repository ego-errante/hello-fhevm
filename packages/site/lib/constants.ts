/**
 * Game status constants for RockPaperScissors contract
 * These correspond to the enum values in the smart contract
 */
export const GAME_STATUS = {
  CREATED: 0, // Game created, waiting for player 1's move
  PLAYER1_SUBMITTED: 1, // Player 1 submitted their move, waiting for player 2
  RESOLVED: 2, // Game resolved, both players can view results
} as const;

/**
 * Game role constants for user roles in the RockPaperScissors game
 */
export const GAME_ROLE = {
  NO_ROLE: "no_role", // User is not a player in the current game
  PLAYER1: "player1", // User is player 1 (game creator)
  PLAYER2: "player2", // User is player 2 (game joiner)
} as const;
