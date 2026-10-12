// M-fes の練習用大会「M-fes（テスト）」を作る（本番と同じ27チーム・くじ番号1〜27をランダムで入力済み）。
// あわせて 9/27 の大会 M-1・M-2 をチーム・試合ごと削除する（2026-10-12ヒラ指示）。
// 使い方: ADMIN_EMAIL=... ADMIN_PASSWORD='...' node scripts/seed_mfes_test.mjs
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc, collection, doc, getDoc, getDocs, getFirestore, query, where, writeBatch,
} from 'firebase/firestore';

const DELETE_IDS = { 'M-1': 'FV0Lv3Fku1nGXLO10Isg', 'M-2': 'RaM8DVu1dOe3xecxMue7' };
const TOURNAMENT_NAME = 'M-fes（テスト）';
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

// 1) M-1・M-2 を削除
for (const [name, id] of Object.entries(DELETE_IDS)) {
  const ref = doc(db, 'tournaments', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) { console.log(`${name}: 見つかりません（削除済み）`); continue; }
  if (snap.data().name !== name) throw new Error(`${id} の大会名が ${snap.data().name} です。削除を中止します。`);
  const [teamsSnap, matchesSnap] = await Promise.all([
    getDocs(query(collection(db, 'teams'), where('tournamentId', '==', id))),
    getDocs(query(collection(db, 'matches'), where('tournamentId', '==', id))),
  ]);
  const batch = writeBatch(db);
  teamsSnap.docs.forEach((d) => batch.delete(d.ref));
  matchesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  await batch.commit();
  console.log(`${name} を削除: チーム${teamsSnap.size}件・試合${matchesSnap.size}件`);
}

// 2) 同名の大会があれば二重作成しない
const dup = (await getDocs(query(collection(db, 'tournaments'), where('name', '==', TOURNAMENT_NAME)))).size;
if (dup > 0) throw new Error(`大会「${TOURNAMENT_NAME}」は既に ${dup} 件あります。アプリで削除してから再実行してください。`);

// 3) テスト大会を作成（くじ番号はシャッフル）
const numbers = Array.from({ length: 27 }, (_, i) => i + 1);
for (let i = numbers.length - 1; i > 0; i -= 1) {
  const j = Math.floor(Math.random() * (i + 1));
  [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
}
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
  const t = new Date(Date.now() + i).toISOString();
  batch.set(doc(collection(db, 'teams')), {
    tournamentId: tournamentRef.id, name, drawNumber: numbers[i], createdAt: t, updatedAt: t,
  });
});
await batch.commit();
console.log(`完了: 大会「${TOURNAMENT_NAME}」(${tournamentRef.id}) に27チームをくじ番号付きで登録しました。`);
process.exit(0);
