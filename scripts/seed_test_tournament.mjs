// テスト用の大会＋27チーム（くじ番号1〜27をシャッフルして付与）をFirestoreに投入する。
// 使い方（リポジトリ直下で）:
//   node scripts/seed_test_tournament.mjs
//   → 管理者のメールアドレスとパスワードを聞かれるので入力（teams の書き込みは認証が必要なため）
//   環境変数 ADMIN_EMAIL / ADMIN_PASSWORD があればそれを使う（プロンプトなし）
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, getFirestore, writeBatch, doc } from 'firebase/firestore';

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

let email = process.env.ADMIN_EMAIL;
let password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  const rl = createInterface({ input: stdin, output: stdout });
  email = email || (await rl.question('管理者メールアドレス: '));
  password = password || (await rl.question('パスワード: '));
  rl.close();
}

await signInWithEmailAndPassword(getAuth(app), email.trim(), password);
const db = getFirestore(app);
const now = new Date().toISOString();

const tournamentRef = await addDoc(collection(db, 'tournaments'), {
  name: 'テスト大会（27チーム）',
  date: '2026-10-18',
  pointRules: { straightWin: 3, drawHigherScore: 2, drawLowerScore: 1, drawEqualScore: 1, straightLoss: 0 },
  matchesOrderVersion: 0,
  createdAt: now,
  updatedAt: now,
});

// くじ番号1〜27をシャッフル（生成結果がチーム名順にならないように）
const numbers = Array.from({ length: 27 }, (_, i) => i + 1);
for (let i = numbers.length - 1; i > 0; i -= 1) {
  const j = Math.floor(Math.random() * (i + 1));
  [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
}

const batch = writeBatch(db);
numbers.forEach((drawNumber, i) => {
  const t = new Date(Date.now() + i).toISOString(); // 登録順を保つ
  batch.set(doc(collection(db, 'teams')), {
    tournamentId: tournamentRef.id,
    name: `テスト${String(i + 1).padStart(2, '0')}`,
    drawNumber,
    createdAt: t,
    updatedAt: t,
  });
});
await batch.commit();

console.log(`完了: 大会「テスト大会（27チーム）」(${tournamentRef.id}) に27チームを登録しました。`);
console.log('アプリで大会を選んで「三角形予選の生成」を開いてください。終わったら「選択中の大会を削除」で消せます。');
process.exit(0);
