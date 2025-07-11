# Firebase Functions 環境変数エラーの修正方法

## 問題の概要

Cloud Functions のビルドエラーが発生している原因は、環境変数に大きなサービスアカウントの秘密鍵が含まれているためです。

### エラーの原因

1. **環境変数のサイズ制限**: Cloud Functions の環境変数は最大32KBまで
2. **セキュリティリスク**: 秘密鍵を環境変数に含めるのは推奨されない
3. **ビルドエラー**: 大きな環境変数がCloud Buildプロセスを妨害

## 修正方法

### 1. 環境変数からサービスアカウントを削除

現在の `.env` ファイルから `ADMIN_SERVICE_ACCOUNT` を削除します：

```bash
cd src/functions

# .envファイルをバックアップ
cp .env .env.backup

# .envファイルを編集して ADMIN_SERVICE_ACCOUNT 行を削除
# または、以下のコマンドで削除
grep -v "ADMIN_SERVICE_ACCOUNT" .env > .env.tmp && mv .env.tmp .env
```

### 2. Firebase Functions のデフォルト認証を使用

Firebase Functions は自動的に Application Default Credentials (ADC) を使用します。
追加の設定は不要です。

現在の `src/functions/src/index.ts` は既に正しく設定されています：
```typescript
import * as admin from 'firebase-admin'

// ADCを使用して自動的に認証
admin.initializeApp()
```

### 3. ローカル開発環境の設定

ローカルで開発する場合のみ、サービスアカウントキーファイルを使用：

1. **サービスアカウントキーをダウンロード**
   - Firebase Console > プロジェクトの設定 > サービスアカウント
   - 「新しい秘密鍵の生成」をクリック
   - JSONファイルを安全な場所に保存

2. **環境変数を設定**（ローカル開発時のみ）
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

3. **または .env ファイルに追加**
   ```env
   # ローカル開発用
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

### 4. 再デプロイ

環境変数を修正後、再デプロイ：

```bash
cd src/functions

# ビルドして確認
npm run build

# デプロイ
npm run deploy
```

### 5. 既存の関数をクリーンアップ（必要な場合）

もしまだエラーが出る場合は、既存の関数を削除してから再デプロイ：

```bash
# すべての関数を削除
firebase functions:delete --force

# 再デプロイ
npm run deploy
```

## ベストプラクティス

### ✅ 推奨される方法

1. **本番環境**: Application Default Credentials を使用（自動設定）
2. **ローカル開発**: `GOOGLE_APPLICATION_CREDENTIALS` でファイルパスを指定
3. **CI/CD環境**: Secret Manager を使用

### ❌ 避けるべき方法

1. 環境変数にサービスアカウントのJSONを直接含める
2. ソースコードにサービスアカウント情報をハードコード
3. .envファイルをGitにコミット

## トラブルシューティング

### 権限エラーが出る場合

```bash
# デフォルト認証を再設定
gcloud auth application-default login

# プロジェクトを設定
gcloud config set project oki-ferryguide
```

### ビルドエラーが続く場合

1. **Cloud Build のログを確認**
   ```bash
   gcloud builds list --limit=5
   gcloud builds log <BUILD_ID>
   ```

2. **Functions のログを確認**
   ```bash
   firebase functions:log
   ```

3. **環境変数のサイズを確認**
   ```bash
   # .env ファイルのサイズを確認
   wc -c src/functions/.env
   ```

## 関連リンク

- [Firebase Admin SDK の初期化](https://firebase.google.com/docs/admin/setup)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Cloud Functions 環境変数](https://cloud.google.com/functions/docs/configuring/env-var)