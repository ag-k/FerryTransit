# GTFS データ管理

このディレクトリは、公共交通 GTFS データの原本、採用中データ、検証結果を分けて管理します。

## ディレクトリ構成

```text
gtfs/
  sources/                  # 取得元、ライセンス、更新方針などのメタ情報
  raw/                      # 取得・展開した原本の履歴
  current/                  # アプリで採用中の GTFS
  reports/                  # 検証結果や差分レポート
```

アプリ配信用の JSON は `src/public/data/gtfs/` に生成します。`raw/` と `current/` は GTFS 原本、`src/public/data/gtfs/` は派生データとして扱います。

## 更新手順

1. 最新 GTFS を取得して `gtfs/raw/{mode}/{id}/{YYYY-MM-DD}/` に展開する
2. 内容を確認し、問題なければ `gtfs/current/{mode}/{id}/` を更新する
3. `npm run gtfs:validate -- bus ama` で GTFS の基本整合性を確認する
4. `npm run gtfs:build -- bus ama` で `src/public/data/gtfs/` を更新する
5. アプリ側の表示・検索に関係するテストを実行する

## 現在の採用データ

- 種別: `bus`
- ID: `ama`
- 事業者: 海士町
- 元データ日付: `2024-03-23`
- GTFS フィード期間: `2024-03-23` から `2024-12-31`

現在の採用データは期限切れです。最新データへ更新するときは、同じ構造で新しい日付ディレクトリを追加してください。
