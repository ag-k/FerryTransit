# Repository Guidelines

## プロジェクト構成 / モジュール配置
- アプリ本体: `src/`（Nuxt 4 + Vue 3）。ページは `src/pages/`、UIは `src/components/`、状態は `src/stores/`、i18n は `i18n/`。
- 静的/公開データ: `src/public/`（例: `src/public/data/*.json`）。
- Functions(Backend): `src/functions/`（独立の `package.json` と `tsconfig.json`）。
- テスト: `src/test/unit/**` と `**/__tests__/**`、モックは `src/test/mocks/`。
- スクリプト: `scripts/` および `src/scripts/`（Firebase/デプロイ補助）。
- ドキュメント: `docs/`、成果物: `output/`、モバイル: `ios/`, `android/`（Capacitor プラットフォーム）。

## ビルド・実行・テスト
- 開発サーバ: `npm run dev`（Nuxt 開発環境）。
- アプリケーションビルド: `npm run build` → `npm run preview` で検証。Web リリース用の静的生成は `npm run build-prod`。
- Lint/型: `npm run lint`、`npm run typecheck`。
- 単体テスト: `npm run test`、カバレッジ: `npm run test:coverage`、UI: `npm run test:ui`。
- Firebase: `npm run firebase:emulators`、`npm run firebase:deploy`（`--only hosting|functions` 可）。
- Cloud Functions ローカル（`src/functions`）: `npm run build`、`npm run serve`、`npm run deploy`。

### iOS/Android ビルド（Capacitor）
- iOS: `npm run cap:ios`（本番 Web アセットを生成・同期して Xcode を開く）、`npm run cap:ios:build`（生成・同期のみ）
- Android: `npm run cap:android`（本番 Web アセットを生成・同期して Android Studio を開く）、`npm run cap:android:build`（生成・同期のみ）
- 環境設定: `cap-build.mjs` が Bundle ID と環境ファイル（`.env.development`/`.env.production`）を自動切り替え

## リリースQA（Web / iOS / Android）

### 基本方針とリリース判定
- バージョンごとのリリースTODOは `docs/releases/vX.Y[.Z].md` に作成する。対象バージョンの全チェック完了、重大・高優先度の未解決不具合0件、最終Go承認の記録が揃うまでリリースしない。運用方法は `docs/releases/README.md` を参照する。
- QA はリリース対象のコミット SHA を固定し、Web・iOS・Android で同じソースを使う。途中で修正した場合は新しい SHA ですべての必須チェックをやり直す。
- 開発サーバーや `--dev` ビルドだけで合格にしない。Web は `.env.production` で生成した `.output/public`、アプリはその成果物を同期した Release 配布バイナリを確認する。
- 自動テストの E2E は外部 API をスタブするため、本番の時刻表・料金・運航状況・ニュース・Firebase 連携は実データでも手動確認する。
- リリースを止める条件は、クラッシュ/白画面、主要導線の失敗、誤った時刻・料金・運航情報、データ消失、認証/権限不備、秘密情報の露出、未解決の重大アクセシビリティ問題。重大・高優先度の不具合は 0 件を必須とし、それ以外の既知不具合は影響・回避策・承認者を記録する。

### リリース前の共通チェック
1. `git status --short` とリリース差分を確認し、意図しない生成物、デバッグコード、テスト用設定、秘密情報が含まれていないことを確認する。既存の作業ツリー変更は勝手に破棄しない。
2. Node.js 22 を使用し、クリーンインストール可能な環境で `npm ci` を実行する。
3. バージョン、ビルド番号、リリース日、リリースノートを揃える。少なくとも `package.json`、`.env.production` の公開バージョン/日付、iOS の `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`、Android の `versionName` / `versionCode` を確認する。各ストアで過去に使用したビルド番号は再利用しない。
4. `.env.production` が本番 Firebase/API を指し、Firebase alias が `prod`、iOS Bundle ID が `com.naturebot-lab.FerryTransit`、Android Application ID が `com.naturebotlab.ferrytransit` であることを確認する。秘密値そのものは QA 記録やログへ貼らない。
5. 配信対象の時刻表、運賃、港/船舶情報、運航期間、ニュースが最新であることを一次情報と照合する。日付境界、季節ダイヤ、運休/臨時便、タイムゾーン（Asia/Tokyo）も確認する。
6. 次の自動チェックをすべて成功させる。

```bash
npm run lint
npm run test
npm run test:e2e
npm run build-prod
```

- `npm run typecheck` は任意の補助チェックとし、リリース必須要件および Go/No-Go 判定には含めない。
- Functions を変更した場合は `npm --prefix src/functions ci` と `npm --prefix src/functions run build` も成功させ、Firebase Emulator で対象フローを確認する。
- 警告を無条件に無視しない。新規警告、非推奨 API、404、ブラウザコンソールエラー、未処理 Promise rejection は原因を確認し、リリース可否を記録する。

### Web版QA
- `npm run build-prod` で生成した `.output/public` を Firebase Hosting Emulator またはプレビュー環境で配信し、その URL で確認する。SPA の直リンクと再読み込みが `firebase.json` の rewrite により成功することも確認する。
- 対象ブラウザは少なくとも最新の Chrome、Safari、Firefox、Edge。モバイル Safari/Chrome、狭幅スマートフォン、タブレット、デスクトップ幅で横スクロール、重なり、文字切れがないことを確認する。
- 公開画面では、トップの時刻表検索、出発/到着入替、日付変更、乗換案内と並び替え、運航状況、料金表、地図/モーダル、ニュース、カレンダー、お気に入り、履歴、設定を確認する。0件、API失敗、読み込み中、オフライン、古いキャッシュの各状態も確認する。
- 日本語/英語、ライト/ダーク/システム、キーボード操作、フォーカス表示、モーダルのフォーカストラップ、主要フォームのラベル、200%拡大を確認する。
- 管理画面に変更がある場合は、未認証リダイレクト、管理者ログイン、権限のないユーザーの拒否、対象 CRUD、入力バリデーション、保存後の公開画面反映まで確認する。
- 本番デプロイ後は公開 URL で主要導線、静的アセット、404、実 API/Firebase、コンソールエラーを再度スモーク確認する。異常時に戻せる直前の Hosting リリースを把握してから公開する。

### iOS / Android アプリ版QA
- `npm run cap:ios:build` / `npm run cap:android:build` は、本番 Web アセットの生成と各ネイティブプロジェクトへの `cap sync` までであり、ストア提出物の完成ではない。その後に Xcode の Release Archive と Android の `./android/gradlew -p android bundleRelease` を成功させる。
- 最終判定は IDE の Debug 実行ではなく、同じ Release Archive/AAB を TestFlight と Google Play 内部テストへ配布し、そこからインストールした実機で行う。ストア署名、アプリ名、アイコン、バージョン、ビルド番号、プライバシー情報、スクリーンショット、リリースノートも確認する。
- 端末は iOS/Android とも最新 OS を含め、可能ならサポート下限（iOS 14 / Android API 23）付近の OS、画面の小さい端末と大きい端末を含める。iPad/タブレットを配布対象にする場合はそのレイアウトも確認する。
- 共通の公開画面QAに加え、初回/再起動/バックグラウンド復帰、スプラッシュ、ステータスバー、セーフエリア、下部ナビゲーション、縦横回転、ソフトウェアキーボード、外部リンクを確認する。
- Android は物理戻るボタン/ジェスチャーで、履歴がある場合は前画面へ、ルート画面では意図どおり終了することを確認する。iOS はスワイプバック、ステータスバー文字色、ノッチ/Dynamic Island 周辺を確認する。
- iOS は `ferrytransit://` のコールド/ウォーム起動を確認し、Android も deep link を配布対象にする場合は対応する intent で確認する。両 OS で通信切断→復帰、キャッシュ利用、機内モード、日付変更を確認する。設定・お気に入り・履歴が再起動後も保持され、更新インストールでは保持、削除後の再インストールでは期待どおり初期化されることを確認する。
- アプリビルドでは管理画面が成果物から除外されるため、`/admin` へ遷移できず一般画面が壊れていないことを確認する。WebView 内に開発サーバー URL、デバッグメニュー、テスト用 Firebase/API が残っていないことも確認する。
- アプリ成果物には時刻表・GTFS・bus-search JSONを同梱しない。`cap-build.mjs` が実行する非同梱チェックを成功させ、データはFirebase Storageから実行時に取得する。
- iOS は Xcode/端末ログ、Android は Logcat と Play Console の pre-launch report を確認し、起動クラッシュ、ANR、ネイティブプラグイン例外、ネットワーク/SSL エラーがないことを確認する。

### QA記録とリリース後監視
- QA 記録には、コミット SHA、バージョン/ビルド番号、環境、実施日時、担当者、OS/端末/ブラウザ、各チェック結果、失敗時の再現手順、スクリーンショット/ログ、既知不具合、最終 Go/No-Go を残す。
- Web は公開直後、アプリは段階的公開中に、主要導線、エラー率、Functions ログ、外部 API 失敗、クラッシュ/ANR、ストアレビューを監視する。重大問題が出た場合は Web を直前リリースへ戻し、アプリは公開停止/段階的公開の中断を行い、修正版は新しいビルド番号で再QAする。

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
