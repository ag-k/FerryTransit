# GTFS データ管理

このディレクトリは、公共交通 GTFS データの原本、採用中データ、検証結果を分けて管理します。

## ディレクトリ構成

```text
gtfs/
  sources/                  # 取得元、ライセンス、更新方針などのメタ情報
  raw/                      # 取得・展開した原本の履歴
  current/                  # アプリで採用中の GTFS
  generated/                # コード管理する生成済み時刻表・公開JSON
  reports/                  # 検証結果や差分レポート
```

アプリ配信用の JSON は `gtfs/public-data/data/` に生成し、Firebase Storage の同じオブジェクトパス（例: `data/gtfs/bus/ama/routes.json`, `data/bus-search/ama.json`）へアップロードします。`raw/` と `current/` は GTFS 原本、`gtfs/public-data/` は外部公開用の派生データとして扱います。

公開時刻表 `data/timetable.json` は管理画面の Firestore データをマスターにせず、コード管理された次のソースを合成して生成します。

- `timetable.json`: 船の基礎時刻表
- `gtfs/raw/air/jal_oki_timetable.json`: JAL 隠岐発着便（公式サイトから自動取得）
- `gtfs/generated/bus/oki_airport_bus_timetable.json`: 隠岐空港連絡バス

合成結果は `gtfs/generated/public/timetable.json` に出力し、Firebase Storage の `data/timetable.json` へ直接公開します。

## 更新手順

1. 最新 GTFS を取得して `gtfs/raw/{mode}/{id}/{YYYY-MM-DD}/` に展開する
2. 内容を確認し、問題なければ `gtfs/current/{mode}/{id}/` を更新する
3. `npm run gtfs:validate -- bus ama` で GTFS の基本整合性を確認する
4. `npm run gtfs:build -- bus ama` で `gtfs/public-data/data/` を更新する
5. `npm run gtfs:upload` で Firebase Storage の `data/...` へアップロードする（確認のみなら `npm run gtfs:upload -- --dry-run`）
6. アプリ側の表示・検索に関係するテストを実行する

## 公開時刻表の生成・公開

管理画面を通さず、コード管理ソースから公開時刻表を生成します。

```bash
npm run timetable:build
```

このコマンドは `gtfs:generate:oki-airport-bus` を実行してから、船・航空便・空港連絡バスを合成し、`gtfs/generated/public/timetable.json` を更新します。公開前の確認は次を使います。

```bash
npm run timetable:publish:dry-run
```

問題なければ Firebase Storage の `data/timetable.json` へ直接反映します。

```bash
npm run timetable:publish
```

公開時は既存の `data/timetable.json` を `backups/timetable/{YYYYMMDD-HHmmss}.json` に退避してから上書きします。

## 現在の採用データ

- 種別: `bus`
  - ID: `ama`
  - 事業者: 海士町
  - 元データ日付: `2025-12-22`
  - GTFS フィード期間: `2026-01-02` から `2026-12-31`
- 種別: `bus`
  - ID: `nishinoshima`
  - 事業者: 西ノ島町
  - 元データ日付: `2026-01-01`
  - GTFS フィード期間: `2026-03-01` から `2026-12-31`
- 種別: `bus`
  - ID: `chibu`
  - 事業者: 知夫村
  - 元データ日付: `2023-02-01`
  - GTFS フィード期間: `2026-01-01` から `2026-12-31`
- 種別: `bus`
  - ID: `okinoshima`
  - 事業者: 隠岐一畑交通 / 隠岐の島町
  - 元データ日付: `2026-03-02`
  - GTFS フィード期間: `2026-01-01` から `2026-12-31`
- 種別: `bus`
  - ID: `ichibata_bus_connection`
  - 事業者: 一畑バス株式会社
  - 元データ日付: `2026-04-01`
  - GTFS フィード期間: `2026-04-01` から `2026-12-31`

## R8 PDF からの変換

`gtfs/pdf/bus/ama/r8/` の時刻表 PDF から GTFS を生成します。

```bash
npm run gtfs:convert:ama:r8 -- --current
npm run gtfs:validate -- bus ama
npm run gtfs:build -- bus ama
```

変換処理は PDF から時刻行と運行期間を抽出し、停留所並びは `scripts/gtfs/convert-ama-r8-pdf.mjs` の行パターン定義に従って `trips.txt` / `stop_times.txt` を生成します。

## 西ノ島町営バス PDF からの変換

`gtfs/pdf/bus/nishinoshima/20260220140915710489010da.pdf` の時刻表 PDF から GTFS を生成します。

```bash
npm run gtfs:convert:nishinoshima:2026 -- --current
npm run gtfs:validate -- bus nishinoshima
npm run gtfs:build -- bus nishinoshima
```

変換処理は PDF の主要時刻表欄を `trips.txt` / `stop_times.txt` に転記し、PDF 注記の `★`、`※`、`◎`、`●`、期間便を `calendar.txt` / `calendar_dates.txt` に反映します。

## 隠岐の島町内バス PDF からの変換

`gtfs/pdf/bus/okinoshima/` の総合時刻表、路線バス、町営バス PDF から GTFS を生成します。

```bash
npm run gtfs:convert:okinoshima:2026 -- --current
npm run gtfs:validate -- bus okinoshima
npm run gtfs:build -- bus okinoshima
```

変換処理は隠岐一畑交通の固定時刻路線と隠岐の島町営バスを `trips.txt` / `stop_times.txt` に転記します。航空便連動の隠岐空港線と予約型のデマンドタクシーは固定時刻のバス GTFS から除外します。

## 一畑バス・隠岐汽船接続バス PDF からの変換

`gtfs/pdf/bus/ichibata_bus_connection/oki_2026_dia.pdf` の時刻表 PDF から GTFS を生成します。

```bash
npm run gtfs:convert:ichibata:2026 -- --current
npm run gtfs:validate -- bus ichibata_bus_connection
npm run gtfs:build -- bus ichibata_bus_connection
```

変換処理は松江駅-七類港、松江駅-境港の接続バス固定時刻を `trips.txt` / `stop_times.txt` に転記します。隠岐汽船欠航時は接続バスも運休する注記がありますが、静的 GTFS ではリアルタイム運休として表現せず、接続船情報を `jp_trip_desc` に保持します。

## 隠岐空港連絡バスの生成

隠岐一畑交通の隠岐空港連絡バスは固定ダイヤではなく航空便の発着に連動して運行されるため、GTFS バスフィードではなく公開時刻表へ合成する JSON として生成します。

```bash
npm run gtfs:generate:oki-airport-bus
```

入力は `gtfs/raw/air/jal_oki_timetable.json`、出力は `gtfs/generated/bus/oki_airport_bus_timetable.json` です。航空便データを更新した場合は、このコマンドを再実行して生成物も更新してください。

JAL公式時刻表の取得と連絡バス・公開時刻表の再生成は次のコマンドでまとめて実行できます。

```bash
npm run timetable:refresh:jal
```

生成規則は次の通りです。

- 航空便が `AIRPORT_OKI` を出発する場合は、2 Trip を `next_id` で連結する
  - 第1区間: `BUS_OKINOSHIMA_eigyosho`（隠岐一畑交通営業所）発を航空便出発55分前、`SAIGO` 着を51分前にする
  - 第2区間: `SAIGO` 発を航空便出発50分前、`AIRPORT_OKI` 着を40分前にする
- 航空便が `AIRPORT_OKI` に到着する場合は、2 Trip を `next_id` で連結する
  - 第1区間: `AIRPORT_OKI` 発を航空便到着15分後、`SAIGO` 着を25分後にする
  - 第2区間: `SAIGO` 発を航空便到着26分後、`BUS_OKINOSHIMA_eigyosho`（隠岐一畑交通営業所）着を30分後にする
- `SAIGO` では乗換検索の時刻判定に合わせて1分停車し、連結区間は同一 `name` と `next_id` により直行便として扱う
- 運行期間と曜日は元の航空便の `start_date` / `end_date` / `active_days` を継承する

生成した JSON は `npm run timetable:build` で `gtfs/generated/public/timetable.json` に合成し、`npm run timetable:publish` で Firebase Storage の `data/timetable.json` に直接反映します。
