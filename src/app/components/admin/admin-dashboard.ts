import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { Account, Match, MatchHistory, ServerStatus } from '../../models/game.models';

/**
 * Admin-only dashboard. The whole page is reachable only after the backend
 * authorises the ADMIN role; here we simply present the server-side data:
 * accounts, live/finished matches, the global match history and a server
 * status snapshot. Account suspension is also exposed.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent implements OnInit {
  tab: 'users' | 'matches' | 'history' | 'server' = 'server';

  users: Account[] = [];
  matches: Match[] = [];
  history: MatchHistory[] = [];
  status: ServerStatus | null = null;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.error = '';
    this.api.getServerStatus().subscribe({ next: (s) => (this.status = s), error: (e) => this.handle(e) });
    this.api.getAdminUsers().subscribe({ next: (u) => (this.users = u), error: (e) => this.handle(e) });
    this.api.getAdminMatches().subscribe({ next: (m) => (this.matches = m), error: (e) => this.handle(e) });
    this.api.getAdminHistory().subscribe({ next: (h) => (this.history = h), error: (e) => this.handle(e) });
  }

  toggleStatus(account: Account): void {
    const next = account.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.api.setAccountStatus(account.id, next).subscribe({
      next: (updated) => (account.status = updated.status),
      error: (e) => this.handle(e)
    });
  }

  private handle(err: any): void {
    if (err?.status === 403) {
      this.error = 'You do not have permission to view this data.';
    } else if (err?.status === 401) {
      this.error = 'Please sign in as an administrator.';
    } else {
      this.error = 'Could not load administrative data.';
    }
  }
}
