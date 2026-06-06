import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { ApiService } from '../../services/api';
import { Emote } from '../../models/game.models';

/**
 * Social emote bar shown during a match.
 *
 * The user picks an emote from a fixed palette; the request is validated by the
 * backend (membership + 3s cooldown). Incoming emotes from every participant are
 * polled reactively and rendered as floating bubbles, with a short HTML5
 * WebAudio chime as feedback. A local cooldown timer mirrors the server rule so
 * the button is visibly disabled while waiting.
 */
@Component({
  selector: 'app-emote-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emote-bar.html',
  styleUrl: './emote-bar.css'
})
export class EmoteBarComponent implements OnInit, OnDestroy {
  @Input() matchId!: string;
  @Input() playerId!: string;

  readonly palette: { code: string; glyph: string }[] = [
    { code: 'WAVE', glyph: '👋' },
    { code: 'GG', glyph: '🤝' },
    { code: 'LAUGH', glyph: '😂' },
    { code: 'ANGRY', glyph: '😠' },
    { code: 'THINK', glyph: '🤔' },
    { code: 'NICE', glyph: '👍' },
    { code: 'FIRE', glyph: '🔥' },
    { code: 'SKULL', glyph: '💀' },
    { code: 'CLAP', glyph: '👏' },
    { code: 'CRY', glyph: '😢' }
  ];

  recent: Emote[] = [];
  cooldownRemaining = 0;
  error = '';

  private lastTimestamp = 0;
  private pollSub?: Subscription;
  private cooldownSub?: Subscription;
  private readonly cooldownMs = 3000;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // Reactive polling: pull the recent emote feed for everyone in the match.
    this.pollSub = interval(1500).subscribe(() => this.fetchEmotes());
    this.fetchEmotes();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.cooldownSub?.unsubscribe();
  }

  glyphFor(code: string): string {
    return this.palette.find((entry) => entry.code === code)?.glyph ?? '💬';
  }

  send(code: string): void {
    if (this.cooldownRemaining > 0 || !this.matchId || !this.playerId) {
      return;
    }
    this.api.sendEmote(this.matchId, this.playerId, code).subscribe({
      next: (emote) => {
        this.error = '';
        this.playChime();
        this.startCooldown();
        this.pushEmote(emote);
      },
      error: (err) => {
        if (err.status === 429) {
          this.error = 'Slow down – emote cooldown active.';
          this.startCooldown();
        } else if (err.status === 400) {
          this.error = 'You cannot emote in this match.';
        } else {
          this.error = 'Emote failed.';
        }
      }
    });
  }

  private fetchEmotes(): void {
    if (!this.matchId) {
      return;
    }
    this.api.getEmotes(this.matchId, this.lastTimestamp).subscribe({
      next: (emotes) => emotes.forEach((emote) => this.pushEmote(emote)),
      error: () => {}
    });
  }

  private pushEmote(emote: Emote): void {
    if (this.recent.some((existing) => existing.id === emote.id)) {
      return;
    }
    this.lastTimestamp = Math.max(this.lastTimestamp, emote.timestamp);
    this.recent = [...this.recent, emote].slice(-6);
    // Auto-expire bubbles after a few seconds.
    setTimeout(() => {
      this.recent = this.recent.filter((existing) => existing.id !== emote.id);
    }, 5000);
  }

  private startCooldown(): void {
    this.cooldownRemaining = this.cooldownMs;
    this.cooldownSub?.unsubscribe();
    this.cooldownSub = interval(100).subscribe(() => {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - 100);
      if (this.cooldownRemaining === 0) {
        this.cooldownSub?.unsubscribe();
      }
    });
  }

  private playChime(): void {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) {
        return;
      }
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      /* audio is best-effort */
    }
  }
}
