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
  matchesOrderVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  /** 当日のくじ番号（三角形予選の生成に使う・未設定可） */
  drawNumber?: number;
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
  displayOrder?: number;
  /** 三角形予選のラウンド（1〜3）。手動作成の試合には無い */
  round?: number;
  /** コート番号（1〜9） */
  court?: number;
  /** コート内の通し試合番号（1〜9・ラウンドをまたいで連番） */
  gameNo?: number;
  refereeTeamId?: string;
  /** 三角形予選の自動生成で作られた試合 */
  generated?: boolean;
  setScores: MatchSetScore[];
  totalScore: MatchSetScore;
  outcome: MatchOutcome | null;
  points: MatchPoints;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}
