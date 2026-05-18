export type MatchStatus = 'WAITING' | 'READY' | 'IN_PROGRESS' | 'FINISHED';
export type RoundStatus = 'INITIALIZED' | 'ROLLING' | 'TARGET_SELECTION' | 'ABILITY_PHASE' | 'RESOLVED';
export type DiceFace = 'ATTACK' | 'SHIELD' | 'STEAL';

export interface Player {
  id: string;
  name: string;
  hearts: number;
  tokens: number;
  eliminated?: boolean;
}

export interface Match {
  id: string;
  status: MatchStatus;
  players: Player[];
  winnerPlayerId?: string | null;
}

export interface RoundPlayerState {
  playerId: string;
  playerName: string;
  dice: DiceFace[];
  locked: boolean[];
  targetPlayerIds: (string | null)[];
  rollsCount: number;
  eliminated: boolean;
  shieldCount: number;
}

export interface RoundState {
  id: string;
  roundNumber: number;
  status: RoundStatus;
  dice: DiceFace[];
  locked: boolean[];
  targetPlayerIds: (string | null)[];
  playerStates: RoundPlayerState[];
  roundSummary?: string | null;
  actionLogs: string[];
}

export interface MatchState {
  matchId: string;
  matchStatus: MatchStatus;
  currentRound: number;
  currentTurnPlayerId?: string | null;
  players: Player[];
  currentRoundState?: RoundState | null;
  winnerPlayerId?: string | null;
  winnerName?: string | null;
  alivePlayerCount: number;
  roundSummary?: string | null;
  actionLogs: string[];
}
