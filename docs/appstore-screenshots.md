# App Store スクリーンショット自動撮影

App Store 提出向けスクリーンショットを自動出力できます。  
用途に応じて `Web撮影` と `iOSシミュレータ撮影` を使い分けます。

## Web撮影（Playwright）

事前に最新の静的成果物を作成します。

```bash
npm run generate
```

撮影を実行します。

```bash
npm run test:e2e:appstore-screenshots
```

デフォルト出力先:

`output/appstore-screenshots/ios-6.7-ja`

## iOSシミュレータ撮影（Capacitorアプリ）

Xcode / iOS Simulator が利用可能な macOS で実行します。

```bash
npm run cap:ios:appstore-screenshots
```

このコマンドで以下を自動実行します。

1. `npm run cap:ios:build`（Web資産生成 + Capacitor sync）
2. シミュレータ起動
3. iOSアプリのビルド・インストール・起動
4. `simctl launch ... --appstore-path /...` で各画面へ自動遷移
5. 3枚のスクリーンショット保存

デフォルト出力先（4セット）:

- `output/appstore-screenshots/ios-sim-6.7-ja`
- `output/appstore-screenshots/ios-sim-6.7-en`
- `output/appstore-screenshots/ios-sim-ipad-13-ja`
- `output/appstore-screenshots/ios-sim-ipad-13-en`

## 出力ファイル

- `01_timetable.png`（時刻表: `別府 → 来居` 検索済み）
- `02_transit.png`（乗換案内: `HONDO → 菱浦` 検索実行後）
- `03_status.png`（運航状況）

上記3枚が各出力ディレクトリに生成されます。

## 環境変数

- Web撮影:
  - `APPSTORE_SCREENSHOT_DIR`
  - `APPSTORE_STATIC_ROOT`
- iOSシミュレータ撮影:
  - `APPSTORE_SIM_SCREENSHOT_ROOT_DIR`
  - `APPSTORE_SIM_SCREENSHOT_DIR`（互換モード: 単一ディレクトリのみ出力）
  - `APPSTORE_SIM_VARIANTS`（例: `iphone-ja,iphone-en,ipad-ja,ipad-en`）
  - `APPSTORE_STATIC_ROOT`
  - `IOS_SIM_DEVICE_NAME`
  - `IOS_SIM_DEVICE_CANDIDATES`
  - `IOS_SIM_IPAD_DEVICE_NAME`
  - `IOS_SIM_IPAD_DEVICE_CANDIDATES`
  - `IOS_SIM_SCHEME`
  - `IOS_SIM_DERIVED_DATA_PATH`
  - `IOS_SIM_APP_PATH`
  - `APPSTORE_TIMETABLE_DEPARTURE`（既定: `BEPPU`）
  - `APPSTORE_TIMETABLE_ARRIVAL`（既定: `KURI`）
  - `APPSTORE_TRANSIT_DEPARTURE`（既定: `HONDO`）
  - `APPSTORE_TRANSIT_ARRIVAL`（既定: `HISHIURA`）
  - `APPSTORE_SEARCH_DATE`（未指定時は `timetable.json` から有効日を自動選択）
  - `APPSTORE_SEARCH_TIME`（既定: `08:00`）
  - `APPSTORE_TIMETABLE_JSON_PATH`（既定: `timetable.json`）
  - `IOS_SIM_SKIP_CAP_BUILD=1`
  - `IOS_SIM_SKIP_XCODEBUILD=1`
