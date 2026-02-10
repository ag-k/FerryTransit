# お気に入り機能仕様書

## 概要

隠岐航路案内のお気に入り機能は、よく使うルートや港を保存し、素早くアクセスできるようにする機能です。ローカルストレージに保存され、デバイス間で同期されます。

## データ構造

### FavoriteRoute インターフェース

```typescript
interface FavoriteRoute {
  id: string                  // 一意識別子
  departure: string           // 出発港コード
  arrival: string             // 到着港コード
  nickname?: string          // ニックネーム（オプション）
  createdAt: Date            // 作成日時
  sortOrder: number           // 並び順
}
```

### FavoritePort インターフェース

```typescript
interface FavoritePort {
  id: string                  // 一意識別子
  portCode: string           // 港コード
  nickname?: string          // ニックネーム（オプション）
  createdAt: Date            // 作成日時
  sortOrder: number           // 並び順
}
```

### 制限値

```typescript
const MAX_FAVORITES = {
  ROUTES: 10,                 // ルートのお気に入り最大数
  PORTS: 5                    // 港のお気に入り最大数
}
```

## 機能詳細

### 1. お気に入りルート

#### 追加

```typescript
const addFavoriteRoute = (
  route: {
    departure: string
    arrival: string
    nickname?: string
  }
): void
```

**制約：**
- 最大10件まで
- 同じ出発地・目的地の組み合わせは重複不可

#### 削除

```typescript
const removeFavoriteRoute = (id: string): void
```

#### 更新

```typescript
const updateFavoriteRoute = (
  id: string,
  updates: {
    nickname?: string
  }
): void
```

#### 並び替え

```typescript
const reorderFavoriteRoutes = (ids: string[]): void
```

### 2. お気に入り港

#### 追加

```typescript
const addFavoritePort = (
  port: {
    portCode: string
    nickname?: string
  }
): void
```

**制約：**
- 最大5件まで
- 同じ港は重複不可

#### 削除

```typescript
const removeFavoritePort = (id: string): void
```

#### 更新

```typescript
const updateFavoritePort = (
  id: string,
  updates: {
    nickname?: string
  }
): void
```

#### 並び替え

```typescript
const reorderFavoritePorts = (ids: string[]): void
```

### 3. お気に入りの確認

```typescript
const isRouteFavorited = (departure: string, arrival: string): boolean
const isPortFavorited = (portCode: string): boolean
```

### 4. データの取得

#### 並び順で取得

```typescript
const orderedRoutes = computed(() => FavoriteRoute[])
const orderedPorts = computed(() => FavoritePort[])
```

#### 作成日時順で取得

```typescript
const recentRoutes = computed(() => FavoriteRoute[])
const recentPorts = computed(() => FavoritePort[])
```

## ユーザーインターフェース

### お気に入りページ（`/favorites`）

**主要コンポーネント：**
- お気に入りルート一覧
- お気に入り港一覧
- 追加・編集・削除ボタン
- 並び替え機能（ドラッグ&ドロップ）

**表示項目：**
- ルート/港の表示名（ニックネームがある場合はそれを使用）
- 追加日時
- お気に入りアイコン

### お気に入りボタン

各画面に表示されるお気に入りボタン：

- **ルート検索画面**: 検索結果の各ルートに表示
- **時刻表画面**: 港セレクターに表示
- **運賃計算画面**: ルート選択時に表示

### お気に入りからの検索

お気に入りルートをクリックすると、そのルートで検索を実行：

```typescript
const searchFavoriteRoute = async (route: FavoriteRoute) => {
  ferryStore.setDeparture(route.departure)
  ferryStore.setArrival(route.arrival)
  await router.push({
    path: localePath('/transit'),
    query: {
      from: route.departure,
      to: route.arrival
    }
  })
}
```

## 実装詳細

### Store: `useFavoriteStore`

```typescript
export const useFavoriteStore = defineStore('favorite', () => {
  const routes = ref<FavoriteRoute[]>([])
  const ports = ref<FavoritePort[]>([])
  
  // Getters
  const orderedRoutes = computed(() => FavoriteRoute[])
  const recentRoutes = computed(() => FavoriteRoute[])
  const orderedPorts = computed(() => FavoritePort[])
  const recentPorts = computed(() => FavoritePort[])
  
  // Actions
  const addFavoriteRoute = (...): void
  const removeFavoriteRoute = (id: string): void
  const updateFavoriteRoute = (...): void
  const reorderFavoriteRoutes = (ids: string[]): void
  
  const addFavoritePort = (...): void
  const removeFavoritePort = (id: string): void
  const updateFavoritePort = (...): void
  const reorderFavoritePorts = (ids: string[]): void
  
  const clearAllFavorites = (): void
  const loadFromStorage = (): void
  const saveToStorage = (): void
})
```

### Composable: `useFavorites`

```typescript
export const useFavorites = () => {
  // トグル機能
  const toggleFavoriteRoute = (
    departure: string,
    arrival: string,
    nickname?: string
  ): boolean
  
  const toggleFavoritePort = (
    portCode: string,
    nickname?: string
  ): boolean
  
  // チェック機能
  const isFavoriteRoute = (departure: string, arrival: string): boolean
  const isFavoritePort = (portCode: string): boolean
  
  // 表示名取得
  const getRouteDisplayName = (route: FavoriteRoute): string
  const getPortDisplayName = (port: FavoritePort): string
  
  // アクション
  const searchFavoriteRoute = async (route: FavoriteRoute): Promise<void>
  const selectFavoritePort = (port: FavoritePort, type: 'departure' | 'arrival'): void
  const updateFavoriteRouteNickname = (id: string, nickname: string): void
  const updateFavoritePortNickname = (id: string, nickname: string): void
  const reorderFavoriteRoutes = (ids: string[]): void
  const reorderFavoritePorts = (ids: string[]): void
  const clearAllFavorites = (): boolean
  
  // 統計情報
  const getFavoriteStats = () => {
    return {
      routeCount: number
      routeLimit: number
      portCount: number
      portLimit: number
      canAddRoute: boolean
      canAddPort: boolean
    }
  }
}
```

## データ永続化

### ローカルストレージ

お気に入りデータはローカルストレージに保存：

- **キー**: `ferry-transit:favorite-routes`, `ferry-transit:favorite-ports`
- **有効期限**: 無期限
- **形式**: JSON

### ストレージ同期

複数のタブ間で同期：

```typescript
window.addEventListener('storage', (e) => {
  if (e.key === 'ferry-transit:favorite-routes' || 
      e.key === 'ferry-transit:favorite-ports') {
    loadFromStorage()
  }
})
```

## エラーハンドリング

- **上限超過**: 「お気に入りの上限に達しました」を表示
- **重複追加**: 「既にお気に入りに登録されています」を表示
- **ストレージエラー**: エラーメッセージを表示、処理を継続

## 多言語対応

- お気に入りの表示名はi18nキーで管理
- エラーメッセージも多言語対応
- 港名はロケールに応じて表示

## 関連機能

- **ルート検索**: お気に入りルートから直接検索
- **時刻表表示**: お気に入り港を素早く選択
- **検索履歴**: よく使うルートを自動的に記録





