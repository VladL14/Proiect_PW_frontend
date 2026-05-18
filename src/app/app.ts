import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api';
import { Match, Player } from './models/game.models';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

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

  newPlayerName: string = '';
  activePlayerId: string = '';
  statusFilter: string = '';

  // --- Game State ---
  activeMatchId: string | null = null;
  matchState$ = new BehaviorSubject<any>(null);
  roundState$ = new BehaviorSubject<any>(null);
  playerAbilities$ = new BehaviorSubject<any[]>([]);
  
  selectedAbilityId: string = '';
  selectedTargetId: string = '';

  private pollingSub?: Subscription;
  private lobbyPollingSub?: Subscription;
  diceTargets: { [key: number]: string } = {};

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadPlayers();
    this.loadMatches();
    this.startLobbyPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.stopLobbyPolling();
  }

  // --- Lobby Methods ---

  loadPlayers() {
    this.apiService.getPlayers().subscribe({
      next: (data) => {
        this.players$.next(data);
        if (data.length > 0 && !this.activePlayerId) {
          this.activePlayerId = data[0].id || '';
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadMatches(status?: string) {
    this.apiService.getMatches(status).subscribe({
      next: (data) => {
        const normalized = data.map(m =>
          m.status === 'WAITING' && m.players.length >= 2
            ? { ...m, status: 'READY' as any }
            : m
        );
        this.matches$.next(normalized);
      },
      error: (err) => console.error(err)
    });
  }

  addPlayer() {
    if (!this.newPlayerName.trim()) return;
    this.apiService.createPlayer(this.newPlayerName).subscribe({
      next: (createdPlayer) => {
        const currentPlayers = this.players$.getValue();
        this.players$.next([...currentPlayers, createdPlayer]);
        this.newPlayerName = '';
        if (!this.activePlayerId && createdPlayer.id) {
          this.activePlayerId = createdPlayer.id;
        }
      },
      error: (err) => console.error(err)
    });
  }

  createNewMatch(hostId: string | undefined) {
    if (!hostId) return;
    this.apiService.createMatch(hostId, 4).subscribe({
      next: (newMatch) => {
        const currentMatches = this.matches$.getValue();
        this.matches$.next([...currentMatches, newMatch]);
      },
      error: (err) => console.error(err)
    });
  }

  joinMatch(matchId: string | undefined) {
    if (!matchId || !this.activePlayerId) return;
    const match = this.matches$.getValue().find(m => m.id === matchId);
    if (match && match.players.length > 0 && match.players[0].id === this.activePlayerId) {
      alert('You cannot join a match you created!');
      return;
    }
    this.apiService.joinMatch(matchId, this.activePlayerId).subscribe({
      next: () => this.loadMatches(),
      error: (err) => {
        console.error(err);
        alert('The match is full or you are already in it!');
      }
    });
  }

  startMatch(matchId: string | undefined) {
    if (!matchId) return;
    this.apiService.startMatch(matchId).subscribe({
      next: () => {
        this.loadMatches();
        this.enterMatch(matchId);
      },
      error: (err) => console.error(err)
    });
  }

  loadPlayerStats(playerId: string | undefined, playerName: string) {
    if (!playerId) return;

    if (this.playerStats$.getValue()?.playerId === playerId) {
      this.playerStats$.next(null);
      return;
    }

    this.apiService.getPlayerStats(playerId).subscribe({
      next: (stats) => {
        this.playerStats$.next({ playerId, playerName, data: stats });
      },
      error: (err) => {
        console.error('Error loading player stats:', err);
        alert('Failed to load player stats.');
      }
    });
  }

  filterMatches() {
    this.loadMatches(this.statusFilter || undefined);
  }

  // --- Game Board Methods ---

  enterMatch(matchId: string | undefined) {
    if (!matchId) return;
    this.activeMatchId = matchId;
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
    this.selectedAbilityId = '';
    this.selectedTargetId = '';
    this.diceTargets = {};
    this.loadMatches();
    this.startLobbyPolling();
  }

  loadPlayerAbilities() {
    if (!this.activePlayerId) return;
    this.apiService.getPlayerAbilities(this.activePlayerId).subscribe({
      next: (abilities) => this.playerAbilities$.next(abilities || []),
      error: (err) => console.error('Error fetching abilities', err)
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
    if (this.lobbyPollingSub) {
      this.lobbyPollingSub.unsubscribe();
      this.lobbyPollingSub = undefined;
    }
  }

  private startPolling() {
    this.stopPolling();
    this.pollingSub = interval(2000)
      .pipe(filter(() => !!this.activeMatchId))
      .subscribe(() => this.pollMatchState());
  }

  private stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  private pollMatchState() {
    if (!this.activeMatchId) return;
    this.apiService.getMatchState(this.activeMatchId).subscribe({
      next: (state) => {
        this.matchState$.next(state);
        // Fetch all rounds to safely get the actual UUID of the active round
        this.apiService.getMatchRounds(this.activeMatchId!).subscribe({
          next: (rounds) => {
            if (rounds && rounds.length > 0) {
              // The active round is typically the last one created
              this.roundState$.next(rounds[rounds.length - 1]);
            } else {
              this.roundState$.next(null);
            }
          },
          error: (err) => console.error('Error fetching rounds list', err)
        });
      },
      error: (err) => {
        console.error('Error fetching state', err);
      }
    });
  }

  getRoundId(): string | null {
    const round = this.roundState$.getValue();
    return round && round.id ? round.id.toString() : null;
  }

  rollDice() {
    if (!this.activeMatchId) return;
    const roundId = this.getRoundId();
    if (!roundId) return;
    
    this.apiService.rollDice(this.activeMatchId, roundId, this.activePlayerId).subscribe({
      next: () => this.pollMatchState(),
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || err.error || err.message;
        alert(`Could not roll dice. Backend says: ${msg}`);
      }
    });
  }

  hasAbility(abilityType: 'ATTACK' | 'STEAL'): boolean {
    const round = this.roundState$.getValue();
    if (!round) return false;
    const playerState = round.playerStates?.find((s: any) => s.playerId === this.activePlayerId);
    if (!playerState || !playerState.dice) return false;
    return playerState.dice.some((dieVal: string) => dieVal.includes(abilityType));
  }

  toggleDiceLock(index: number) {
    if (!this.activeMatchId) return;
    const round = this.roundState$.getValue();
    const roundId = this.getRoundId();
    if (!round || !roundId) return;

    const playerState = round.playerStates?.find((s: any) => s.playerId === this.activePlayerId);
    if (!playerState) return;

    const currentLocked = playerState.locked || [false, false, false, false, false];
    const newLocked = [...currentLocked];
    newLocked[index] = !newLocked[index];

    // Convert boolean array to array of locked indexes
    const lockedIndexes: number[] = [];
    newLocked.forEach((isLocked: boolean, idx: number) => {
      if (isLocked) lockedIndexes.push(idx);
    });

    this.apiService.lockDice(this.activeMatchId, roundId, this.activePlayerId, lockedIndexes).subscribe({
      next: () => {
        this.pollMatchState();
        if (lockedIndexes.length === 5) {
          this.rollDice();
        }
      },
      error: (err) => {
        console.error(err);
        let msg = err.error?.message || err.error || err.message;
        if (typeof msg === 'object') msg = JSON.stringify(msg);
        alert(`Could not lock dice. Backend says: ${msg}`);
      }
    });
  }

  setTargetAbility(dieIndex: number, targetId: string) {
    if (targetId) {
      this.diceTargets[dieIndex] = targetId;
    } else {
      delete this.diceTargets[dieIndex];
    }
    
    if (!this.activeMatchId) return;
    const roundId = this.getRoundId();
    if (!roundId) return;

    this.apiService.setTarget(this.activeMatchId, roundId, this.activePlayerId, this.diceTargets).subscribe({
      next: () => this.pollMatchState(),
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || err.error || err.message;
        alert(`Could not set target. Backend says: ${msg}`);
      }
    });
  }

  activateAbility() {
    if (!this.activeMatchId || !this.selectedAbilityId) return;
    const roundId = this.getRoundId();
    if (!roundId) return;

    this.apiService.activateAbility(this.activeMatchId, roundId, this.activePlayerId, this.selectedAbilityId, this.selectedTargetId || undefined).subscribe({
      next: () => {
        this.selectedAbilityId = '';
        this.selectedTargetId = '';
        this.pollMatchState();
      },
      error: (err) => {
        console.error('Ability error', err);
        const msg = err.error?.message || err.error || err.message;
        alert(`Could not activate ability. Backend says: ${msg}`);
      }
    });
  }

  resolveRound() {
    if (!this.activeMatchId) return;
    const roundId = this.getRoundId();
    if (!roundId) return;
    
    this.apiService.resolveRound(this.activeMatchId, roundId).subscribe({
      next: () => this.pollMatchState(),
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || err.error || err.message;
        alert(`Could not resolve phase. Backend says: ${msg}`);
      }
    });
  }
}