import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player, Match } from '../models/game.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.baseUrl}/players`);
  }

  createPlayer(name: string): Observable<Player> {
    return this.http.post<Player>(`${this.baseUrl}/players`, { name });
  }

  getMatches(): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.baseUrl}/matches`);
  }

  createMatch(hostPlayerId: string, maxPlayers: number = 4): Observable<Match> {
    return this.http.post<Match>(`${this.baseUrl}/matches`, { 
      hostPlayerId: hostPlayerId, 
      maxPlayers: maxPlayers 
    });
  }
}