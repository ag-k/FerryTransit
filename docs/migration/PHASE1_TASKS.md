# フェーズ1 詳細タスクリスト - プロジェクトセットアップ

## 概要
フェーズ1では、Nuxt3プロジェクトの基礎構築と開発環境のセットアップを行います。
**想定期間**: 1-2日（8-16時間）

## タスク一覧

### 1. 開発環境の準備（1-2時間）

#### 1.1 Node.js環境の確認
- [ ] Node.js v18以上がインストールされていることを確認
- [ ] npm/yarn/pnpmの最新版を確認
- [ ] 必要に応じてnvmでNode.jsバージョンを管理

#### 1.2 開発ツールの準備
- [ ] VS Code拡張機能のインストール
  - [ ] Vue Language Features (Volar)
  - [ ] TypeScript Vue Plugin (Volar)
  - [ ] ESLint
  - [ ] Prettier
- [ ] Chrome/Firefox開発者ツールのVue DevTools拡張機能をインストール

### 2. Nuxt3プロジェクトの初期化（1時間）

#### 2.1 プロジェクト作成
```bash
# 新しいディレクトリで作業
cd /Users/ag/works/
npx nuxi@latest init src
cd src
```

#### 2.2 初期設定
- [ ] `.gitignore`の確認と調整
- [ ] `README.md`の更新
- [ ] TypeScript設定の確認（`tsconfig.json`）
- [ ] ESLint設定の追加
  ```bash
  npm install -D @nuxt/eslint-config-typescript eslint
  ```

### 3. 基本的な依存関係のインストール（1-2時間）

#### 3.1 コア依存関係
```bash
# UIフレームワーク
npm install bootstrap@5.3.3
npm install -D sass sass-loader

# 状態管理
npm install @pinia/nuxt pinia

# 日付処理
npm install dayjs

# 開発ツール
npm install -D @types/node
```

#### 3.2 Nuxtモジュールのインストール
```bash
# 国際化
npm install @nuxtjs/i18n

# フォント管理
npm install @nuxtjs/google-fonts

# Bootstrap Vue (Vue3対応版)
npm install bootstrap-vue-next @bootstrap-vue-next/nuxt
```

#### 3.3 Capacitor関連（後で使用）
```bash
# Capacitorコア
npm install @capacitor/core
npm install -D @capacitor/cli

# プラットフォーム別パッケージ（フェーズ5で使用）
# npm install @capacitor/ios @capacitor/android
```

### 4. プロジェクト構造の作成（1-2時間）

#### 4.1 ディレクトリ作成
```bash
# コンポーネント
mkdir -p components/ferry
mkdir -p components/ui  
mkdir -p components/layout

# Composables
mkdir -p composables

# ストア
mkdir -p stores

# アセット
mkdir -p assets/css
mkdir -p assets/images

# サーバーAPI
mkdir -p server/api

# 国際化
mkdir -p locales

# 型定義
mkdir -p types
```

#### 4.2 基本ファイルの作成
- [ ] `layouts/default.vue` - デフォルトレイアウト
- [ ] `pages/index.vue` - トップページ
- [ ] `assets/css/main.scss` - メインスタイルシート
- [ ] `types/index.ts` - 型定義ファイル

### 5. Nuxt設定ファイルの構成（1-2時間）

#### 5.1 nuxt.config.tsの設定
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts',
    '@pinia/nuxt',
    '@bootstrap-vue-next/nuxt'
  ],

  css: [
    'bootstrap/dist/css/bootstrap.css',
    '@/assets/css/main.scss'
  ],

  i18n: {
    locales: [
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    defaultLocale: 'ja',
    langDir: 'locales/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected'
    }
  },

  googleFonts: {
    families: {
      Roboto: [300, 400, 500, 700],
      'Noto+Sans+JP': [300, 400, 500, 700]
    }
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'https://naturebot-lab.com/ferry_transit',
      shipStatusApi: process.env.SHIP_STATUS_API || 'https://ship.nkk-oki.com/api',
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
    }
  },

  typescript: {
    strict: true,
    shim: false
  }
})
```

### 6. 型定義の作成（1時間）

#### 6.1 基本的な型定義
```typescript
// types/index.ts
export interface Port {
  id: string
  name: string
  nameEn: string
  location: {
    lat: number
    lng: number
  }
  type: 'mainland' | 'dozen' | 'dogo'
}

export interface Ship {
  id: string
  name: string
  nameEn: string
  type: 'ferry' | 'highspeed' | 'local'
  imageUrl?: string
}

export interface Trip {
  tripId: number
  startDate: string
  endDate: string
  name: string
  departure: string
  departureTime: Date
  arrival: string
  arrivalTime: Date
  nextId?: number
  status: TripStatus
  price?: number
}

export enum TripStatus {
  Hidden = -1,
  Normal = 0,
  Delay = 1,
  Cancel = 2,
  Change = 3,
  Extra = 4
}

export interface ShipStatus {
  hasAlert: boolean
  status: number
  date: string | null
  updated: string | null
  summary: string | null
  comment: string | null
  lastShips?: Trip[]
  extraShips?: Trip[]
}
```

### 7. 既存アセットの移行準備（30分）

#### 7.1 画像ファイルのコピー
```bash
# 既存プロジェクトから画像をコピー
cp -r ../FerryTransit/images/* public/images/
```

#### 7.2 フェビコンとアイコンの設定
- [ ] `public/favicon.ico`の配置
- [ ] `public/apple-touch-icon.png`の配置

### 8. 国際化ファイルの準備（1時間）

#### 8.1 翻訳ファイルの作成
既存のAngularJS翻訳を移行：

```json
// locales/ja.json
{
  "TITLE": "隠岐航路案内",
  "CURRENCY_UNIT": "円",
  "HOURS": "時間",
  "MINUTES": "分",
  "ROUTE": "経路",
  "TIME": "時刻",
  "FARE": "運賃",
  // ... 既存の翻訳をコピー
}
```

```json
// locales/en.json
{
  "TITLE": "Oki Islands Sea Line Information",
  "CURRENCY_UNIT": "yen",
  "HOURS": "hours",
  "MINUTES": "mins",
  // ... 既存の翻訳をコピー
}
```

### 9. 開発サーバーの起動確認（30分）

#### 9.1 動作確認
```bash
# 開発サーバー起動
npm run dev

# ビルド確認
npm run build
npm run preview
```

#### 9.2 初期ページの作成
```vue
<!-- pages/index.vue -->
<template>
  <div class="container">
    <h1>{{ $t('TITLE') }}</h1>
    <p>Nuxt3 移植版 - 開発中</p>
  </div>
</template>

<script setup lang="ts">
// 初期セットアップ確認用
</script>
```

### 10. Git設定とコミット（30分）

#### 10.1 リポジトリの初期化
```bash
git init
git add .
git commit -m "feat: Nuxt3プロジェクトの初期セットアップ"
```

#### 10.2 リモートリポジトリとの連携
- [ ] GitHubに新しいリポジトリを作成
- [ ] リモートリポジトリを追加
- [ ] 初期プッシュ

## チェックリスト

### 環境構築
- [ ] Node.js v18以上
- [ ] 開発ツールのインストール
- [ ] VS Code拡張機能

### プロジェクト基盤
- [ ] Nuxt3プロジェクトの作成
- [ ] 依存関係のインストール
- [ ] ディレクトリ構造の作成
- [ ] nuxt.config.tsの設定

### 型定義とアセット
- [ ] TypeScript型定義
- [ ] 画像アセットの移行
- [ ] 国際化ファイルの準備

### 動作確認
- [ ] 開発サーバーの起動
- [ ] ビルドの成功
- [ ] 基本的なページ表示

## 成果物

1. **動作するNuxt3プロジェクト**
   - 開発サーバーが起動する
   - TypeScriptが正しく設定されている
   - 国際化が機能している

2. **整理されたプロジェクト構造**
   - コンポーネント、ページ、ストアのディレクトリ
   - 型定義ファイル
   - 設定ファイル

3. **開発環境**
   - ESLint/Prettier設定
   - VS Code設定
   - Git設定

## 次のステップへの準備

フェーズ1完了後、以下が可能になります：
- Piniaストアの実装開始
- APIエンドポイントの移植
- UIコンポーネントの開発

## 注意事項

1. **既存プロジェクトとの並行作業**
   - 新しいディレクトリで作業
   - 既存のAngularJSプロジェクトは保持

2. **段階的な移行**
   - 一度にすべてを移行しない
   - 動作確認を頻繁に実施

3. **ドキュメント化**
   - 設定変更は記録
   - 問題と解決策を文書化