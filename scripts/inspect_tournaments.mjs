// 大会とチームの現状を読むだけ（認証不要・書き込みなし）
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const app = initializeApp({ apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, appId: env.EXPO_PUBLIC_FIREBASE_APP_ID });
const db = getFirestore(app);
const ts = await getDocs(collection(db, 'tournaments'));
for (const t of ts.docs) {
  const d = t.data();
  const teams = await getDocs(query(collection(db, 'teams'), where('tournamentId', '==', t.id)));
  const matches = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', t.id)));
  console.log(`\n## ${d.name} (${t.id}) date=${d.date} teams=${teams.size} matches=${matches.size}`);
  teams.docs.map((x) => x.data()).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
    .forEach((x) => console.log(`  ${x.drawNumber ?? '-'}\t${x.name}`));
}
process.exit(0);
