# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際の Claude Code (claude.ai/code)への指針を提供します。

## プロジェクト概要

FerryTransit は、島根県隠岐諸島のフェリー時刻表と航路情報システムです。このアプリケーションは各港間のフェリースケジュールを表示し、日本語と英語の両方をサポートしています。

## 会話ガイドライン

- 常に日本語で会話する
- コード修正後は必ずビルドが通ることを確認する（`npm run build`）
- 関連するユニットテストも実行して動作を確認する（`npm run test:unit`）
- 変更によりユニットテストの修正が必要な場合は、テストも併せて修正する
- 該当機能にユニットテストが存在しない場合は、新規にユニットテストを実装する

**現在、AngularJS 版から Nuxt3 版への移行作業が完了し、Nuxt3 版をメインに開発中です。**

## プロジェクト構成

```
FerryTransit/
├── archive/                   # AngularJS版（レガシー）
├── src/                       # Nuxt3版（メイン開発）
├── i18n/                      # 多言語対応
│   └── locales/              # ロケールファイル
│       ├── ja.json          # 日本語
│       └── en.json          # 英語
├── docs/                      # ドキュメント
│   ├── phase-plans/          # フェーズごとの計画
│   ├── work-logs/            # 日付ごとの作業ログ
│   └── migration/            # 移行関連ドキュメント
└── CLAUDE.md                  # このファイル
```

## 技術スタック

### Nuxt3 版（開発中）

- **フレームワーク**: Nuxt 3.17.5 + Vue 3
- **言語**: TypeScript (strict mode)
- **UI**: Tailwind CSS v4.1.10
- **状態管理**: Pinia
- **国際化**: @nuxtjs/i18n
- **スタイル**: Sass/SCSS + Tailwind CSS
- **ターゲット**: Web + iOS/Android (Capacitor 予定)

## 開発コマンド

### Nuxt3 版

```bash
cd src

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# 型チェック
npm run typecheck

# ユニットテスト
npm run test:unit

# リント
npm run lint
```

## 主要機能

### 実装済み機能

- **多言語対応**: 日本語・英語の切り替え
- **時刻表表示**: 港間のフェリースケジュール表示
- **乗換案内**: 最適ルートの検索と表示
- **運航状況**: リアルタイムの運航情報
- **料金計算**: 料金マスターデータに基づく料金表示
- **祝日対応**: 日本の祝日カレンダーと特別運航情報
- **オフライン対応**: ローカルストレージによるデータキャッシュ
- **お気に入り機能**: ルートと港のお気に入り登録
- **検索履歴**: 検索履歴の保存と再利用
- **ダークモード**: システム連動のテーマ切り替え

### データ構造

時刻表データには以下が含まれます：

- 港の接続（西郷、菱浦、別府、来居、本土七類、本土境港）
- フェリーサービス（フェリーおき、フェリーしらしま、フェリーくにが、フェリーどうぜん）
- 日時付きスケジュール情報
- サービスアラートと例外

## 開発時の注意事項

1. **型安全性**: TypeScript の strict mode を維持し、any 型の使用を避ける
2. **テスト**: 新機能追加時は必ずユニットテストを作成する
3. **国際化**: すべてのテキストは i18n 経由で表示する
4. **アクセシビリティ**: WCAG 2.1 AA 準拠を目指す
5. **レスポンシブ**: モバイルファーストで設計する
6. **下タブナビゲーション**: モバイルでは以下の 4 項目のみを表示
   - 時刻表 (TIMETABLE)
   - 乗換案内 (TRANSIT)
   - 運行状況 (STATUS)
   - 設定 (SETTINGS)
7. **SPA環境**: このプロジェクトはSPA（Single Page Application）のため、`/server/api`ディレクトリの使用は禁止。すべてのデータ取得はFirebase StorageまたはFirestoreを経由して行う

## 移行状況

### 完了済みフェーズ

- ✅ **フェーズ 1-3**: 基盤構築、データ層、UI/UX 基本実装
- ✅ **フェーズ 4**: ビジネスロジックの詳細実装 → [詳細](docs/phase-plans/PHASE4_BUSINESS_LOGIC.md)
- ✅ **フェーズ 5**: UI/UX 完成 → [詳細](docs/phase-plans/PHASE5_UI_UX.md)

### 今後の計画

- **フェーズ 5.5**: 管理画面実装 → [詳細](docs/phase-plans/PHASE5.5_ADMIN_PANEL.md)
- **フェーズ 6**: Capacitor 統合・ネイティブアプリ化

## 作業ログ

日付ごとの作業内容は [docs/work-logs/](docs/work-logs/) を参照してください。

## 現在の課題

1. **テストカバレッジ**: 一部のコンポーネントでテストが不足
2. **パフォーマンス**: 大量データ表示時の最適化が必要
3. **管理画面**: 管理者向け機能の実装が未完了

## 関連ドキュメント

- [移行計画](docs/migration/MIGRATION_PLAN.md)
- [フェーズ 1 タスクリスト](docs/migration/PHASE1_TASKS.md)
- [Nuxt3 開発ドキュメント](docs/nuxt/README.md)

## Firebase 設定・デプロイ

### Firebase プロジェクト情報

- **プロジェクト ID**: `oki-ferryguide`
- **デフォルトストレージバケット**: `oki-ferryguide.firebasestorage.app`

### Firebase ルールのデプロイ方法

#### 1. 個別にデプロイ

```bash
# Firestore ルールのみ
firebase deploy --only firestore:rules

# Storage ルールのみ
firebase deploy --only storage

# 両方同時（推奨）
firebase deploy --only firestore:rules,storage:rules
```

#### 2. ルールファイルの場所

- **Firestore ルール**: `src/firestore.rules`
- **Storage ルール**: `src/storage.rules`
- **設定ファイル**: `firebase.json`

#### 3. エラーが発生した場合

**Storage デプロイでエラーが出る場合**:

```bash
# ストレージターゲットを設定
firebase target:apply storage main oki-ferryguide.firebasestorage.app

# その後、再度デプロイ
firebase deploy --only storage
```

**権限エラーが出る場合**:

```bash
# プロジェクトリストを確認
firebase projects:list

# プロジェクトを選択
firebase use oki-ferryguide

# アカウントを再ログイン
firebase logout
firebase login
```

### Firebase Admin SDK (管理者作成用)

```bash
# 管理者アカウントを作成
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
node src/scripts/setup-admin.js [email] [password] [role]

# 例: スーパー管理者を作成
node src/scripts/setup-admin.js admin@example.com SecurePass123! super
```

### Firebase Storage CORS 設定

Firebase Storage で公開データにアクセスするために、CORS 設定が必要です：

```bash
# Google Cloud SDK がインストールされていることを確認
gcloud --version

# プロジェクトを設定
gcloud config set project oki-ferryguide

# CORS設定を適用
gsutil cors set src/cors.json gs://oki-ferryguide.firebasestorage.app
```

**注意**: この設定は、Firebase Storage から直接 JSON データを取得するために必要です。

### セキュリティルールの詳細

- [Firestore ルール詳細](src/scripts/README_FIRESTORE_RULES.md)
- [Storage ルール詳細](src/scripts/README_STORAGE_RULES.md)
- [管理者設定ガイド](src/scripts/README_ADMIN_SETUP.md)

### Firestore ルール更新履歴

#### 2025-01-12 追加されたコレクション

1. **news コレクション**

   - お知らせ機能の新しいコレクション
   - 公開されているニュースは誰でも読める
   - 管理者のみ作成・更新・削除可能

2. **discounts コレクション**

   - 割引設定（島民割引、団体割引など）
   - 誰でも読める（公開情報）
   - 管理者のみ編集可能

3. **peakPeriods コレクション**
   - 繁忙期設定
   - 誰でも読める（公開情報）
   - 管理者のみ編集可能

**注意**: Firebase ルールをデプロイする際は、必ず `firebase login` で認証してから実行してください。

## 障害管理

プロジェクトの障害は `bugs.md` ファイルで管理しています。新しい障害を発見した場合や修正作業を行う際は、このファイルを確認・更新してください。

- **障害管理ファイル**: [`bugs.md`](bugs.md)
- **障害ID形式**: `BUG-XXX` (XXXは3桁の連番)
- **優先度**: 高 (🔥), 中 (⚠️), 低 (💡)
- **ステータス**: 未対応 (🆕), 調査中 (🔍), 対応中 (🔨), 検証中 (🧪), 完了 (✅)
