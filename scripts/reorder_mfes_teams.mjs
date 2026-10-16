// M-fes（本番）のチーム一覧の並びを要項の順に揃える（createdAt だけを書き換える・名前・くじ番号は触らない）
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, getFirestore, query, where, writeBatch } from 'firebase/firestore';
const TOURNAMENT_ID = 'TwYxsZCfswRIydmbv4g3';
const TEAMS = [
  '無鉄砲', 'ピエロ', 'ムーミン', 'ちはやふる', 'AGpals', 'M', '１３０', '余韻族', 'はりゅ',
  'EPOCH', 'ユナイト', 'さとぅー', 'スリンキー', 'ホリホリ', '琥珀', 'ZiZi', 'ZOO', '天狗',
  'ちたたぷ', 'リコークラブ', 'Golden Eggs', 'SUGAR', 'メイプル', 'ラッキーセブン', 'Tiara',
  'MAZZEL', 'mild zoom',
];
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const app = initializeApp({ apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, appId: env.EXPO_PUBLIC_FIREBASE_APP_ID });
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? env.ADMIN_EMAIL; const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? env.ADMIN_PASSWORD;
await signInWithEmailAndPassword(getAuth(app), ADMIN_EMAIL.trim(), ADMIN_PASSWORD);
const db = getFirestore(app);
const snap = await getDocs(query(collection(db, 'teams'), where('tournamentId', '==', TOURNAMENT_ID)));
if (snap.size !== 27) throw new Error(`チーム数が27ではありません: ${snap.size}`);
const base = Math.min(...snap.docs.map((d) => new Date(d.data().createdAt).getTime()));
const batch = writeBatch(db);
snap.docs.forEach((d) => {
  const idx = TEAMS.indexOf(d.data().name);
  if (idx < 0) throw new Error(`要項にないチーム: ${d.data().name}`);
  batch.update(d.ref, { createdAt: new Date(base + idx * 1000).toISOString() });
});
await batch.commit();
console.log('並びを要項順に揃えました。');
process.exit(0);
