# アクセス統計機能 仕様書

## 概要

アクセス統計機能は、匿名のPVと検索条件を日次で集計し、管理画面「統計情報」で可視化する機能です。一般ユーザー向けの表示は行いません。

## 目的

- 全ページのPV推移を日次・月次・期間指定で把握する
- 検索回数と検索条件（出発地/到着地/日時）の傾向を把握する
- 人気航路（検索回数ベース）を上位3件表示する

## 対象範囲

- 対象イベント
  - PV（Nuxtのルート遷移ごとのページビュー）
  - 検索（出発地/到着地/日時）
- 集計粒度: 日次
- 集計基準タイムゾーン: Asia/Tokyo
- 保存期間: 無期限
- 個人識別: なし（匿名集計のみ）

## データ構造（Firestore）

### コレクション構成

- `analytics_daily/{dateKey}`
  - `dateKey`: `YYYY-MM-DD`（Asia/Tokyo）
- `analytics_monthly/{monthKey}`
  - `monthKey`: `YYYY-MM`（Asia/Tokyo）
- `analytics_hourly/{hourKey}`
  - `hourKey`: `YYYY-MM-DD-HH`（Asia/Tokyo）

### AnalyticsDaily ドキュメント

```typescript
interface AnalyticsDaily {
  dateKey: string                 // YYYY-MM-DD
  pvTotal: number                 // 日次PV合計
  searchTotal: number             // 日次検索回数合計
  routeCounts: Record<string, number>  // "depId-arrId" -> count
  departureCounts: Record<string, number> // depId -> count
  arrivalCounts: Record<string, number>   // arrId -> count
  hourCounts: Record<string, number>      // "00".."23" -> count
  updatedAt: Timestamp
}
```

### AnalyticsMonthly ドキュメント

```typescript
interface AnalyticsMonthly {
  monthKey: string               // YYYY-MM
  pvTotal: number
  searchTotal: number
  routeCounts: Record<string, number>
  departureCounts: Record<string, number>
  arrivalCounts: Record<string, number>
  hourCounts: Record<string, number>
  updatedAt: Timestamp
}
```

### AnalyticsHourly ドキュメント

```typescript
interface AnalyticsHourly {
  hourKey: string                // YYYY-MM-DD-HH
  pvTotal: number
  searchTotal: number
  routeCounts: Record<string, number>
  departureCounts: Record<string, number>
  arrivalCounts: Record<string, number>
  updatedAt: Timestamp
}
```

## 収集項目

### PV

- ルート遷移ごとのページビュー
- 収集内容: `pagePath`（例: `/transit`）
- 集計: 日次PV合計のみ（ページ別の内訳は持たない）

### 検索条件

- 出発地ID（depId）
- 到着地ID（arrId）
- 日時（検索時刻）
  - `YYYY-MM-DD` は日付キー算出に使用
  - 時刻は `HH` に丸めて `hourCounts` に集計

## 人気航路の算出

- ルートキー: `${depId}-${arrId}`
- 日次/期間指定の集計範囲で `routeCounts` を合算し、上位3件を表示
- 同数の場合は任意の順序（安定ソート不要）

## データフロー

### 1. PV計測

```
Nuxt ルート遷移
  ↓
useAnalytics().trackPageView(route.path)
  ↓
Firestore analytics_daily/{dateKey}.pvTotal を increment
Firestore analytics_monthly/{monthKey}.pvTotal を increment
Firestore analytics_hourly/{hourKey}.pvTotal を increment
```

### 2. 検索計測

```
検索実行
  ↓
useAnalytics().trackSearch({ depId, arrId, datetime })
  ↓
analytics_daily/{dateKey} を increment
  - searchTotal
  - routeCounts[depId-arrId]
  - departureCounts[depId]
  - arrivalCounts[arrId]
  - hourCounts[HH]
analytics_monthly/{monthKey} を同様に increment
analytics_hourly/{hourKey} を同様に increment
```

## 管理画面「統計情報」表示

### 表示項目

- 1. PV推移（折れ線）
- 2. 検索回数（折れ線）
- 3. 時間帯別PV/検索（折れ線）
  - デフォルト期間: 1日
  - 系列: PVと検索の2本
  - X軸: 0〜23時の固定表示
  - 期間指定時: 期間内の各日を合算し、日数で平均した時間帯分布を表示
  - 欠損時間帯: 0で補完
- 4. 人気航路 Top 3（期間指定の集計）
- 5. 検索条件の分布
  - 出発地別の件数
  - 到着地別の件数
  - 時間帯別の件数（0-23時）
  - 表示形式: 円グラフ

### 期間指定UI

- プリセット + カスタム（開始日/終了日）
- プリセット: 今日 / 昨日 / 直近7日 / 直近30日 / 今月 / 先月 / 3ヶ月 / 1年

### 期間指定

- 日次表示: 日付範囲を指定して `analytics_daily` を集計
- 月次表示: 月範囲を指定して `analytics_monthly` を集計
- 時間帯表示: 日時範囲を指定して `analytics_hourly` を集計
- 期間の最大制限: なし

## 実装方針

- 基本方針: クライアント側でFirestoreに直接インクリメント更新する
- 更新方法: `increment` を用いて日次/月次/時間帯の集計ドキュメントを同時に更新
- 書き込みタイミング
  - PV: ルート遷移時
  - 検索: 検索実行時
- 書き込み方式: 即時書き込み（バッファなし）

## 取得ロジック（管理画面）

1. 期間指定に応じて `analytics_daily` / `analytics_monthly` / `analytics_hourly` を取得
   - `analytics_hourly` は開始日/終了日（0-23時を内包）で取得する
2. PV・検索回数の推移を時系列に整形
3. `routeCounts` を合算し Top 3 を抽出
4. `departureCounts`/`arrivalCounts`/`hourCounts` を合算し分布表示

## セキュリティ・プライバシー

- 個人識別情報は収集しない（IP・ユーザーID・端末IDなどを保存しない）
- 保存は集計結果のみ（イベントの生データは保持しない）
- Firestore ルールで管理画面ログイン済みユーザーのみ閲覧可能とする

## 例外・制限

- オフライン時は計測をスキップ（再送しない）
- PVはルート遷移基準のため、同一ページ内操作はカウントしない
- 管理画面で対象期間にデータがない場合は「データなし」を表示する
