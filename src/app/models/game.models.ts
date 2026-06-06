export type MatchStatus = 'WAITING' | 'READY' | 'IN_PROGRESS' | 'FINISHED';
export type RoundStatus = 'INITIALIZED' | 'ROLLING' | 'TARGET_SELECTION' | 'ABILITY_PHASE' | 'RESOLVED';
export type DiceFace = 'ATTACK' | 'SHIELD' | 'STEAL';

export interface Player {
  id: string;
  name: string;
  hearts: number;
  tokens: number;
  eliminated?: boolean;
  avatarUrl?: string;
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

// --- Stage 4: accounts, ACL, social, history and replay -----------------------

export type Role = 'GUEST' | 'USER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface Account {
  id: string;
  username: string | null;
  email: string | null;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  role: Role;
  account: Account;
}

export interface ServerStatus {
  totalAccounts: number;
  adminCount: number;
  totalMatches: number;
  waitingMatches: number;
  readyMatches: number;
  inProgressMatches: number;
  finishedMatches: number;
  recordedHistory: number;
  generatedAt: string;
}

export interface Participant {
  id: string;
  name: string;
}

export interface MatchHistory {
  id: string;
  matchId: string;
  participants: Participant[];
  winnerId: string | null;
  winnerName: string | null;
  finalStatus: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  events: string[];
  hasReplay: boolean;
}

export interface Emote {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  emote: string;
  timestamp: number;
}

export interface ReplayAction {
  sequence: number;
  timestamp: string;
  roundNumber: number;
  type: string;
  description: string;
}

export interface PlayerSnapshot {
  playerId: string;
  name: string;
  hearts: number;
  tokens: number;
}

export interface Replay {
  matchId: string;
  status: string;
  participants: Participant[];
  initialState: PlayerSnapshot[];
  actions: ReplayAction[];
  winnerId: string | null;
  winnerName: string | null;
  finishedAt: string | null;
}
