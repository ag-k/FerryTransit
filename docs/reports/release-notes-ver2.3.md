# FerryTransit ver2.3 Release Notes

## 日本語

### 主な変更点

- 時刻表・乗換案内の地図表示を刷新し、航路と港の確認をより軽快で見やすくしました。
- フェリー運航ステータスの判定ロジックを見直し、フェリー・レインボージェットの通常運航/警戒表示をより正確にしました。
- Android で下部ナビゲーションまわりの余白とシステムナビゲーションバー表示を調整し、画面下部の見やすさと安定性を改善しました。
- 設定画面にリリース日を表示するようにしました。

### 内部改善

- 地図 UI の重なり順や表示制御を見直し、操作ボタンと地図の干渉を抑えました。
- Nuxt `4.4.2` への移行準備を進め、関連設定と依存関係を更新しました。
- Capacitor 依存を `7.6` 系へ更新し、モバイルアプリ基盤の保守性を向上しました。
- iOS では CocoaPods 依存を見直し、Swift Package Manager ベースの構成へ移行しました。
- テスト設定と依存関係の固定を見直し、ビルドと検証の安定性を改善しました。

## English

### Highlights

- Refreshed the timetable and transit maps for a lighter and clearer route and port browsing experience.
- Improved ferry service status detection so normal-operation and alert states for ferries and Rainbow Jet are shown more accurately.
- Adjusted bottom safe-area spacing and Android system navigation bar styling for a more stable layout near the bottom of the screen.
- Added the release date to the Settings screen.

### Internal Improvements

- Refined map layering and visibility handling to reduce interference between overlay buttons and the map UI.
- Continued migration prep for Nuxt `4.4.2` with related configuration and dependency updates.
- Updated Capacitor dependencies to the `7.6` line to improve maintainability of the mobile app foundation.
- Migrated the iOS project away from CocoaPods toward a Swift Package Manager based setup.
- Stabilized build and test workflows by tightening dependency overrides and related test configuration.
