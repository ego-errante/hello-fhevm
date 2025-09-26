import { GAME_ROLE, GAME_STATUS } from "./constants";
import { RockPaperScissorsABI } from "@/abi/RockPaperScissorsABI";

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

export type GameRole = (typeof GAME_ROLE)[keyof typeof GAME_ROLE];

export type GameData = {
  player1: `0x${string}`;
  player2: `0x${string}`;
  move1: string;
  move2: string;
  result: string;
  status: number;
  createdAt: bigint;
  resolvedAt: bigint;
};

export type LatestGame = {
  gameId: bigint;
  data: GameData | null;
  isLoading: boolean;
};

export type RockPaperScissorsInfoType = {
  abi: typeof RockPaperScissorsABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};
