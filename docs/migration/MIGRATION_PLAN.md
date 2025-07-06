# 隠岐航路案内 Nuxt3 + Vue3 + Capacitor 移植計画書

## 概要
既存のAngularJS 1.7.9ベースのフェリー時刻表アプリケーションを、最新のNuxt3 + Vue3フレームワークに移植し、Capacitorを使用してiOS/Androidネイティブアプリとして展開する計画です。

## 現在のシステム分析

### 技術スタック
- **フロントエンド**: AngularJS 1.7.9
- **言語**: TypeScript (ES5へコンパイル)
- **UI**: Bootstrap 3.4.1 + Angular UI Bootstrap
- **データ**: SQLite → JSON (PHPエンドポイント経由)
- **外部API**: 
  - 隠岐観光API (https://ship.nkk-oki.com/api/)
  - Google Maps API

### 主要機能
1. **時刻表表示**: 港間のフェリースケジュール表示
2. **乗換案内**: 複数の経路を使った最適ルート検索
3. **運航状況**: リアルタイムの欠航・臨時便情報
4. **多言語対応**: 日本語/英語の切り替え
5. **地図統合**: 各港の位置情報表示

## 移植計画

### フェーズ1: プロジェクトセットアップ (1-2日)

#### 1.1 Nuxt3プロジェクトの初期化
```bash
npx nuxi@latest init src
cd src
npm install
```

#### 1.2 必要な依存関係のインストール
```json
{
  "dependencies": {
    "@nuxtjs/i18n": "^8.x",
    "@nuxtjs/google-fonts": "^3.x",
    "@pinia/nuxt": "^0.5.x",
    "bootstrap": "^5.3.x",
    "@bootstrap-vue-next/nuxt": "^0.x",
    "dayjs": "^1.11.x",
    "@capacitor/core": "^5.x",
    "@capacitor/ios": "^5.x",
    "@capacitor/android": "^5.x"
  }
}
```

#### 1.3 ディレクトリ構造
```
src/
├── components/
│   ├── ferry/
│   │   ├── TimetableView.vue
│   │   ├── TransitSearch.vue
│   │   └── StatusView.vue
│   ├── ui/
│   │   ├── DatePicker.vue
│   │   ├── PortSelector.vue
│   │   └── ShipModal.vue
│   └── layout/
│       ├── AppHeader.vue
│       └── AppFooter.vue
├── composables/
│   ├── useFerryData.ts
│   ├── useTransitSearch.ts
│   └── useShipStatus.ts
├── layouts/
│   └── default.vue
├── pages/
│   ├── index.vue
│   ├── timetable.vue
│   ├── transit.vue
│   └── status.vue
├── plugins/
│   └── google-maps.client.ts
├── stores/
│   ├── ferry.ts
│   └── ui.ts
├── assets/
│   └── css/
│       └── main.css
└── public/
    └── images/
```

### フェーズ2: データ層の移植 (2-3日)

#### 2.1 Pinia Storeの実装
```typescript
// stores/ferry.ts
export const useFerryStore = defineStore('ferry', () => {
  const timetableData = ref([])
  const shipStatus = ref({})
  const selectedDate = ref(new Date())
  const departure = ref('DEPARTURE')
  const arrival = ref('ARRIVAL')
  
  // APIからデータ取得
  const fetchTimetable = async () => {
    const { data } = await $fetch('/api/timetable')
    timetableData.value = data
  }
  
  // 運航状況取得
  const fetchShipStatus = async () => {
    const { data } = await $fetch('https://ship.nkk-oki.com/api/status')
    shipStatus.value = data
  }
  
  return {
    timetableData,
    shipStatus,
    selectedDate,
    departure,
    arrival,
    fetchTimetable,
    fetchShipStatus
  }
})
```

#### 2.2 APIエンドポイントの移植
Nuxt3のserver/apiディレクトリに移植:
```typescript
// server/api/timetable.get.ts
export default defineEventHandler(async (event) => {
  const data = await readFile('./data/timetable.json', 'utf-8')
  return JSON.parse(data)
})
```

### フェーズ3: UIコンポーネントの移植 (3-4日)

#### 3.1 Bootstrap 5への移行
- Bootstrap 3.4.1 → Bootstrap 5.3.x
- Angular UI Bootstrap → Bootstrap Vue Next
- レスポンシブデザインの改善

#### 3.2 主要コンポーネントの実装
```vue
<!-- components/ferry/TimetableView.vue -->
<template>
  <div class="timetable-container">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">{{ $t('TIMETABLE') }}</h2>
      </div>
      <div class="card-body">
        <PortSelector 
          v-model:departure="departure"
          v-model:arrival="arrival"
        />
        <DatePicker v-model="selectedDate" />
        <TimetableList :trips="filteredTrips" />
      </div>
    </div>
  </div>
</template>
```

#### 3.3 多言語対応の実装
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'ja', file: 'ja.json' },
      { code: 'en', file: 'en.json' }
    ],
    defaultLocale: 'ja',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected'
    }
  }
})
```

### フェーズ4: ビジネスロジックの移植 (2-3日)

#### 4.1 経路検索アルゴリズムの移植
```typescript
// composables/useTransitSearch.ts
export const useTransitSearch = () => {
  const searchRoute = (departure: string, arrival: string, dateTime: Date) => {
    // 既存のAngularJSロジックをVue3 Composition APIに移植
    // ダイクストラ法による最短経路探索の実装
  }
  
  return { searchRoute }
}
```

#### 4.2 運航状況の統合
```typescript
// composables/useShipStatus.ts
export const useShipStatus = () => {
  const processShipStatus = (rawStatus: any) => {
    // 欠航・臨時便の処理ロジック
    // アラート表示の判定
  }
  
  return { processShipStatus }
}
```

### フェーズ5: Capacitorの統合 (2-3日)

#### 5.1 Capacitorの初期化
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

#### 5.2 ネイティブ機能の実装
```typescript
// plugins/capacitor.client.ts
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { Geolocation } from '@capacitor/geolocation'

export default defineNuxtPlugin(() => {
  if (Capacitor.isNativePlatform()) {
    // ネットワーク状態の監視
    Network.addListener('networkStatusChange', status => {
      console.log('Network status changed', status.connected)
    })
    
    // 位置情報の取得（港への経路案内用）
    const getCurrentPosition = async () => {
      const coordinates = await Geolocation.getCurrentPosition()
      return coordinates
    }
  }
})
```

#### 5.3 プラットフォーム別の最適化
```vue
<!-- components/ui/DatePicker.vue -->
<template>
  <!-- iOS/Androidネイティブの日付ピッカーを使用 -->
  <input 
    v-if="isNative" 
    type="datetime-local" 
    v-model="localDate"
    class="form-control"
  >
  <!-- Webではカスタムピッカーを使用 -->
  <VueDatePicker 
    v-else 
    v-model="localDate"
    :locale="locale"
  />
</template>
```

### フェーズ6: テストとデプロイ (2-3日)

#### 6.1 テスト戦略
- **単体テスト**: Vitest
- **E2Eテスト**: Playwright
- **デバイステスト**: 実機での動作確認

#### 6.2 ビルドとデプロイ
```bash
# Webアプリのビルド
npm run build

# iOSアプリのビルド
npx cap sync ios
npx cap open ios

# Androidアプリのビルド
npx cap sync android
npx cap open android
```

## 技術的な考慮事項

### 1. パフォーマンス最適化
- **SSR/SSG**: Nuxt3のハイブリッドレンダリング
- **画像最適化**: Nuxt Imageモジュール
- **キャッシュ戦略**: PWAサポート

### 2. データ管理
- **オフライン対応**: IndexedDBでのデータキャッシュ
- **リアルタイム更新**: WebSocketまたはSSE

### 3. UI/UX改善
- **モダンなデザイン**: Material Design 3準拠
- **アクセシビリティ**: WCAG 2.1 AA準拠
- **ダークモード**: システム設定連動

### 4. セキュリティ
- **CORS設定**: サーバーサイドでの適切な設定
- **API認証**: 必要に応じてトークンベース認証

## リスクと対策

### 1. 既存機能の欠落
- **対策**: 詳細な機能テストチェックリスト作成

### 2. パフォーマンス劣化
- **対策**: Lighthouseでの継続的な計測

### 3. ブラウザ/デバイス互換性
- **対策**: BrowserStackでの幅広いテスト

## スケジュール概要

| フェーズ | 期間 | 成果物 |
|---------|------|--------|
| フェーズ1 | 1-2日 | プロジェクト基盤 |
| フェーズ2 | 2-3日 | データ層実装 |
| フェーズ3 | 3-4日 | UIコンポーネント |
| フェーズ4 | 2-3日 | ビジネスロジック |
| フェーズ5 | 2-3日 | Capacitor統合 |
| フェーズ6 | 2-3日 | テスト・デプロイ |

**合計**: 約2-3週間

## 次のステップ

1. この計画書のレビューと承認
2. 開発環境のセットアップ
3. フェーズ1の開始

## 補足: 段階的移行戦略

既存のAngularJSアプリを稼働させながら、段階的に移行することも可能です：

1. **並行運用**: 新旧両方のアプリを運用
2. **機能単位の移行**: 時刻表→乗換案内→運航状況の順
3. **A/Bテスト**: ユーザーフィードバックの収集

この計画により、最新技術スタックへの移行と、iOS/Androidネイティブアプリの展開が実現できます。