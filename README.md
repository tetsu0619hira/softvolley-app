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

## アイコン生成プロンプト（Gemini使用）

**スタイリッシュ版（現在使用中）**

Create a sleek and stylish mobile app icon for a volleyball tournament app.
- Background: deep black with a subtle dark gradient
- Main elements: a volleyball with yellow as the main color and blue accents, a minimalist net and poles in pure white, and the bold text "2SET" in a modern sans-serif font
- Style: clean, premium, high contrast, smooth shapes with sharp edges, no pixel art
- Color palette: black, gold/yellow, electric blue, white
- Typography: "2SET" in a strong modern font, prominently placed
- Size: square format, suitable for iOS app icon
- No white border or padding. Background color must fill the entire image edge to edge.

**ドット絵版**

Create a mobile app icon in retro pixel art style (8-bit Famicom aesthetic).
- Background: dark navy or black
- Main elements: a volleyball with yellow as the main color and blue accents, a net in the center, and the text "2SET" in bold pixel font
- Color palette: limited retro colors (yellow, blue, white) like an 8-bit game
- Style: chunky pixels, high contrast, no gradients, flat retro look
- Size: square format, suitable for iOS app icon
- No white border or padding. Background color must fill the entire image edge to edge.

## 配布情報

### TestFlight（テスト配布）

https://testflight.apple.com/join/hnHrZZQr

- iPhoneにTestFlightアプリをインストール後、上記URLをタップするだけでインストール可能
- App Store Connect: https://appstoreconnect.apple.com/apps/6761749295/testflight/ios

### App Store（正式配布）

- App Store Connect: https://appstoreconnect.apple.com/apps/6761749295
- 審査提出済み（2026-04-07）
- プライバシーポリシー: https://tetsu0619hira.github.io/softvolley-app/privacy-policy.html
- 配信地域：日本のみ

## ビルド・配布（Expo/EAS）

配布用ビルドは EAS を使用します。

### 事前準備

```bash
npm install -g eas-cli
eas login
```

### iOSビルド → 提出

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

### 環境変数の更新

```bash
npx eas-cli env:push --environment production --path .env
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
