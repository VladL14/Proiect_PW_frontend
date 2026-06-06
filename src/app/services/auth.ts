import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Account, AuthResponse, Role } from '../models/game.models';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'dd_token';
const ACCOUNT_KEY = 'dd_account';

/**
 * Reactive authentication state.
 *
 * The token and account snapshot are persisted in localStorage (guarded for
 * SSR) and exposed as observables so the whole UI reacts automatically to
 * login/logout. The frontend only ever *hides* or *shows* options based on the
 * role here; the backend remains the authoritative gate for every action.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = environment.apiBaseUrl;
  private readonly isBrowser: boolean;

  private tokenSubject = new BehaviorSubject<string | null>(null);
  private accountSubject = new BehaviorSubject<Account | null>(null);

  token$ = this.tokenSubject.asObservable();
  account$ = this.accountSubject.asObservable();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      const token = localStorage.getItem(TOKEN_KEY);
      const account = localStorage.getItem(ACCOUNT_KEY);
      if (token) {
        this.tokenSubject.next(token);
      }
      if (account) {
        try {
          this.accountSubject.next(JSON.parse(account));
        } catch {
          /* ignore corrupt cache */
        }
      }
    }
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get account(): Account | null {
    return this.accountSubject.value;
  }

  get role(): Role {
    return this.accountSubject.value?.role ?? 'GUEST';
  }

  get isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  register(username: string, email: string, password: string, displayName?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, { username, email, password, displayName })
      .pipe(tap((res) => this.persist(res)));
  }

  login(usernameOrEmail: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, { usernameOrEmail, password })
      .pipe(tap((res) => this.persist(res)));
  }

  logout(): void {
    if (this.token) {
      // Best-effort server-side revocation; local state is cleared regardless.
      this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe({ error: () => {} });
    }
    this.clear();
  }

  private persist(res: AuthResponse): void {
    this.tokenSubject.next(res.token);
    this.accountSubject.next(res.account);
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(res.account));
    }
  }

  private clear(): void {
    this.tokenSubject.next(null);
    this.accountSubject.next(null);
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ACCOUNT_KEY);
    }
  }
}
