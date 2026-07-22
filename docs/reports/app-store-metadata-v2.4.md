# App Storeメタデータ v2.4

App Store Connectへv2.4を登録する際の転記用ドラフト。管理画面へ反映した後、公開プレビューと実際のストアページで再確認する。

2026-07-21に転記前検証を実施した。日本語サブタイトル17文字、英語サブタイトル25文字で上限30文字以内。キーワードは日本語36文字（UTF-8 90 bytes）、英語65文字で上限100文字以内。スクリーンショット12枚は下記の規定寸法と一致した。同日にApp Store Connectへサインインし、v2.4の日英説明・What's New・キーワード・サブタイトル・サポートURL・マーケティングURLを本書どおり保存した。プライバシーポリシーURLはすでに有効な`https://transit.oki-digilab.com/privacy`へ更新済みだった。

2026-07-22に管理画面を再監査した。Bitwardenの自動入力オーバーレイを閉じてファイル選択操作の遮断を解消した。英語の提出欄に残っていた2026-02-08生成の旧6.9-inch画像5枚は削除済みで、現在0枚。今回のv2.4画像3枚をアップロードし、続けて日本語とiPadの日英各3枚を登録する。TestFlightの全iOSビルド一覧では最大使用済みがv2.3 build 23000で、v2.4 build 24000は未使用。新しい年齢制限質問はコード監査に合わせて「ソーシャルメディア：いいえ」「13歳未満向けソーシャル機能：いいえ」「広告：いいえ」とし、既存回答を含む全7ステップを保存した。算出結果は4+のままで、v2.4画面の未回答警告も消失した。

同日のプライバシー監査では、既存回答に「検索履歴」「製品の操作」「クラッシュデータ」があり、検索履歴・製品操作の用途に「デベロッパの広告またはマーケティング」「製品のパーソナライズ」等も含まれていた。公開アプリに広告SDK・Crashlytics・個人向け推薦はなく、独自計測はユーザー識別子を保存しない日別・経路別等の集計である。さらにCapacitorビルドのFirebase Analyticsを無効化し、同期済みiOS公開資産から本番Measurement IDが除外されたことを確認した。アプリ内プライバシーポリシーも2026-07-22付で、モバイルアプリではFirebase Analyticsを使用しない旨へ更新した。アプリターゲットには同じ申告内容の`PrivacyInfo.xcprivacy`を追加し、Release Simulator完成バンドル直下への同梱とplist内容を確認した。Capacitor/Cordova Frameworkのmanifestも収集・トラッキングなしだった。

App Store Connectへ保存するプライバシー回答案は次のとおり。保存後に公開プレビューとアプリの実通信を再照合する。

- 検索履歴: 収集あり、ユーザーへの関連付けなし、トラッキングなし、目的は「アナリティクス」のみ
- 製品の操作: 収集あり、ユーザーへの関連付けなし、トラッキングなし、目的は「アナリティクス」のみ
- クラッシュデータ: 収集なし（公開アプリにCrashlytics等の収集実装なし）
- 「デベロッパの広告またはマーケティング」「製品のパーソナライズ」: 用途から除外
- デバイスID・おおよその位置情報: 収集なし（Firebase Analyticsをモバイル成果物で無効化済み）

## 輸出コンプライアンス

アプリ固有の暗号化アルゴリズムは実装しておらず、通信はOS・標準ライブラリによるHTTPSを使用する。`ios/App/App/Base.lproj/Info.plist`には`ITSAppUsesNonExemptEncryption=false`が設定済みで、Release device buildの完成バンドルにも反映されている。App Store Connectへ非免除暗号化書類をアップロードする必要はなく、ビルド処理時の値が`false`であることを確認する。

## アクセシビリティ表示

2026-07-22にApp Store Connectのアクセシビリティ表示を監査した。iOS Release SimulatorとWeb QAでライト・ダーク・システムテーマの主要画面を検証済みのため、iPhone・iPadとも「ダークインターフェイス」だけを選択して下書き保存した。VoiceOver、音声コントロール、Dynamic Typeの200%以上、コントラスト等はApp Storeの定義に沿った実機検証が未完了なので申告していない。公開後は非公開にできない旨が確認画面に表示されたため、iPhone・iPadの公開選択直前で停止している。

## 共通設定

- アプリ名: `隠岐航路案内`
- カテゴリ: `ナビゲーション`
- サポートURL: `https://transit.oki-digilab.com/`
- マーケティングURL: `https://transit.oki-digilab.com/`
- プライバシーポリシーURL: `https://transit.oki-digilab.com/privacy`
- Copyright: `© 2026 Oki Digital Lab, LLC`

2026-07-20の公開版監査では、App Store掲載中だった旧プライバシーポリシーURL
`https://naturebot-lab.com/ferry_transit/privacy_policy.html` はサイトトップへ301リダイレクトされた。2026-07-21にApp Store Connectのv2.4メタデータを上記の`/privacy`へ更新済み。2026-07-23にもサポート・マーケティングURLと`/privacy`がHTTPSでHTTP 200、旧URLが新サイトトップへ301であることを再確認した。

`npm run store:metadata:verify`は、App Storeの日英サブタイトル、説明、キーワード、新機能と、Google Playの日英短文・詳細説明の文字数・bytes上限、両文書のサポート・マーケティング・プライバシーURL記載を一括検査する。2026-07-23に現在のドラフトで成功し、上限超過を拒否する回帰テストを含む3件も成功した。

## 日本語

### サブタイトル

船・バス・飛行機の時刻表・乗換案内

### 説明

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

### キーワード

隠岐,フェリー,船,バス,飛行機,時刻表,乗換案内,運航状況,島根,旅行

### このバージョンの新機能

- フェリー、島内・本土連絡バス、航空便を横断した乗換検索に対応しました。
- 港・バス停・空港を含む経路表示と地図を改善しました。
- 車両長を指定したフェリー検索と車両運賃表示に対応しました。
- 2026年度の船・航空・空港連絡バス時刻表と最新運賃を反映しました。
- オフライン表示、お気に入り、検索履歴、日付変更時の動作を改善しました。

## English

### Subtitle

Ferry, bus & flight guide

### Description

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

### Keywords

Oki,ferry,bus,flight,timetable,route,transit,Shimane,Japan,travel

### What's New in This Version

- Added multimodal journey search across ferries, local and mainland connection buses, and flights.
- Improved routes and maps covering ports, bus stops, and airports.
- Added ferry searches by vehicle length and vehicle fare display.
- Updated 2026 ferry, flight, airport bus, and fare data.
- Improved offline behavior, favorites, search history, and date rollover handling.

## スクリーンショット

- iPhone 6.7-inch: 1320 x 2868、日英各3枚
- iPad 13-inch: 2064 x 2752、日英各3枚
- 対象画面: 時刻表、乗換案内、運航状況

格納先は`output/appstore-screenshots/ios-sim-*`。App Store Connectへ登録後、端末種別・言語・表示順が意図どおりであることをプレビューで確認する。

`npm run app-store:assets:verify`は、提出用4ディレクトリの計12枚について、所定のファイル名、PNG構造・CRC、寸法、8-bit RGBA、内容重複を一括検査する。2026-07-23に提出用実データ12件で成功し、正常系、余分なPNG、寸法不一致、重複画像を含む回帰テスト4件も成功した。`output/appstore-screenshots/ios-6.7-ja`はWeb E2Eで生成した日本語だけの旧撮影物であり、App Store提出対象には含めない。App Store Connectへ登録する直前と、画像を差し替えた後に再実行する。

登録順は各言語・端末とも次の3枚とする。

1. `01_timetable.png`
2. `02_transit.png`
3. `03_status.png`
