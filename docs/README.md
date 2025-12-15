# FerryTransit ドキュメント

このディレクトリには、FerryTransitプロジェクトのすべてのドキュメントが整理されています。

## ディレクトリ構造

```
docs/
├── README.md              # このファイル
├── project/               # プロジェクト全体のドキュメント
│   └── CLAUDE.md         # Claude Code用の指示書
├── migration/             # 移行関連のドキュメント
│   ├── MIGRATION_PLAN.md # AngularJSからNuxt3への移行計画
│   └── PHASE1_TASKS.md   # フェーズ1のタスクリスト
├── nuxt/                  # Nuxt3版のドキュメント
│   ├── README.md         # Nuxt3版の概要
│   ├── README_FIREBASE_DEPLOY.md    # Firebaseデプロイ手順
│   ├── README_SUPABASE_DEPLOY.md    # Supabaseデプロイ手順
│   ├── NAVIGATION_FIX_SUMMARY.md    # ナビゲーション修正サマリー
│   ├── OPERATION_CHECK.md           # 動作確認チェックリスト
│   ├── PHASE2_SUMMARY.md            # フェーズ2実装サマリー
│   ├── PHASE3_SUMMARY.md            # フェーズ3実装サマリー
│   ├── TEST_IMPLEMENTATION.md       # テスト実装ガイド
│   ├── TIMETABLE_FIX_REPORT.md      # 時刻表修正レポート
│   └── missing-translations-report.md # 翻訳漏れレポート
├── specs/                 # 機能別仕様書（仕様・設計）
│   └── NEWS_SYSTEM.md     # お知らせ機能の仕様書
├── tasks/                 # 機能別タスク（TODO・実装チェック）
│   └── TODO_INDEX.md      # タスク一覧（各TODOへのリンク集）
├── features/              # 旧配置（互換用の案内のみ。中身は specs/ と tasks/ へ移動）
└── archive/               # アーカイブ版（AngularJS）のドキュメント
```

## ドキュメント概要

### プロジェクトドキュメント (`project/`)

- **CLAUDE.md**: Claude Codeでコードを扱う際のガイドライン。プロジェクトの概要、技術スタック、開発コマンド、実装状況などを記載。

### 移行ドキュメント (`migration/`)

- **MIGRATION_PLAN.md**: AngularJS版からNuxt3版への詳細な移行計画。フェーズごとのタスクとスケジュール。
- **PHASE1_TASKS.md**: フェーズ1（基盤構築）の詳細なタスクリスト。

### Nuxt3ドキュメント (`nuxt/`)

- **README.md**: Nuxt3版の概要と基本的な使い方
- **README_FIREBASE_DEPLOY.md**: FirebaseへのNuxt3アプリケーションのデプロイ手順
- **README_SUPABASE_DEPLOY.md**: SupabaseへのNuxt3アプリケーションのデプロイ手順
- **NAVIGATION_FIX_SUMMARY.md**: ナビゲーション関連の修正内容のサマリー
- **OPERATION_CHECK.md**: 実装した機能の動作確認チェックリスト
- **PHASE2_SUMMARY.md**: フェーズ2（データ層実装）の実装サマリー
- **PHASE3_SUMMARY.md**: フェーズ3（UI/UX実装）の実装サマリー
- **TEST_IMPLEMENTATION.md**: ユニットテストの実装ガイド
- **TIMETABLE_FIX_REPORT.md**: 時刻表機能の修正レポート
- **missing-translations-report.md**: 国際化対応での翻訳漏れのレポート

### 機能別仕様書 (`specs/`)

- **NEWS_SYSTEM.md**: お知らせ機能の詳細仕様書。データ構造、システムアーキテクチャ、管理機能、表示機能、セキュリティ設定などを網羅的に記載。

### 機能別タスク (`tasks/`)

- **TODO_INDEX.md**: 機能別TODOの目次。各機能の実装タスクへリンク。

### アーカイブドキュメント (`archive/`)

AngularJS版に関するドキュメント（今後追加予定）

## 参照方法

各ドキュメントは、プロジェクトの異なる側面を説明しています：

1. **新規開発者向け**: `project/CLAUDE.md`から始めて、プロジェクトの全体像を把握
2. **移行作業の確認**: `migration/`ディレクトリ内のドキュメントを参照
3. **Nuxt3版の詳細**: `nuxt/`ディレクトリ内の各ドキュメントを参照
4. **デプロイ手順**: `nuxt/README_FIREBASE_DEPLOY.md`または`nuxt/README_SUPABASE_DEPLOY.md`を参照

## 更新履歴

- 2025-07-04: ドキュメントを`docs`ディレクトリに整理
- 2025-07-15: お知らせ機能の仕様書（`specs/NEWS_SYSTEM.md`）を追加