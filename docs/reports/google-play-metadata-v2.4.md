# Google Playメタデータ v2.4

Google Play Consoleへv2.4を登録する際の転記・確認用ドラフト。2026-07-23に公開中のストア情報を読み取り監査し、同日に日英説明を未公開下書きとして保存、公式ウェブサイトURLだけを即時公開した。説明の審査送信・公開は行っていない。

## 監査結果

- 公開中のproductionはv2.3（versionCode 23000）。v2.4のversionCode 24000は未使用。
- デフォルトのストア掲載情報（英語・米国）と日本語の掲載情報は公開中。
- 公開中の説明はフェリー中心で、v2.4のバス・航空・運航状況・運賃・オフライン対応を十分に説明していない。下記の日英v2.4説明をPlay Consoleへ転記し、英語は短い説明72/80・詳細1042/4000文字、日本語は42/80・414/4000文字でエラーがないことを確認して「未公開として保存」した。審査送信と公開は最新AAB・画像・データセーフティを揃えるまで行わない。
- アプリアイコンは登録済みだが、「新しい仕様に従っていません」という警告が表示される。v2.4提出前に新仕様へ適合した画像へ更新し、警告消失を確認する。
- ローカルの512pxアイコンを内容変更なしで`output/google-play-assets/app-icon-512.png`へ準備した。512×512、8-bit RGBA PNG、62,986 bytes、角丸・外部シャドウなし、SHA-256 `dea3cf6c28a86e80f86b3d261899ac5d89b29baaf00c6cb386b821022a4e771a`。Play Consoleへ登録後に動的マスクのプレビューと警告消失を確認する。
- 携帯電話スクリーンショットはPlay Console上では日英各2枚。ローカルではv2.4用の日英各4枚（1080×2220）を生成済みで、Google Playが案内する各言語4枚以上を満たす。
- 7インチ・10インチタブレットのスクリーンショットはPlay Console上では未登録。Pixel Tablet / Android 14の横向き日英各5枚（2560×1600）を生成済み。10インチ欄へ登録し、7インチ欄は同画像の受理可否と表示品質をPlay Consoleで確認する。
- カテゴリは「地図、ナビ」で、アプリ内容と整合する。
- ウェブサイトは旧`http://naturebot-lab.com/`から`https://transit.oki-digilab.com/`へ更新し、Play Consoleの「変更内容が公開されました」を確認した。通常1時間以内にストアへ反映される案内だった。
- 連絡先メールは`koyama@naturebot-lab.com`。現在の運用窓口として有効か、リリース責任者が確認する。
- [Google Playの対象API要件](https://support.google.com/googleplay/android-developer/answer/11926878)により、2026年8月31日以降の通常アプリ更新はAndroid 16（API 36）以上が必要。監査時のv2.4はtargetSdk 35だったため、compileSdk / targetSdkを36、API 36の公式最小要件に合わせてAGPを8.9.1へ更新した。生成APKからtargetSdk 36、minSdk 23、versionCode 24000、v2.4を確認し、Android 16でスモーク済み。最新AABアップロード後にPlay Consoleの警告消失を確認する。
- 「アプリのコンテンツ > データ セーフティ」は2025-11-01更新の公開回答で、対象データを収集・共有しない旨になっている。一方、v2.4実装はモバイルでもFirestoreへ日別・月別・時間別のページ閲覧回数と、出発地・到着地・検索日時別の検索回数を送信する。ユーザーID、端末ID、セッションID、ページパスは保存せず共有集計ドキュメントを直接加算する実装だが、アプリ外への送信自体はGoogle Playの「収集」に該当し得る。また、プライバシーポリシーも同統計情報を収集対象として明記しているため、現在のPlay回答とは不整合がある。保存・公開は行わず、下記の修正案をリリース責任者確認待ちとした。

## データセーフティ回答案

[Google Playのデータセーフティ定義](https://support.google.com/googleplay/android-developer/answer/10787469)は、アプリまたはSDKが端末外へデータを送信することを「収集」とし、サービスプロバイダへの転送は一定条件下で「共有」から除外する。[FirebaseのPlayデータ開示ガイド](https://firebase.google.com/docs/android/play-data-disclosure)も、Cloud Firestoreへ送信する利用定義データは開発者が用途に応じて申告する必要があるとしている。

実装とポリシーに対する保守的な回答案は次のとおり。Play Consoleの実際の設問とプレビューで最終確認し、必要なら法務・プライバシー責任者の判断を得てから保存する。

- データを収集する: `はい`
- データを共有する: `いいえ`（Firebaseはアプリ提供のためのサービスプロバイダとして利用し、第三者広告・販売・横断トラッキング用途なし）
- データの種類: `アプリのアクティビティ > アプリ内の操作`（ページ閲覧の集計）、`アプリのアクティビティ > アプリ内検索履歴`（出発地・到着地・検索日時別の集計）
- 目的: `分析`
- 必須 / 任意: `必須`（現行UIに個別オプトアウトなし）
- 一時的な処理: `いいえ`（日別・月別・時間別の集計値をFirestoreへ保存）
- ユーザーへの関連付け: `いいえ`（ユーザーID、端末ID、セッションIDを保存せず、共有集計ドキュメントを直接加算）
- 転送時暗号化: `はい`
- 削除リクエスト: 個人に関連付けたデータを保持しないため個別削除できないことを、Play Consoleの選択肢とポリシー文言で確認する

Cloud Firestore SDKが自動収集するFirebase User Agent（OSバージョン、端末名・モデル等）はFirebaseの説明上ユーザー・端末識別子へリンクされない。ただし、上記アプリ定義データとは別にPlay Consoleの質問へ該当するかを、最新AABのSDK構成で最終確認する。

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

- [x] 日英の説明文を転記し、文字数と入力内容を確認して未公開保存する（公開プレビューと審査送信は最終提出時に再確認）。
- [x] 新仕様向けの512×512 PNGアイコン候補を準備・検証する。
- [ ] アイコン候補をPlay Consoleへ登録し、動的マスクと警告消失を確認する。
- [x] 日英の携帯電話用画像を各4枚生成する。
- [x] 日英のタブレット用画像を各5枚生成する。
- [ ] 携帯電話画像をPlay Consoleへ登録してプレビューを確認する。
- [ ] タブレット画像の7インチ・10インチ欄への掲載方針を確定し、登録する。
- [x] ウェブサイトを`https://transit.oki-digilab.com/`へ更新し、即時公開の成功を確認する。
- [ ] プライバシーポリシーURLと連絡先メールを最終確認する。
- [x] Android設定とローカルAPKをtargetSdk 36へ更新する。
- [ ] targetSdk 36の最新AAB登録後に対象APIレベル警告の解消状態を確認する。
- [ ] データセーフティを上記回答案へ更新し、実装・プライバシーポリシーとの一致、プレビュー、公開状態を最終確認する。
- [ ] 内部テスト、リリース前レポート、Android Vitalsを確認する。
