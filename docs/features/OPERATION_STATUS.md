# 運航状況・アラート機能仕様書

## 概要

隠岐航路案内の運航状況・アラート機能は、リアルタイムの運航情報を取得し、欠航・遅延・時間変更などのアラートを表示する機能です。各船舶の運航状況を統合して表示します。

## データ構造

### ShipStatus インターフェース

```typescript
interface ShipStatus {
  id?: number
  ship_id?: number
  hasAlert: boolean              // アラートの有無
  status: number                 // 運航状況（0:通常、1:遅延、2:欠航、3:時間変更、4:臨時便）
  date: string | null            // 対象日
  updated: string | null         // 更新日時
  summary: string | null         // 概要
  comment: string | null         // 詳細コメント
  reason?: string                // 理由
  reason_id?: number | null      // 理由ID
  departure?: string             // 出発港
  arrival?: string               // 到着港
  startTime?: string             // 開始時刻
  lastShips?: any[]              // 影響を受ける便のリスト
  extraShips?: any[]             // 臨時便のリスト
  ship_name?: string             // 船舶名
  prev_status?: number           // 前回のステータス
}
```

### FerryStatus インターフェース

```typescript
interface FerryStatus {
  id?: number
  hasAlert: boolean
  date: string | null
  ferryState?: string            // フェリーの運航状況
  ferryComment?: string          // フェリーのコメント
  fastFerryState?: string        // 高速船の運航状況
  fastFerryComment?: string     // 高速船のコメント
  todayWave?: string             // 今日の波高
  tomorrowWave?: string          // 明日の波高
  created_at?: string
  updated_at?: string
}
```

### StatusApiResponse インターフェース

```typescript
interface StatusApiResponse {
  isokaze: ShipStatus | null     // いそかぜ
  dozen: ShipStatus | null        // フェリーどうぜん
  ferry: FerryStatus | null       // フェリーおき・レインボージェット
  kunigaKankou?: SightseeingStatus | null  // くにが観光
}
```

## 機能詳細

### 1. 運航状況データの取得

**データソース：**
- 外部API: `${config.public.shipStatusApi}/status`
- 観光船API: `${config.public.shipStatusApi}/status-kankou`

**読み込みタイミング：**
- アプリ起動時
- 運航状況ページ（`/status`）表示時
- 定期的な自動更新（5分間隔）

**データ取得フロー：**
```
useFerryStore.fetchShipStatus()
    ↓
外部APIから取得（並列実行）
    ↓
StatusApiResponse 形式に変換
    ↓
shipStatus に保存
```

### 2. アラートの判定

#### アラートの有無

```typescript
const hasAlert = (status: ShipStatus | FerryStatus | null): boolean => {
  if (!status) return false
  
  // ShipStatus の場合
  if ('status' in status) {
    return status.status !== 0  // 通常運航以外はアラート
  }
  
  // FerryStatus の場合
  if ('ferryState' in status || 'fastFerryState' in status) {
    return status.ferryState !== '通常運航' || 
           status.fastFerryState !== '通常運航'
  }
  
  return false
}
```

#### アラートの種類

- **通常運航（0）**: アラートなし
- **遅延・一部欠航（1）**: 黄色アラート
- **全便欠航（2）**: 赤色アラート
- **時間変更（3）**: オレンジ色アラート
- **臨時便（4）**: 青色アラート

### 3. アラート情報の統合

時刻表にアラート情報を統合：

```typescript
const alerts = computed(() => {
  const alertList = []
  
  // ISOKAZE のアラート
  if (shipStatus.value.isokaze?.lastShips && 
      shipStatus.value.isokaze.status !== 0) {
    shipStatus.value.isokaze.lastShips.forEach(trip => {
      alertList.push({
        date: selectedDate.value.toISOString().split('T')[0],
        shipName: 'ISOKAZE',
        departureTime: trip.departure_time || trip.departureTime,
        status: shipStatus.value.isokaze?.status || 2
      })
    })
  }
  
  // FERRY_DOZEN のアラート
  // ...
  
  return alertList
})
```

### 4. 運航状況の表示

#### ホーム画面での表示

`StatusAlerts` コンポーネントで主要なアラートを表示：

- アラートがある船舶のみ表示
- 概要（summary）を表示
- 詳細ページへのリンク

#### 運航状況ページ（`/status`）

各船舶の詳細な運航状況を表示：

- **ISOKAZE（いそかぜ）**
  - 運航状況
  - 概要・コメント
  - 影響を受ける便のリスト
  - 臨時便のリスト

- **FERRY_DOZEN（フェリーどうぜん）**
  - 同上

- **フェリーおき・レインボージェット**
  - フェリーの運航状況
  - 高速船の運航状況
  - 波高情報（今日・明日）

- **くにが観光**
  - 観光コースA・Bの運航状況

## ユーザーインターフェース

### 運航状況ページ（`/status`）

**主要コンポーネント：**
- 各船舶の運航状況カード
- アラート情報の詳細表示
- 更新時刻の表示
- 自動更新の切り替え

**表示項目：**
- 運航状況バッジ（色分け）
- 概要・コメント
- 影響を受ける便のリスト
- 臨時便のリスト
- 波高情報（フェリーの場合）

### アラートバナー

ホーム画面や時刻表画面に表示されるアラートバナー：

- 黄色: 遅延・一部欠航
- 赤色: 全便欠航
- オレンジ色: 時間変更
- 青色: 臨時便

## 実装詳細

### Store: `useFerryStore`

```typescript
export const useFerryStore = defineStore('ferry', () => {
  const shipStatus = ref<StatusApiResponse>({
    isokaze: null,
    dozen: null,
    ferry: null,
    kunigaKankou: null
  })
  
  // 運航状況の取得
  const fetchShipStatus = async (): Promise<void>
  
  // アラートのリスト
  const alerts = computed(() => Array<Alert>)
})
```

### コンポーネント: `StatusAlerts`

```vue
<template>
  <div v-if="hasAlerts">
    <!-- アラート情報を表示 -->
  </div>
</template>
```

## 管理画面機能

### アラート管理（`/admin/alerts`）

管理者が運航アラートを作成・編集・削除：

**入力項目：**
- 船舶（ISOKAZE、FERRY_DOZEN、フェリーおき、レインボージェット）
- 航路
- ステータス（遅延、欠航、時間変更、臨時便）
- 概要（日本語・英語）
- コメント（日本語・英語）
- 開始日・終了日
- 重要度（低・中・高）

**機能：**
- アラートの作成・編集・削除
- アクティブなアラートの一覧表示
- アラート履歴の表示
- データ公開（Firebase Storage への反映）

## パフォーマンス最適化

1. **自動更新の間隔**
   - デフォルト: 5分間隔
   - ユーザーが手動で更新可能

2. **キャッシュ戦略**
   - 取得したデータを一時的にキャッシュ
   - ネットワークエラー時はキャッシュを表示

3. **並列取得**
   - 複数のAPIを並列で取得して高速化

## エラーハンドリング

- APIが利用できない場合：キャッシュデータを表示、または「情報を取得できませんでした」を表示
- ネットワークエラー：オフライン時のキャッシュデータを使用
- データ形式エラー：デフォルト値を使用して継続

## 多言語対応

- 運航状況の表示名はi18nキーで管理
- アラートメッセージも多言語対応
- コメントは日本語・英語の両方を表示

## 関連機能

- **時刻表表示**: アラート情報を統合して表示
- **ルート検索**: 欠航便を検索結果から除外
- **管理画面**: アラート情報の管理




