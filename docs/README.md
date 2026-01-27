# FerryTransit ドキュメント

このディレクトリには、FerryTransit プロジェクトのドキュメントを用途別に整理しています。

## ディレクトリ構造

```
docs/
├── README.md              # このファイル
├── project/               # プロジェクト全体の指針
├── operations/            # 運用・デプロイ・スクリプト手順
│   ├── firebase/          # Firebase 関連の手順
│   └── scripts/           # 運用スクリプトの手順
├── issues/                # 障害・課題管理
├── reports/               # 調査・検証レポート
├── development/           # 開発環境の補助資料
├── migration/             # 移行関連ドキュメント
├── nuxt/                  # Nuxt3 版のドキュメント
├── phase-plans/           # フェーズごとの計画
├── specs/                 # 機能別仕様書（仕様・設計）
├── status-api/            # 運航状況API関連
├── tasks/                 # 機能別タスク（TODO・実装チェック）
├── testing/               # テスト関連
└── work-logs/             # 作業ログ
```

## ドキュメント概要

### プロジェクト指針 (`project/`)

- **CLAUDE.md**: 開発ガイドライン、コマンド、技術スタック、実装状況

### 運用・デプロイ手順 (`operations/`)

- Firebase 設定、ルール、Cloud Build 対応など
- 運用スクリプトの実行手順

### 障害・課題 (`issues/`)

- **bugs.md**: 障害管理リスト

### 調査・検証レポート (`reports/`)

- 仕様検証や検索結果の分析メモ

### 開発・移行・実装 (`development/`, `migration/`, `nuxt/`, `phase-plans/`)

- 開発環境、移行計画、Nuxt3 実装サマリー

### 仕様・タスク (`specs/`, `tasks/`)

- 機能別の仕様書・TODO

### テスト (`testing/`)

- テスト計画や手順

### 作業ログ (`work-logs/`)

- 日付ごとの作業記録

## 参照方法

1. **新規開発者向け**: `project/CLAUDE.md`
2. **Firebase/運用**: `operations/`
3. **仕様・タスク確認**: `specs/` / `tasks/`
4. **作業履歴の確認**: `work-logs/`

## 更新履歴

- 2026-01-27: ドキュメント構成を再整理（運用・障害・レポートを追加）
- 2025-07-15: お知らせ機能の仕様書（`specs/NEWS_SYSTEM.md`）を追加
- 2025-07-04: ドキュメントを`docs`ディレクトリに整理
