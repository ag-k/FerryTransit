# 単体テスト実装レポート

## 概要

Nuxt3プロジェクトにVitestを使用した単体テスト環境を構築し、主要なコンポーネント、ストア、コンポーザブルのテストを実装しました。

## テスト環境

### 使用技術
- **Vitest**: 高速なViteベースのテストランナー
- **@vue/test-utils**: Vueコンポーネントのテストユーティリティ
- **@testing-library/vue**: より直感的なテストAPI
- **happy-dom**: 軽量なDOM実装
- **@pinia/testing**: Piniaストアのテストヘルパー

### ディレクトリ構成
```
test/
├── setup.ts                 # テスト環境のセットアップ
├── mocks/
│   ├── nuxt.ts             # Nuxtの自動インポートのモック
│   └── mockData.ts         # テスト用モックデータ
└── unit/
    ├── stores/             # ストアのテスト
    ├── composables/        # コンポーザブルのテスト
    └── components/         # コンポーネントのテスト
```

## 実装したテスト

### 1. ストアのテスト

#### ferry.test.ts
- 初期状態の検証
- データ取得アクション（時刻表、運航状況）
- 出発地・到着地の設定
- LocalStorageとの連携
- キャッシュ機能

#### ui.test.ts
- ローディング状態の管理
- アラート管理（追加、削除、クリア）
- モーダル表示制御
- タブ切り替え

### 2. コンポーザブルのテスト

#### useRouteSearch.test.ts
- 直行便の検索
- 乗換便の検索（最大1回乗換）
- 特殊港（本土）の処理
- 時刻モード（出発・到着）の切り替え
- 運航状況によるフィルタリング
- 料金計算
- 時刻・時間のフォーマット

### 3. コンポーネントのテスト

#### DatePicker.test.ts
- 日付表示と変更
- 本日ボタンの動作
- 最小・最大日付の制限
- 無効化状態

#### PortSelector.test.ts
- 港の選択とグループ表示
- 選択変更イベント
- 特定港の無効化
- プレースホルダー表示

#### AlertComponent.test.ts
- アラートタイプの表示
- 閉じるボタンの動作
- 自動クローズ機能
- アニメーション

#### ShipModal.test.ts
- モーダルの表示/非表示
- 船舶画像・港情報の表示
- バックドロップクリック
- スロットコンテンツ
- body要素のスクロール制御

## テストのベストプラクティス

### 1. モックの活用
```typescript
// Nuxtの自動インポートをモック
global.useNuxtApp = () => ({
  $i18n: {
    t: (key: string) => key,
    locale: ref('ja')
  }
})
```

### 2. テストデータの再利用
```typescript
// 共通のモックデータを定義
export const mockTrips: Trip[] = [
  {
    tripId: 1,
    name: 'FERRY_OKI',
    // ...
  }
]
```

### 3. 非同期処理のテスト
```typescript
// fetchのモック
global.fetch = vi.fn().mockResolvedValueOnce({
  ok: true,
  json: async () => mockData
})
```

### 4. タイマーのテスト
```typescript
// Vitestのタイマーモック
vi.useFakeTimers()
vi.advanceTimersByTime(1000)
vi.useRealTimers()
```

## 課題と改善点

### 1. カバレッジの向上
- 現在のテストカバレッジは基本的な機能に限定
- エッジケースやエラーハンドリングのテスト追加が必要

### 2. E2Eテストの追加
- ユーザーフローの検証
- 実際のAPIとの連携テスト

### 3. パフォーマンステスト
- 大量データでのレンダリング性能
- メモリリークの検証

### 4. アクセシビリティテスト
- キーボードナビゲーション
- スクリーンリーダー対応

## テストコマンド

```bash
# テストの実行
npm test

# UIモードでテスト実行
npm run test:ui

# カバレッジレポート生成
npm run test:coverage
```

## 2. E2Eテスト環境

### 使用技術
- **Playwright**: 主要ブラウザでのE2Eテスト自動化

### ディレクトリ構成
```
src/tests/e2e/
├── home.spec.ts          # トップページの表示確認
```

### 設定ファイル
- `playwright.config.ts`
  - `webServer`: `npm run dev` を自動起動（CIでは自動再利用なし）
  - `use.baseURL`: `http://127.0.0.1:3000`（環境変数で上書き可）
  - マルチブラウザ（Chromium/Firefox/WebKit）での実行を定義

### 実行方法
```bash
npx playwright install     # 初回のみブラウザインストール
npm run test:e2e           # 全ブラウザでのE2Eテスト
npm run test:e2e -- --ui   # UIモード
```

## 今後の展開

1. **CI/CD連携**
   - GitHub Actionsでの自動テスト実行
   - プルリクエスト時のカバレッジチェック

2. **ビジュアルリグレッションテスト**
   - Storybookとの連携
   - スクリーンショットの差分検証

3. **統合テスト**
   - ページ間の遷移テスト
   - 実際のAPIエンドポイントとの連携

4. **モバイル対応テスト**
   - レスポンシブデザインの検証
   - タッチイベントのテスト