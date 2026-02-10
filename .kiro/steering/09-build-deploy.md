---
inclusion: always
---

# ビルド・デプロイガイドライン

## 開発環境セットアップ

### 前提条件

- Node.js 18.x 以上
- npm または yarn
- Firebase CLI
- Git

### 初期セットアップ

```bash
# リポジトリのクローン
git clone [repository-url]
cd FerryTransit

# Nuxt3版のセットアップ
cd src
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してFirebase設定を追加

# 開発サーバーの起動
npm run dev
```

### 環境変数設定

```bash
# .env
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NUXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 管理者機能用
FIREBASE_ADMIN_PRIVATE_KEY=your_admin_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_admin_client_email
```

## ビルドプロセス

### 開発ビルド

```bash
# 開発サーバー起動
npm run dev

# 型チェック
npm run typecheck

# リント
npm run lint

# テスト実行
npm run test:unit
```

### プロダクションビルド

```bash
# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# 静的サイト生成（必要に応じて）
npm run generate
```

### ビルド最適化設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // プロダクション最適化
  nitro: {
    compressPublicAssets: true,
    minify: true,
  },

  // バンドル分析
  build: {
    analyze: process.env.ANALYZE === "true",
  },

  // 画像最適化
  image: {
    quality: 80,
    format: ["webp", "jpg"],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },

  // PWA設定
  pwa: {
    registerType: "autoUpdate",
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
    },
    client: {
      installPrompt: true,
    },
  },
});
```

## Firebase デプロイ

### Firebase 設定

```json
// firebase.json
{
  "hosting": {
    "public": "src/.output/public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "src/firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "src/storage.rules"
  },
  "functions": {
    "source": "src/functions",
    "runtime": "nodejs18"
  }
}
```

### デプロイコマンド

```bash
# 全体デプロイ
firebase deploy

# Hostingのみ
firebase deploy --only hosting

# ルールのみ
firebase deploy --only firestore:rules,storage:rules

# Functionsのみ
firebase deploy --only functions

# プレビューデプロイ
firebase hosting:channel:deploy preview-branch
```

### デプロイスクリプト

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 デプロイを開始します..."

# 1. テスト実行
echo "📋 テストを実行中..."
npm run test:unit

# 2. 型チェック
echo "🔍 型チェックを実行中..."
npm run typecheck

# 3. リント
echo "🧹 リントを実行中..."
npm run lint

# 4. ビルド
echo "🔨 ビルドを実行中..."
npm run build

# 5. Firebase デプロイ
echo "☁️ Firebase にデプロイ中..."
firebase deploy

echo "✅ デプロイが完了しました！"
```

## CI/CD パイプライン

### GitHub Actions 設定

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"
          cache-dependency-path: src/package-lock.json

      - name: Install dependencies
        run: |
          cd src
          npm ci

      - name: Run tests
        run: |
          cd src
          npm run test:unit

      - name: Type check
        run: |
          cd src
          npm run typecheck

      - name: Lint
        run: |
          cd src
          npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"
          cache-dependency-path: src/package-lock.json

      - name: Install dependencies
        run: |
          cd src
          npm ci

      - name: Build
        run: |
          cd src
          npm run build
        env:
          NUXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          NUXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          NUXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: oki-ferryguide
          channelId: live
          entryPoint: ./src
```

### プレビューデプロイ

```yaml
# .github/workflows/preview.yml
name: Preview Deploy

on:
  pull_request:
    branches: [main]

jobs:
  preview:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"
          cache-dependency-path: src/package-lock.json

      - name: Install and Build
        run: |
          cd src
          npm ci
          npm run build

      - name: Deploy Preview
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: oki-ferryguide
          entryPoint: ./src
```

## Capacitor ビルド（モバイルアプリ）

### iOS ビルド

```bash
# Capacitor の同期
npx cap sync ios

# Xcode で開く
npx cap open ios

# ビルド（コマンドライン）
xcodebuild -workspace src/ios/App/App.xcworkspace \
           -scheme App \
           -configuration Release \
           -destination generic/platform=iOS \
           archive -archivePath App.xcarchive

# App Store Connect へのアップロード
xcodebuild -exportArchive \
           -archivePath App.xcarchive \
           -exportPath . \
           -exportOptionsPlist ExportOptions.plist
```

### Android ビルド

```bash
# Capacitor の同期
npx cap sync android

# Android Studio で開く
npx cap open android

# ビルド（コマンドライン）
cd src/android
./gradlew assembleRelease

# APK の場所
# src/android/app/build/outputs/apk/release/app-release.apk
```

### Capacitor 設定

```typescript
// capacitor.config.ts
import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ferryTransit.app",
  appName: "FerryTransit",
  webDir: ".output/public",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3b82f6",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
```

## パフォーマンス監視

### Lighthouse CI 設定

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: |
          cd src
          npm ci

      - name: Build
        run: |
          cd src
          npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Lighthouse 設定

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "staticDistDir": "./src/.output/public",
      "url": [
        "http://localhost/",
        "http://localhost/timetable",
        "http://localhost/transit",
        "http://localhost/status"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

## セキュリティ

### セキュリティヘッダー

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    routeRules: {
      "/**": {
        headers: {
          "X-Frame-Options": "DENY",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        },
      },
    },
  },
});
```

### 依存関係の脆弱性チェック

```bash
# npm audit
npm audit

# 自動修正
npm audit fix

# Snyk を使用した詳細チェック
npx snyk test
npx snyk monitor
```

## 環境別設定

### 開発環境

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  $development: {
    devtools: { enabled: true },
    ssr: false, // SPA モードで高速開発
    sourcemap: {
      server: true,
      client: true,
    },
  },
});
```

### ステージング環境

```typescript
export default defineNuxtConfig({
  $staging: {
    ssr: true,
    nitro: {
      minify: false, // デバッグ用
    },
    runtimeConfig: {
      public: {
        apiBase: "https://staging-api.ferry-transit.com",
      },
    },
  },
});
```

### プロダクション環境

```typescript
export default defineNuxtConfig({
  $production: {
    ssr: true,
    nitro: {
      minify: true,
      compressPublicAssets: true,
    },
    runtimeConfig: {
      public: {
        apiBase: "https://api.ferry-transit.com",
      },
    },
  },
});
```

## トラブルシューティング

### よくある問題

1. **ビルドエラー**

```bash
# キャッシュクリア
rm -rf node_modules/.cache
rm -rf .nuxt
npm ci
npm run build
```

2. **Firebase デプロイエラー**

```bash
# Firebase CLI の再ログイン
firebase logout
firebase login

# プロジェクトの確認
firebase projects:list
firebase use oki-ferryguide
```

3. **Capacitor 同期エラー**

```bash
# Capacitor の再インストール
npm uninstall @capacitor/core @capacitor/cli
npm install @capacitor/core @capacitor/cli
npx cap sync
```

### ログ確認

```bash
# Firebase Functions ログ
firebase functions:log

# Firebase Hosting ログ
firebase hosting:channel:list

# Capacitor ログ（iOS）
npx cap run ios --livereload --external

# Capacitor ログ（Android）
npx cap run android --livereload --external
```

## バックアップ・復旧

### データベースバックアップ

```bash
# Firestore エクスポート
gcloud firestore export gs://oki-ferryguide-backups/$(date +%Y%m%d)

# Firestore インポート
gcloud firestore import gs://oki-ferryguide-backups/20240115
```

### コードバックアップ

```bash
# Git タグでリリースをマーク
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# リリースブランチの作成
git checkout -b release/v1.0.0
git push origin release/v1.0.0
```
