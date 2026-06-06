import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Account,
  AuthResponse,
  Emote,
  Match,
  MatchHistory,
  MatchState,
  Player,
  Replay,
  RoundState,
  ServerStatus
} from '../models/game.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  // Auth

  register(username: string, email: string, password: string, displayName?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, { username, email, password, displayName });
  }

  login(usernameOrEmail: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, { usernameOrEmail, password });
  }

  me(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/auth/me`);
  }

  // Admin (ADMIN role only; backend enforces the ACL)

  getAdminUsers(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/admin/users`);
  }

  setAccountStatus(accountId: string, status: 'ACTIVE' | 'SUSPENDED'): Observable<Account> {
    return this.http.patch<Account>(`${this.baseUrl}/admin/users/${accountId}/status`, { status });
  }

  getAdminMatches(): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/admin/matches`);
  }

  getAdminHistory(): Observable<MatchHistory[]> {
    return this.http.get<MatchHistory[]>(`${this.baseUrl}/admin/match-history`);
  }

  getServerStatus(): Observable<ServerStatus> {
    return this.http.get<ServerStatus>(`${this.baseUrl}/admin/server-status`);
  }

  // Match history (self or admin)

  getPlayerHistory(playerId: string): Observable<MatchHistory[]> {
    return this.http.get<MatchHistory[]>(`${this.baseUrl}/players/${playerId}/history`);
  }

  // Emotes (social)

  sendEmote(matchId: string, playerId: string, emote: string): Observable<Emote> {
    return this.http.post<Emote>(`${this.baseUrl}/matches/${matchId}/emotes`, { playerId, emote });
  }

  getEmotes(matchId: string, since: number = 0): Observable<Emote[]> {
    return this.http.get<Emote[]>(`${this.baseUrl}/matches/${matchId}/emotes?since=${since}`);
  }

  // Structured JSON replay (participant or admin)

  getReplayJson(matchId: string): Observable<Replay> {
    return this.http.get<Replay>(`${this.baseUrl}/matches/${matchId}/replay`);
  }

  // Players

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.baseUrl}/players`);
  }

  getPlayer(playerId: string): Observable<Player> {
    return this.http.get<Player>(`${this.baseUrl}/players/${playerId}`);
  }

  createPlayer(name: string): Observable<Player> {
    return this.http.post<Player>(`${this.baseUrl}/players`, { name });
  }

  updatePlayer(playerId: string, name: string, hearts: number, tokens: number): Observable<Player> {
    return this.http.put<Player>(`${this.baseUrl}/players/${playerId}`, { name, hearts, tokens });
  }

  patchPlayer(playerId: string, fields: { name?: string; hearts?: number; tokens?: number }): Observable<Player> {
    return this.http.patch<Player>(`${this.baseUrl}/players/${playerId}`, fields);
  }

  deletePlayer(playerId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/players/${playerId}`);
  }

  getPlayerStats(playerId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/players/${playerId}/stats`);
  }

  getPlayerAbilities(playerId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/players/${playerId}/abilities`);
  }

  addPlayerAbility(playerId: string, abilityId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/players/${playerId}/abilities`, { abilityId });
  }

  removePlayerAbility(playerId: string, abilityId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/players/${playerId}/abilities/${abilityId}`);
  }

  uploadAvatar(playerId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.baseUrl}/players/${playerId}/avatar`, formData);
  }

  replaceAvatar(playerId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<any>(`${this.baseUrl}/players/${playerId}/avatar`, formData);
  }

  deleteAvatar(playerId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/players/${playerId}/avatar`);
  }
  setAvatarStyle(playerId: string, style: string): Observable<void> {
  return this.http.patch<void>(`${this.baseUrl}/players/${playerId}/avatar-style`, { style });
}
  // Matches

  getMatches(status?: string): Observable<Match[]> {
    const url = status ? `${this.baseUrl}/matches?status=${status}` : `${this.baseUrl}/matches`;
    return this.http.get<Match[]>(url);
  }

  getMatch(matchId: string): Observable<Match> {
    return this.http.get<Match>(`${this.baseUrl}/matches/${matchId}`);
  }

  createMatch(hostPlayerId: string, maxPlayers: number = 4): Observable<Match> {
    return this.http.post<Match>(`${this.baseUrl}/matches`, { hostPlayerId, maxPlayers });
  }

  updateMatch(matchId: string, maxPlayers: number): Observable<Match> {
    return this.http.put<Match>(`${this.baseUrl}/matches/${matchId}`, { maxPlayers });
  }

  patchMatch(matchId: string, fields: { status?: string; maxPlayers?: number }): Observable<Match> {
    return this.http.patch<Match>(`${this.baseUrl}/matches/${matchId}`, fields);
  }

  deleteMatch(matchId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/matches/${matchId}`);
  }

  joinMatch(matchId: string, playerId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/matches/${matchId}/join`, { playerId });
  }

  leaveMatch(matchId: string, playerId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/matches/${matchId}/leave`, { playerId });
  }

  removePlayerFromMatch(matchId: string, playerId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/matches/${matchId}/players/${playerId}`);
  }

  startMatch(matchId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/matches/${matchId}/start`, {});
  }

  updateMatchStatus(matchId: string, status: 'WAITING' | 'READY' | 'IN_PROGRESS' | 'FINISHED'): Observable<Match> {
    return this.http.patch<Match>(`${this.baseUrl}/matches/${matchId}/status`, { status });
  }

  getMatchState(matchId: string): Observable<MatchState> {
    return this.http.get<MatchState>(`${this.baseUrl}/matches/${matchId}/state`);
  }

  // Rounds

  getMatchRounds(matchId: string): Observable<RoundState[]> {
    return this.http.get<RoundState[]>(`${this.baseUrl}/matches/${matchId}/rounds`);
  }

  getRound(matchId: string, roundId: string): Observable<RoundState> {
    return this.http.get<RoundState>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}`);
  }

  updateRound(matchId: string, roundId: string, body: { status: string; dice: string[]; locked: boolean[] }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}`, body);
  }

  patchRound(matchId: string, roundId: string, fields: { status?: string; dice?: string[]; locked?: boolean[] }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}`, fields);
  }

  deleteRound(matchId: string, roundId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}`);
  }

  rollDice(matchId: string, roundId: string, playerId: string): Observable<RoundState> {
    return this.http.post<RoundState>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}/roll`, { playerId });
  }

  lockDice(matchId: string, roundId: string, playerId: string, lockedIndexes: number[]): Observable<RoundState> {
    return this.http.post<RoundState>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}/lock`, { playerId, lockedIndexes });
  }

  setTarget(matchId: string, roundId: string, playerId: string, diceTargets: { [key: number]: string }): Observable<RoundState> {
    return this.http.post<RoundState>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}/target`, { playerId, diceTargets });
  }

  updateLockedDice(matchId: string, roundId: string, locked: boolean[]): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}/locked-dice`, { locked });
  }

  resolveRound(matchId: string, roundId: string): Observable<MatchState> {
    return this.http.post<MatchState>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}/resolve`, {});
  }

  // Replay

  exportReplay(matchId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/matches/${matchId}/replay/export`, { responseType: 'blob' });
  }

  // Abilities

  getAbilities(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/abilities`);
  }

  createAbility(name: string, cost: number, id?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/abilities`, { id, name, cost });
  }

  getAbility(abilityId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/abilities/${abilityId}`);
  }

  updateAbility(abilityId: string, name: string, cost: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/abilities/${abilityId}`, { name, cost });
  }

  patchAbility(abilityId: string, fields: { name?: string; cost?: number }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/abilities/${abilityId}`, fields);
  }

  deleteAbility(abilityId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/abilities/${abilityId}`);
  }

  activateAbility(matchId: string, roundId: string, playerId: string, abilityId: string, targetId?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/matches/${matchId}/rounds/${roundId}/abilities/activate`, { playerId, abilityId, targetId });
  }

  // Ability Packs

  importAbilityPack(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.baseUrl}/ability-packs/import`, formData);
  }

  getAbilityPack(packId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ability-packs/${packId}`);
  }

  replaceAbilityPack(packId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<any>(`${this.baseUrl}/ability-packs/${packId}`, formData);
  }

  patchAbilityPack(packId: string, fields: { name?: string; description?: string }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/ability-packs/${packId}`, fields);
  }

  deleteAbilityPack(packId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/ability-packs/${packId}`);
  }
}
