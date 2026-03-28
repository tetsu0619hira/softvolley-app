import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
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
    items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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

  const timestamp = nowIso();
  await addDoc(collection(db, COLLECTIONS.matches), {
    tournamentId,
    homeTeamId,
    awayTeamId,
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
