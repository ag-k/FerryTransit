# FerryTransit v2.4 リリースノート

## 日本語

### 主な変更点

- 船、島内・本土連絡バス、航空便を横断して検索できるようになりました。
- バス停、港、空港を含む乗換案内と地図表示を改善しました。
- 車両長を指定したフェリー検索と、運転者1名を含む車両運賃表示に対応しました。
- 船・バスの料金表、時刻表データの適用期間表示、お気に入り・履歴からの検索復元を改善しました。
- 2026年度の隠岐汽船ダイヤ、JAL隠岐路線、隠岐空港連絡バスのデータを反映しました。

### 管理・データ運用の改善

- 船、バス、航空の時刻表データ管理を複数交通モードに対応しました。
- お知らせ保存後の公開処理と公開失敗時の通知を改善し、アプリ復帰・再表示・通信回復時と前面表示中に最新のお知らせを自動取得するようにしました。
- GTFS原本、変換結果、検証レポート、公開データを分離し、生成手順を再現可能にしました。
- 公開時刻表を単一の処理で合成・配信し、公開先の指定、差分スキップ、バックアップ、ハッシュ検証、manifest、devからprodへの昇格確認を追加しました。
- JAL時刻表の取得・検証・更新と定期実行の仕組みを追加しました。

### 基盤・品質改善

- Node.js 22、Nuxt 4.4.8、Vue 3.5.39、Capacitor 7.6.8を含む依存関係を更新しました。
- Androidの戻る操作、システムナビゲーションバー、セーフエリア、地図タッチ操作を改善しました。
- 経路検索、GTFS、運賃、公開処理、管理画面を含む回帰テストを拡充しました。

## English

### Highlights

- Added multimodal journey search across ferries, local and mainland connection buses, and flights.
- Improved journey results and maps for bus stops, ferry ports, and airports.
- Added ferry searches by vehicle length and vehicle fares including one driver.
- Improved ferry and bus fare tables, timetable validity information, and restoring searches from favorites and history.
- Updated the published data for the 2026 Oki Kisen schedule, JAL Oki flights, and Oki Airport connection buses.

### Administration and Data Operations

- Extended timetable administration to support ferry, bus, and air transport data.
- Improved automatic news publishing and failure notifications, and added automatic refreshes when the app resumes, regains focus or connectivity, and while it remains in the foreground.
- Separated GTFS source data, conversions, validation reports, and public artifacts for reproducible generation.
- Consolidated public timetable building and publishing with explicit targets, change detection, backups, hash verification, manifests, and guarded dev-to-production promotion.
- Added automated retrieval, validation, and scheduled updates for JAL timetable data.

### Platform and Quality Improvements

- Updated the platform to Node.js 22, Nuxt 4.4.8, Vue 3.5.39, and Capacitor 7.6.8.
- Improved Android back navigation, system navigation styling, safe-area handling, and map touch interaction.
- Expanded regression coverage for route search, GTFS, fares, publishing, and administration flows.
