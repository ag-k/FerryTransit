# オフライン対応機能仕様書

## 概要

隠岐航路案内のオフライン対応機能は、ネットワーク接続がない環境でも基本的な機能を利用できるようにする機能です。ローカルストレージとService Workerを使用してデータをキャッシュします。

## キャッシュ戦略

### データの種類とキャッシュ期間

| データ種類 | キャッシュ期間 | ストレージキー |
|-----------|--------------|--------------|
| 時刻表データ | 15分 | `ferry-transit:timetable` |
| 料金マスターデータ | 1週間 | `ferry-transit:fare` |
| 祝日データ | 30日 | `ferry-transit:holiday` |
| お知らせデータ | 30分 | `ferry-transit:news` |
| アラートデータ | 15分 | `ferry-transit:alerts` |

### キャッシュの優先順位

1. **オンライン時**
   - Firebase Storage から最新データを取得
   - 取得に成功したらローカルストレージに保存
   - 取得に失敗したらキャッシュを使用

2. **オフライン時**
   - ローカルストレージのキャッシュを使用
   - キャッシュが古い場合は警告を表示

## 機能詳細

### 1. オフライン検出

```typescript
const isOffline = ref(false)

const setupOfflineDetection = () => {
  if (process.client) {
    isOffline.value = !navigator.onLine
    
    window.addEventListener('online', () => {
      isOffline.value = false
    })
    
    window.addEventListener('offline', () => {
      isOffline.value = true
    })
  }
}
```

### 2. データの保存

```typescript
const saveData = (
  key: string,
  data: any,
  ttlMinutes?: number
): boolean => {
  const item: OfflineStorageItem = {
    key,
    data,
    timestamp: Date.now(),
    expiresAt: ttlMinutes 
      ? Date.now() + (ttlMinutes * 60 * 1000) 
      : undefined
  }
  
  localStorage.setItem(`ferry-transit:${key}`, JSON.stringify(item))
  return true
}
```

### 3. データの取得

```typescript
const getData = <T = any>(key: string): T | null => {
  const itemStr = localStorage.getItem(`ferry-transit:${key}`)
  if (!itemStr) return null
  
  const item: OfflineStorageItem = JSON.parse(itemStr)
  
  // 有効期限チェック
  if (item.expiresAt && Date.now() > item.expiresAt) {
    removeData(key)
    return null
  }
  
  return item.data as T
}
```

### 4. 時刻表データの取得（オフライン対応）

```typescript
const fetchTimetableData = async (): Promise<TimetableData | null> => {
  const localData = getTimetableData()
  
  // オンライン時は最新データを取得
  if (!isOffline.value) {
    try {
      const remoteUrl = await getStorageDownloadURL('timetable.json')
      if (remoteUrl) {
        const response = await fetch(remoteUrl)
        if (response.ok) {
          const data = await response.json()
          saveTimetableData(data)
          return data
        }
      }
    } catch (e) {
      // エラー時はキャッシュを使用
    }
  }
  
  // オフライン時または取得失敗時はキャッシュを返す
  if (localData) return localData
  
  return null
}
```

### 5. 料金データの取得（オフライン対応）

```typescript
const fetchFareData = async (): Promise<FareMaster | null> => {
  const localData = getFareData()
  
  if (!isOffline.value) {
    try {
      const remoteUrl = await getStorageDownloadURL('fare-master.json')
      if (remoteUrl) {
        const response = await fetch(remoteUrl)
        if (response.ok) {
          const data = await response.json()
          saveFareData(data)
          return data
        }
      }
    } catch (e) {
      // エラー時はキャッシュを使用
    }
  }
  
  if (localData) return localData
  return null
}
```

## 実装詳細

### Composable: `useOfflineStorage`

```typescript
export const useOfflineStorage = () => {
  // データの保存
  const saveData = (
    key: string,
    data: any,
    ttlMinutes?: number
  ): boolean
  
  // データの取得
  const getData = <T = any>(key: string): T | null
  
  // データの削除
  const removeData = (key: string): boolean
  
  // 期限切れデータのクリーンアップ
  const cleanupExpired = (): number
  
  // ストレージサイズの取得
  const getStorageSize = () => {
    return {
      used: number,      // 使用量（バイト）
      total: number,     // 総容量（バイト）
      percentage: number // 使用率（%）
    }
  }
  
  // 特定データタイプの保存・取得
  const saveTimetableData = (data: any): boolean
  const getTimetableData = (): any
  const saveFareData = (data: any): boolean
  const getFareData = (): any
  const saveHolidayData = (data: any): boolean
  const getHolidayData = (): any
}
```

### Store: `useOfflineStore`

```typescript
export const useOfflineStore = defineStore('offline', () => {
  const isOffline = ref(false)
  const lastSync = ref<{
    timetable?: number
    fare?: number
    holiday?: number
  }>({})
  
  // オフライン検出のセットアップ
  const setupOfflineDetection = (): void
  
  // データの取得（オフライン対応）
  const fetchTimetableData = async (): Promise<TimetableData | null>
  const fetchFareData = async (): Promise<FareMaster | null>
  const fetchHolidayData = async (): Promise<HolidayMaster | null>
  
  // データの同期
  const syncAllData = async (): Promise<void>
  
  // キャッシュのクリア
  const clearCache = (): void
})
```

## ユーザーインターフェース

### オフラインインジケーター

ネットワーク接続がない場合、画面上部にオフラインインジケーターを表示：

- 黄色のバナー: 「オフラインです。キャッシュされたデータを表示しています。」
- データが古い場合: 「データが古い可能性があります。接続を確認してください。」

### データの手動更新

設定画面から手動でデータを更新可能：

- 「データを更新」ボタン
- 更新中のインジケーター
- 更新成功/失敗の通知

## パフォーマンス最適化

1. **ストレージサイズの管理**
   - 定期的に期限切れデータをクリーンアップ
   - ストレージサイズが上限に近づいたら警告

2. **データの圧縮**
   - JSON データを圧縮して保存（将来的に実装）

3. **選択的なキャッシュ**
   - よく使うデータのみキャッシュ
   - 不要なデータは削除

## エラーハンドリング

- **ストレージエラー**: ストレージが満杯の場合、エラーメッセージを表示
- **データ破損**: 破損したデータは削除し、デフォルト値を表示
- **ネットワークエラー**: キャッシュデータを使用し、警告を表示

## 制限事項

1. **ストレージ容量**
   - ローカルストレージの容量制限（通常5-10MB）
   - データが大きい場合は IndexedDB の使用を検討

2. **データの鮮度**
   - オフライン時は最新データを取得できない
   - キャッシュが古い場合は警告を表示

3. **機能の制限**
   - 一部の機能（データ公開など）はオンライン時のみ利用可能

## 関連機能

- **時刻表表示**: オフライン時もキャッシュから表示
- **ルート検索**: オフライン時もキャッシュデータで検索可能
- **運賃計算**: オフライン時もキャッシュデータで計算可能
- **設定機能**: キャッシュのクリア、手動更新




