# 管理者アカウントの設定方法

このドキュメントでは、FerryTransit の管理画面にアクセスするための管理者アカウントの設定方法を説明します。

## 前提条件

1. **Firebase プロジェクトの設定**
   - Firebase Console でプロジェクトを作成済み
   - Firebase Authentication が有効化済み
   - Firestore Database が作成済み

2. **環境変数の設定**
   - `.env` ファイルに Firebase の認証情報を設定
   ```bash
   cp .env.example .env
   # .env ファイルを編集して Firebase の認証情報を入力
   ```

3. **Firebase Admin SDK のセットアップ**
   - Firebase Console > プロジェクトの設定 > サービスアカウント
   - 「新しい秘密鍵の生成」をクリックしてJSONファイルをダウンロード
   - 安全な場所に保存（Git にはコミットしないこと）

## 管理者アカウントの作成

### 方法1: setup-admin.js スクリプトを使用（推奨）

1. **環境変数の設定**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

2. **Firebase Admin SDK のインストール**
   ```bash
   cd src
   npm install firebase-admin
   ```

3. **スクリプトの実行**
   ```bash
   # デフォルト設定（一般管理者）
   node scripts/setup-admin.js

   # カスタム設定（スーパー管理者）
   node scripts/setup-admin.js superadmin@example.com MySecurePass123! super

   # ヘルプを表示
   node scripts/setup-admin.js --help
   ```

### 方法2: Firebase Console で手動設定

1. **ユーザーの作成**
   - Firebase Console > Authentication > ユーザー
   - 「ユーザーを追加」をクリック
   - メールアドレスとパスワードを入力

2. **Custom Claims の設定**
   - Cloud Functions または別のスクリプトで以下を実行：
   ```javascript
   await admin.auth().setCustomUserClaims(uid, {
     admin: true,
     role: 'super' // または 'general'
   });
   ```

## 権限レベル

### スーパー管理者（role: 'super'）
- すべての管理機能にアクセス可能
- 他の管理者アカウントの管理
- システム設定の変更
- データの完全削除

### 一般管理者（role: 'general'）
- 時刻表・料金データの管理
- お知らせ・アラートの管理
- データのエクスポート・インポート
- 統計情報の閲覧

## 管理画面へのアクセス

1. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

2. **管理画面へアクセス**
   - ブラウザで http://localhost:3030/admin/login を開く
   - 作成した管理者アカウントでログイン

## トラブルシューティング

### ログインできない場合

1. **Firebase の設定を確認**
   - `.env` ファイルの Firebase 認証情報が正しいか確認
   - Firebase Console で Authentication が有効になっているか確認

2. **Custom Claims の確認**
   ```javascript
   // Firebase Admin SDK で確認
   const user = await admin.auth().getUserByEmail('admin@example.com');
   console.log('Custom claims:', user.customClaims);
   ```

3. **ブラウザのコンソールでエラーを確認**
   - ネットワークエラー
   - 認証エラー
   - 権限エラー

### よくあるエラー

- **「管理者権限がありません」**
  - Custom Claims が正しく設定されていない
  - `admin: true` が設定されているか確認

- **「アカウントが見つかりません」**
  - メールアドレスが間違っている
  - アカウントが作成されていない

- **「パスワードが正しくありません」**
  - パスワードを再確認
  - Firebase Console でパスワードをリセット

## セキュリティの注意事項

1. **サービスアカウントキーの管理**
   - Git にコミットしない
   - 環境変数で管理
   - 本番環境では適切な権限設定

2. **パスワードポリシー**
   - 強力なパスワードを使用
   - 定期的な変更
   - 2段階認証の有効化（推奨）

3. **アクセスログの監視**
   - Firestore の `logs` コレクションで管理者の操作を記録
   - 不審なアクセスがないか定期的に確認

## 関連ファイル

- `/src/scripts/setup-admin.js` - 管理者設定スクリプト
- `/src/stores/auth.ts` - 認証ストア
- `/src/middleware/admin.ts` - 管理者権限チェック
- `/src/pages/admin/login.vue` - ログインページ