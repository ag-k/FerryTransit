# FerryTransit

島根県隠岐諸島のフェリー時刻表と航路情報システム

## 概要

FerryTransitは、隠岐諸島の各港間のフェリースケジュールを表示するWebアプリケーションです。日本語と英語の両方をサポートしており、料金計算、乗換案内、運航状況の確認などの機能を提供しています。

## プロジェクト構成

```
FerryTransit/
├── src/                   # Nuxt3版（メイン開発）
├── archive/               # AngularJS版（レガシー、参照のみ）
├── config/                # 設定ファイル
└── docs/                  # プロジェクトドキュメント
```

## 実装状況

**現在のステータス**: Phase 5.5 完了 🎉

- ✅ **Phase 1-3**: 基盤構築、データ層、UI/UX基本実装
- ✅ **Phase 4**: ビジネスロジックの詳細実装  
- ✅ **Phase 5**: UI/UX完成、パフォーマンス最適化
- ✅ **Phase 5.5**: 管理画面実装（Firebase統合、ユニットテスト含む）
- 🔲 **Phase 6**: Capacitor統合・ネイティブアプリ化（準備済み）

詳細は **[実装状況ドキュメント](docs/IMPLEMENTATION_STATUS.md)** を参照してください。

## ドキュメント

詳細なドキュメントは`docs`ディレクトリに整理されています：

- **[実装状況](docs/IMPLEMENTATION_STATUS.md)** - 現在の実装状況と技術詳細
- **[プロジェクト指針](CLAUDE.md)** - Claude Codeでの開発ガイドライン
- **[移行計画](docs/migration/MIGRATION_PLAN.md)** - AngularJSからNuxt3への移行計画
- **[作業ログ](docs/work-logs/)** - 日付ごとの作業記録

## クイックスタート

### 前提条件

- Node.js 18.x以上
- npm または yarn

### セットアップ

```bash
# リポジトリのクローン
git clone [repository-url]
cd FerryTransit

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要なAPIキーを設定

# Nuxt3版のセットアップ
cd src
npm install

# 開発サーバーの起動
npm run dev
```

#### Google Maps APIキーの設定

地図機能を利用するには、Google Maps APIキーが必要です：

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. Maps JavaScript APIを有効化
4. APIキーを作成
5. `.env`ファイルに設定：
   ```
   NUXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

開発サーバーが起動したら、ブラウザで http://localhost:3000 にアクセスしてください。

## 技術スタック

### Nuxt3版

- **フレームワーク**: Nuxt 3.17.5 + Vue 3.5
- **言語**: TypeScript (strict mode)
- **スタイリング**: Tailwind CSS v4.1.10
- **状態管理**: Pinia 2.4.0
- **国際化**: @nuxtjs/i18n 9.6
- **認証**: Firebase Authentication
- **データベース**: Firebase Firestore
- **ストレージ**: Firebase Storage
- **テスト**: Vitest + Vue Test Utils
- **モバイル**: Capacitor 7.4.1

## 主な機能

### ユーザー向け機能
- **時刻表表示**: 港間のフェリースケジュール表示
- **乗換案内**: 複数経路を使った最適ルート検索  
- **運航状況**: リアルタイムの運航情報とアラート
- **多言語対応**: 日本語・英語の切り替え
- **料金計算**: 詳細な料金表示（繁忙期、割引対応）
- **オフライン対応**: データキャッシュによるオフライン利用
- **お気に入り**: ルートと港のお気に入り機能
- **ダークモード**: システム連動のテーマ切り替え

### 管理者向け機能  
- **データ管理**: 時刻表、料金、アラート、お知らせの管理
- **分析機能**: アクセス統計、ユーザー行動分析
- **公開機能**: Firebase Storageへのデータ公開
- **認証・権限**: Firebase Authenticationによるセキュア管理

## 開発・テスト

### 開発環境の起動
```bash
cd src
npm run dev
```

### ビルド
```bash
npm run build
npm run preview
```

### テスト実行
```bash
npm run test:unit        # ユニットテスト
npm run typecheck       # 型チェック
npm run lint           # コードリント
```

### Firebase デプロイ
```bash
firebase deploy
```

## ライセンス

[ライセンス情報を追加]

## 貢献

[貢献ガイドラインを追加]