# 隠岐交通ソース監視

FerryTransit アプリ本体の外側で動く、ローカル専用の公式ソース収集ダッシュボードです。隠岐汽船、隠岐観光、島後・島前の町営バス、連絡バスなどの公式ページから、時刻表・運賃表・お知らせ・運航状況リンクを取得し、前回スナップショットとの差分を確認できます。

GTFSデータ管理、公開時刻表、JAL取得・定期実行との責務分担と統合方針は [交通データ管理・合成・配信パイプライン](../../docs/operations/transport-data-pipeline.md) を参照してください。このダッシュボードの24時間更新はローカル監視用であり、公開データの定期配信ではありません。

## 起動

```bash
npm --prefix tools/oki-transport-dashboard start
```

既定 URL は `http://localhost:4177` です。別ポートで起動する場合は `PORT=4180 npm --prefix tools/oki-transport-dashboard start` を使います。

## 収集

UI の「最新取得」でライブ収集します。「保存して取得」は `tools/oki-transport-dashboard/data/snapshots/latest.json` と日時付き JSON を更新します。「PDF等も保存」は検出した PDF/画像資料を `tools/oki-transport-dashboard/data/downloads/` に保存します。

トップページの「時刻表カバレッジ」は、本番アプリが Firebase Storage から取得する `data/timetable.json`、`data/bus-search/*.json` と各公開 manifest を読み込み、事業者・交通機関（フェリーおき、内航船いそかぜ、JAL各路線、町営バス、接続バスなど）ごとに1月1日から12月31日までの有効データ有無を表示します。サイドメニューのグループ選択はカバレッジの行と集計にも連動します。本番Storageを取得できないデータだけローカル生成物を代替表示し、画面上にフォールバック状態を明示します。

ダッシュボード起動中は、保存済みスナップショットが24時間以上古い場合に1日1回の自動更新を行い、`latest.json` を更新します。無効化する場合は `OKI_DASHBOARD_AUTO_REFRESH=0`、間隔を変える場合は `OKI_DASHBOARD_REFRESH_INTERVAL_HOURS=12` のように指定します。自動更新でも資料ファイルを保存する場合は `OKI_DASHBOARD_REFRESH_DOWNLOAD=1` を指定します。

資料リンクは PDF/Excel/画像などのファイルだけでなく、HTML 本文に時刻表・運賃表などの表が掲載されているページも `HTML` 資料として検出します。

検出資料のレビュー状態は「未レビュー / 不要 / 必要」の3種類です。状態は資料 URL をキーにして `tools/oki-transport-dashboard/data/reviews.json` にローカル保存され、次回起動後も維持されます。

資料一覧の「反映」は、レビュー状態と GTFS 下書き route の管理状態から自動判定します。「必要」資料に紐づく route が「GTFS化済み」なら「反映済み」、まだ「GTFS化済み」ではない、または下書き route がない場合は「要反映」と表示します。「不要」は「対象外」、未レビューは「未判定」です。

検出資料の種別は、収集時の自動判定に加えて UI から手動変更できます。手動変更した種別は資料 URL をキーにして `tools/oki-transport-dashboard/data/document-types.json` にローカル保存され、「自動」に戻すと保存された上書きが解除されます。

## GTFS 管理

UI の「GTFS管理」では、採用中の `gtfs/current/{mode}/{id}` の概要、検証結果、変換/検証/配信用 JSON 生成コマンドを確認・実行できます。各操作は共通レジストリのsource IDとtask IDから `transport:acquire` / `transport:check` / `transport:build` を呼び、ダッシュボード固有の事業者別コマンド表は持ちません。

GTFS 化の作業順は、画面上の「GTFS化ワークフロー」で確認できます。

1. 資料レビュー: 検出資料を「必要 / 不要 / 未レビュー」に整理する
2. 下書き: 必要な時刻表資料から GTFS 下書きを作成する
3. 候補整理: route 候補を「GTFS化済み / 確認中 / 未変換 / 除外」に整理する
4. 出力: 下書きから GTFS txt 一式と ZIP を生成する
5. 採用中更新: 採用中 GTFS の変換・検証・配信用 JSON 生成を実行する

「GTFS下書き作成」は、画面に表示中の収集結果から時刻表資料を抽出し、`agency.txt` / `routes.txt` を中心にした GTFS 下書きを `tools/oki-transport-dashboard/data/gtfs/draft.json` に保存します。下書きでは route の管理状態（未変換 / 確認中 / GTFS化済み / 除外）、`route_type`、短縮名、正式名、メモを手動編集できます。

「GTFSファイル生成」は下書きから GTFS の txt 一式と `gtfs.zip` を `tools/oki-transport-dashboard/data/gtfs/exports/` に出力します。停留所・便・時刻は下書き段階では空のため、完成 GTFS として使う前に既存変換スクリプトまたは手動転記で `stops.txt` / `trips.txt` / `stop_times.txt` を埋めてください。

採用中GTFS、下書き、直近出力は UI の「ビュー」から `gtfs-viewer.html` で確認できます。ビューアでは routes / stops / trips の集計表示と、各 GTFS txt テーブルの raw 表示・検索ができます。

### Codex App Server 連携

GTFS route候補の操作列にある「CodexでGTFS化」から、route単位のGTFS化ジョブを作成できます。ジョブには対象route、公式資料URL、agency、期待するGTFS成果物、検証コマンドを含むCodex向けプロンプトと、Codex App Server JSON-RPC payloadが保存されます。

`CODEX_APP_SERVER_URL` を設定して起動すると、ジョブ作成時に Codex App Server へ自動送信します。`ws://` / `wss://` はWebSocket、`http://` / `https://` はJSON-RPC POSTとして送信します。

```bash
CODEX_APP_SERVER_URL=ws://127.0.0.1:9000 npm --prefix tools/oki-transport-dashboard start
```

App Server 側でトークンが必要なHTTP endpointを使う場合は、`CODEX_APP_SERVER_TOKEN` を指定すると `Authorization: Bearer ...` を付与します。`CODEX_APP_SERVER_URL` が未設定、または `stdio://` / `unix://` のようにこのダッシュボードから直接送信しないtransportの場合、ジョブは `tools/oki-transport-dashboard/data/codex-app-server/jobs.json` にローカル保存されます。画面の「Codex App Server」パネルからプロンプトとJSON-RPC payloadを確認・コピーできます。

CLI でも実行できます。

```bash
npm --prefix tools/oki-transport-dashboard run collect -- --save
npm --prefix tools/oki-transport-dashboard run collect -- --save --download
```

## 監視対象

- 隠岐汽船: 時刻表、運賃、ニュース、運航状況
- 隠岐観光: お知らせ、島前内航船、運賃詳細
- 隠岐一畑交通: 路線バス、空港連絡バス、新着情報
- 隠岐の島町: 町内バス・デマンドタクシー
- 海士町: 島内巡回バス、お知らせ
- 西ノ島町: 町営バス
- 知夫村 / 知夫里島観光協会: アクセス・島内交通、お知らせ
- 隠岐広域連合: 隠岐汽船連絡バス
- JAL・隠岐空港発着便: 隠岐空港フライト情報、JAL令和8年度上期運航計画、出雲空港 就航路線・時刻表
- 一畑バス: 隠岐汽船接続バス（松江・七類・境港間時刻表）

## テスト

```bash
npm --prefix tools/oki-transport-dashboard test
```

## 注意

このツールは公式ページの HTML と資料リンクを監視し、GTFS 化の作業状態を管理する補助ツールです。PDF/画像/HTML の表から停留所・便・時刻を完全自動抽出する処理は、対象ごとの既存 `scripts/gtfs/` 変換スクリプトまたは手動レビューで補完してください。

24時間更新の名称と責務は `source-monitor`（変更通知・レビュー候補の作成）です。JAL構造化データの `jal-data-refresh` やStorage公開とは独立しており、ダッシュボードを起動しただけでは公開データを変更しません。source監視の常設CIは現在導入していません。
