# Repository Guidelines

## プロジェクト構成 / モジュール配置
- アプリ本体: `src/`（Nuxt 3 + Vue 3）。ページは `src/pages/`、UIは `src/components/`、状態は `src/stores/`、i18n は `i18n/`。
- 静的/公開データ: `src/public/`（例: `src/public/data/*.json`）。
- Functions(Backend): `src/functions/`（独立の `package.json` と `tsconfig.json`）。
- テスト: `src/test/unit/**` と `**/__tests__/**`、モックは `src/test/mocks/`。
- スクリプト: `scripts/` および `src/scripts/`（Firebase/デプロイ補助）。
- ドキュメント: `docs/`、成果物: `output/`、モバイル: `src/ios/`, `src/android/`。

## ビルド・実行・テスト
- 開発サーバ: `npm run dev`（Nuxt 開発環境）。
- 本番ビルド: `npm run build` → `npm run preview` で検証。
- 静的出力/Capacitor 同期: `npm run generate` → `npm run cap:ios|cap:android`。
- Lint/型: `npm run lint`、`npm run typecheck`。
- 単体テスト: `npm run test`、カバレッジ: `npm run test:coverage`、UI: `npm run test:ui`。
- Firebase: `npm run firebase:emulators`、`npm run firebase:deploy`（`--only hosting|functions` 可）。
- Cloud Functions ローカル（`src/functions`）: `npm run build`、`npm run serve`、`npm run deploy`。

## コーディング規約 / 命名
- 言語: TypeScript、インデント2スペース。ESLint（`@nuxtjs/eslint-config-typescript`）準拠。自動修正: `eslint . --fix`。
- Vue: コンポーネントは `PascalCase.vue`、Composable は `useXxx.ts`、ストアは `stores/*.ts`（Pinia）。
- ファイル/キー: i18n は `i18n/locales/{ja,en}.json`、スタイルは `src/assets/css/main.scss`、Tailwind 利用。

## テスト指針
- フレームワーク: Vitest + Vue Testing Library（DOM は `happy-dom`）。
- 追加/変更時は必ず `*.test.ts` を同梱。名称は対象に対応（例: `useRouteSearch.test.ts`）。
- 重要ロジックは境界/例外系を含め最低限カバー。`src/test/setup.ts` の共通設定を活用。

## コミット / PR
- コミット規約: 可能なら Conventional Commits（例: `feat(admin): ...`, `fix(storage): ...`）。日本語本文可。
- PR 必須項目: 概要/背景、変更点、関連 Issue、UI 変更はスクリーンショット、テスト結果、影響範囲/移行手順。
- マージ条件: Lint/型/テストがグリーンであること。
- コミットから除外したい変更がある場合: **変更を消さずにステージングだけ外す**。`git restore` / `git clean` で作業ツリーの変更を破棄しないこと。
  - 例: `git restore --staged <path>`（または `git reset <path>`）でステージから外す
  - 未追跡ファイルは `git add -N <path>` で意図的に可視化してから判断する（`git clean` は最終手段）

## セキュリティ / 設定
- 秘密情報はコミット禁止。`src/functions/.env.example` を基に `.env` を作成。
- 開発はエミュレータ優先。`firestore.rules` の変更はレビュー必須。
