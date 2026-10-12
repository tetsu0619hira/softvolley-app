// 三角形予選（27チーム・9コート・3ラウンド）の組み合わせ生成。
// Firestore に依存しない純粋関数だけを置く（node --test で単体テストできるように、相対importもしない）。

export const TRIANGLE_TEAM_COUNT = 27;
export const TRIANGLE_COURT_COUNT = 9;
export const TRIANGLE_ROUND_COUNT = 3;
/** コート番号（1〜9）を会場の表記 A〜I に変換する */
export function courtLetter(court: number): string {
  return String.fromCharCode(64 + court);
}

/** 試合一覧などに出す短いラベル。例: Aコートの第4試合（第2ラウンドの1試合目） → "A-4" */
export function courtGameLabel(court: number, gameNo: number): string {
  return `${courtLetter(court)}-${gameNo}`;
}

export const TRIANGLE_MATCH_COUNT =
  TRIANGLE_COURT_COUNT * TRIANGLE_ROUND_COUNT * 3;

/** くじ番号ベースの1試合分（チームIDに置き換える前） */
export interface TriangleSlot {
  round: number;
  court: number;
  gameNo: number;
  homeDraw: number;
  awayDraw: number;
  refereeDraw: number;
  displayOrder: number;
}

/** チームIDに置き換えた1試合分 */
export interface TriangleMatchSpec {
  round: number;
  court: number;
  gameNo: number;
  homeTeamId: string;
  awayTeamId: string;
  refereeTeamId: string;
  displayOrder: number;
}

export interface DrawTeam {
  id: string;
  drawNumber?: number | null;
}

export interface DrawAssignmentCheck {
  teamCount: number;
  assignedCount: number;
  /** 2チーム以上に付いている番号 */
  duplicates: number[];
  /** 1〜27以外（整数でないものも含む） */
  outOfRange: number[];
  /** 1〜27のうち誰にも付いていない番号 */
  missing: number[];
  canGenerate: boolean;
}

/** ラウンド round でくじ番号 n が入る組（＝コート番号 1〜9） */
export function courtForDraw(round: number, n: number): number {
  const i = n - 1;
  switch (round) {
    case 1:
      return Math.floor(i / 3) + 1;
    case 2:
      return (i % 9) + 1;
    case 3:
      return Math.floor(i / 9) * 3 + (i % 3) + 1;
    default:
      throw new Error(`ラウンド番号が不正です: ${round}`);
  }
}

/** ラウンドごとの組（コート順・組内は番号の小さい順） */
export function buildTriangleGroups(round: number): number[][] {
  const groups: number[][] = Array.from({ length: TRIANGLE_COURT_COUNT }, () => []);
  for (let n = 1; n <= TRIANGLE_TEAM_COUNT; n += 1) {
    groups[courtForDraw(round, n) - 1].push(n);
  }
  return groups;
}

/**
 * 81試合分の枠をくじ番号で作る。組内は A-B（審判C）→ B-C（審判A）→ A-C（審判B）の順。
 * gameNo はコートごとの通し番号（R1=1〜3・R2=4〜6・R3=7〜9）でラウンドをまたいでもリセットしない。
 */
export function generateTriangleSlots(): TriangleSlot[] {
  const slots: TriangleSlot[] = [];
  for (let round = 1; round <= TRIANGLE_ROUND_COUNT; round += 1) {
    buildTriangleGroups(round).forEach((group, courtIndex) => {
      const [a, b, c] = group;
      const games: [number, number, number][] = [
        [a, b, c],
        [b, c, a],
        [a, c, b],
      ];
      games.forEach(([home, away, referee], gameIndex) => {
        slots.push({
          round,
          court: courtIndex + 1,
          gameNo: (round - 1) * games.length + gameIndex + 1,
          homeDraw: home,
          awayDraw: away,
          refereeDraw: referee,
          displayOrder: slots.length,
        });
      });
    });
  }
  return slots;
}

export function checkDrawAssignments(teams: DrawTeam[]): DrawAssignmentCheck {
  const counts = new Map<number, number>();
  const outOfRange: number[] = [];
  let assignedCount = 0;

  teams.forEach((team) => {
    const n = team.drawNumber;
    if (typeof n !== 'number' || !Number.isFinite(n)) return;
    assignedCount += 1;
    if (!Number.isInteger(n) || n < 1 || n > TRIANGLE_TEAM_COUNT) {
      outOfRange.push(n);
      return;
    }
    counts.set(n, (counts.get(n) ?? 0) + 1);
  });

  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([n]) => n)
    .sort((a, b) => a - b);
  const missing: number[] = [];
  for (let n = 1; n <= TRIANGLE_TEAM_COUNT; n += 1) {
    if (!counts.has(n)) missing.push(n);
  }

  return {
    teamCount: teams.length,
    assignedCount,
    duplicates,
    outOfRange: outOfRange.sort((a, b) => a - b),
    missing,
    canGenerate:
      teams.length === TRIANGLE_TEAM_COUNT &&
      duplicates.length === 0 &&
      outOfRange.length === 0 &&
      missing.length === 0,
  };
}

/** くじ番号付きのチーム一覧から81試合を作る。条件を満たさなければ例外 */
export function buildTriangleMatches(teams: DrawTeam[]): TriangleMatchSpec[] {
  const check = checkDrawAssignments(teams);
  if (!check.canGenerate) {
    throw new Error('チーム数が27、くじ番号が1〜27を1回ずつ使っている必要があります。');
  }

  const teamIdByDraw = new Map<number, string>();
  teams.forEach((team) => {
    if (typeof team.drawNumber === 'number') teamIdByDraw.set(team.drawNumber, team.id);
  });
  const idOf = (n: number) => {
    const id = teamIdByDraw.get(n);
    if (!id) throw new Error(`くじ番号 ${n} のチームが見つかりません。`);
    return id;
  };

  return generateTriangleSlots().map((slot) => ({
    round: slot.round,
    court: slot.court,
    gameNo: slot.gameNo,
    homeTeamId: idOf(slot.homeDraw),
    awayTeamId: idOf(slot.awayDraw),
    refereeTeamId: idOf(slot.refereeDraw),
    displayOrder: slot.displayOrder,
  }));
}
