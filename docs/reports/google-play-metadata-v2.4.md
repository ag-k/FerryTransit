# Google Playメタデータ v2.4

Google Play Consoleへv2.4を登録する際の転記・確認用ドラフト。2026-07-23に公開中のストア情報を読み取り監査し、保存・公開操作は行っていない。

## 監査結果

- 公開中のproductionはv2.3（versionCode 23000）。v2.4のversionCode 24000は未使用。
- デフォルトのストア掲載情報（英語・米国）と日本語の掲載情報は公開中。
- 現在の説明はフェリー中心で、v2.4のバス・航空・運航状況・運賃・オフライン対応を十分に説明していない。
- アプリアイコンは登録済みだが、「新しい仕様に従っていません」という警告が表示される。v2.4提出前に新仕様へ適合した画像へ更新し、警告消失を確認する。
- 携帯電話スクリーンショットはPlay Console上では日英各2枚。ローカルではv2.4用の日英各4枚（1080×2220）を生成済みで、Google Playが案内する各言語4枚以上を満たす。
- 7インチ・10インチタブレットのスクリーンショットはPlay Console上では未登録。Pixel Tablet / Android 14の横向き日英各5枚（2560×1600）を生成済み。10インチ欄へ登録し、7インチ欄は同画像の受理可否と表示品質をPlay Consoleで確認する。
- カテゴリは「地図、ナビ」で、アプリ内容と整合する。
- ウェブサイトは旧`http://naturebot-lab.com/`のため、`https://transit.oki-digilab.com/`へ更新する。
- 連絡先メールは`koyama@naturebot-lab.com`。現在の運用窓口として有効か、リリース責任者が確認する。
- 2026年8月31日までに対象APIレベルを更新する必要があるという警告がある。v2.4のローカル成果物はtargetSdk 35であるため、最新AABアップロード後に警告の対象と解消状態を再確認する。

## 共通設定案

- アプリ名: `隠岐航路案内` / `Oki Islands Ferry Guide`
- カテゴリ: `地図、ナビ`
- ウェブサイト: `https://transit.oki-digilab.com/`
- プライバシーポリシーURL: `https://transit.oki-digilab.com/privacy`
- 連絡先メール: 現行アドレスの有効性を確認後に確定

## 日本語

### 短い説明

隠岐の船・バス・航空をまとめて検索。時刻表、乗換案内、運航状況、運賃を確認できます。

### 詳細な説明

「隠岐航路案内」は、島根県隠岐諸島への移動と島内の移動をまとめて調べられる交通案内アプリです。

本土と隠岐を結ぶフェリー・高速船、島前内航船、島内・本土側の連絡バス、隠岐空港を発着する航空便に対応しています。港・バス停・空港を組み合わせた時刻表と乗換案内を、地図と一緒に確認できます。

主な機能

- 船・バス・航空便の時刻表検索
- 出発時刻または到着時刻を指定した乗換案内
- 港・バス停・空港を含む経路地図
- 船の運航状況、波高情報、翌日の欠航リスク表示
- 船・バスの運賃表
- 車両長を指定したフェリー検索と車両運賃表示
- お気に入り、検索履歴、お知らせ
- 日本語・英語表示
- オフライン時の保存済み情報表示

運航可否や運賃、臨時便などの最終確認は、必ず各運航事業者の公式情報をご確認ください。欠航リスクは過去の運航データと波高予測に基づく本アプリ独自の推計であり、運航会社による公式予測ではありません。

## English (United States)

### Short description

Timetables, routes, status and fares for Oki ferries, buses and flights.

### Full description

Oki Route Guide brings together transport information for travel to and around the Oki Islands in Shimane, Japan.

Search ferries and high-speed boats between the mainland and Oki, inter-island ferries, local and mainland connection buses, and flights serving Oki Airport. View timetables and multimodal journeys across ports, bus stops, and airports together with route maps.

Main features

- Ferry, bus, and flight timetable search
- Journey search by departure or arrival time
- Route maps covering ports, bus stops, and airports
- Ferry service status, wave information, and next-day cancellation risk
- Ferry and bus fare tables
- Ferry search by vehicle length with vehicle fares
- Favorites, search history, and service news
- Japanese and English
- Cached information when offline

Always confirm final service decisions, fares, and special services with the relevant transport operator. Cancellation risk is an independent estimate based on historical operations and wave forecasts; it is not an official forecast from the operator.

## スクリーンショット

生成済みの携帯電話用画像は次の順で登録する。

1. `01_timetable.png`
2. `02_transit.png`
3. `03_status.png`
4. `04_fare.png`

格納先は`output/google-play-screenshots/android-phone-{ja,en}`。全8枚は1080×2220のRGBA PNGで、破損とハッシュ重複がないことを確認済み。

タブレット用は次の5枚を生成した。現在の運航状況が「情報なし」の場合は`03_status.png`を外し、残る4枚を登録する。

1. `01_timetable.png`
2. `02_transit.png`
3. `03_status.png`
4. `04_fare.png`
5. `05_about.png`

格納先は`output/google-play-screenshots/android-tablet-{ja,en}`。全10枚は2560×1600のRGBA PNGで、破損とハッシュ重複がないことを確認済み。About画像の生成中に、機能説明が船中心の旧文言だったことを検出し、日英とも船・バス・航空対応へ修正した。対象回帰テスト2件、lint、production Android同期、debug APK生成に成功し、修正版画像を目視確認した。撮影に使った最終APKのSHA-256は`aa206a56279da64019769c3d1e7b73f7c976b31ffefa341ee415ef72655289dc`。

登録後に言語、表示順、トリミング、端末枠、文字切れをPlay Consoleのプレビューで確認する。

## 提出前チェック

- [ ] 日英の説明文を転記し、文字数とプレビューを確認する。
- [ ] 新仕様のアイコンへ更新し、警告が消えることを確認する。
- [x] 日英の携帯電話用画像を各4枚生成する。
- [x] 日英のタブレット用画像を各5枚生成する。
- [ ] 携帯電話画像をPlay Consoleへ登録してプレビューを確認する。
- [ ] タブレット画像の7インチ・10インチ欄への掲載方針を確定し、登録する。
- [ ] ウェブサイト、プライバシーポリシーURL、連絡先メールを確認する。
- [ ] 最新AAB登録後に対象APIレベル警告の解消状態を確認する。
- [ ] データセーフティ回答と実装・プライバシーポリシーを最終照合する。
- [ ] 内部テスト、リリース前レポート、Android Vitalsを確認する。
