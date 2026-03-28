import { MatchOutcome, MatchSetScore } from '../types/models';

function isValidSetScore(home: number, away: number): boolean {
  if (home === away) return false;
  if (home < 0 || away < 0) return false;

  const winnerScore = Math.max(home, away);
  const loserScore = Math.min(home, away);

  if (winnerScore < 15 || winnerScore > 17) return false;
  if (winnerScore === 15) return loserScore <= 13;
  if (winnerScore === 16) return loserScore === 14;

  return loserScore >= 15 && loserScore <= 16;
}

export function validateTwoSetScores(setScores: MatchSetScore[]): boolean {
  if (setScores.length !== 2) return false;
  return setScores.every((set) => isValidSetScore(set.home, set.away));
}

export function detectOutcome(setScores: MatchSetScore[]): MatchOutcome | null {
  if (!validateTwoSetScores(setScores)) return null;

  let homeSetWin = 0;
  let awaySetWin = 0;

  for (const set of setScores) {
    if (set.home > set.away) {
      homeSetWin += 1;
    } else {
      awaySetWin += 1;
    }
  }

  if (homeSetWin === 2) return '2-0';
  if (awaySetWin === 2) return '0-2';
  return '1-1';
}
