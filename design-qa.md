# Design QA

- source: `/Users/ag/.codex/generated_images/019fafd1-7878-7523-84a7-3235a552eb02/exec-a73e2268-eecb-4c89-8742-90b615d6bfe8.png`
- implementation: `http://127.0.0.1:4193/?departure=HONDO_SHICHIRUI&arrival=SAIGO&date=2026-08-11`
- viewport: mobile 390 × 844 CSS px / desktop 1280 × 900 CSS px
- source pixels: 853 × 1859 px
- implementation pixels: 390 × 844 px（mobile capture）
- density normalization: source and implementation were compared after scaling to the same 390 × 844 canvas
- state: 本土（七類）→島後（西郷）、2026-08-11、車両なし、地図非表示、横長バナー広告あり
- full comparison evidence: `/tmp/ferry-ad-design-comparison.png`
- focused comparison evidence: `/tmp/ferry-ad-focus-comparison.png`

## Findings

- 広告枠は選択案どおり、車両選択の直後かつ地図・時刻表の直前に配置されている。
- テキスト、横長バナー、画像の3形式は、別々の固定枠を設けず同一コンポーネント内で切り替わる。
- 横長バナーは4:1を維持し、mobileではコンテンツ幅、desktopではページ最大幅に追従する。
- 「広告」ラベルを常時表示し、広告であることを判別できる。
- 204、取得失敗、不正レスポンス、画像読み込み失敗では枠ごと非表示になり、空白を残さない。
- 実広告の内容は配信データにより変動するため、画像そのものの一致は対象外。配置、比率、余白、階層を比較対象とした。
- ローカル静的プレビューに表示される時刻表取得エラーは、既存の外部データ接続環境によるもので広告実装とは無関係。

## Comparison history

1. P1: `AdSlot` が自動登録名と一致せず未解決だった。ページで明示 import し、広告枠が描画されることを再確認した。
2. P2: 開発用オーバーレイが比較を妨げた。production相当の静的ビルドへ切り替えて再撮影した。
3. 最終比較: mobile 390 × 844 と desktop 1280 × 900 で、配置、レスポンシブ幅、4:1比率、地図表示切替後のレイアウト維持を確認した。広告枠に未解決の P0 / P1 / P2 はない。

final result: passed
