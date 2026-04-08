import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DEFAULT_POINT_RULES, normalizePointRules } from '../constants/defaultRules';
import { Match, MatchSetScore, PointRules, Team, Tournament } from '../types/models';
import { calculateMatchPoints, calculateTotalScore } from '../utils/matchScoring';
import { detectOutcome, validateTwoSetScores } from '../utils/scoreValidation';
import { COLLECTIONS } from './collections';
import { db } from './config';

const nowIso = () => new Date().toISOString();
const fallbackOrder = Number.MAX_SAFE_INTEGER;

type Unsubscribe = () => void;

export function subscribeTournaments(callback: (items: Tournament[]) => void): Unsubscribe {
  if (!db) {
    callback([]);
    return () => undefined;
  }

  const q = query(collection(db, COLLECTIONS.tournaments), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
      pointRules: normalizePointRules((item.data() as Tournament).pointRules),
      matchesOrderVersion: (item.data() as Partial<Tournament>).matchesOrderVersion ?? 0,
    })) as Tournament[];
    callback(items);
  });
}

export function subscribeTeams(
  tournamentId: string | null,
  callback: (items: Team[]) => void,
): Unsubscribe {
  if (!db || !tournamentId) {
    callback([]);
    return () => undefined;
  }

  const q = query(
    collection(db, COLLECTIONS.teams),
    where('tournamentId', '==', tournamentId),
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Team[];
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    callback(items);
  });
}

export function subscribeMatches(
  tournamentId: string | null,
  callback: (items: Match[]) => void,
): Unsubscribe {
  if (!db || !tournamentId) {
    callback([]);
    return () => undefined;
  }

  const q = query(
    collection(db, COLLECTIONS.matches),
    where('tournamentId', '==', tournamentId),
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Match[];
    items.sort((a, b) => {
      const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : fallbackOrder;
      const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : fallbackOrder;
      if (orderA !== orderB) return orderA - orderB;
      return a.createdAt.localeCompare(b.createdAt);
    });
    callback(items);
  });
}

export async function createTournament(name: string, date: string) {
  if (!db) throw new Error('Firebase未設定です。');

  const timestamp = nowIso();
  const created = await addDoc(collection(db, COLLECTIONS.tournaments), {
    name,
    date,
    pointRules: DEFAULT_POINT_RULES,
    matchesOrderVersion: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return created.id;
}

export async function updateTournamentPointRules(tournamentId: string, pointRules: PointRules) {
  if (!db) throw new Error('Firebase未設定です。');
  await updateDoc(doc(db, COLLECTIONS.tournaments, tournamentId), {
    pointRules: normalizePointRules(pointRules),
    updatedAt: nowIso(),
  });
}

export async function deleteTournament(tournamentId: string) {
  if (!db) throw new Error('Firebase未設定です。');
  const dbRef = db;

  const [teamsSnap, matchesSnap] = await Promise.all([
    getDocs(
      query(collection(dbRef, COLLECTIONS.teams), where('tournamentId', '==', tournamentId)),
    ),
    getDocs(
      query(collection(dbRef, COLLECTIONS.matches), where('tournamentId', '==', tournamentId)),
    ),
  ]);

  const deleteTasks: Promise<void>[] = [];
  teamsSnap.docs.forEach((item) => {
    deleteTasks.push(deleteDoc(doc(dbRef, COLLECTIONS.teams, item.id)));
  });
  matchesSnap.docs.forEach((item) => {
    deleteTasks.push(deleteDoc(doc(dbRef, COLLECTIONS.matches, item.id)));
  });

  await Promise.all(deleteTasks);
  await deleteDoc(doc(dbRef, COLLECTIONS.tournaments, tournamentId));
}

export async function createTeam(tournamentId: string, name: string) {
  if (!db) throw new Error('Firebase未設定です。');
  const timestamp = nowIso();
  await addDoc(collection(db, COLLECTIONS.teams), {
    tournamentId,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function deleteTeam(teamId: string, tournamentId: string) {
  if (!db) throw new Error('Firebase未設定です。');
  const dbRef = db;

  const relatedMatchesQuery = query(
    collection(dbRef, COLLECTIONS.matches),
    where('tournamentId', '==', tournamentId),
  );
  const relatedMatches = await getDocs(relatedMatchesQuery);

  const deleteTasks: Promise<void>[] = [];
  relatedMatches.docs.forEach((item) => {
    const data = item.data() as Match;
    if (data.homeTeamId === teamId || data.awayTeamId === teamId) {
      deleteTasks.push(deleteDoc(doc(dbRef, COLLECTIONS.matches, item.id)));
    }
  });

  await Promise.all(deleteTasks);
  await deleteDoc(doc(dbRef, COLLECTIONS.teams, teamId));
}

export async function createMatch(tournamentId: string, homeTeamId: string, awayTeamId: string) {
  if (!db) throw new Error('Firebase未設定です。');

  const existingQuery = query(
    collection(db, COLLECTIONS.matches),
    where('tournamentId', '==', tournamentId),
  );
  const existing = await getDocs(existingQuery);
  const hasDuplicate = existing.docs.some((item) => {
    const data = item.data() as Match;
    return (
      (data.homeTeamId === homeTeamId && data.awayTeamId === awayTeamId) ||
      (data.homeTeamId === awayTeamId && data.awayTeamId === homeTeamId)
    );
  });

  if (hasDuplicate) {
    throw new Error('同じ対戦カードが既に登録されています。');
  }

  const nextDisplayOrder =
    existing.docs.reduce((maxOrder, item) => {
      const value = (item.data() as Partial<Match>).displayOrder;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(maxOrder, value);
      }
      return maxOrder;
    }, -1) + 1;

  const timestamp = nowIso();
  await addDoc(collection(db, COLLECTIONS.matches), {
    tournamentId,
    homeTeamId,
    awayTeamId,
    displayOrder: nextDisplayOrder,
    setScores: [],
    totalScore: { home: 0, away: 0 },
    outcome: null,
    points: { home: 0, away: 0 },
    status: 'scheduled',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export async function deleteMatch(matchId: string) {
  if (!db) throw new Error('Firebase未設定です。');
  await deleteDoc(doc(db, COLLECTIONS.matches, matchId));
}

export async function reorderMatches(
  tournamentId: string,
  matchIdsInOrder: string[],
  expectedVersion: number,
) {
  if (!db) throw new Error('Firebase未設定です。');
  if (matchIdsInOrder.length === 0) return expectedVersion;

  const dbRef = db;
  const updatedAt = nowIso();
  const nextVersion = await runTransaction(dbRef, async (transaction) => {
    const tournamentRef = doc(dbRef, COLLECTIONS.tournaments, tournamentId);
    const tournamentSnap = await transaction.get(tournamentRef);
    if (!tournamentSnap.exists()) {
      throw new Error('大会データが見つかりません。');
    }

    const data = tournamentSnap.data() as Partial<Tournament>;
    const currentVersion = data.matchesOrderVersion ?? 0;
    if (currentVersion !== expectedVersion) {
      throw new Error(
        '並び順の更新が競合しました。最新の表示に更新したうえで、もう一度並び替えてください。',
      );
    }

    matchIdsInOrder.forEach((matchId, index) => {
      transaction.update(doc(dbRef, COLLECTIONS.matches, matchId), {
        displayOrder: index,
        updatedAt,
      });
    });

    const updatedVersion = currentVersion + 1;
    transaction.update(tournamentRef, {
      matchesOrderVersion: updatedVersion,
      updatedAt,
    });
    return updatedVersion;
  });

  return nextVersion;
}

export async function submitMatchResult(
  matchId: string,
  setScores: MatchSetScore[],
  pointRules: PointRules,
) {
  if (!db) throw new Error('Firebase未設定です。');
  if (!validateTwoSetScores(setScores)) {
    throw new Error('セットスコアが不正です。');
  }

  const outcome = detectOutcome(setScores);
  const totalScore = calculateTotalScore(setScores);
  const points = calculateMatchPoints(setScores, pointRules);

  await updateDoc(doc(db, COLLECTIONS.matches, matchId), {
    setScores,
    totalScore,
    outcome,
    points,
    status: 'completed',
    updatedAt: nowIso(),
  });
}
