# Supabase デプロイガイド

このドキュメントでは、FerryTransit Nuxt3アプリケーションをSupabaseにデプロイする手順を説明します。

## 前提条件

- Supabase CLI がインストールされていること
- Supabase アカウントを持っていること
- Node.js 18 以上がインストールされていること

## セットアップ手順

### 1. Supabase CLI のインストール

```bash
npm install -g supabase
```

### 2. Supabase プロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. 新しいプロジェクトを作成
3. プロジェクトURL と Anon Key を取得

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集して、Supabase の情報を入力：

```env
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. ローカルでの Supabase 開発

```bash
# Supabase ローカル開発環境を起動
npm run supabase:start

# データベースをリセット（マイグレーションとシードを実行）
npm run supabase:db:reset

# Edge Functions をローカルで実行
npm run supabase:functions:serve
```

### 5. データベースのセットアップ

```bash
# Supabase プロジェクトにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your-project-ref

# マイグレーションを実行
supabase db push

# シードデータを投入（オプション）
supabase db seed
```

### 6. Edge Functions のデプロイ

```bash
# すべての Edge Functions をデプロイ
supabase functions deploy
```

### 7. Nuxt アプリケーションのビルドとデプロイ

```bash
# ビルドとデプロイを実行
npm run deploy
```

または手動で：

```bash
# アプリケーションをビルド
npm run build

# Supabase Storage にアップロード
supabase storage upload public/* --bucket-id hosting
```

## デプロイ設定

### Supabase Hosting 設定

1. Supabase Dashboard で Storage バケットを作成（名前: `hosting`）
2. バケットを公開設定に変更
3. カスタムドメインを設定（オプション）

### 環境変数の設定

Supabase Dashboard > Settings > Edge Functions で以下の環境変数を設定：

- `NUXT_PUBLIC_API_BASE`
- `NUXT_PUBLIC_SHIP_STATUS_API`
- `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## トラブルシューティング

### CORS エラーが発生する場合

Edge Functions の CORS ヘッダーを確認してください。すべての Edge Functions に以下のヘッダーが設定されています：

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### データベース接続エラー

1. Supabase プロジェクトの接続文字列を確認
2. サービスロールキーが正しく設定されているか確認
3. データベースのマイグレーションが正しく実行されているか確認

### Edge Functions が動作しない

1. `supabase functions list` でデプロイ状況を確認
2. `supabase functions logs <function-name>` でログを確認
3. ローカルで `npm run supabase:functions:serve` を実行してテスト

## 本番環境へのデプロイ

### GitHub Actions を使用した自動デプロイ

`.github/workflows/deploy.yml` を作成：

```yaml
name: Deploy to Supabase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        env:
          NUXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUXT_PUBLIC_SUPABASE_URL }}
          NUXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NUXT_PUBLIC_SUPABASE_ANON_KEY }}
          
      - name: Deploy to Supabase
        run: |
          npm install -g supabase
          supabase login --token ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy
          supabase storage upload .output/public/* --bucket-id hosting
```

### 必要な GitHub Secrets

- `SUPABASE_ACCESS_TOKEN`: Supabase アクセストークン
- `SUPABASE_PROJECT_REF`: プロジェクトリファレンス
- `NUXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクト URL
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

## 監視とログ

### アプリケーションログ

Supabase Dashboard > Logs でアプリケーションのログを確認できます。

### データベースクエリログ

Supabase Dashboard > Database > Query Performance でクエリのパフォーマンスを監視できます。

### Edge Functions ログ

```bash
supabase functions logs get-timetable --tail
```

## セキュリティ設定

### Row Level Security (RLS)

すべてのテーブルで RLS を有効にし、適切なポリシーを設定してください：

```sql
-- 例: announcements テーブルの読み取り専用ポリシー
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON announcements
  FOR SELECT TO public
  USING (is_active = true AND display_from <= NOW() AND display_until >= NOW());
```

### API キーの管理

- Anon Key: クライアントサイドで使用（公開可能）
- Service Role Key: サーバーサイドのみで使用（秘密にする）

## パフォーマンス最適化

### データベースインデックス

適切なインデックスが作成されていることを確認：

```sql
-- 例: 頻繁にクエリされるカラムにインデックスを作成
CREATE INDEX idx_timetables_departure ON timetables(departure_time);
CREATE INDEX idx_routes_ports ON routes(from_port_id, to_port_id);
```

### キャッシュ戦略

- Nuxt の `useFetch` でキャッシュを活用
- Edge Functions でレスポンスキャッシュを設定
- 静的アセットは CDN を使用