// M-fes（本番・TwYxsZCfswRIydmbv4g3）に足りないチームを追加する（既存チーム・試合は触らない・くじ番号は入れない）。
// 一覧の並びが要項と同じになるよう、createdAt は直前のチームの直後に置く。何度実行しても二重登録しない。
// 使い方: node scripts/add_missing_mfes_teams.mjs
//   管理者の認証情報は環境変数 ADMIN_EMAIL / ADMIN_PASSWORD、または .env の同名キーから読む。
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, query, where, writeBatch } from 'firebase/firestore';

const TOURNAMENT_ID = 'TwYxsZCfswRIydmbv4g3';
const TOURNAMENT_NAME = 'M-fes';
const TEAMS = [
  '無鉄砲', 'ピエロ', 'ムーミン', 'ちはやふる', 'AGpals', 'M', '１３０', '余韻族', 'はりゅ',
  'EPOCH', 'ユナイト', 'さとぅー', 'スリンキー', 'ホリホリ', '琥珀', 'ZiZi', 'ZOO', '天狗',
  'ちたたぷ', 'リコークラブ', 'Golden Eggs', 'SUGAR', 'メイプル', 'ラッキーセブン', 'Tiara',
  'MAZZEL', 'mild zoom',
];
if (TEAMS.length !== 27) throw new Error(`チーム数が27ではありません: ${TEAMS.length}`);

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('ADMIN_EMAIL と ADMIN_PASSWORD を環境変数か .env で渡してください。');
await signInWithEmailAndPassword(getAuth(app), ADMIN_EMAIL.trim(), ADMIN_PASSWORD);
const db = getFirestore(app);

const tSnap = await getDoc(doc(db, 'tournaments', TOURNAMENT_ID));
if (!tSnap.exists() || tSnap.data().name !== TOURNAMENT_NAME) throw new Error(`大会 ${TOURNAMENT_ID} が「${TOURNAMENT_NAME}」ではありません。中止します。`);

const existing = (await getDocs(query(collection(db, 'teams'), where('tournamentId', '==', TOURNAMENT_ID)))).docs.map((d) => d.data());
const byName = new Map(existing.map((t) => [t.name, t]));
const missing = TEAMS.filter((n) => !byName.has(n));
console.log(`現在 ${existing.length} チーム。追加対象: ${missing.length ? missing.join('・') : 'なし'}`);
if (!missing.length) process.exit(0);

// 直前の既存チームの createdAt の直後（+1ms ずつ）に置く
const plusMs = (iso, ms) => new Date(new Date(iso).getTime() + ms).toISOString();
const batch = writeBatch(db);
missing.forEach((name) => {
  const idx = TEAMS.indexOf(name);
  const prev = TEAMS.slice(0, idx).reverse().find((n) => byName.has(n));
  const base = prev ? byName.get(prev).createdAt : plusMs(existing[0]?.createdAt ?? new Date().toISOString(), -1000);
  const t = plusMs(base, 1 + (idx - (prev ? TEAMS.indexOf(prev) : -1)));
  const data = { tournamentId: TOURNAMENT_ID, name, createdAt: t, updatedAt: t };
  byName.set(name, data);
  batch.set(doc(collection(db, 'teams')), data);
});
await batch.commit();
console.log(`完了: ${missing.length} チームを追加しました（くじ番号は未入力）。`);
process.exit(0);
