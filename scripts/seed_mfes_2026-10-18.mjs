// M-fes（2026-10-18・27チーム）の本番データを投入する。
// 先にテスト大会（TgOsPCZSsibGG3jMJv7A）をチーム・試合ごと削除してから、M-fes を作成する。
// くじ番号は当日引くので入れない。
// 使い方: ADMIN_EMAIL=... ADMIN_PASSWORD='...' node scripts/seed_mfes_2026-10-18.mjs
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, where, writeBatch,
} from 'firebase/firestore';

const TEST_TOURNAMENT_ID = 'TgOsPCZSsibGG3jMJv7A';
const TOURNAMENT_NAME = 'M-fes';
const TOURNAMENT_DATE = '2026-10-18';
const TEAMS = [
  '無鉄砲', 'ピエロ', 'ムーミン', 'ちはやふる', 'AGpals', 'M', '１３０', '余韻族', 'はりゅ',
  'EPOCH', 'ユナイト', 'さとぅー', 'スリンキー', 'ホリホリ', '琥珀', 'ZiZi', 'ZOO', '天狗',
  'ちたたぷ', 'リコークラブ', 'Golden Eggs', 'SUGAR', 'メイプル', 'ラッキーセブン', 'Tiara',
  'MAZZEL', 'mild zoom',
];
if (TEAMS.length !== 27) throw new Error(`チーム数が27ではありません: ${TEAMS.length}`);

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);
const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('ADMIN_EMAIL と ADMIN_PASSWORD を環境変数で渡してください。');
await signInWithEmailAndPassword(getAuth(app), ADMIN_EMAIL.trim(), ADMIN_PASSWORD);
const db = getFirestore(app);

// 1) テスト大会を削除（存在すれば）
const testRef = doc(db, 'tournaments', TEST_TOURNAMENT_ID);
if ((await getDoc(testRef)).exists()) {
  const [teamsSnap, matchesSnap] = await Promise.all([
    getDocs(query(collection(db, 'teams'), where('tournamentId', '==', TEST_TOURNAMENT_ID))),
    getDocs(query(collection(db, 'matches'), where('tournamentId', '==', TEST_TOURNAMENT_ID))),
  ]);
  const batch = writeBatch(db);
  teamsSnap.docs.forEach((d) => batch.delete(d.ref));
  matchesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(testRef);
  await batch.commit();
  console.log(`テスト大会を削除: チーム${teamsSnap.size}件・試合${matchesSnap.size}件`);
} else {
  console.log('テスト大会は見つかりませんでした（削除済み）');
}

// 2) 同名の大会が既にあれば二重作成しない
const dup = (await getDocs(query(collection(db, 'tournaments'), where('name', '==', TOURNAMENT_NAME)))).size;
if (dup > 0) throw new Error(`大会「${TOURNAMENT_NAME}」は既に ${dup} 件あります。アプリで削除してから再実行してください。`);

// 3) M-fes を作成
const now = new Date().toISOString();
const tournamentRef = await addDoc(collection(db, 'tournaments'), {
  name: TOURNAMENT_NAME,
  date: TOURNAMENT_DATE,
  pointRules: { straightWin: 3, drawHigherScore: 2, drawLowerScore: 1, drawEqualScore: 1, straightLoss: 0 },
  matchesOrderVersion: 0,
  createdAt: now,
  updatedAt: now,
});
const batch = writeBatch(db);
TEAMS.forEach((name, i) => {
  const t = new Date(Date.now() + i).toISOString(); // 一覧の並びを上の順に保つ
  batch.set(doc(collection(db, 'teams')), { tournamentId: tournamentRef.id, name, createdAt: t, updatedAt: t });
});
await batch.commit();
console.log(`完了: 大会「${TOURNAMENT_NAME}」(${tournamentRef.id}) に27チームを登録しました（くじ番号は未入力）。`);
process.exit(0);
