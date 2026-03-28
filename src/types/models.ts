export type MatchOutcome = '2-0' | '0-2' | '1-1';

export type MatchStatus = 'scheduled' | 'completed';

export interface PointRules {
  straightWin: number;
  drawHigherScore: number;
  drawLowerScore: number;
  drawEqualScore: number;
  straightLoss: number;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  pointRules: PointRules;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchSetScore {
  home: number;
  away: number;
}

export interface MatchPoints {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  setScores: MatchSetScore[];
  totalScore: MatchSetScore;
  outcome: MatchOutcome | null;
  points: MatchPoints;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}
