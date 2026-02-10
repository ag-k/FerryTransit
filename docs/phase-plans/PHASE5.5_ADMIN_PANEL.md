# フェーズ 5.5 - 管理画面実装

## 実装スケジュール（合計: 約8-10日）

| タスク | 期間 | 優先度 |
|--------|------|--------|
| 管理者認証・権限管理システム | 2日 | 高 |
| 管理画面のダッシュボード実装 | 2日 | 高 |
| フェリーデータ管理機能 | 2-3日 | 高 |
| ユーザー管理機能 | 1-2日 | 中 |
| お知らせ・アラート管理システム | 1-2日 | 中 |
| データエクスポート・インポート機能 | 1日 | 中 |
| 管理画面用UIコンポーネント | 1日 | 中 |
| 管理画面機能のユニットテスト実装 | 1-2日 | 低 |

## 機能要件

### 5.5.1 管理者認証・権限管理（Firebase Authentication）
- **ログイン機能**: 
  - Firebase Authenticationを使用した管理者認証
  - メールアドレス/パスワードによるログイン
  - 管理者専用のログイン画面
  - 2段階認証の推奨
- **権限管理**: 
  - Firebase Custom Claimsを使用した権限レベル管理
  - 管理者レベル（スーパー管理者、一般管理者）
  - Firestoreの管理者コレクションと連携
- **セッション管理**: 
  - Firebase Authの自動トークン更新
  - カスタム設定による自動ログアウト
  - セッション期限の管理
- **セキュリティ**: 
  - Firebase Authによる安全な認証
  - ログイン試行制限（Firebase Security Rules）
  - 管理者アカウントの承認制（新規登録は無効化）

### 5.5.2 管理画面ダッシュボード
- **統計情報**: 
  - 日次・月次アクセス数
  - 人気の航路ランキング
  - お気に入り登録数統計
  - 検索履歴分析
- **リアルタイム情報**:
  - 現在のアクティブユーザー数
  - システム稼働状況
  - 最新のエラーログ

### 5.5.3 フェリーデータ管理
- **時刻表管理**: 
  - 時刻表の追加・編集・削除
  - 運航スケジュールの一括更新
  - 特別ダイヤの設定
- **料金管理**:
  - 料金表の編集
  - 繁忙期料金の設定
  - 割引料金の管理
- **運航状況管理**:
  - 運航アラートの作成・編集
  - 運休情報の管理
  - 遅延情報の更新

### 5.5.4 ユーザー管理機能
- **アクセス解析**:
  - ユーザーの利用パターン分析
  - 地域別アクセス統計
  - デバイス別利用状況
- **お気に入り統計**:
  - 人気の航路分析
  - お気に入り登録傾向
  - 利用頻度の高い港統計

### 5.5.5 お知らせ・アラート管理
- **お知らせ管理**:
  - お知らせの作成・編集・削除
  - 公開期間の設定
  - 重要度の設定
- **アラート管理**:
  - 運航アラートの管理
  - 緊急告知の配信
  - 多言語対応のメッセージ管理

### 5.5.6 データ管理機能
- **エクスポート機能**:
  - 時刻表データのCSV出力
  - 利用統計のExcel出力
  - FirestoreデータのJSONバックアップ
  - Firebase Storageへの一括アップロード
- **インポート機能**:
  - 時刻表データの一括インポート（CSV → Firestore）
  - 料金データの更新（JSON → Firestore）
  - 祝日データの更新（JSON → Firestore）
- **公開管理**:
  - プレビュー機能（変更内容の確認）
  - 承認ワークフロー（変更の承認プロセス）
  - 公開処理（Firestore → Firebase Storage）
  - 公開履歴の管理
  - ロールバック機能

## 新規作成ファイル（フェーズ5.5）

```
src/
├── pages/
│   └── admin/
│       ├── index.vue              # 管理画面ダッシュボード
│       ├── login.vue              # 管理者ログイン
│       ├── timetable.vue          # 時刻表管理
│       ├── fare.vue               # 料金管理
│       ├── alerts.vue             # アラート管理
│       ├── announcements.vue      # お知らせ管理
│       ├── users.vue              # ユーザー管理
│       └── data-management.vue    # データ管理
├── components/
│   └── admin/
│       ├── AdminLayout.vue        # 管理画面レイアウト
│       ├── AdminSidebar.vue       # サイドバーナビゲーション
│       ├── AdminHeader.vue        # ヘッダー
│       ├── DashboardCard.vue      # ダッシュボードカード
│       ├── DataTable.vue          # データテーブル
│       ├── FormModal.vue          # フォームモーダル
│       ├── StatisticsChart.vue    # 統計グラフ
│       └── AdminFormComponents.vue # フォーム部品
├── stores/
│   ├── admin.ts                   # 管理機能ストア
│   ├── auth.ts                    # 認証ストア
│   └── analytics.ts               # 分析データストア
├── composables/
│   ├── useAdminAuth.ts           # Firebase Auth管理者認証
│   ├── useAdminPermissions.ts    # Custom Claims権限管理
│   ├── useAnalytics.ts           # 分析機能
│   ├── useDataManagement.ts      # データ管理
│   ├── useAdminFirestore.ts      # 管理データのFirestore操作
│   └── useDataPublish.ts         # Firebase Storageへのデータ公開
├── types/
│   ├── admin.ts                   # 管理機能の型定義
│   ├── auth.ts                    # 認証の型定義
│   └── analytics.ts               # 分析データの型定義
├── middleware/
│   └── admin.ts                   # 管理者権限チェック
└── server/
    └── api/
        └── admin/
            ├── auth.ts            # 認証API
            ├── analytics.ts       # 分析API
            ├── timetable.ts       # 時刻表管理API
            ├── fare.ts            # 料金管理API
            └── announcements.ts   # お知らせ管理API
```

## 技術仕様

### 認証・セキュリティ（Firebase Authentication）
- **Firebase認証**:
  - Firebase AuthenticationのIDトークンを使用
  - サーバーサイドでのトークン検証
  - Custom Claimsによる管理者権限の付与
- **役割ベースアクセス制御**:
  - Firebase Custom Claims（admin: true, role: 'super' | 'general'）
  - Firestore Security Rulesによるアクセス制御
  - クライアント側のルートガード（middleware）
- **セキュリティ対策**:
  - Firebase Security Rulesによるデータ保護
  - Admin SDKを使用したサーバーサイド処理
  - HTTPS必須、XSS対策の実装
  - 管理者操作のログ記録（Firestore）

### データ保存設計

#### Firestore（管理データ）
管理画面で扱う以下のデータはFirestoreに保存します：

- **管理者コレクション（admins）**: 管理者情報、権限レベル
- **ログコレクション（logs）**: アクセスログ、操作ログ
- **お知らせコレクション（announcements）**: お知らせ情報、公開期間
- **アラートコレクション（alerts）**: 運航アラート、緊急告知
- **統計コレクション（analytics）**: アクセス統計、利用状況データ
- **設定コレクション（settings）**: システム設定、運用パラメータ

#### Firebase Storage（配信データ）
ユーザーに配信する以下のデータはFirebase Storageに保存します：

- **時刻表データ（/data/timetable.json）**: ユーザー向け時刻表JSON
- **料金マスターデータ（/data/fare-master.json）**: 料金表JSON
- **祝日データ（/data/holidays.json）**: 祝日カレンダーJSON
- **画像ファイル（/images/）**: 船舶画像、港画像など
- **バックアップデータ（/backups/）**: データのバックアップファイル

### データ同期フロー
1. **管理画面での編集**: Firestoreの管理データを更新
2. **公開処理**: 承認されたデータをJSONに変換してFirebase Storageにアップロード
3. **ユーザーアプリ**: Firebase StorageからJSONをダウンロードして表示
4. **キャッシュ**: ユーザー側でLocalStorageにキャッシュして高速化

### API設計
- **RESTful API**: 標準的なREST APIの実装
- **GraphQL対応**: 複雑なクエリに対応
- **レート制限**: API呼び出し制限の実装
- **ログ記録**: すべてのAPI呼び出しをログ記録

## UI/UX設計

### 管理画面のデザイン
- **レスポンシブデザイン**: デスクトップ・タブレット対応
- **ダークモード対応**: 管理者の作業環境に配慮
- **アクセシビリティ**: キーボードナビゲーション完全対応
- **一貫性**: ユーザー向け画面との統一感

### コンポーネント設計
- **再利用可能**: 共通コンポーネントの活用
- **カスタマイズ性**: 管理者のニーズに合わせた設定
- **パフォーマンス**: 大量データの効率的な表示
- **エラーハンドリング**: 適切なエラーメッセージ表示

## 管理者アカウントの初期設定

### Firebase Consoleでの設定
1. **Authentication有効化**: Firebase ConsoleでAuthenticationを有効化
2. **初期管理者作成**: Firebase Consoleで最初の管理者アカウントを作成
3. **Custom Claims設定**: Firebase Admin SDKで管理者権限を付与
   ```javascript
   // 例：Cloud Functionsでの設定
   admin.auth().setCustomUserClaims(uid, {
     admin: true,
     role: 'super'
   });
   ```
4. **新規登録無効化**: 一般ユーザーの登録を防ぐため、サインアップを無効化

### Firestore Security Rules
```javascript
// 管理者のみがアクセス可能なルール例
match /admin/{document=**} {
  allow read, write: if request.auth != null 
    && request.auth.token.admin == true;
}
```

これにより、フェーズ5.5完了後は完全な管理機能を備えたシステムとなり、フェーズ6（Capacitor統合・ネイティブアプリ化）への準備が整います。