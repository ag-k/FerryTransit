# 開発コマンド一覧

## 基本的な開発コマンド
プロジェクトルートで実行:

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ビルドプレビュー
npm run preview

# 静的サイト生成
npm run generate
```

## テスト・品質管理コマンド
```bash
# ユニットテスト実行
npm run test:unit
# または
npm run test

# テストUI付き実行
npm run test:ui

# カバレッジ付きテスト
npm run test:coverage

# TypeScript型チェック
npm run typecheck

# ESLintでのコードチェック
npm run lint
```

## Firebase関連コマンド
```bash
# Firebaseエミュレータ起動
npm run firebase:emulators

# Firebase全体デプロイ
npm run firebase:deploy

# ホスティングのみデプロイ
npm run firebase:deploy:hosting

# Functionsのみデプロイ
npm run firebase:deploy:functions

# ビルド＆デプロイ（一括）
npm run deploy

# Firebaseルールのデプロイ
firebase deploy --only firestore:rules,storage:rules
```

## モバイルアプリ開発（Capacitor）
```bash
# ビルド＆同期
npm run cap:build

# iOS開発環境を開く
npm run cap:ios

# Android開発環境を開く
npm run cap:android
```

## Git関連（macOS）
```bash
# ステータス確認
git status

# 差分確認
git diff

# ログ確認
git log --oneline -10

# ブランチ切り替え
git checkout [branch-name]

# コミット
git add .
git commit -m "メッセージ"
```

## システムコマンド（macOS）
```bash
# ディレクトリ一覧
ls -la

# ファイル検索
find . -name "*.ts" -type f

# テキスト検索（ripgrep推奨）
rg "検索文字列"

# プロセス確認
ps aux | grep node

# ポート使用確認
lsof -i :3000
```

## 重要な注意事項
- **必須**: コード修正後は必ず`npm run build`でビルドが通ることを確認
- **必須**: 関連するユニットテストも`npm run test:unit`で実行
- **推奨**: TypeScript型チェック`npm run typecheck`も実行
- **推奨**: リントチェック`npm run lint`も実行