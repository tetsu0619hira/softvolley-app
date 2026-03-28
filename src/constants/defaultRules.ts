import { PointRules } from '../types/models';

export const DEFAULT_POINT_RULES = {
  straightWin: 3,
  drawHigherScore: 2,
  drawLowerScore: 1,
  drawEqualScore: 1,
  straightLoss: 0,
} as const satisfies PointRules;

export function normalizePointRules(rules?: Partial<PointRules> | null): PointRules {
  return {
    straightWin: rules?.straightWin ?? DEFAULT_POINT_RULES.straightWin,
    drawHigherScore: rules?.drawHigherScore ?? DEFAULT_POINT_RULES.drawHigherScore,
    drawLowerScore: rules?.drawLowerScore ?? DEFAULT_POINT_RULES.drawLowerScore,
    drawEqualScore: rules?.drawEqualScore ?? DEFAULT_POINT_RULES.drawEqualScore,
    straightLoss: rules?.straightLoss ?? DEFAULT_POINT_RULES.straightLoss,
  };
}

export const SOFT_VOLLEY_RULES_DESCRIPTION = [
  '1セット15点先取（デュース時は17点上限）',
  '2セット制・フルセットなし',
  '結果パターン: 2-0 / 0-2 / 1-1',
];
