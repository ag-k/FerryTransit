# 管理画面機能仕様書

## 概要

隠岐航路案内の管理画面は、管理者が時刻表・料金・アラート・お知らせなどのデータを管理し、Firebase Storage に公開するためのシステムです。Firebase Authentication による認証と、カスタムクレームによる権限管理を実装しています。

## 認証・権限管理

### 認証方式

**Firebase Authentication**
- メールアドレス/パスワードによるログイン
- カスタムクレームによる権限管理
- トークンの自動更新

### 権限レベル

```typescript
interface AdminUser {
  uid: string
  email: string
  displayName?: string
  customClaims: {
    admin: boolean        // 管理者フラグ
    role: 'super' | 'general'  // スーパー管理者 or 一般管理者
  }
}
```

**権限の種類：**
- **スーパー管理者（super）**
  - すべての機能にアクセス可能
  - 管理者アカウントの管理
  - システム設定の変更
  - 全データの削除

- **一般管理者（general）**
  - データ管理（時刻表・料金・アラート・お知らせ）
  - データ公開
  - アナリティクスの閲覧
  - システム設定の閲覧（一部変更可能）

### セキュリティ

**ミドルウェア（`/middleware/admin.ts`）**
- ネイティブアプリからのアクセスを禁止
- 認証状態の確認
- 権限チェック

**Firestore セキュリティルール**
```javascript
match /news/{newsId} {
  allow read: if resource.data.status == 'published' || isAdmin();
  allow create, update, delete: if isAdmin();
}
```

## 機能一覧

### 1. ダッシュボード（`/admin`）

**表示項目：**
- 統計情報（アクセス数、人気ルートなど）
- リアルタイム情報（アクティブユーザー数など）
- 最新のアラート・お知らせ
- システム稼働状況

### 2. 時刻表管理（`/admin/timetable`）

**機能：**
- 時刻表データの一覧表示
- 時刻表の追加・編集・削除
- CSV インポート
- 日付範囲の設定
- 連続便（nextId）の設定
- データ公開（Firebase Storage への反映）

**データ構造：**
```typescript
interface TimetableEntry {
  tripId: number
  startDate: string      // YYYY-MM-DD
  endDate: string        // YYYY-MM-DD
  name: string           // 船舶名
  departure: string      // 出発港コード
  arrival: string        // 到着港コード
  departureTime: string   // HH:mm
  arrivalTime: string    // HH:mm
  nextId?: number        // 次の便ID
  status: number         // 運航状況
}
```

### 3. 料金管理（`/admin/fare`）

**機能：**
- 料金マスターデータの編集
- ルート別料金の設定
- 座席等級料金の設定
- 車両料金の設定
- 割引の設定
- バージョン管理（適用開始日の設定）
- データ公開

**データ構造：**
- `FareMaster` インターフェース（`FARE_CALCULATION.md` 参照）

### 4. アラート管理（`/admin/alerts`）

**機能：**
- 運航アラートの作成・編集・削除
- アクティブなアラートの一覧表示
- アラート履歴の表示
- データ公開

**入力項目：**
- 船舶（ISOKAZE、FERRY_DOZEN、フェリーおき、レインボージェット）
- 航路
- ステータス（遅延、欠航、時間変更、臨時便）
- 概要（日本語・英語）
- コメント（日本語・英語）
- 開始日・終了日
- 重要度（低・中・高）

### 5. お知らせ管理（`/admin/news`）

**機能：**
- お知らせの作成・編集・削除
- カテゴリー別フィルタリング
- ステータス管理（下書き・公開・予約・アーカイブ）
- 予約投稿の自動公開
- データ公開

**詳細は `NEWS_SYSTEM.md` を参照**

### 6. データ管理（`/admin/data-management`）

**機能：**
- データのエクスポート（Firestore → JSON）
- データのインポート（JSON → Firestore）
- データ公開（Firestore → Firebase Storage）
- バックアップの作成・復元

**公開データ：**
- `timetable.json`: 時刻表データ
- `fare-master.json`: 料金マスターデータ
- `holidays.json`: 祝日データ
- `alerts.json`: アラートデータ
- `news.json`: お知らせデータ（公開中のみ）

### 7. ユーザー管理（`/admin/users`）

**権限：スーパー管理者のみ**

**機能：**
- 管理者アカウントの一覧表示
- 管理者アカウントの追加・編集・削除
- 権限レベルの変更
- アカウントの有効/無効化

### 8. アナリティクス（`/admin/analytics`）

**機能：**
- アクセス統計の表示
- 人気ルートの分析
- 検索履歴の分析
- エラーログの表示

### 9. 設定（`/admin/settings`）

**機能：**
- システム設定の変更
- API キーの管理
- 通知設定
- データ更新間隔の設定

## 実装詳細

### Store: `useAuthStore`

```typescript
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isLoading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    isAdmin: (state) => state.user?.customClaims?.admin === true,
    isSuperAdmin: (state) => state.user?.customClaims?.role === 'super'
  },
  
  actions: {
    async login(credentials: LoginCredentials): Promise<AdminUser>
    async logout(): Promise<void>
    async checkAuth(): Promise<void>
  }
})
```

### Composable: `useAdminAuth`

```typescript
export const useAdminAuth = () => {
  const login = async (credentials: LoginCredentials): Promise<User>
  const logout = async (): Promise<void>
  const getCurrentUser = (): Promise<User | null>
  const isAdmin = async (user: User): Promise<boolean>
  const getAdminRole = async (user: User): Promise<string | null>
  const refreshToken = async (): Promise<void>
}
```

### Composable: `useAdminPermissions`

```typescript
export const useAdminPermissions = () => {
  const hasPermission = (permission: string): boolean
  const canAccess = (resource: string): boolean
  const getUserRole = (): string
  const isSuperAdmin = (): boolean
  const isGeneralAdmin = (): boolean
}
```

### Composable: `useDataPublish`

```typescript
export const useDataPublish = () => {
  const publishData = async (
    dataType: 'timetable' | 'fare' | 'alerts' | 'news' | 'holidays',
    data: any
  ): Promise<void>
  
  const publishAllData = async (): Promise<void>
  const getStorageDownloadURL = (filename: string): Promise<string | null>
}
```

## データフロー

### データ公開フロー

```
管理画面でデータ編集
    ↓
Firestore に保存
    ↓
「データ公開」ボタンをクリック
    ↓
useDataPublish.publishData()
    ↓
Firestore からデータを取得
    ↓
公開用データに変換（不要なフィールドを削除など）
    ↓
Firebase Storage にアップロード
    ↓
ユーザーは Storage から読み込み
```

### 認証フロー

```
ログイン画面（/admin/login）
    ↓
メールアドレス/パスワード入力
    ↓
Firebase Authentication で認証
    ↓
カスタムクレームを確認
    ↓
管理者権限がある場合のみログイン成功
    ↓
管理画面にアクセス
```

## セキュリティ考慮事項

1. **認証**
   - Firebase Authentication による安全な認証
   - カスタムクレームによる権限管理
   - トークンの自動更新

2. **アクセス制御**
   - ミドルウェアによる認証チェック
   - 権限に応じた機能の制限
   - ネイティブアプリからのアクセス禁止

3. **データ保護**
   - Firestore セキュリティルール
   - Storage セキュリティルール
   - 管理者操作のログ記録

## エラーハンドリング

- 認証エラー：ログインページにリダイレクト
- 権限エラー：403 エラーを表示
- データ保存エラー：エラーメッセージを表示
- ネットワークエラー：リトライ機能

## 多言語対応

- 管理画面のUIは日本語のみ（将来的に英語対応も検討）
- データの内容（お知らせ・アラート）は多言語対応

## 関連機能

- **お知らせ機能**: 管理画面からお知らせを作成・管理
- **運航状況**: 管理画面からアラートを作成・管理
- **データ公開**: 管理画面からデータを公開





