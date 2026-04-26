import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api';
import { Match, Player } from './models/game.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  players: Player[] = [];
  newPlayerName: string = '';
  matches: Match[] = [];

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadPlayers();
    this.loadMatches();
  }

  loadPlayers() {
    this.apiService.getPlayers().subscribe({
      next: (data) => this.players = data,
      error: (err) => console.error('Eroare la preluarea jucătorilor', err)
    });
  }

  loadMatches() {
    this.apiService.getMatches().subscribe({
      next: (data) => {
        this.matches = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Eroare la preluarea meciurilor', err)
    });
  }

  addPlayer() {
    if (!this.newPlayerName.trim()) {
      alert('Te rog introdu un nume!');
      return;
    }

    this.apiService.createPlayer(this.newPlayerName).subscribe({
      next: (createdPlayer) => {
        this.players.push(createdPlayer);
        this.newPlayerName = '';
        this.cdr.detectChanges();      
      },
      error: (err) => console.error('Eroare la creare', err)
    });
  }

  createNewMatch(hostId: string | undefined) {
    if (!hostId) return;

    this.apiService.createMatch(hostId).subscribe({
      next: (newMatch) => {
        this.matches = [...this.matches, newMatch];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Eroare la creare meci', err)
    });
  }
}
