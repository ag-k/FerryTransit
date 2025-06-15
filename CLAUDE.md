# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)への指針を提供します。

## プロジェクト概要

FerryTransitは、島根県隠岐諸島のフェリー時刻表と航路情報システムです。このアプリケーションは各港間のフェリースケジュールを表示し、日本語と英語の両方をサポートしています。

**現在、AngularJS版からNuxt3版への移行作業が進行中です。**

## プロジェクト構成

```
FerryTransit/
├── index.html                 # AngularJS版（現行）
├── js/                        # AngularJS版のソースコード
├── ferry-transit-nuxt/        # Nuxt3版（開発中）
├── MIGRATION_PLAN.md          # 移行計画書
└── PHASE1_TASKS.md           # フェーズ1タスクリスト
```

## 技術スタック

### AngularJS版（現行）
- **フロントエンド**: AngularJS 1.7.9 (レガシーバージョン)
- **言語**: TypeScript (ES5にコンパイル)
- **UI**: Bootstrap 3.4.1 with Angular UI Bootstrap
- **データストレージ**: SQLiteデータベースからJSONにエクスポート
- **サーバー**: CORSヘッダー付きでJSONを提供するPHP

### Nuxt3版（開発中）
- **フレームワーク**: Nuxt 3.17.5 + Vue 3
- **言語**: TypeScript (strict mode)
- **UI**: Bootstrap 5.3.3 + Bootstrap Vue Next
- **状態管理**: Pinia
- **国際化**: @nuxtjs/i18n
- **スタイル**: Sass/SCSS
- **ターゲット**: Web + iOS/Android (Capacitor予定)

## 開発コマンド

### AngularJS版
npmスクリプトが定義されていないため、開発は手動プロセスに従います：

#### TypeScriptコンパイル
TypeScriptファイルは保存時にコンパイルするよう設定されています。プロジェクトで使用：
- `js/controller.ts` → `js/controller.js`
- `js/timepicker-ctrl.ts` → `js/timepicker-ctrl.js`

#### データ更新
フェリー時刻表データを更新するには：
```bash
# update_timetable.sqlでSQLコマンドを編集
# 更新スクリプトを実行
./update_timetable.sh
```

### Nuxt3版
```bash
cd ferry-transit-nuxt

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# 型チェック
npm run typecheck
```

## アーキテクチャ概要

### データフロー
1. **ソースデータ**: `timetable.sqlite`に保存されたフェリースケジュール情報
2. **データエクスポート**: `update_timetable.sh`経由でSQLite → JSON
3. **API**: `timetable.php`がCORSヘッダー付きでJSONを提供
4. **フロントエンド**: AngularJSコントローラーがデータを取得して表示

### コアコンポーネント

**メインコントローラー (`js/controller.ts`)**
- フェリースケジュール表示を管理
- 言語切り替え（ja/en）を処理
- 日付ベースのフィルタリングを実装
- 港/船情報のモーダルダイアログを制御

**データ構造**
時刻表データには以下が含まれます：
- 港の接続（西郷、菱浦、別府、来居、本土七類、本土境港）
- フェリーサービス（フェリーおき、フェリーしらしま、フェリーくにが、フェリーどうぜん）
- 日時付きスケジュール情報
- サービスアラートと例外

### 主要機能の実装
- **多言語対応**: コントローラー内の言語ファイルでAngular Translateを使用
- **日付フィルタリング**: スケジュールフィルタリング用のカスタム日付ピッカー実装
- **地図統合**: 港の場所を表示するGoogle Maps API
- **レスポンシブデザイン**: モバイル互換性のためのBootstrapベースのレイアウト

## 重要な考慮事項

### 共通
1. **手動データ更新**: スケジュール更新には手動のSQL編集とスクリプト実行が必要
2. **CORS設定**: PHPエンドポイントにはクロスオリジンリクエスト用のCORSヘッダーが含まれる
3. **日付処理**: 日本のカレンダーの考慮事項とタイムゾーン処理が重要

### AngularJS版
1. **レガシーフレームワーク**: アクティブにメンテナンスされていないAngularJS 1.xを使用
2. **ブラウザ互換性**: 古いブラウザもサポート

### Nuxt3版
1. **移行作業中**: AngularJS版と並行して開発中
2. **モダンブラウザ対象**: ES2015+をサポートするブラウザが必要
3. **SSR/SSG対応**: サーバーサイドレンダリングに対応

## 移行状況

### 完了済み（フェーズ1）
- ✅ プロジェクト基盤の構築
- ✅ 依存関係のセットアップ
- ✅ 型定義の作成
- ✅ 国際化対応
- ✅ 基本レイアウトとルーティング

### 次のステップ（フェーズ2）
- データ層の移植（Pinia Store）
- APIエンドポイントの実装
- 既存ビジネスロジックの移植

詳細は`MIGRATION_PLAN.md`を参照してください。