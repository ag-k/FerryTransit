# FerryTransit v2.5 リリースQA記録

## 実施情報

- 実施日: 2026-07-31（Asia/Tokyo）
- 実施者: Codex
- 作業ブランチ: `dev`
- 作業開始時HEAD: `185171a82e425f8e04ac55e05ce80a92c0350d82`
- Web / Storage公開コミット: `c75e4c02cf007c86606b43e10ffe5802c358b36c`
- iOS / Android配布候補コミット: `1db1ba1a4d543a358587ff6738adb7f21c8870a5`
- Node.js: `v22.21.1`
- npm: `11.11.0`
- Web: `2.5.0`
- iOS: `2.5 (25003)`
- Android: `2.5 (25003)`
- 追跡Issue: [#76](https://github.com/ag-k/FerryTransit/issues/76)

## 対象

- はつみ交通「七類港―境港駅」連絡バス
- バス出発地・目的地選択のバス停限定
- JAL航空運賃の状態表示、既知額合算、料金順、公式リンク
- 西ノ島町営バスの●・◎・★が付いた停留所区間の運行日修正
- v2.5版番号とWeb / iOS / Androidのローカルリリース成果物

## 自動品質ゲート

| 項目 | 結果 | 証跡 |
| --- | --- | --- |
| `npm ci --prefer-offline --no-audit` | 成功 | 1,397 packages、postinstall / `nuxt prepare`成功 |
| `npm run release:config:verify` | 成功 | Web 2.5.0、iOS / Android 2.5 (25003)、本番Firebase alias一致（2026-08-01 17:25 JST再実行） |
| `npm run timetable:validate:jal-fares` | 成功 | JAL 10便、変動運賃10便、登録済み運賃0便 |
| `npm run lint` | 成功 | ESLintエラー0件 |
| `npm run test` | 成功 | 123 files、1,015 passed、1 skipped（2026-08-01の不具合修正後に再実行） |
| `npm run gtfs:validate -- bus nishinoshima --check` | 成功 | 6 routes、27 stops、59 trips、817 stop_times |
| `npm run gtfs:validate -- bus hatsumi_bus_connection --check` | 成功 | 1 route、2 stops、31 trips、62 stop_times |
| `npm run build-prod` | 成功 | `.env.production`、Firebase `prod/default`で静的生成成功 |
| `npm run test:e2e:prod` | 成功 | Chromium / Firefox / WebKitで最終63件を実行（最終実行結果をTODOへ記録） |
| `npm run cap:assert:no-timetable` | 成功 | `.output/public`に時刻表・GTFS・bus-search JSONの同梱なし |

`npm run typecheck`はリリース必須要件ではない。実行時に今回の差分外を含む既存のリポジトリ全体エラーが多数あり、v2.5では修正対象外とした。

## Web確認

- 本番静的成果物と固定fixtureで、伊丹→西郷、西郷→伊丹、出雲→西郷、西郷→出雲を確認した。
- JAL運賃未設定時は、航空区間を「航空運賃は別途（変動）」、空港バス接続を「¥520 + 航空運賃（変動）」と表示する。
- 正の`trip.price`を持つ検証データでは、航空区間と経路合計に登録額を表示する。
- JAL公式リンクのURL、`target="_blank"`、`rel="noopener noreferrer"`を確認した。
- 日本語・英語、ライト相当・ダーク、390×844、デスクトップ、Chromium / Firefox / WebKitで確認した。狭幅画面の横はみ出しは0件。
- 本番静的成果物をローカル実ブラウザでも表示し、ページ本体が1280px幅で横にはみ出さないことを確認した。外部Firebase Storageへ接続できない制限環境では、0件・通信失敗のフォールバック表示を確認した。
- E2EではNews、Analytics、Iconify、Firebase Authなどの外部依存を固定応答へ置換した。WebKit終了時にページクローズでキャンセルされたローカル遅延読込は自動化の終了処理として分離し、実行中のアプリ由来コンソールエラーと未処理Promise rejectionは0件。

## Web / Storage本番公開

- 公開日時: 2026-07-31 20:56 JSTまでに完了
- Firebase Hosting: `https://oki-ferryguide.web.app`（158 files、release complete）
- GTFS Storage: devで49オブジェクトのmanifest・SHA-256を検証後、同じmanifestをprodへ昇格し、prodで全49オブジェクトを再検証した。
- 公開時刻表Storage: JAL10便が全件変動運賃・固定運賃0件であることを検証し、dev manifestからprodへ昇格した。`data/timetable.json`は既存本番と同一ハッシュだったためオブジェクト本体はスキップし、manifestの公開SHAを更新した。
- 本番ブラウザ: 公開URLのページタイトル・主要DOM・静的アセットを確認し、関連するconsole error / warningは0件だった。
- 西ノ島町営バス: 2026-09-01の由良車庫→島前病院を本番実データで検索し、6便の記号なし区間`13:05→13:36`が表示されることを確認した。
- バックアップ: 変更されたStorageオブジェクトは公開処理が自動作成する`backups/`配下へ保存した。

### 公開後追加QA（2026-08-01）

- 本番URL `https://oki-ferryguide.web.app` をCodex In-app Browserで確認した。ページタイトル、主要DOM、エラーオーバーレイなし、オンライン時の関連console error / warning 0件を確認した。
- 実MacのChrome 150.0.7871.187、Safari 26.5、Firefox 153.0、Edge 150.0.4078.105で本番URLのページタイトル・主要DOM・交通手段の「バス」タブ選択を確認した。Chromeでは関連console error / warning 0件、Safari / Firefox / Edgeではアクセシビリティツリーと画面表示にエラー画面がないことを確認した。検証用に開いたタブは終了後に閉じた。
- モバイルSafari / ChromeはPlaywrightのWebKit / Chromium・390×844では確認済みだが、物理端末ブラウザでの確認は未完了項目として継続する。
- 2026-08-01の本番実データで、七類港→境港駅は`10:05→10:20`・`18:10→18:25`、境港駅→七類港は`08:24→08:39`・`13:25→13:40`・`16:07→16:22`を表示した。
- はつみ交通の詳細で、事業者名、七類港・境港駅、大人片道`¥500`、掲載期間、はつみ交通Webサイト、隠岐広域連合の公式ページ、PDF時刻表を確認した。
- 390×844で横方向のoverflowがないことを確認した。バス選択ダイアログの本土タブにはバス停だけが表示され、はつみ交通路線へ絞り込めることを確認した。
- CDPでオフライン状態を一時的に再現し、再読み込み後もアプリシェルと検索条件が表示され、通信失敗を利用者向けアラートで通知することを確認した。検証後はオンライン設定へ復旧した。外部通信失敗に伴うService Worker、News、Firebase Analytics等のログは期待されたオフライン時ログとして記録した。
- 本番実データで大阪（伊丹）空港→西郷を検索し、JAL2331、隠岐空港での15分乗換、空港連絡バス`¥520`、経路合計`¥520 + 航空運賃（変動）`を確認した。
- JAL公式リンクは`target="_blank"`・`rel="noopener noreferrer"`で、リンク先がJALの隠岐発航空券ページとして表示され、大阪（伊丹）・出雲の対象路線を案内していることを確認した。
- GitHubの未解決Issueはリリース追跡Issue #75・#76のみで、重大・高優先度の未解決プロダクト不具合は0件だった。ストア配布・実機QA・責任者承認のリリース阻止ゲートは継続する。

### Webアクセシビリティ追加QA（2026-08-01）

- 実Chromeでトップの「設定」リンクへキーボードのEnterで遷移し、フォーカス対象と遷移先URLが一致することを確認した。
- 設定画面の「システム設定に従う」をキーボードで選択し、選択スタイルとフォーカスリングを確認した。OSのカラースキームはライトだったため、画面もライト表示になった。
- 2036px幅のChromeに対してCSS viewportを1018px、device pixel ratioを2へ設定し、200%拡大相当のリフローを再現した。設定画面・乗換案内画面とも`scrollWidth === innerWidth`で横はみ出し0件、エラーオーバーレイなし、関連console error / warning 0件だった。
- 検証後はページ倍率とviewport overrideを解除し、テーマをライトへ復旧した。

## iOS / Android

| 項目 | 結果 | 備考 |
| --- | --- | --- |
| `npm run cap:ios:build` | 成功 | productionアセット生成、Capacitor同期、非同梱チェック成功 |
| iOS Release Simulator build | 成功 | scheme `App`、iOS Simulator Release |
| iOS Release Archive | 成功 | 固定SHA `1db1ba1a4d543a358587ff6738adb7f21c8870a5`、`/tmp/FerryTransit-v25-b25003.xcarchive`、v2.5（build 25003）、Apple Development署名 |
| iOS配布候補内容検証 | 成功 | Archive内にCapacitor Browser依存と外部リンク修正コードを確認。時刻表・GTFS・bus-searchデータの同梱0件 |
| iOS App Store配布用IPA | 成功 | `xcodebuild -exportArchive`のApp Store Connect分析・再署名・アップロード検証が成功し、build番号25003を維持 |
| App Store Connectアップロード | 成功 | 2026-08-01 17:30 JST。`xcodebuild -exportArchive`が`Uploaded App` / `Upload succeeded`を返した |
| App Store Connect処理完了 | 成功 | 2026-08-01 17:38 JST。Appleから「Version 2.5 (25003) ... has completed processing.」通知を受信したことを、送信元・アプリ名・build番号へ限定したメール検索で確認 |
| TestFlight更新インストール | 成功 | 2026-08-01 17:43 JST。接続中の`ePhone`をbuild 25002から修正版build 25003へTestFlightの「アップデート」で更新し、TestFlight表示`2.5 (25003)`と「開く」からの起動成功を確認 |
| `npm run cap:android:build` | 成功 | productionアセット生成、Capacitor同期、非同梱チェック成功 |
| Android `bundleRelease` | 成功 | macOSキーチェーンから既存署名情報4項目を同一シェルへ読み込み、`bundleRelease` / `lintVitalRelease` / `signReleaseBundle`に成功 |
| Android AAB検証 | 成功 | `output/releases/ferrytransit-v2.5-25003-1db1ba1.aab`（10,219,703 bytes、SHA-256 `ddf7e8ff341093df2c9449d4d2cb0317fa7850e1a99203e1b0793e736dd401a8`）。bundletool 1.18.3 validate成功、Application ID `com.naturebotlab.ferrytransit`、v2.5 / 25003、minSdk 23 / targetSdk 36、署名証明書SHA-256はPlay登録値と一致、時刻表・GTFS・bus-search・source map禁止エントリ0件 |
| Google Play内部テスト | 成功 | 2026-08-02 15:08 JST。対象アカウントで再認証し、v2.5（25003）を内部テスターへ公開。minSdk 23 / targetSdk 36、対応端末数の減少0件、日英リリースノートを確認 |

iOSビルドではCapacitor/Cordovaの`WKProcessPool`非推奨警告とAppIntents未使用警告がある。AndroidビルドではflatDir、Capacitor StatusBar、MainActivityの既存警告があるが、Release lintとAAB生成は成功した。Android署名情報はmacOSキーチェーンから一時的に読み込み、秘密値は記録していない。

2026-08-01の再確認では、Developer Mode有効のiPhone実機2台をXcodeBuildMCPで認識した。接続中の`ePhone`にv2.4（build 24001）がインストール済みであることを確認後、14:38 JSTにTestFlightからv2.5（build 25002）を更新インストールした。`devicectl device info apps`で`com.naturebot-lab.FerryTransit`のVersion `2.5`、Bundle Version `25002`を確認し、TestFlightの「開く」から時刻表画面の起動にも成功した。Android SDKのADBは利用可能だが、接続中のAndroid実機は0台だった。Android署名情報は後続作業でmacOSキーチェーンから安全に読み込み、AAB生成に成功した。App Store Connect API設定は未設定だったが、Xcodeに設定済みの開発者アカウントを利用した自動署名・アップロードには成功した。

### iOS TestFlight実機追加QA（2026-08-01 15:09–15:40 JST）

- 対象: `ePhone`（iPhone18,3 / iOS 26.5.2）、TestFlight v2.5（build 25002）、日本語・ダークテーマ。
- 更新保持: 更新前からの日本語・ダーク設定、お気に入り`別府→菱浦`、検索履歴`別府→菱浦`が更新後も残っていた。お気に入りと履歴から検索条件を復元でき、出雲線履歴の再検索でも`¥520 + 航空運賃（変動）`を維持した。
- バス停選択: バスタブの選択ダイアログにはバス停だけが表示され、`七類港⇔境港駅`で路線を絞り込めた。
- はつみ交通直行便: 七類港→境港駅`10:05→10:20`・`18:10→18:25`、境港駅→七類港`08:24→08:39`を表示。乗換案内でも境港駅`16:07`→七類港`16:22`、15分、`¥500`を確認した。
- はつみ交通詳細: 事業者名、区間、片道`¥500`、運行期間`2026/06/08–2026/12/31`、公式ページ・PDF時刻表の表示を確認した。
- 船→バス: 西郷`15:40`→フェリーおき→七類`18:05`→徒歩3分→はつみ交通`18:10`→境港駅`18:25`、合計`¥4,370`（船`¥3,870` + バス`¥500`）を確認した。
- バス→船: 境港駅`16:07`→はつみ交通→七類`16:22`→徒歩3分→レインボージェット`16:50`→西郷`17:59`を確認し、バス区間`¥500`を表示した。
- JAL: 大阪（伊丹）`12:15`→隠岐空港→西郷`13:30`、出雲`09:00`→隠岐空港→西郷`09:55`を表示。いずれも経路合計`¥520 + 航空運賃（変動）`、JAL区間`航空運賃は別途（変動）`、空港連絡バス`¥520`を確認した。
- 復帰・日付: アプリをホームへ移してからアプリスイッチャーで復帰し、検索条件・結果を保持した。出雲線を2026-08-01から08-02へ変更して再検索しても変動運賃表示を維持した。
- オフライン試行: 承認後にePhoneの機内モードをオンにしたところ、iPhoneミラーリング自体が即時切断された。ミラーリングはBluetoothとWi-Fiを必要とするため、完全オフライン中のアプリ操作はこの方法では実施できなかった。端末側で機内モードをオフ、Wi-Fi・Bluetoothをオン、端末をロックした後にミラーリングへ再接続できた。
- 通信復帰: 再接続後にRouteGuideを起動し、検索条件とお気に入り状態の保持を確認した。オンラインで`別府 16:40→菱浦 16:52`、12分、`¥300`を再検索でき、通信復帰後の検索は成功した。
- 不具合1: はつみ交通を含む検索履歴で`BUS_HATSUMI_CONNECTION_sakaiminato...`等の内部停留所コードが表示される。条件復元は可能。
- 不具合2: 伊丹・出雲の両経路で「JALで運賃を確認」は表示されるが、TestFlight実機でタップしても外部ページへ遷移しない。複数回、画面中央へスクロールした状態でも再現した。

### 実機QA検出不具合のコード対応（2026-08-01）

- REL-25-05: `@capacitor/browser`を追加し、ネイティブ環境では`target="_blank"`の外部HTTP(S)リンクをCapacitor Browserで開く共通処理へ変更した。JALリンクだけでなく、運賃表・運航情報・関連サイト等の外部リンクにも適用される。
- REL-25-06: 検索履歴の出発地・目的地表示でも`ferryStore.getLocationLabel`を参照し、bus-search由来の利用者向け停留所名（例: `境港駅`）を内部IDより優先するよう変更した。
- 回帰テスト: 外部リンクの対象判定（外部HTTP(S)、同一オリジン、非HTTP、`target`差異）と、はつみ交通の内部IDが履歴に露出しないことを追加。`npm run lint`、`npm run test`（123 files、1,015 passed、1 skipped）、`npm run build-prod`、`npm run cap:ios:build`、`npm run cap:android:build`は成功し、両OSへCapacitor Browserを同期した。
- iOSネイティブ整合性: Capacitor Browser同期後、iPhone 16 Pro / iOS 26.5 Simulator向けのscheme `App`・Releaseビルドが成功し、Swift Package依存を含むコンパイルを確認した。
- 本番静的成果物をローカル実ブラウザで確認し、ページタイトル・主要DOM・エラーオーバーレイなし・外部リンクの表示と`target="_blank"`を確認した。外部Firebase Storageへの接続が制限された環境のため、通信失敗ログとフォールバック表示は確認対象外の既知環境差として記録した。
- `npm run typecheck`は今回の変更箇所以外を含む既存のリポジトリ全体エラーで失敗した。今回追加・変更したファイルに起因するエラーは出ていない。
- build 25002には本修正が含まれない。修正を含むbuild 25003は17:30 JSTにApp Store Connectへアップロードし、17:38 JSTに処理完了した。REL-25-05 / REL-25-06の完了には、build 25003を実機へ更新してJAL公式ページ遷移・履歴の「七類港」「境港駅」表示を再確認する必要がある。

### iOS TestFlight build 25003再QA（2026-08-01 17:43–17:50 JST）

- 対象: `ePhone`（iPhone18,3 / iOS 26.5.2）、TestFlight v2.5（build 25003）。TestFlight一覧の`2.5 (25003)`、「アップデート」完了後の「開く」、アプリ起動を確認した。CoreDeviceの一時的な初期化タイムアウトにより`devicectl`の二重確認はできなかったが、TestFlight自身のbuild表示を更新前後で確認した。
- REL-25-06: build 25002で内部IDが露出していた既存のはつみ交通履歴が、build 25003では`境港駅 → 七類港`と表示された。更新前履歴をそのまま使用しており、データ移行後の表示も合格した。
- REL-25-05（伊丹）: 更新前履歴から大阪（伊丹）空港`12:15`→西郷`13:30`を再検索し、`¥520 + 航空運賃（変動）`を確認。「JALで運賃を確認」をタップしてCapacitor Browser内の`jal.co.jp`・隠岐空港発航空券ページへ到達した。
- REL-25-05（出雲）: 更新前履歴から出雲空港`09:00`→西郷`09:55`を再検索し、`¥520 + 航空運賃（変動）`を確認。同じリンクから`jal.co.jp`へ到達した。
- 更新保持: 日本語、ダークテーマ、お気に入り`別府 → 菱浦`、更新前の検索履歴がbuild 25003更新後も保持された。履歴から伊丹・出雲の検索条件を復元して再検索できた。
- 判定: REL-25-05 / REL-25-06はbuild 25003の実機で解決確認済み。iOSのJAL外部リンク・履歴表示に関するリリース阻止を解除する。

### モバイル実ブラウザQA（2026-08-01 17:54–17:56 JST）

- 対象: `ePhone`（iPhone18,3 / iOS 26.5.2）のSafariおよびChrome、公開URL `https://oki-ferryguide.web.app`。
- 両ブラウザで本番の時刻表画面が表示され、ヘッダー、交通種別、検索フォーム、地図、下部ナビゲーションに横はみ出しや操作を妨げる重なりがないことを確認した。
- 両ブラウザで「バス」タブへ切り替え、出発地選択ダイアログを表示した。ダイアログは「バス停」区分、地域・路線絞り込み、停留所一覧で構成され、港・空港などの非バス停候補は表示されなかった。
- 判定: モバイルSafari / Chromeの本番表示・主要操作QAは合格。

### Android Release成果物・エミュレータ補助QA（2026-08-01 18:01–18:21 JST）

- 署名済みAABを生成し、bundletool 1.18.3、`jarsigner`、証明書SHA-256、manifest、禁止データ非同梱を検証した。提出用コピーは`output/releases/ferrytransit-v2.5-25003-1db1ba1.aab`へ固定した。
- API 23クリーンAVDではRelease APKがクラッシュせず、古いAndroid System WebViewを検出して日本語・英語の更新案内とGoogle Play更新ボタンを表示した。Google APIsイメージには更新可能なPlay Storeがないため機能画面QAはAPI 34へ移した。
- API 34クリーンAVDへ同じ署名済みRelease構成のAPKを導入。コールド起動、時刻表、バスタブ、バス停だけの出発地・目的地ダイアログを確認した。
- 境港駅→七類港で`08:24→08:39`、`13:25→13:40`、`16:07→16:22`を取得。便詳細でHatsumi Kotsu、片道`¥500`、公開期間`2026/06/08–2026/12/31`を確認した。
- 大阪（伊丹）空港→隠岐空港でJAL2331 `12:15→13:05`、`Airfare charged separately (variable)`、合計も変動運賃であることを確認した。「Check fare on JAL」押下でCapacitor Browserが起動し、Activityログで`https://www.jal.co.jp/...`のVIEW IntentをChromeへ渡したことを確認した。クリーンAVDのChrome初回規約画面で停止し、規約同意は実施していない。
- 最終プロセスログにクラッシュ、ANR、SSL、Capacitorの致命的例外は確認されなかった。本確認はエミュレータ補助QAであり、Google Play内部テスト版のAndroid実機QAを代替しない。

### Android Release完全オフライン・通信復帰QA（2026-08-01 18:26–18:32 JST）

- 対象: Android API 34クリーンAVD、v2.5（25003）の署名済みRelease APK。オンラインで大阪（伊丹）空港→隠岐空港を検索し、JAL2331 `12:15→13:05`と`Airfare charged separately (variable)`を基準表示として確認した。
- Wi-Fiとモバイルデータを停止し、外部IPへのpingが100% lossになることを確認した。機内モードのシステムブロードキャストはshell権限で拒否されたが、対象AVDの外部通信は遮断できている。
- 完全オフラインでアプリをforce-stopしてコールド起動した。検索条件は大阪空港（伊丹）→隠岐空港のまま保持され、地図失敗と「最後に取得した時刻表データを表示する」旨の利用者向け警告を表示した。
- オフラインのまま乗換検索を再実行し、JAL2331 `12:15→13:05`、区間・合計とも`Airfare charged separately (variable)`を表示した。固定額への誤変換はなかった。
- Wi-Fiとモバイルデータを復帰し、外部IPへのping成功後にコールド再起動した。検索条件を保持したまま地図タイルを再取得し、通信復帰を確認した。
- QA中および復帰後のログにクラッシュ、ANR、SSLHandshakeException、Capacitorの致命的例外はなかった。この確認は運賃状態TODOの完全オフライン部分を補完するが、Google Play内部テスト版のAndroid実機QAは引き続き別ゲートとして残す。

### 同一アプリソースのWeb公開前QA（2026-08-01 18:38–18:41 JST）

- 配布済みiOS build 25003の基準SHA `1db1ba1a4d543a358587ff6738adb7f21c8870a5`から現HEADまでを監査した。`src`、`package.json`、`package-lock.json`、Nuxt・Firebase・iOS設定に差分はなく、アプリ関連差分はAndroidへCapacitor Browserを同期した生成設定2ファイルだけだった。Web/iOSのアプリコードは基準SHAと同一である。
- Node.js `v22.21.1`で`npm run release:config:verify`と`npm run build-prod`が成功した。Firebaseはprod/default alias `oki-ferryguide`、Web `2.5.0`、iOS/Android `2.5 (25003)`の整合を再確認した。
- `.output/public`は159ファイルで、source map、GTFS、時刻表JSON、bus-search JSONの禁止エントリは0件だった。既存のsourcemap生成・chunk size警告は出たが、生成エラーはなかった。
- Firebase Hosting Emulator `http://127.0.0.1:5002`で本番成果物を確認した。デスクトップで時刻表の初期画面、船→バスタブ切替、出発地ダイアログ展開を確認し、390×844では横スクロール0、乗換案内フォームと下部ナビゲーションの重なり・切れなしを確認した。
- `/transit`への直リンクと再読み込み後も、タイトル、乗換案内フォーム、交通条件、検索ボタンが描画され、SPA rewriteが機能した。フレームワークエラーオーバーレイと白画面はなかった。
- ローカルoriginからFirebase Storageへの取得は失敗し、時刻表・運賃・ニュース・バス停一覧のオンライン実データQAには使用できなかった。利用者向け通信失敗表示と関連ログを確認し、オンライン実データは同日に実施済みの本番URL QAを証跡とする。
- 本番Hostingの更新は未実施。同一ソース成果物の公開と公開後スモークQAを完了するまで、全プラットフォーム同一SHAゲートは未完了のままとする。

### Google Play内部テスト配布（2026-08-02 15:08 JST）

- 対象アカウントでGoogle本人確認を完了し、`Oki Islands Ferry Guide`（`com.naturebotlab.ferrytransit`）の内部テストトラックを確認した。直前の内部テスト版はv2.4（24001）だった。
- SHA-256 `ddf7e8ff341093df2c9449d4d2cb0317fa7850e1a99203e1b0793e736dd401a8`の`ferrytransit-v2.5-25003-1db1ba1.aab`をアップロードし、Google Playの配信用最適化完了後にv2.5（25003）、API 23以上、target SDK 36を再確認した。
- 前版からサポート対象外になった端末は全フォームファクタで0件。電話13,334台、タブレット6,781台を含む対象数を維持した。新規インストール8.48 MB、アップデート3.16 MBと表示された。
- 日本語・英語のリリースノートを登録し、2026-08-02 15:08 JSTに「内部テスターに公開」へ移行した。内部テスト参加用Webリンクが設定済みであることも確認した。
- 検証メッセージは難読化解除ファイル未登録の警告1件だけだった。Release設定は`minifyEnabled false`でR8 / ProGuard難読化を使用していないため、解析不能になる新規リスクではなく、配布阻止にはしない。
- 配布直後のADB接続端末は0台だった。Google Play経由の更新インストール、はつみ交通、JAL運賃・外部リンク、設定・お気に入り・履歴保持はAndroid実機ゲートとして残す。

### Google Playリリース前レポート・実機接続確認（2026-08-02 15:10–15:25 JST）

- 利用者からGoogle Play内部テスト版のインストール完了申告を受けた。内部テストトラックには1名のメーリングリストが選択済みで、v2.5（25003）が最新リリースとして有効であることを再確認した。
- Mac側の`adb devices -l`、ADB mDNS discovery、USBデバイス照合はいずれもAndroid端末0台だった。このため、実機へ入った版のversionName / versionCode、画面、操作、Logcatは独立検証できておらず、インストール申告だけで実機TODOを完了扱いにしない。
- Google Playのリリース前レポートはv2.5（25003）を1種類の端末で2026-08-02 15:06 JSTに完了。安定性0件、パフォーマンス0件で、起動クラッシュ・ANR・性能問題は検出されなかった。
- ユーザー補助機能は39件（警告3件、軽微36件）。内訳はコンテンツラベル1件（警告）、タップターゲット13件（警告2・軽微11）、実装1件（軽微）、低コントラスト24件（軽微）。重大・高優先度として分類された問題はなく、前版24001の54件から15件減少した。
- リリース前レポートは実機の主要経路QAを代替しない。USB接続とUSBデバッグ許可後に、更新保持、はつみ交通、伊丹・出雲JAL経路、外部リンク、クラッシュ・ANR・SSLログを確認する。

最初にアップロードしたbuild 25001のArchive作成日時は2026-07-31 16:30 JSTで、JAL運賃表示などをまとめたWeb / Storage公開コミット（同日20:47 JST）より前だった。最終変更を含む配布候補として使用できないためbuild 25001を配布対象外とし、build番号を25002へ更新した固定SHA `19aab26378b820c88747bf404db8ed83175090b9`から再生成・再アップロードした。

## 影響レビュー

- ユーザー影響: はつみ交通の新規経路、バス停選択候補の修正、航空運賃の誤認防止、西ノ島町営バスの記号なし区間が運行期間外にも正しく検索されるようになる。
- 互換性: 既存の`fare` / `totalFare`数値は既知部分の金額として維持し、任意の`fareStatus` / `knownFareTotal`を追加した。
- データ移行: 不要。
- Firebase Rules / Functions: 変更なし。
- Storage: はつみ交通の公開GTFS / bus-searchデータ追加、西ノ島町営バスGTFS / bus-searchデータ更新、既存時刻表のJAL`price`未設定方針を継続する。公開前検証をbuild / publishへ追加した。
- アプリ更新: はつみ交通対応、バス停選択修正、JAL運賃表示はクライアント実装を含むため、iOS / Androidではv2.5アプリ更新が必要。

## 既知事項・未完了ゲート

| ID | 重要度 | 内容 | 影響 / 回避策 | 完了条件 |
| --- | --- | --- | --- | --- |
| REL-25-01 | 解決済み | macOSキーチェーンから既存署名情報を読み込み、署名済みAABを生成・検証した | 影響なし | 2026-08-01確認済み |
| REL-25-02 | リリース阻止 | iOS build 25003の主要経路・保持QAとAndroid Release構成のオフラインQAを実施し、Google Play内部テストへv2.5（25003）を公開済み。インストール完了申告はあるが、ADB接続端末は0台 | Google Play内部テスト版をAndroid実機で最終確認できない | Android実機をADB接続し、versionCode、更新保持、主要経路、外部リンク、端末ログを確認 |
| REL-25-05 | 解決済み | build 25003へ更新し、伊丹・出雲の両経路からJAL公式ページへ遷移できることを実機確認 | 影響なし | 2026-08-01実機確認済み |
| REL-25-06 | 解決済み | build 25003へ更新し、既存のはつみ交通履歴が`境港駅 → 七類港`と表示され、内部IDが露出しないことを実機確認 | 影響なし | 2026-08-01実機確認済み |
| REL-25-04 | リリース阻止 | QA責任者、リリース責任者の承認未記録 | Web / Storage公開SHAは固定済み。最終Go判定は未成立 | 両責任者承認 |

Web / Storage本番反映に重大不具合は確認していない。iOS TestFlight実機QAで確認したJAL外部リンク遷移不良と履歴の内部コード露出は、build 25003の実機再QAで解決確認した。モバイルSafari / Chromeの実機QA、Android Release構成による完全オフライン・通信復帰QA、Google Play内部テスト配布も合格した。Android実機QA、全プラットフォーム同一SHA、承認ゲートが未完了のため、v2.5全体の判定はNo-Go（確認継続）とする。
