# 運賃計算機能仕様書

## 概要

隠岐航路案内の運賃計算機能は、航路・船舶タイプ・日付に基づいて正確な運賃を計算する機能です。旅客料金、車両料金、座席等級、割引などを考慮した包括的な料金計算を提供します。

## データ構造

### FareMaster インターフェース

```typescript
interface FareMaster {
  innerIslandFare?: InnerIslandFare           // 島内航路の基本料金
  innerIslandVehicleFare?: InnerIslandVehicleFare  // 島内航路の車両料金
  rainbowJetFares?: Record<string, { adult: number | null; child: number | null }>  // レインボージェット料金
  versions?: FareVersion[]                    // 料金バージョン（時系列管理）
  routes?: FareRoute[]                        // ルート別料金
  activeVersionIds?: Partial<Record<VesselType, string>>  // 有効なバージョンID
  discounts: Record<string, Discount>         // 割引情報
  notes: string[]                             // 備考
}

interface FareVersion {
  id: string
  vesselType: VesselType                      // 'ferry' | 'highspeed' | 'local'
  name?: string
  description?: string
  effectiveFrom: string                        // 適用開始日
  routes: FareRoute[]                         // ルート別料金
}

interface FareRoute {
  id: string                                   // ルートID（例: 'saigo-hishiura'）
  departure: string                           // 出発港
  arrival: string                             // 到着港
  fares?: RouteFare                           // 旅客料金
  vehicle?: VehicleFare                       // 車両料金
  vesselType?: VesselType
  versionId?: string
  versionEffectiveFrom?: string
}

interface RouteFare {
  adult: number                               // 大人料金
  child: number                               // 子供料金（大人の半額を10円単位に切り上げ）
  disabled?: {                                // 障害者割引料金
    adult: number
    child: number
  }
  seatClass?: SeatClassFare                   // 座席等級料金
  vehicle?: VehicleFare                       // 車両料金
}

interface SeatClassFare {
  class2: number                              // 2等
  class2Special: number                       // 特2等
  class1: number                              // 1等
  classSpecial: number                         // 特等
  specialRoom: number                         // 特別室
}

interface VehicleFare {
  under3m: number
  under4m: number
  under5m: number
  under6m: number
  under7m: number
  under8m: number
  under9m: number
  under10m: number
  under11m: number
  under12m: number
  over12mPer1m: number                        // 12m超過: 1mあたり
}
```

## 機能詳細

### 1. 料金マスターデータの読み込み

**データソース：**
- Firebase Storage: `/data/fare-master.json`
- ローカルストレージキャッシュ（1週間有効）

**読み込みタイミング：**
- アプリ起動時
- ルート検索時
- 運賃計算時（未読み込みの場合）

### 2. 運賃計算ロジック

#### 船舶タイプの判定

```typescript
const determineVesselType = (ship: string): VesselType => {
  if (ship === "RAINBOWJET") return "highspeed"
  if (ship === "ISOKAZE" || ship === "ISOKAZE_EX" || ship === "FERRY_DOZEN") return "local"
  return "ferry"
}
```

#### ルートIDの正規化

- `HONDO` → `HONDO_SHICHIRUI` または `HONDO_SAKAIMINATO` に展開
- 高速船の港コードを正規化（`mapHighspeedPortsToCanonicalRoute`）

#### 料金の取得

1. **有効なバージョンの特定**
   - `activeVersionIds` から該当する船舶タイプのバージョンIDを取得
   - 日付が `effectiveFrom` 以降のバージョンを選択

2. **ルートの検索**
   - 正規化されたルートIDで `FareRoute` を検索
   - 出発港・到着港の組み合わせで検索

3. **島内航路の判定**
   - 島内船（ISOKAZE、FERRY_DOZEN）の場合は `innerIslandFare` を使用
   - ルートに関係なく島内航路料金を適用

4. **レインボージェット料金**
   - 高速船（RAINBOWJET）の場合は `rainbowJetFares` から取得
   - ルートIDをキーとして検索

### 3. 料金の計算

#### 旅客料金

```typescript
const calculatePassengerFare = (
  route: FareRoute,
  passengerType: 'adult' | 'child',
  seatClass: keyof SeatClassFare = 'class2'
): number => {
  // 座席等級が指定されている場合
  if (route.fares?.seatClass) {
    const baseFare = route.fares.seatClass[seatClass]
    return passengerType === 'adult' 
      ? baseFare 
      : roundUpToTen(baseFare / 2)  // 子供は半額を10円単位に切り上げ
  }
  
  // 基本料金
  const baseFare = route.fares?.adult || 0
  return passengerType === 'adult'
    ? baseFare
    : roundUpToTen(baseFare / 2)
}
```

#### 車両料金

```typescript
const calculateVehicleFare = (
  route: FareRoute,
  vehicleLength: number
): number => {
  if (!route.fares?.vehicle && !route.vehicle) return 0
  
  const vehicleFare = route.fares?.vehicle || route.vehicle
  
  if (vehicleLength <= 3) return vehicleFare.under3m
  if (vehicleLength <= 4) return vehicleFare.under4m
  // ... 12mまで
  if (vehicleLength <= 12) return vehicleFare.under12m
  
  // 12m超過
  const baseFare = vehicleFare.under12m
  const extraLength = Math.ceil(vehicleLength - 12)
  return baseFare + (extraLength * vehicleFare.over12mPer1m)
}
```

#### 10円単位への切り上げ

```typescript
const roundUpToTen = (amount: number): number => {
  return Math.ceil(amount / 10) * 10
}
```

### 4. 割引の適用

**対応割引：**
- 往復割引（10%引き）
- 団体割引（15%引き、15名以上）
- 障害者割引（50%引き）
- 学生割引（20%引き）

**割引適用ロジック：**
```typescript
const applyDiscount = (
  baseFare: number,
  discountType: string,
  passengerCount: number = 1
): number => {
  const discount = fareMaster.discounts[discountType]
  if (!discount) return baseFare
  
  // 団体割引の場合は人数チェック
  if (discount.minPeople && passengerCount < discount.minPeople) {
    return baseFare
  }
  
  const discountedFare = baseFare * discount.rate
  return roundUpToTen(discountedFare)
}
```

### 5. 繁忙期の適用

繁忙期の判定は別機能（祝日・繁忙期判定）で行い、料金に乗数を適用：

```typescript
const applyPeakPeriod = (
  baseFare: number,
  date: Date,
  peakMultiplier: number = 1.0
): number => {
  return Math.round(baseFare * peakMultiplier)
}
```

## ストア実装

### useFareStore

```typescript
export const useFareStore = defineStore('fare', () => {
  const fareMaster = ref<FareMaster | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // 料金マスターの読み込み
  const loadFareMaster = async (): Promise<void>
  
  // 運賃の取得
  const getFare = (
    routeId: string,
    vesselType: VesselType,
    options?: GetFareOptions
  ): RouteFare | null
  
  // ルートの検索
  const findRoute = (
    departure: string,
    arrival: string,
    vesselType: VesselType,
    date?: Date
  ): FareRoute | null
})
```

## ユーザーインターフェース

### 運賃表示画面（`/fare`）

**主要機能：**
- ルート選択（出発地・目的地）
- 旅客タイプ選択（大人・子供）
- 座席等級選択（2等・特2等・1等・特等・特別室）
- 車両情報入力（長さ）
- 割引選択
- 料金計算結果の表示

**表示項目：**
- 基本料金
- 座席等級料金
- 車両料金
- 割引適用後の料金
- 合計料金

## データ管理

### 料金マスターデータの更新

**管理画面（`/admin/fare`）から：**
- ルート別料金の編集
- 座席等級料金の設定
- 車両料金の設定
- 割引の設定
- バージョン管理（適用開始日の設定）

**データ公開：**
- Firestore に保存
- Firebase Storage に公開データとしてエクスポート
- ユーザーは Storage から読み込み

## パフォーマンス最適化

1. **キャッシュ戦略**
   - 料金マスターデータは1週間キャッシュ
   - ローカルストレージに保存

2. **遅延読み込み**
   - 必要時のみ料金マスターを読み込み
   - 初回読み込み後はキャッシュを使用

## エラーハンドリング

- 料金マスターデータが読み込めない場合：デフォルト料金を使用
- ルートが見つからない場合：エラーメッセージを表示
- 無効なパラメータ：バリデーションエラーを表示

## 多言語対応

- ルート名、座席等級名はi18nキーで管理
- 料金表示はロケールに応じて通貨フォーマットを変更

## 関連機能

- **ルート検索**: 検索結果に運賃を表示
- **時刻表表示**: 各便の運賃を表示
- **管理画面**: 料金マスターデータの管理





