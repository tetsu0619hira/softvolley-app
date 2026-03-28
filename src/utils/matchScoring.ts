import { PointRules } from '../types/models';
import { detectOutcome } from './scoreValidation';

interface ScorePair {
  home: number;
  away: number;
}

export function calculateTotalScore(setScores: ScorePair[]): ScorePair {
  return setScores.reduce(
    (acc, set) => ({
      home: acc.home + set.home,
      away: acc.away + set.away,
    }),
    { home: 0, away: 0 },
  );
}

export function calculateMatchPoints(setScores: ScorePair[], rules: PointRules): ScorePair {
  const outcome = detectOutcome(setScores);
  const total = calculateTotalScore(setScores);

  if (outcome === '2-0') {
    return { home: rules.straightWin, away: rules.straightLoss };
  }

  if (outcome === '0-2') {
    return { home: rules.straightLoss, away: rules.straightWin };
  }

  if (outcome === '1-1') {
    if (total.home > total.away) {
      return { home: rules.drawHigherScore, away: rules.drawLowerScore };
    }

    if (total.home < total.away) {
      return { home: rules.drawLowerScore, away: rules.drawHigherScore };
    }

    return { home: rules.drawEqualScore, away: rules.drawEqualScore };
  }

  return { home: 0, away: 0 };
}
