import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api';
import { Match, Player } from './models/game.models';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  players$ = new BehaviorSubject<Player[]>([]);
  matches$ = new BehaviorSubject<Match[]>([]);
  playerStats$ = new BehaviorSubject<{ playerId: string; playerName: string; data: any } | null>(null);

  newPlayerName: string = '';
  activePlayerId: string = '';
  statusFilter: string = '';

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadPlayers();
    this.loadMatches();
  }

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
      next: () => this.loadMatches(),
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
}