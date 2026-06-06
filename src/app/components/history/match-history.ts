import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { MatchHistory, Replay } from '../../models/game.models';

/**
 * Personal match-history view. A regular user only ever sees their own history
 * (the backend rejects any other id with 403). Each finished match can be
 * expanded into a structured JSON replay, which can also be downloaded.
 */
@Component({
  selector: 'app-match-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-history.html',
  styleUrl: './match-history.css'
})
export class MatchHistoryComponent implements OnChanges {
  @Input() playerId = '';

  history: MatchHistory[] = [];
  selectedReplay: Replay | null = null;
  error = '';
  loading = false;

  constructor(private api: ApiService) {}

  ngOnChanges(): void {
    if (this.playerId) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getPlayerHistory(this.playerId).subscribe({
      next: (h) => {
        this.history = h;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.status === 401 ? 'Please sign in to view your history.' : 'Could not load history.';
      }
    });
  }

  viewReplay(matchId: string): void {
    this.api.getReplayJson(matchId).subscribe({
      next: (replay) => (this.selectedReplay = replay),
      error: (err) => (this.error = err?.status === 403 ? 'You can only view your own replays.' : 'Replay unavailable.')
    });
  }

  downloadReplay(replay: Replay): void {
    const blob = new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `match-${replay.matchId}-replay.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  closeReplay(): void {
    this.selectedReplay = null;
  }
}
