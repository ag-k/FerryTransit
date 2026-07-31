# FerryTransit v2.5 リリースQA記録

## 実施情報

- 実施日: 2026-07-31（Asia/Tokyo）
- 実施者: Codex
- 作業ブランチ: `dev`
- 作業開始時HEAD: `185171a82e425f8e04ac55e05ce80a92c0350d82`
- リリース候補コミット: 未固定（v2.5変更は未コミット）
- Node.js: `v22.21.1`
- npm: `11.11.0`
- Web: `2.5.0`
- iOS: `2.5 (25001)`
- Android: `2.5 (25001)`
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
| `npm run release:config:verify` | 成功 | Web 2.5.0、iOS / Android 2.5 (25001)、本番Firebase alias一致 |
| `npm run timetable:validate:jal-fares` | 成功 | JAL 10便、変動運賃10便、登録済み運賃0便 |
| `npm run lint` | 成功 | ESLintエラー0件 |
| `npm run test` | 成功 | 122 files、1,010 passed、1 skipped |
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

## iOS / Android

| 項目 | 結果 | 備考 |
| --- | --- | --- |
| `npm run cap:ios:build` | 成功 | productionアセット生成、Capacitor同期、非同梱チェック成功 |
| iOS Release Simulator build | 成功 | scheme `App`、iOS Simulator Release |
| iOS Release Archive | 成功 | `/tmp/FerryTransit-v25.xcarchive`、Apple Development署名 |
| `npm run cap:android:build` | 成功 | productionアセット生成、Capacitor同期、非同梱チェック成功 |
| Android `bundleRelease` | 未完了 | 署名用4環境変数が未設定のため、Gradleが意図どおり停止 |

iOSビルドではCapacitor/Cordovaの`WKProcessPool`非推奨警告とAppIntents未使用警告がある。Android AAB生成には`FERRYTRANSIT_ANDROID_KEYSTORE_PATH`、`FERRYTRANSIT_ANDROID_KEYSTORE_PASSWORD`、`FERRYTRANSIT_ANDROID_KEY_ALIAS`、`FERRYTRANSIT_ANDROID_KEY_PASSWORD`が必要で、秘密値は記録していない。

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
| REL-25-01 | リリース阻止 | Android署名環境変数未設定 | AABを生成・内部テスト配布できない。署名担当環境で実行する | `bundleRelease`成功とAAB検証 |
| REL-25-02 | リリース阻止 | TestFlight / Google Play内部テストと実機QA未実施 | WebView外部リンク、オフライン、更新保持を最終確認できない | 両ストア内部配布と実機チェック |
| REL-25-03 | リリース阻止 | 本番Web / Storage未公開 | 実データと公開URLの最終スモーク未実施 | デプロイ後の両方向検索・リンク・ログ確認 |
| REL-25-04 | リリース阻止 | 候補SHA、QA責任者、リリース責任者の承認未固定 | 同一成果物の証跡とGo判定が未成立 | SHA固定、再QA、両責任者承認 |

現時点で今回のローカル実装に重大・高優先度の既知プロダクト不具合は確認していない。ただし上記リリースゲートが未完了のため、判定はNo-Go（準備継続）とする。
