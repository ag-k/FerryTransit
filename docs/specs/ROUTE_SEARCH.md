# ルート検索・乗換案内機能仕様書

## 概要

隠岐航路案内のルート検索・乗換案内機能は、出発地と目的地を指定して、最適なフェリー航路を検索し、複数の経路を比較できる機能です。直行便だけでなく、乗り換えが必要な経路も検索できます。
将来的にバス・飛行機を含むマルチモーダル検索へ拡張する前提で設計します。

## データ構造

### TransitRoute インターフェース

```typescript
type TransportMode = 'FERRY' | 'BUS' | 'AIR'
type LocationType = 'PORT' | 'STOP' | 'AIRPORT'

interface TransitRoute {
  segments: TransitSegment[]  // 経路の各セグメント
  departureTime: Date          // 出発時刻
  arrivalTime: Date            // 到着時刻
  totalFare: number            // 合計運賃
  transferCount: number        // 乗り換え回数
}

interface TransitSegment {
  tripId: string              // 便ID
  mode?: TransportMode        // 交通手段（未指定時はFERRY）
  ship: string                // 便名（船舶名/バス路線/航空便名）
  operatorId?: string         // 事業者ID
  serviceId?: string          // 路線/便ID
  vehicleId?: string          // 車両/機材ID
  flightNumber?: string       // 航空便番号（AIRのみ）
  departure: string           // 出発地点
  departureType?: LocationType // 出発地点タイプ
  arrival: string             // 到着地点
  arrivalType?: LocationType   // 到着地点タイプ
  departureTime: Date         // 出発時刻
  arrivalTime: Date           // 到着時刻
  status: number              // 運航状況（0:通常、1:遅延、2:欠航、3:時間変更、4:臨時便）
  fare: number                // 運賃
}
```

## 機能詳細

### 1. 検索パラメータ

**入力項目：**
- 出発地（必須）
- 目的地（必須）
- 検索日（必須）
- 検索時刻（必須）
- 交通手段フィルタ（将来）
- 検索モード
  - 出発時刻指定（デフォルト）
  - 到着時刻指定

**対応地点（現行は港のみ）：**
- 西郷（SAIGO）
- 菱浦（HISHIURA）
- 別府（BEPPU）
- 来居（KURI）
- 本土七類（HONDO_SHICHIRUI）
- 本土境港（HONDO_SAKAIMINATO）
- 本土（HONDO）- 七類・境港の両方を検索

### 2. 検索アルゴリズム

#### 直行便検索（findDirectRoutes）

1. 指定日付の有効な時刻表データを交通手段別にフィルタリング
2. 出発地・目的地が一致する便を検索
3. 検索時刻の制約を満たす便を抽出
4. 欠航便（status=2）を除外
5. 各便の運賃を計算

#### 乗り換え経路検索（findTransferRoutes）

1. 第1便：出発地から出発する便を検索
2. 第2便：第1便の到着地点から出発し、目的地に到着する便を検索
3. 乗り換え時間の制約を確認（最小待ち時間を確保）
4. 同一船舶の連続便（nextId）を考慮
5. 本土港での乗り換えは除外（島内のみ）

**乗り換え制約：**
- 第1便の到着地点と第2便の出発地点が一致
- 第2便の出発時刻が第1便の到着時刻より後
- 本土港（HONDO_SHICHIRUI、HONDO_SAKAIMINATO）では乗り換え不可

**将来の交通手段拡張時の乗換制約（設計方針）：**
- 交通手段ごとに最小乗換時間（MCT: Minimum Connection Time）を設定
  - 例: FERRY→FERRY: 10分 / BUS→BUS: 5分 / AIR→AIR: 45分 / AIR→BUS: 30分
- 異なる交通手段の乗換は「接続可能な地点タイプ（PORT/STOP/AIRPORT）」をもとに許可判定
- 交通手段フィルタが指定されている場合は、該当モードのみで経路探索

### 3. 検索結果の並び替え

- **出発時刻指定モード**: 出発時刻の昇順
- **到着時刻指定モード**: 到着時刻の降順

### 3.1 検索結果の重複排除（乗換待ち時間が最短のもののみ表示）

乗換案内の検索結果において、**乗り換えの経路および船種が同一**で、**乗換待ち時間のみが異なる**候補が複数ある場合は、ユーザーの比較負荷を下げるため **乗換待ち時間が最短の候補のみを表示**し、他は除外する。

#### 用語定義

- **便種/路線/便名**: 本仕様では時刻表の `Trip.name`（= `TransitSegment.ship`）で表現される**便名/路線名/船名**を指す。
  - 例: `ISOKAZE`（いそかぜ）と `FERRY_DOZEN`（フェリーどうぜん）は**別の便種**として扱い、同一経路でも重複排除の対象にしない。
- **乗換待ち時間**: セグメント間の待ち時間。セグメント配列を `segments` とすると以下で定義する。
  - `segments.length <= 1` の場合は 0
  - `segments.length >= 2` の場合、各乗換の待ち時間の合計
    - \(\sum_{i=0}^{n-2} (segments[i+1].departureTime - segments[i].arrivalTime)\)

#### 「同一経路」の判定キー（Route Signature）

重複排除の単位（同一とみなすグループ）を、検索結果の `TransitRoute` から導出する **Route Signature** で定義する。

- **Route Signature**: `segments` の順序を保ったまま、各セグメントの以下のタプルを連結した文字列（または同等の配列キー）
  - `departure`（出発地点ID）
  - `arrival`（到着地点ID）
  - `mode`（交通手段）
  - `ship`（便名/路線/船名）

例（ユーザー要望のケース）:
- 「菱浦港から `ISOKAZE` で出発し、来居港で `FERRY_SHIRASHIMA` に乗り換える」
  - Signature: `[HISHIURA->KURI@ISOKAZE, KURI->(目的地)@FERRY_SHIRASHIMA]`
  - この Signature が同じ候補が複数ある場合、**来居港での待ち時間（= 1回目の待ち時間）が最短**のものだけ残す。

#### フィルタ規則

- 直行便（`segments.length <= 1`）は対象外（同一経路でも出発時刻違いの候補を残す）
- 同一の Route Signature を持つ候補が複数ある場合、**乗換待ち時間合計が最小**の候補を採用する。
- 乗換待ち時間合計が同値の場合のタイブレーク（表示の安定性のため）:
  - 1) `departureTime` が早いもの
  - 2) それも同値なら `arrivalTime` が早いもの
  - 3) それも同値なら `segments` の `tripId` 連結が辞書順で小さいもの

#### 適用タイミング

結果の重複排除は、最終的なソート規則（出発時刻/到着時刻モード）に依存しないよう、

- **候補生成（直行便＋乗換便）**
- **重複排除（本節）**
- **並び替え（出発/到着モード）**

の順で実施する。

### 4. 運賃計算

各セグメントの運賃を計算し、合計を算出：

```typescript
const calculateFare = async (
  ship: string,
  departure: string,
  arrival: string,
  date?: Date
): Promise<number>
```

**運賃計算ロジック：**
- 船舶タイプの判定（高速船/フェリー/島内船）
- ルートIDの正規化（HONDOの正規化など）
- 料金マスターデータから該当ルートの運賃を取得
- 繁忙期・割引の適用（別途実装）

**将来の拡張方針（バス・飛行機）：**
- 交通手段ごとに料金ソースを分離（バスは路線運賃、飛行機は運賃区分・便別運賃）
- `mode` をキーに料金計算ロジックを切り替え

### 5. 運航状況の反映

各セグメントの運航状況（status）を取得：

- `0`: 通常運航
- `1`: 一部欠航・遅延
- `2`: 全便欠航（検索結果から除外）
- `3`: 時間変更
- `4`: 臨時便

## ユーザーインターフェース

### 検索画面（`/transit`）

**主要コンポーネント：**
- 港セレクター（出発地・目的地）
- 日付ピッカー
- 時刻入力
- 検索モード切り替え（出発/到着）
- 検索ボタン

**将来拡張:**
- 交通手段フィルタ（フェリー/バス/飛行機/すべて）
- 出発地・目的地の候補を地点タイプ別にグルーピング
- セグメントごとの交通手段バッジ・アイコン表示

**交通手段フィルタ UI/UX（将来）:**
- 交通手段が複数ある場合に表示（フェリーのみの間は非表示）
- 検索条件エリアの先頭に配置
- 交通手段未選択時のデフォルトは「すべて」
- フィルタ変更時は入力値を保持し、結果のみ再検索する

**地点セレクタ UI/UX（将来）:**
- ラベルは「出発地/目的地」を維持し、地点タイプ（港/停留所/空港）を補助表示
- 候補リストは地点タイプでグループ化し、アイコンで区別
- 入力プレースホルダーは「港・停留所・空港を検索」

**検索結果表示：**
- ルート一覧（最大5件を初期表示、追加読み込み可能）
- 各ルートの詳細：
  - 出発時刻・到着時刻
  - 所要時間
  - 合計運賃
  - 乗り換え回数
  - 各セグメントの詳細（便名、地点、時刻、運賃）
  - 運航状況バッジ

**マルチモーダル表示ルール（将来）:**
- 交通手段ごとに色/アイコンを固定し、セグメント一覧とルート要約の両方に反映
- 乗換地点では最小乗換時間（MCT）を満たさない候補は非表示
- 異なる交通手段を含む経路は「乗換あり」ラベルを強調表示

**地図表示：**
- 選択したルートを地図上に表示
- Google Maps APIを使用
- 航路の可視化

## 実装詳細

### Composable: `useRouteSearch`

```typescript
export const useRouteSearch = () => {
  const searchRoutes = async (
    departure: string,
    arrival: string,
    searchDate: Date,
    searchTime: string,
    isArrivalMode: boolean = false
  ): Promise<TransitRoute[]>
  
  const findDirectRoutes = async (...): Promise<TransitRoute[]>
  const findTransferRoutes = async (...): Promise<TransitRoute[]>
  const calculateFare = async (...): Promise<number>
}
```

### データフロー

```
ユーザー入力
    ↓
useRouteSearch.searchRoutes()
    ↓
時刻表データの読み込み（useFerryStore）
    ↓
料金マスターデータの読み込み（useFareStore）
    ↓
直行便検索（findDirectRoutes）
    ↓
乗り換え経路検索（findTransferRoutes）
    ↓
運賃計算（calculateFare）
    ↓
結果の並び替え・フィルタリング
    ↓
検索結果の表示
```

## パフォーマンス最適化

1. **データキャッシュ**
   - 時刻表データは15分間キャッシュ
   - 料金マスターデータは1週間キャッシュ

2. **検索結果の制限**
   - 直行便が5件以上見つかった場合、乗り換え経路は検索しない
   - 検索結果は最大50件まで

3. **非同期処理**
   - データ読み込みと検索処理を並列実行
   - 運賃計算は必要時のみ実行

## エラーハンドリング

- 時刻表データが読み込めない場合：エラーメッセージを表示
- 検索結果が0件の場合：「該当する便が見つかりませんでした」を表示
- ネットワークエラー：オフライン時のキャッシュデータを使用

## 多言語対応

- 港名、船舶名はi18nキーで管理
- エラーメッセージも多言語対応
- 時刻表の表示形式はロケールに応じて変更

## 関連機能

- **お気に入り機能**: よく使うルートを保存
- **検索履歴**: 過去の検索条件を保存
- **運航状況**: リアルタイムの運航情報を表示
- **地図表示**: 選択したルートを地図上に可視化
