# 船舶運航状況取得 API 仕様

このドキュメントでは、隠岐諸島フェリー運航状況を取得するための API 仕様について説明します。

## 概要

| 項目                         | 内容                                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| エンドポイント               | `GET https://ship.nkk-oki.com/api/status`（クエリ不要・認証不要・CORS 全許可）                                                                                                    |
| レスポンス構造               | JSON 配列 `[ship1State, ship2State, ferryState]`。各要素は当日データがなければ `null`                                                                                             |
| ship1State/ship2State        | `states` レコードを基に、`ship_name`・`prev_status`・`reason`・`last_departure_port`・`last_arrival_port`を付加。臨時便 `extraShips` と最終便候補 `lastShips` を配列で提供        |
| 追加フィールド               | ステータスが欠航開始(2)・運航再開(4)の場合のみ `departure`・`start_time`・`arrival` を設定。それ以外は `null`                                                                     |
| `departure` / `arrival` の値 | 港マスタのシグネチャを大文字化した `BEPPU`（別府港）・`HISHIURA`（菱浦港）・`KURI`（来居港）。対象便がなければ `null`                                                             |
| ステータス値                 | 0=通常運航、1=全便欠航、2=一部欠航、3=変更あり、4=運航再開、5=自由記述（2 隻目向け想定）                                                                                          |
| ferryState                   | 長距離フェリー情報。`date`・`ferry_state`・`ferry_comment`・`fast_ferry_state`・`fast_ferry_comment`・`today_wave`・`tomorrow_wave` を文字列で返却。更新日が当日でなければ `null` |
| 留意点                       | 外部時刻表取得失敗時は船ステートが `null` や空配列になり得るため、クライアントは欠損値に耐性が必要                                                                                |

## データモデル

### states テーブル

| フィールド             | 型        | 説明                          |
| ---------------------- | --------- | ----------------------------- | ------------------------- |
| id                     | integer   | 主キー                        |
| ship_id                | integer   | 船舶 ID                       |
| date                   | date      | 運航状況の日付                |
| status                 | integer   | 運航ステータス                |
| reason_id              | integer   | 欠航理由 ID（NULL 許容）      |
| last_departure_port_id | integer   | 最終出港港 ID（NULL 許容）    |
| last_arrival_port_id   | integer   | 最終到着港 ID（NULL 許容）    |
| start_time             | time      |                               | 欠航開始時刻（NULL 許容） |
| comment                | text      | 運航状況コメント（NULL 許容） |
| created_at             | timestamp | レコード作成日時              |
| updated_at             | timestamp | レコード更新日時              |

### ships テーブル

| フィールド | 型      | 説明   |
| ---------- | ------- | ------ |
| id         | integer | 主キー |
| name       | string  | 船舶名 |

#### 船舶名のマスタデータ

```json
[
  {
    "id": 1,
    "name": "いそかぜ"
  },
  {
    "id": 2,
    "name": "フェリーどうぜん"
  }
]
```

### ports テーブル

| フィールド | 型      | 説明         |
| ---------- | ------- | ------------ |
| id         | integer | 主キー       |
| name       | string  | 港名         |
| signature  | string  | 港シグネチャ |

#### 港名のマスタデータ

```json
[
  {
    "id": 1,
    "name": "別府港",
    "signature": "BEPPU"
  }
  {
    "id": 2,
    "name": "菱浦港",
    "signature": "HISHIURA"
  },
  {
    "id": 3,
    "name": "来居港",
    "signature": "KURI"
  }
]
```

### reasons テーブル

| フィールド  | 型      | 説明         |
| ----------- | ------- | ------------ |
| id          | integer | 主キー       |
| description | string  | 欠航理由説明 |

### extra_ships テーブル

| フィールド        | 型      | 説明                          |
| ----------------- | ------- | ----------------------------- |
| id                | integer | 主キー                        |
| state_id          | integer | 対応する states レコードの ID |
| departure_port_id | integer | 出港港 ID                     |
| arrival_port_id   | integer | 到着港 ID                     |
| departure_time    | time    | 出港時刻                      |

### ferry_states テーブル

| フィールド         | 型      | 説明                         |
| ------------------ | ------- | ---------------------------- |
| id                 | integer | 主キー                       |
| date               | date    | フェリー運航状況の日付       |
| ferry_state        | string  | フェリー運航状況説明         |
| ferry_comment      | text    | フェリー運航状況コメント     |
| fast_ferry_state   | string  | 高速フェリー運航状況説明     |
| fast_ferry_comment | text    | 高速フェリー運航状況コメント |
| today_wave         | string  | 本日の波浪情報               |
| tomorrow_wave      | string  | 明日の波浪情報               |

## API エンドポイント

```
GET https://ship.nkk-oki.com/api/status
```

## サンプルレスポンス

```json
[
  {
    "id": 4581,
    "ship_id": 1,
    "date": "2024-06-15",
    "status": 2,
    "reason_id": 3,
    "last_departure_port_id": 1,
    "last_arrival_port_id": 2,
    "start_time": "8:30",
    "comment": "午後便以降の見通しは11時頃に再案内予定です。",
    "created_at": "2024-06-15T06:45:12.000000Z",
    "updated_at": "2024-06-15T07:10:03.000000Z",
    "ship_name": "内航船いそかぜ",
    "prev_status": 0,
    "last_departure_port": "別府港",
    "last_arrival_port": "菱浦港",
    "reason": "濃霧のため視界不良",
    "extraShips": [
      {
        "id": 921,
        "state_id": 4581,
        "departure_port_id": 1,
        "arrival_port_id": 2,
        "departure_time": "10:15",
        "departure": "BEPPU",
        "arrival": "HISHIURA"
      }
    ],
    "lastShips": [
      {
        "name": "ISOKAZE",
        "value": 14,
        "departure": "BEPPU",
        "departure_time": "06:30",
        "arrival": "HISHIURA",
        "arrival_time": "07:40",
        "via": null,
        "departure_port_id": 1,
        "arrival_port_id": 2,
        "via_port_id": null
      },
      {
        "name": "ISOKAZE",
        "value": 15,
        "departure": "HISHIURA",
        "departure_time": "07:55",
        "arrival": "BEPPU",
        "arrival_time": "09:05",
        "via": null,
        "departure_port_id": 2,
        "arrival_port_id": 1,
        "via_port_id": null
      }
    ],
    "departure": "BEPPU",
    "arrival": "HISHIURA"
  },
  {
    "id": 4590,
    "ship_id": 2,
    "date": "2024-06-15",
    "status": 0,
    "reason_id": null,
    "last_departure_port_id": null,
    "last_arrival_port_id": null,
    "start_time": null,
    "comment": null,
    "created_at": "2024-06-15T06:50:44.000000Z",
    "updated_at": "2024-06-15T06:50:44.000000Z",
    "ship_name": "フェリーどうぜん",
    "prev_status": 0,
    "last_departure_port": null,
    "last_arrival_port": null,
    "reason": null,
    "extraShips": [],
    "lastShips": [],
    "departure": null,
    "arrival": null
  },
  {
    "id": 187,
    "date": "2024-06-15 08:30 更新",
    "ferry_state": "全便通常運航",
    "ferry_comment": "気象条件により一部で遅延の可能性があります。",
    "fast_ferry_state": "1便目欠航",
    "fast_ferry_comment": "波浪の影響により午前便を欠航します。",
    "today_wave": "1.5m",
    "tomorrow_wave": "1.0m-2.0m",
    "created_at": "2024-06-15T08:35:02.000000Z",
    "updated_at": "2024-06-15T08:35:02.000000Z"
  }
]
```
