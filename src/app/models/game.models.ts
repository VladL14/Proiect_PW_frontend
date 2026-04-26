export interface Player {
  id?: string;
  name: string;
  hearts: number;
  tokens: number;
}

export interface Match {
  id?: string;
  status: string;
  players: Player[];
}