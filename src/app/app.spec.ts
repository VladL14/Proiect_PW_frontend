import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { ApiService } from './services/api';
import { AuthService } from './services/auth';

describe('App', () => {
  const apiServiceStub = {
    getPlayers: () => of([]),
    getMatches: () => of([]),
    getPlayerAbilities: () => of([]),
    getEmotes: () => of([])
  };

  const authServiceStub = {
    account$: of(null),
    token: null,
    role: 'GUEST',
    isAuthenticated: false,
    isAdmin: false,
    login: () => of({}),
    register: () => of({}),
    logout: () => {}
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ApiService, useValue: apiServiceStub },
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the lobby title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Dice Duel');
  });
});
