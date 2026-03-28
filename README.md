# ソフトバレーボール大会管理アプリ

React Native + Expo + Firebase（Firestore / Authentication）で構築するスマホアプリです。

## 技術スタック

- Expo (React Native + TypeScript)
- Firebase Authentication（管理者ログイン用）
- Cloud Firestore（大会・チーム・試合データ）
- React Navigation（主要4画面）

## 現在のプロジェクト構成

```text
softvolley-app/
  src/
    components/
      ScreenContainer.tsx
    constants/
      defaultRules.ts
    firebase/
      collections.ts
      config.ts
      repositories.ts
    hooks/
      useTournamentData.ts
    screens/
      AdminScreen.tsx
      MatchResultInputScreen.tsx
      MatchesListScreen.tsx
      StandingsScreen.tsx
    types/
      models.ts
    utils/
      matchScoring.ts
      scoreValidation.ts
  App.tsx
  firestore.rules
  .env.example
```

## Firebase設定

1. Firebase プロジェクトを作成
2. Authentication でメール/パスワード認証を有効化
3. Firestore を作成
4. `.env.example` をコピーして `.env` を作成し、値を設定

```bash
copy .env.example .env
```

5. Firestore ルールに `firestore.rules` の内容を適用

## Firestoreデータ設計（想定）

- `tournaments`: 大会情報・勝ち点ルール
- `teams`: チーム情報
- `matches`: 試合情報・セットスコア・結果・勝ち点

## 実装済み機能（現時点）

- 試合一覧: Firestore `matches` をリアルタイム表示
- 試合結果入力: 2セットスコアのバリデーションと結果保存
- 順位表: 勝ち点合計でソート（同点時は得失点差→総得点）
- 管理者画面:
  - メール/パスワードで管理者ログイン
  - 大会登録
  - 勝ち点ルール更新
  - チーム登録
  - 対戦カード作成

## Firestoreセキュリティルール

- `matches`: 誰でも読み書き可
- `tournaments`, `teams`: 読み取りは全員可 / 書き込みは認証済みのみ

## 開発コマンド

```bash
npm run start
npm run android
npm run web
```

## 最初に必要な準備（ユーザー作業）

この部分は Firebase Console 側のため、あなたの操作が必要です。

1. Firebase プロジェクトを作成
2. Authentication で「メール / パスワード」を有効化
3. Firestore Database を作成（本番モード推奨）
4. Firestore ルールに `firestore.rules` を適用
5. Authentication で管理者ユーザーを1件作成（メール・パスワード）
6. `.env` を作成して Firebase 設定値を記入
7. アプリ起動: `npm run start`
