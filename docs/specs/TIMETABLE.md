# 時刻表表示機能仕様書

## 概要

隠岐航路案内の時刻表表示機能は、指定した港間のフェリースケジュールを日付別に表示する機能です。リアルタイムの運航状況やアラート情報も統合して表示します。
将来的にバス・飛行機の時刻表も統合して扱える設計を前提とします。

## データ構造

### Trip インターフェース

```typescript
type TransportMode = 'FERRY' | 'BUS' | 'AIR'
type LocationType = 'PORT' | 'STOP' | 'AIRPORT'

interface Trip {
  tripId: number              // 便ID
  startDate: string            // 適用開始日（YYYY-MM-DD）
  endDate: string              // 適用終了日（YYYY-MM-DD）
  name: string                 // 便名（船舶名/バス路線/航空便名）
  mode?: TransportMode         // 交通手段（未指定時はFERRY）
  operatorId?: string          // 事業者ID
  serviceId?: string           // 路線/便ID
  vehicleId?: string           // 車両/機材ID
  departure: string           // 出発地点コード
  departureType?: LocationType // 出発地点タイプ
  departureTime: Date | string // 出発時刻
  arrival: string             // 到着地点コード
  arrivalType?: LocationType   // 到着地点タイプ
  arrivalTime: Date | string   // 到着時刻
  platform?: string           // 乗り場番号（バスなど）
  terminal?: string           // ターミナル（空港など）
  gate?: string               // ゲート（空港など）
  nextId?: number             // 次の便ID（連続便）
  status: TripStatus          // 運航状況
  price?: number              // 運賃（オプション）
  via?: string                // 経由地（オプション）
  departureLabel?: string     // 出発地点表示名
  arrivalLabel?: string       // 到着地点表示名
}

enum TripStatus {
  Hidden = -1,    // 非表示
  Normal = 0,      // 通常運航
  Delay = 1,      // 遅延・一部欠航
  Cancel = 2,     // 全便欠航
  Change = 3,     // 時間変更
  Extra = 4       // 臨時便
}
```

## 機能詳細

### 1. 時刻表データの取得

**データソース：**
- Firebase Storage: `/data/timetable.json`
- ローカルストレージキャッシュ（15分間有効）

**読み込みタイミング：**
- アプリ起動時
- 港選択時
- 日付変更時
- 手動更新時

**データ取得フロー：**
```
useTimetableLoader.ensureTimetableLoaded()
    ↓
useFerryStore.fetchTimetable()
    ↓
Firebase Storage から取得（getCachedJsonFile）
    ↓
ローカルストレージにキャッシュ
    ↓
Trip[] 形式に変換
```

### 2. 時刻表のフィルタリング

#### 交通手段フィルタ

将来的に複数交通手段を扱うため、UI側の交通手段フィルタに応じて `mode` で絞り込む。現在は `FERRY` のみ。

#### 日付範囲フィルタ

指定日付が `startDate` と `endDate` の範囲内にある便のみを表示：

```typescript
const dayTimetable = timetableData.filter(trip => {
  const searchDateStr = formatDate(searchDate)  // YYYY-MM-DD
  const startDate = trip.startDate.replace(/\//g, '-')
  const endDate = trip.endDate.replace(/\//g, '-')
  return searchDateStr >= startDate && searchDateStr <= endDate
})
```

#### 港フィルタ

出発港・到着港が一致する便を抽出：

```typescript
const filteredTimetable = dayTimetable.filter(trip => {
  return trip.departure === selectedDeparture && 
         trip.arrival === selectedArrival
})
```

#### 本土港の正規化

`HONDO` が選択された場合、`HONDO_SHICHIRUI` と `HONDO_SAKAIMINATO` の両方を検索：

```typescript
const departurePorts = departure === "HONDO"
  ? ["HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"]
  : [departure]
```

将来的には交通手段別に**地点エイリアス**を持ち、`mode` ごとに正規化ルールを切り替える。

### 3. 連続便の処理

`nextId` が設定されている便は、次の便と連続して運行します。時刻表表示では、連続便を1つの行として表示する場合があります。

**連続便の判定：**
- 同一船舶名
- 前の便の到着港 = 次の便の出発港
- `nextId` が設定されている

### 4. 運航状況の表示

各便の運航状況をバッジで表示：

- **通常運航（0）**: 緑色バッジ
- **遅延・一部欠航（1）**: 黄色バッジ
- **全便欠航（2）**: 赤色バッジ、時刻表から除外またはグレーアウト
- **時間変更（3）**: オレンジ色バッジ
- **臨時便（4）**: 青色バッジ

### 5. アラート情報の統合

運航アラート情報を時刻表に統合表示：

```typescript
const alerts = computed(() => {
  const alertList = []
  
  // shipStatus からアラート情報を取得
  if (shipStatus.value.isokaze?.lastShips && shipStatus.value.isokaze.status !== 0) {
    // ISOKAZE のアラート情報を追加
  }
  
  // FERRY_DOZEN のアラート情報を追加
  // ...
  
  return alertList
})
```

将来的に `mode` をキーにバス・飛行機の運航状況データを統合し、`serviceId` や `operatorId` を優先キーとしてアラート紐付けを行う。

## ユーザーインターフェース

### 時刻表表示画面

**主要コンポーネント：**
- 港セレクター（出発地・目的地）
- 日付ピッカー
- カレンダー表示（`/calendar`）
- 時刻表一覧

### 交通手段フィルタ（将来）

- 交通手段が複数登録された場合に表示する（フェリーのみの間は非表示）
- 港セレクターの上に配置し、一覧の見通しを優先
- 表示形式はタブまたはセグメントコントロールを想定
- 選択肢: フェリー / バス / 飛行機 / すべて（導入時期に応じて）
- 「すべて」を選択した場合は交通手段ごとにグルーピング表示する
- 各行に交通手段バッジを表示し、視認性を確保する

**時刻表一覧の表示項目：**
- 出発時刻
- 到着時刻
- 所要時間
- 便名（船舶名/バス路線/航空便名）
- 運航状況バッジ
- 運賃（オプション）
- アラート情報

**地点表示のルール（将来）:**
- 港/停留所/空港を `LocationType` で判別し、ラベルやアイコンで区別
- プラットフォーム/ターミナル/ゲートがある場合はサブ情報として表示

**表示形式：**
- テーブル形式（デフォルト）
- カード形式（モバイル向け）
- リスト形式

**乗換を含むルートを検索ボタン：**
- 時刻表の結果表の下に表示
- 出発地と到着地が両方選択されている場合のみ表示
- **島前3島間（別府・菱浦・来居）のルートでは表示しない**
- ボタンをクリックすると乗換案内画面（`/transit`）に遷移
- 現在の出発地・到着地・日付をパラメータとして渡す
- 出発時刻は0:00に設定される
- 乗換案内画面で同ルートを検索する

### カレンダー表示（`/calendar`）

月間カレンダーで各日の運航状況を一覧表示：

- 通常運航日: 緑色
- 一部欠航日: 黄色
- 全便欠航日: 赤色
- 臨時便日: 青色

## 将来拡張（バス・飛行機）

- **地点モデルの一般化**: `departure`/`arrival` を港・停留所・空港で共通利用し、`LocationType` で区別。
- **交通手段の切り替え**: 画面上の交通手段フィルタ（タブ/トグル）で `mode` を絞り込み。
- **データソース**: 仕様は別ドキュメントで管理する。
- **時刻の扱い**: 基本はローカル時刻（国内線のみ想定のためタイムゾーンは保持しない）。

## 実装詳細

### Store: `useFerryStore`

```typescript
export const useFerryStore = defineStore('ferry', () => {
  const timetableData = ref<Trip[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchTime = ref<Date | null>(null)
  const departure = ref<string>('')
  const arrival = ref<string>('')
  const selectedDate = ref<Date>(new Date())
  
  // 時刻表の取得
  const fetchTimetable = async (force = false): Promise<void>
  
  // フィルタリングされた時刻表
  const filteredTimetable = computed(() => Trip[])
  
  // データが古いかチェック
  const isDataStale = computed(() => boolean)
})
```

### Composable: `useTimetableLoader`

```typescript
export const useTimetableLoader = () => {
  const ensureTimetableLoaded = (force = false): Promise<void>
}
```

**機能：**
- 時刻表データが未読み込みまたは古い場合に自動取得
- 重複読み込みを防止（in-flight promise の管理）

## パフォーマンス最適化

1. **キャッシュ戦略**
   - Firebase Storage から取得したデータを15分間キャッシュ
   - ローカルストレージにも保存（オフライン対応）

2. **データ量削減**
   - 日付範囲でフィルタリングしてから表示
   - 必要な港のデータのみ取得

3. **遅延読み込み**
   - 初期表示時は当日のデータのみ
   - 日付変更時に必要なデータを取得

## オフライン対応

- ネットワークエラー時はローカルストレージのキャッシュを使用
- キャッシュが古い場合は警告を表示
- オフライン状態を明示的に表示

## エラーハンドリング

- 時刻表データが読み込めない場合：エラーメッセージを表示、キャッシュから読み込みを試行
- 該当する便がない場合：「この日には便がありません」を表示
- ネットワークエラー：オフライン時のキャッシュデータを使用

## 多言語対応

- 港名、船舶名はi18nキーで管理
- 時刻表の表示形式はロケールに応じて変更
- エラーメッセージも多言語対応

## 関連機能

- **ルート検索**: 時刻表データを使用してルートを検索
- **運航状況**: リアルタイムの運航情報を統合
- **お気に入り**: よく使う港の組み合わせを保存
- **管理画面**: 時刻表データの編集・管理
