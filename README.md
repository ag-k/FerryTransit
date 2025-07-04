# FerryTransit

島根県隠岐諸島のフェリー時刻表と航路情報システム

## 概要

FerryTransitは、隠岐諸島の各港間のフェリースケジュールを表示するWebアプリケーションです。日本語と英語の両方をサポートしており、料金計算、乗換案内、運航状況の確認などの機能を提供しています。

## プロジェクト構成

```
FerryTransit/
├── ferry-transit-nuxt/    # Nuxt3版（メイン開発）
├── archive/               # AngularJS版（レガシー、参照のみ）
├── config/                # 設定ファイル
└── docs/                  # プロジェクトドキュメント
```

## ドキュメント

詳細なドキュメントは`docs`ディレクトリに整理されています：

- **[プロジェクト指針](docs/project/CLAUDE.md)** - Claude Codeでの開発ガイドライン
- **[移行計画](docs/migration/MIGRATION_PLAN.md)** - AngularJSからNuxt3への移行計画
- **[Nuxt3開発ガイド](docs/nuxt/README.md)** - Nuxt3版の開発方法

## クイックスタート

### 前提条件

- Node.js 18.x以上
- npm または yarn

### セットアップ

```bash
# リポジトリのクローン
git clone [repository-url]
cd FerryTransit

# Nuxt3版のセットアップ
cd ferry-transit-nuxt
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーが起動したら、ブラウザで http://localhost:3000 にアクセスしてください。

## 技術スタック

### Nuxt3版

- **フレームワーク**: Nuxt 3 + Vue 3
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **状態管理**: Pinia
- **国際化**: @nuxtjs/i18n
- **テスト**: Vitest

## 開発状況

現在、AngularJS版からNuxt3版への移行が完了し、以下の機能が実装されています：

- ✅ 時刻表検索
- ✅ 乗換案内
- ✅ 運航状況確認
- ✅ 料金計算
- ✅ お気に入り機能
- ✅ 検索履歴
- ✅ 多言語対応（日本語・英語）
- ✅ ダークモード
- ✅ オフライン対応

## ライセンス

[ライセンス情報を追加]

## 貢献

[貢献ガイドラインを追加]