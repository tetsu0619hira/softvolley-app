// 実行: npm test（Node 22.6+ の型ストリップで .ts を直接実行する）
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildTriangleGroups,
  buildTriangleMatches,
  checkDrawAssignments,
  courtForDraw,
  generateTriangleSlots,
  TRIANGLE_MATCH_COUNT,
} from './triangleSchedule.ts';

const makeTeams = () =>
  Array.from({ length: 27 }, (_, i) => ({ id: `team-${i + 1}`, drawNumber: 27 - i }));

test('各ラウンドの組が仕様どおり', () => {
  assert.deepEqual(buildTriangleGroups(1)[0], [1, 2, 3]);
  assert.deepEqual(buildTriangleGroups(1)[8], [25, 26, 27]);
  assert.deepEqual(buildTriangleGroups(2)[0], [1, 10, 19]);
  assert.deepEqual(buildTriangleGroups(2)[8], [9, 18, 27]);
  assert.deepEqual(buildTriangleGroups(3)[0], [1, 4, 7]);
  assert.deepEqual(buildTriangleGroups(3)[3], [10, 13, 16]);
  assert.deepEqual(buildTriangleGroups(3)[8], [21, 24, 27]);
  assert.equal(courtForDraw(3, 27), 9);
});

test('81試合・各チーム6試合・審判3回・相手重複なし', () => {
  const slots = generateTriangleSlots();
  assert.equal(slots.length, TRIANGLE_MATCH_COUNT);

  const games = new Map<number, number>();
  const refs = new Map<number, number>();
  const pairs = new Set<string>();
  slots.forEach((s) => {
    assert.ok(s.homeDraw < s.awayDraw, 'ホームは番号の小さい方');
    const key = `${s.homeDraw}-${s.awayDraw}`;
    assert.ok(!pairs.has(key), `重複: ${key}`);
    pairs.add(key);
    games.set(s.homeDraw, (games.get(s.homeDraw) ?? 0) + 1);
    games.set(s.awayDraw, (games.get(s.awayDraw) ?? 0) + 1);
    refs.set(s.refereeDraw, (refs.get(s.refereeDraw) ?? 0) + 1);
  });
  for (let n = 1; n <= 27; n += 1) {
    assert.equal(games.get(n), 6);
    assert.equal(refs.get(n), 3);
  }
});

test('並び順と試合順（A-B / B-C / A-C・コート内通し番号）', () => {
  const slots = generateTriangleSlots();
  assert.deepEqual(
    slots.slice(0, 3).map((s) => [s.round, s.court, s.gameNo, s.homeDraw, s.awayDraw, s.refereeDraw]),
    [
      [1, 1, 1, 1, 2, 3],
      [1, 1, 2, 2, 3, 1],
      [1, 1, 3, 1, 3, 2],
    ],
  );
  assert.deepEqual([slots[27].round, slots[27].court, slots[27].gameNo], [2, 1, 4]);
  assert.deepEqual([slots[80].round, slots[80].court, slots[80].gameNo], [3, 9, 9]);
  for (let court = 1; court <= 9; court += 1) {
    const nos = slots.filter((s) => s.court === court).map((s) => s.gameNo);
    assert.deepEqual(nos, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
  slots.forEach((s, i) => assert.equal(s.displayOrder, i));
});

test('くじ番号のチェック', () => {
  assert.equal(checkDrawAssignments(makeTeams()).canGenerate, true);

  const dup = makeTeams();
  dup[0].drawNumber = 1;
  const dupCheck = checkDrawAssignments(dup);
  assert.equal(dupCheck.canGenerate, false);
  assert.deepEqual(dupCheck.duplicates, [1]);
  assert.deepEqual(dupCheck.missing, [27]);

  const out = makeTeams();
  out[0].drawNumber = 28;
  assert.deepEqual(checkDrawAssignments(out).outOfRange, [28]);

  assert.equal(checkDrawAssignments(makeTeams().slice(0, 26)).canGenerate, false);
  assert.throws(() => buildTriangleMatches(makeTeams().slice(0, 26)));
});

test('チームIDへの置き換え', () => {
  const matches = buildTriangleMatches(makeTeams());
  assert.equal(matches.length, 81);
  // くじ1番 = team-27, 2番 = team-26, 3番 = team-25
  assert.deepEqual(matches[0], {
    round: 1,
    court: 1,
    gameNo: 1,
    homeTeamId: 'team-27',
    awayTeamId: 'team-26',
    refereeTeamId: 'team-25',
    displayOrder: 0,
  });
});
