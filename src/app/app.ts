import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ApiService } from './services/api';
import { DiceFace, Match, MatchState, Player, RoundPlayerState, RoundState } from './models/game.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  players$ = new BehaviorSubject<Player[]>([]);
  matches$ = new BehaviorSubject<Match[]>([]);
  playerStats$ = new BehaviorSubject<{ playerId: string; playerName: string; data: any } | null>(null);
  matchState$ = new BehaviorSubject<MatchState | null>(null);
  roundState$ = new BehaviorSubject<RoundState | null>(null);
  playerAbilities$ = new BehaviorSubject<any[]>([]);

  newPlayerName = '';
  activePlayerId = '';
  statusFilter = '';
  activeMatchId: string | null = null;
  selectedAbilityId = '';
  selectedTargetId = '';
  selectedDieIndex: number | null = null;
  targetWarning = '';
  diceTargets: { [key: number]: string } = {};

  private pollingSub?: Subscription;
  private lobbyPollingSub?: Subscription;
  private readonly isBrowser: boolean;

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) {
      return;
    }
    this.loadPlayers();
    this.loadMatches();
    this.startLobbyPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.stopLobbyPolling();
  }

  loadPlayers() {
    this.apiService.getPlayers().subscribe({
      next: (players) => {
        this.players$.next(players);
        if (players.length > 0 && !this.activePlayerId) {
          this.activePlayerId = players[0].id;
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadMatches(status?: string) {
    this.apiService.getMatches(status).subscribe({
      next: (matches) => {
        const normalized = matches.map((match) =>
          match.status === 'WAITING' && match.players.length >= 2
            ? { ...match, status: 'READY' as const }
            : match
        );
        this.matches$.next(normalized);
      },
      error: (err) => console.error(err)
    });
  }

  addPlayer() {
    const name = this.newPlayerName.trim();
    if (!name) {
      return;
    }
    this.apiService.createPlayer(name).subscribe({
      next: (player) => {
        this.players$.next([...this.players$.getValue(), player]);
        this.newPlayerName = '';
        if (!this.activePlayerId) {
          this.activePlayerId = player.id;
        }
      },
      error: (err) => console.error(err)
    });
  }

  createNewMatch(hostId: string | undefined) {
    if (!hostId) {
      return;
    }
    this.apiService.createMatch(hostId, 4).subscribe({
      next: (match) => this.matches$.next([...this.matches$.getValue(), match]),
      error: (err) => console.error(err)
    });
  }

  joinMatch(matchId: string | undefined) {
    if (!matchId || !this.activePlayerId) {
      return;
    }
    const match = this.matches$.getValue().find((item) => item.id === matchId);
    if (match?.players[0]?.id === this.activePlayerId) {
      alert('You cannot join a match you created.');
      return;
    }
    this.apiService.joinMatch(matchId, this.activePlayerId).subscribe({
      next: () => this.loadMatches(this.statusFilter || undefined),
      error: (err) => alert(this.formatError(err, 'Could not join match.'))
    });
  }

  startMatch(matchId: string | undefined) {
    if (!matchId) {
      return;
    }
    this.apiService.startMatch(matchId).subscribe({
      next: () => {
        this.loadMatches();
        this.enterMatch(matchId);
      },
      error: (err) => alert(this.formatError(err, 'Could not start match.'))
    });
  }

  loadPlayerStats(playerId: string | undefined, playerName: string) {
    if (!playerId) {
      return;
    }
    if (this.playerStats$.getValue()?.playerId === playerId) {
      this.playerStats$.next(null);
      return;
    }
    this.apiService.getPlayerStats(playerId).subscribe({
      next: (stats) => this.playerStats$.next({ playerId, playerName, data: stats }),
      error: (err) => alert(this.formatError(err, 'Could not load player stats.'))
    });
  }

  filterMatches() {
    this.loadMatches(this.statusFilter || undefined);
  }

  enterMatch(matchId: string | undefined) {
    if (!matchId) {
      return;
    }
    this.activeMatchId = matchId;
    this.selectedDieIndex = null;
    this.targetWarning = '';
    this.stopLobbyPolling();
    this.loadPlayerAbilities();
    this.pollMatchState();
    this.startPolling();
  }

  leaveMatch() {
    this.activeMatchId = null;
    this.stopPolling();
    this.matchState$.next(null);
    this.roundState$.next(null);
    this.playerAbilities$.next([]);
    this.selectedAbilityId = '';
    this.selectedTargetId = '';
    this.selectedDieIndex = null;
    this.targetWarning = '';
    this.diceTargets = {};
    this.loadMatches(this.statusFilter || undefined);
    this.startLobbyPolling();
  }

  loadPlayerAbilities() {
    if (!this.activePlayerId) {
      return;
    }
    this.apiService.getPlayerAbilities(this.activePlayerId).subscribe({
      next: (abilities) => this.playerAbilities$.next(abilities || []),
      error: (err) => console.error('Error fetching abilities', err)
    });
  }

  rollDice() {
    if (!this.activeMatchId || !this.activePlayerId || !this.canRollDice()) {
      return;
    }
    const roundId = this.getRoundId();
    if (!roundId) {
      return;
    }
    this.apiService.rollDice(this.activeMatchId, roundId, this.activePlayerId).subscribe({
      next: (round) => {
        this.selectedDieIndex = null;
        this.targetWarning = '';
        this.setRoundState(round);
        this.pollMatchState();
      },
      error: (err) => alert(this.formatError(err, 'Could not roll dice.'))
    });
  }

  toggleDiceLock(index: number) {
    if (!this.activeMatchId || !this.canLockDice()) {
      return;
    }
    const roundId = this.getRoundId();
    const playerState = this.activePlayerState();
    if (!roundId || !playerState) {
      return;
    }
    const locked = this.normalizedLocks(playerState);
    locked[index] = !locked[index];
    const lockedIndexes = locked
      .map((value, idx) => value ? idx : -1)
      .filter((idx) => idx >= 0);

    this.apiService.lockDice(this.activeMatchId, roundId, this.activePlayerId, lockedIndexes).subscribe({
      next: (round) => this.setRoundState(round),
      error: (err) => alert(this.formatError(err, 'Could not lock dice.'))
    });
  }

  selectDieForTarget(index: number) {
    const playerState = this.activePlayerState();
    const die = playerState?.dice[index];
    if (!die || !this.requiresTarget(die) || !this.canChooseTargets()) {
      return;
    }
    this.selectedDieIndex = this.selectedDieIndex === index ? null : index;
    this.targetWarning = this.selectedDieIndex === null ? '' : 'Choose a valid enemy for this die.';
  }

  setTargetAbility(dieIndex: number, targetId: string) {
    const playerState = this.activePlayerState();
    const die = playerState?.dice[dieIndex];
    if (!this.activeMatchId || !playerState || !die || !this.requiresTarget(die)) {
      return;
    }
    if (targetId && !this.isValidTargetId(targetId)) {
      this.targetWarning = 'That target is not valid.';
      return;
    }

    const roundId = this.getRoundId();
    if (!roundId) {
      return;
    }
    const diceTargets = this.buildTargetPayload(playerState);
    diceTargets[dieIndex] = targetId || '';

    this.apiService.setTarget(this.activeMatchId, roundId, this.activePlayerId, diceTargets).subscribe({
      next: (round) => {
        this.setRoundState(round);
        this.selectedDieIndex = dieIndex;
        this.targetWarning = this.missingTargetIndexes().length ? 'Some attack or steal dice still need targets.' : '';
      },
      error: (err) => alert(this.formatError(err, 'Could not set target.'))
    });
  }

  assignSelectedDieTarget(targetPlayerId: string) {
    if (this.selectedDieIndex === null) {
      return;
    }
    this.setTargetAbility(this.selectedDieIndex, targetPlayerId);
  }

  resolveRound() {
    if (!this.activeMatchId) {
      return;
    }
    const missingTargets = this.missingTargetIndexes();
    if (missingTargets.length > 0) {
      this.targetWarning = `Select targets for dice ${missingTargets.map((idx) => idx + 1).join(', ')} before resolving.`;
      return;
    }
    const roundId = this.getRoundId();
    if (!roundId) {
      return;
    }
    this.apiService.resolveRound(this.activeMatchId, roundId).subscribe({
      next: (state) => {
        this.matchState$.next(state);
        this.setRoundState(state.currentRoundState ?? null);
        this.selectedDieIndex = null;
        this.targetWarning = '';
      },
      error: (err) => {
        this.targetWarning = this.formatError(err, 'Could not resolve round.');
      }
    });
  }

  activateAbility() {
    if (!this.activeMatchId || !this.selectedAbilityId) {
      return;
    }
    const roundId = this.getRoundId();
    if (!roundId) {
      return;
    }
    this.apiService.activateAbility(
      this.activeMatchId,
      roundId,
      this.activePlayerId,
      this.selectedAbilityId,
      this.selectedTargetId || undefined
    ).subscribe({
      next: () => {
        this.selectedAbilityId = '';
        this.selectedTargetId = '';
        this.pollMatchState();
      },
      error: (err) => alert(this.formatError(err, 'Could not activate ability.'))
    });
  }

  getRoundId(): string | null {
    return this.roundState$.getValue()?.id ?? null;
  }

  activePlayerState(round = this.roundState$.getValue()): RoundPlayerState | null {
    return round?.playerStates?.find((state) => state.playerId === this.activePlayerId) ?? null;
  }

  activePlayer(): Player | null {
    return this.matchState$.getValue()?.players.find((player) => player.id === this.activePlayerId) ?? null;
  }

  canRollDice(): boolean {
    const matchState = this.matchState$.getValue();
    const round = this.roundState$.getValue();
    const player = this.activePlayer();
    return !!matchState
      && !!round
      && matchState.matchStatus === 'IN_PROGRESS'
      && round.status !== 'RESOLVED'
      && !player?.eliminated;
  }

  canLockDice(): boolean {
    const round = this.roundState$.getValue();
    const playerState = this.activePlayerState(round);
    return !!round
      && !!playerState?.dice?.length
      && round.status !== 'RESOLVED'
      && this.matchState$.getValue()?.matchStatus === 'IN_PROGRESS';
  }

  canChooseTargets(): boolean {
    const round = this.roundState$.getValue();
    return !!round
      && round.status !== 'RESOLVED'
      && this.matchState$.getValue()?.matchStatus === 'IN_PROGRESS'
      && this.validTargets().length > 0;
  }

  canResolveRound(): boolean {
    const round = this.roundState$.getValue();
    return !!round
      && round.status !== 'RESOLVED'
      && this.matchState$.getValue()?.matchStatus === 'IN_PROGRESS'
      && this.missingTargetIndexes().length === 0
      && this.hasAnyActiveDice();
  }

  validTargets(): Player[] {
    const players = this.matchState$.getValue()?.players ?? [];
    return players.filter((player) => player.id !== this.activePlayerId && !player.eliminated && player.hearts > 0);
  }

  isValidTarget(player: Player): boolean {
    return this.validTargets().some((target) => target.id === player.id);
  }

  isValidTargetId(playerId: string): boolean {
    return this.validTargets().some((player) => player.id === playerId);
  }

  requiresTarget(face: DiceFace): boolean {
    return face === 'ATTACK' || face === 'STEAL';
  }

  missingTargetIndexes(): number[] {
    const playerState = this.activePlayerState();
    if (!playerState?.dice?.length) {
      return [];
    }
    return playerState.dice
      .map((die, index) => this.requiresTarget(die) && !this.targetForDie(index) ? index : -1)
      .filter((index) => index >= 0);
  }

  hasAnyActiveDice(): boolean {
    return !!this.activePlayerState()?.dice?.length;
  }

  targetForDie(index: number): string {
    return this.activePlayerState()?.targetPlayerIds?.[index] || '';
  }

  targetName(targetPlayerId: string | null | undefined): string {
    if (!targetPlayerId) {
      return '';
    }
    return this.matchState$.getValue()?.players.find((player) => player.id === targetPlayerId)?.name ?? 'Unknown';
  }

  dieLabel(face: DiceFace): string {
    if (face === 'ATTACK') {
      return 'ATK';
    }
    if (face === 'SHIELD') {
      return 'SHD';
    }
    return 'STL';
  }

  dieTitle(face: DiceFace): string {
    if (face === 'ATTACK') {
      return 'Attack';
    }
    if (face === 'SHIELD') {
      return 'Shield';
    }
    return 'Steal';
  }

  normalizedLocks(playerState: RoundPlayerState): boolean[] {
    return Array.from({ length: 5 }, (_, index) => !!playerState.locked?.[index]);
  }

  playerShieldCount(playerId: string): number {
    const round = this.roundState$.getValue();
    const state = round?.playerStates?.find((item) => item.playerId === playerId);
    return state?.shieldCount ?? 0;
  }

  recentDamage(player: Player): number {
    return this.recentLogs().reduce((total, log) => {
      const escapedName = this.escapeRegExp(player.name);
      const match = log.match(new RegExp(`attacked ${escapedName}\\. \\d+ attack\\(s\\) blocked, (\\d+) damage dealt\\.`));
      return total + (match ? Number(match[1]) : 0);
    }, 0);
  }

  recentBlocks(player: Player): number {
    return this.recentLogs().reduce((total, log) => {
      const escapedName = this.escapeRegExp(player.name);
      const match = log.match(new RegExp(`attacked ${escapedName}\\. (\\d+) attack\\(s\\) blocked, \\d+ damage dealt\\.`));
      return total + (match ? Number(match[1]) : 0);
    }, 0);
  }

  recentTokenDelta(player: Player): number {
    return this.recentLogs().reduce((total, log) => {
      if (log.startsWith(`${player.name} stole 1 token from `)) {
        return total + 1;
      }
      if (log.includes(`stole 1 token from ${player.name}.`)) {
        return total - 1;
      }
      return total;
    }, 0);
  }

  recentLogs(): string[] {
    return this.matchState$.getValue()?.actionLogs ?? this.roundState$.getValue()?.actionLogs ?? [];
  }

  playerHasRecentEvent(player: Player): boolean {
    return this.recentLogs().some((log) => log.includes(player.name));
  }

  phaseLabel(status: string | null | undefined): string {
    if (status === 'INITIALIZED') {
      return 'Roll Phase';
    }
    if (status === 'ROLLING') {
      return 'Lock Dice';
    }
    if (status === 'TARGET_SELECTION') {
      return 'Target Selection';
    }
    if (status === 'ABILITY_PHASE') {
      return 'Ability Phase';
    }
    if (status === 'RESOLVED') {
      return 'Resolution Phase';
    }
    return 'Preparing';
  }

  private setRoundState(round: RoundState | null) {
    this.roundState$.next(round);
    this.syncDiceTargets(round);
  }

  private syncDiceTargets(round: RoundState | null) {
    const playerState = this.activePlayerState(round);
    this.diceTargets = {};
    playerState?.targetPlayerIds?.forEach((targetId, index) => {
      if (targetId) {
        this.diceTargets[index] = targetId;
      }
    });
  }

  private buildTargetPayload(playerState: RoundPlayerState): { [key: number]: string } {
    return playerState.dice.reduce((payload, die, index) => {
      if (this.requiresTarget(die)) {
        payload[index] = playerState.targetPlayerIds?.[index] || '';
      }
      return payload;
    }, {} as { [key: number]: string });
  }

  private pollMatchState() {
    if (!this.activeMatchId) {
      return;
    }
    this.apiService.getMatchState(this.activeMatchId).subscribe({
      next: (state) => {
        this.matchState$.next(state);
        if (state.currentRoundState) {
          this.setRoundState(state.currentRoundState);
          return;
        }
        this.apiService.getMatchRounds(this.activeMatchId!).subscribe({
          next: (rounds) => this.setRoundState(rounds.at(-1) ?? null),
          error: (err) => console.error('Error fetching rounds list', err)
        });
      },
      error: (err) => console.error('Error fetching match state', err)
    });
  }

  private startLobbyPolling() {
    this.stopLobbyPolling();
    this.lobbyPollingSub = interval(3000)
      .pipe(filter(() => !this.activeMatchId))
      .subscribe(() => {
        this.loadPlayers();
        this.loadMatches(this.statusFilter || undefined);
      });
  }

  private stopLobbyPolling() {
    this.lobbyPollingSub?.unsubscribe();
    this.lobbyPollingSub = undefined;
  }

  private startPolling() {
    this.stopPolling();
    this.pollingSub = interval(2000)
      .pipe(filter(() => !!this.activeMatchId))
      .subscribe(() => this.pollMatchState());
  }

  private stopPolling() {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  private formatError(err: any, fallback: string): string {
    const message = err?.error?.message || err?.error || err?.message || fallback;
    return typeof message === 'string' ? message : fallback;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
