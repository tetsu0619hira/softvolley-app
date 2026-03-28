# ソフトバレーボール大会管理アプリ

ソフトバレーボール大会の試合結果を記録・閲覧する React Native アプリです。  
一般ユーザーは結果入力・閲覧、管理者は大会運用データ（大会/チーム/対戦カード/ルール）の管理ができます。

## 技術スタック

- Expo (React Native + TypeScript, SDK 54)
- Firebase Authentication（管理者ログイン）
- Cloud Firestore（大会・チーム・試合データ）
- React Navigation（Bottom Tabs）

## アプリ仕様（現在）

### 試合ルール

- 1セット 15点先取（デュース時は 17点上限）
- 2セット制（フルセットなし）
- 結果パターン: `2-0` / `0-2` / `1-1`

### 勝ち点ルール（大会ごと）

- `2-0` 勝ち: 初期値 `3`
- `1-1`（得点多い）: 初期値 `2`
- `1-1`（得点少ない）: 初期値 `1`
- `1-1`（得点同じ）: 初期値 `1`
- `0-2` 負け: `0` 固定

### 権限

- 一般ユーザー
  - 試合一覧の閲覧
  - 結果入力（未入力試合）
- 管理者ログイン（メール/パスワード）後
  - 勝ち点ルール編集
  - チーム登録/削除
  - 対戦カード作成/削除
  - 入力済み試合の再編集（上書き）
  - 大会削除（大会配下データを一括削除）

## 主要画面

- `試合一覧`
  - 大会選択付き
  - 対戦カード、セット、結果、勝ち点をコンパクト表示
- `試合結果入力`
  - 大会選択付き
  - セットスコア入力 + ルールチェック
  - 管理者のみ入力済み試合の閲覧/再編集可
- `順位表`
  - 大会選択付き
  - 勝ち点順（同点時: 得失点差 → 総得点）
  - テーブル1行表示
- `管理者`
  - 未ログイン時: ログインフォームのみ表示
  - ログイン後: 各管理セクションをトグル表示（開閉アニメーションあり）

## UI/アニメーション

- タブアイコンのフェード/スケールアニメーション
- 大会選択チップのアニメーション
- ボタン押下時の共通フェード/スケールアニメーション
- 管理者セクションのトグル開閉アニメーション

## Firestore データ設計

- `tournaments`
  - 大会情報
  - `pointRules`
  - 作成/更新日時
- `teams`
  - 大会ID
  - チーム名
  - 作成/更新日時
- `matches`
  - 大会ID
  - ホーム/アウェイチームID
  - セットスコア、結果、勝ち点
  - 状態（`scheduled` / `completed`）
  - 作成/更新日時

## Firestore セキュリティルール

- `matches`: 誰でも読み書き可
- `tournaments`, `teams`: 読み取りは全員可 / 書き込みは認証済みのみ

`firestore.rules` を Firebase Console に反映してください。

## Firebase セットアップ

1. Firebase プロジェクト作成
2. Authentication で「メール / パスワード」を有効化
3. Firestore Database 作成
4. 管理者ユーザーを作成（Authentication）
5. `.env` 作成

```bash
copy .env.example .env
```

6. `.env` に Firebase Web App の値を設定
7. `firestore.rules` を適用

## 開発コマンド

```bash
npm install
npm run start
npm run android
npm run web
npm run typecheck
```

## ビルド・配布（Expo/EAS）

配布用ビルドは EAS を使用します。

### 1) 事前準備

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### 2) Android ビルド（AAB/APK）

```bash
eas build -p android --profile production
```

### 3) iOS ビルド（必要な場合）

```bash
eas build -p ios --profile production
```

### 4) ストア提出（任意）

```bash
eas submit -p android --latest
eas submit -p ios --latest
```

## 現在の主要ファイル構成

```text
softvolley-app/
  src/
    components/
      AnimatedPressable.tsx
      ScreenContainer.tsx
      TournamentSelector.tsx
    constants/
      defaultRules.ts
    context/
      TournamentSelectionContext.tsx
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
