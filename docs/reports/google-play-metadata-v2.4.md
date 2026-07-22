# Google Playメタデータ v2.4

Google Play Consoleへv2.4を登録する際の転記・確認用ドラフト。2026-07-23に公開中のストア情報を読み取り監査し、保存・公開操作は行っていない。

## 監査結果

- 公開中のproductionはv2.3（versionCode 23000）。v2.4のversionCode 24000は未使用。
- デフォルトのストア掲載情報（英語・米国）と日本語の掲載情報は公開中。
- 現在の説明はフェリー中心で、v2.4のバス・航空・運航状況・運賃・オフライン対応を十分に説明していない。
- アプリアイコンは登録済みだが、「新しい仕様に従っていません」という警告が表示される。v2.4提出前に新仕様へ適合した画像へ更新し、警告消失を確認する。
- 携帯電話スクリーンショットは日英各2枚。v2.4用に生成済みの日英各3枚（1080×2220）へ更新する。Google Playのプロモーション要件として各言語4枚以上が案内されているため、4枚目の追加も検討する。
- 7インチ・10インチタブレットのスクリーンショットは未登録。配布対象と掲載方針を確定し、必要ならPixel Tabletで生成する。
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

格納先は`output/google-play-screenshots/android-phone-{ja,en}`。登録後に言語、表示順、トリミング、端末枠、文字切れをPlay Consoleのプレビューで確認する。

## 提出前チェック

- [ ] 日英の説明文を転記し、文字数とプレビューを確認する。
- [ ] 新仕様のアイコンへ更新し、警告が消えることを確認する。
- [ ] 日英の携帯電話画像を更新し、必要なら4枚目を追加する。
- [ ] タブレット画像の掲載方針を確定する。
- [ ] ウェブサイト、プライバシーポリシーURL、連絡先メールを確認する。
- [ ] 最新AAB登録後に対象APIレベル警告の解消状態を確認する。
- [ ] データセーフティ回答と実装・プライバシーポリシーを最終照合する。
- [ ] 内部テスト、リリース前レポート、Android Vitalsを確認する。
