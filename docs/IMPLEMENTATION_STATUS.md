# FerryTransit 実装状況

最終更新: 2025年1月12日

## 概要

このドキュメントは、隠岐諸島フェリー時刻表アプリケーション（FerryTransit）の現在の実装状況をまとめたものです。AngularJS版からNuxt3版への移行プロジェクトは、Phase 5.5まで完了しています。

## 完了フェーズ

### Phase 1-3: 基盤構築（完了）
- ✅ Nuxt3プロジェクトのセットアップ
- ✅ ディレクトリ構造の確立
- ✅ 基本的なコンポーネント実装
- ✅ データ層（Pinia stores）の実装
- ✅ 国際化（日本語・英語）対応

### Phase 4: ビジネスロジック（完了）
- ✅ 経路検索アルゴリズム
- ✅ 料金計算ロジック
- ✅ 祝日・繁忙期判定
- ✅ 運航状況の統合
- ✅ オフライン対応

### Phase 5: UI/UX完成（完了）
- ✅ レスポンシブデザイン
- ✅ ダークモード対応
- ✅ アクセシビリティ対応
- ✅ パフォーマンス最適化
- ✅ PWA対応

### Phase 5.5: 管理画面実装（完了）
- ✅ Firebase Authentication統合
- ✅ 管理者ログイン機能
- ✅ 時刻表管理機能
- ✅ 料金管理機能
- ✅ アラート管理機能
- ✅ お知らせ管理機能
- ✅ ユーザー分析機能
- ✅ データ公開機能（Firebase Storage）
- ✅ ユニットテスト実装

## 技術スタック

### フロントエンド
- **フレームワーク**: Nuxt 3.17.5
- **UI**: Vue 3.5 + Composition API
- **スタイル**: Tailwind CSS v4.1.10
- **状態管理**: Pinia 2.4.0
- **国際化**: @nuxtjs/i18n 9.6

### バックエンド・インフラ
- **認証**: Firebase Authentication
- **データベース**: Firebase Firestore
- **ストレージ**: Firebase Storage
- **ホスティング**: Firebase Hosting
- **API**: Nuxt Server API

### モバイル対応
- **フレームワーク**: Capacitor 7.4.1
- **プラットフォーム**: iOS/Android（準備完了）

## 主要機能

### ユーザー向け機能
1. **時刻表表示**
   - 港間のフェリースケジュール
   - リアルタイム運航状況
   - カレンダー表示

2. **乗換案内**
   - 最適ルート検索
   - 複数経路の比較
   - 料金・所要時間表示

3. **運航状況**
   - リアルタイム更新
   - アラート表示
   - 多言語対応

4. **付加機能**
   - お気に入り登録
   - 検索履歴
   - オフライン対応
   - ダークモード

### 管理者向け機能
1. **データ管理**
   - 時刻表の編集・CSVインポート
   - 料金設定（通常・繁忙期・割引）
   - 運航アラート管理
   - お知らせ配信

2. **分析機能**
   - アクセス統計
   - 人気ルート分析
   - エラー監視
   - ユーザー行動分析

3. **公開機能**
   - Firebase Storageへのデータ公開
   - プレビュー機能
   - ロールバック機能

## ディレクトリ構造

```
FerryTransit/
├── src/                      # Nuxt3アプリケーション
│   ├── components/          # UIコンポーネント
│   ├── composables/         # コンポーザブル
│   ├── layouts/            # レイアウト
│   ├── middleware/         # ミドルウェア
│   ├── pages/              # ページコンポーネント
│   │   ├── admin/         # 管理画面
│   │   └── ...            # ユーザー画面
│   ├── plugins/            # プラグイン
│   ├── stores/             # Piniaストア
│   ├── server/             # サーバーAPI
│   └── test/               # テストファイル
├── docs/                    # ドキュメント
│   ├── phase-plans/        # フェーズ計画
│   ├── work-logs/          # 作業ログ
│   └── migration/          # 移行ドキュメント
└── archive/                 # AngularJS版（レガシー）
```

## Firebase設定

### Firestore コレクション
- `timetables`: 時刻表データ
- `fares`: 料金データ
- `peakPeriods`: 繁忙期設定
- `discounts`: 割引設定
- `alerts`: 運航アラート
- `news`: お知らせ
- `holidays`: 祝日データ
- `adminLogs`: 管理者操作ログ
- `publishHistory`: 公開履歴

### Storage 構造
```
/data/
  ├── timetable.json      # 時刻表データ
  ├── fare-master.json    # 料金マスター
  ├── holidays.json       # 祝日データ
  └── alerts.json         # アラートデータ
/preview/                 # プレビュー用
/backups/                 # バックアップ
```

### セキュリティルール
- Firestore: 読み取りは全ユーザー、書き込みは管理者のみ
- Storage: 公開データは読み取り可能、書き込みは管理者のみ

## ビルド・デプロイ

### 開発環境
```bash
cd src
npm run dev
```

### ビルド
```bash
npm run build
npm run preview
```

### Firebase デプロイ
```bash
# Hostingのみ
firebase deploy --only hosting

# ルールのデプロイ
firebase deploy --only firestore:rules,storage:rules

# 全体デプロイ
firebase deploy
```

### Capacitor ビルド（準備済み）
```bash
# iOS
npx cap sync ios
npx cap open ios

# Android
npx cap sync android
npx cap open android
```

## テスト

### ユニットテスト
```bash
npm run test:unit
```

### テストカバレッジ
- コンポーネント: 部分的にカバー
- コンポーザブル: 主要機能はカバー
- ストア: 基本機能はカバー
- 管理画面: テスト実装済み（実行には調整が必要）

## パフォーマンス

### Lighthouse スコア（目安）
- Performance: 90+
- Accessibility: 95+
- Best Practices: 100
- SEO: 100

### バンドルサイズ
- Client: ~2.13 MB (gzip: ~430 KB)
- 最適化: 動的インポート、コード分割実装済み

## 残作業

### Phase 6: Capacitor統合（未完了）
- 🔲 ネイティブ機能の完全実装
- 🔲 プッシュ通知
- 🔲 App Store/Google Play対応
- 🔲 ネイティブUIの最適化

### その他の改善項目
- 🔲 E2Eテストの実装
- 🔲 CI/CDパイプラインの構築
- 🔲 監視・ログシステムの強化
- 🔲 パフォーマンスの継続的改善

## 既知の問題

1. **テスト実行時のモック問題**
   - 一部のテストでモックの設定に調整が必要

2. **大量データ表示時のパフォーマンス**
   - 仮想スクロールの実装を検討

3. **オフライン時の同期**
   - より高度な同期メカニズムの実装を検討

## セキュリティ考慮事項

1. **認証・認可**
   - Firebase Authenticationによる管理者認証
   - カスタムクレームによる権限管理
   - セッション管理

2. **データ保護**
   - Firestoreルールによるアクセス制御
   - HTTPS通信
   - XSS対策実装済み

3. **管理者アクション**
   - 全操作のログ記録
   - 重要操作の確認ダイアログ

## 今後の展望

1. **機能拡張**
   - リアルタイムGPSトラッキング
   - 座席予約システム統合
   - 観光情報連携

2. **技術的改善**
   - GraphQL APIの検討
   - マイクロフロントエンド化
   - エッジコンピューティング活用

3. **ビジネス展開**
   - 他地域への展開
   - 多言語対応の拡充
   - アクセシビリティの更なる向上

## 連絡先・リソース

- **リポジトリ**: [GitHub](https://github.com/your-org/FerryTransit)
- **ドキュメント**: `/docs`ディレクトリ参照
- **Firebase Console**: [oki-ferryguide](https://console.firebase.google.com/project/oki-ferryguide)

---

このドキュメントは定期的に更新されます。最新の情報は作業ログ（`/docs/work-logs/`）を参照してください。