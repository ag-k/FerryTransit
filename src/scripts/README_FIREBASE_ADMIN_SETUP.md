# Firebase Admin SDK セットアップガイド

このガイドでは、Firebase Admin SDKの環境変数設定方法を説明します。

## 1. サービスアカウントキーの取得

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクトを選択
3. 左メニューの歯車アイコン → 「プロジェクトの設定」をクリック
4. 「サービスアカウント」タブを選択
5. 「新しい秘密鍵の生成」ボタンをクリック
6. JSONファイルがダウンロードされます（例：`your-project-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`）

## 2. 環境変数の設定

### 方法1: JSON文字列として設定（本番環境推奨）

1. ダウンロードしたJSONファイルを1行に変換：

   **macOS:**
   ```bash
   cat your-project-firebase-adminsdk-xxxxx-xxxxxxxxxx.json | jq -c . | pbcopy
   ```

   **Linux:**
   ```bash
   cat your-project-firebase-adminsdk-xxxxx-xxxxxxxxxx.json | jq -c . | xclip -selection clipboard
   ```

   **Windows (PowerShell):**
   ```powershell
   Get-Content your-project-firebase-adminsdk-xxxxx-xxxxxxxxxx.json | ConvertFrom-Json | ConvertTo-Json -Compress | Set-Clipboard
   ```

   **jqがインストールされていない場合:**
   ```bash
   # macOS
   brew install jq

   # Ubuntu/Debian
   sudo apt-get install jq

   # その他
   # https://stedolan.github.io/jq/download/
   ```

2. `.env`ファイルに設定：
   ```env
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```

### 方法2: ファイルパスとして設定（開発環境）

1. サービスアカウントキーを安全な場所に保存
2. `.env`ファイルに設定：
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
   ```

## 3. Cloud Functionsへの環境変数設定

### ローカル開発環境

1. `src/functions/.env`ファイルを作成：
   ```bash
   cd src/functions
   cp .env.example .env
   ```

2. `.env`ファイルを編集して値を設定

### 本番環境（Firebase Functions）

Firebase Functionsの環境変数は、デプロイ時に自動的に設定されます：

```bash
# プロジェクトディレクトリで実行
firebase functions:config:set \
  app.name="FerryTransit" \
  app.env="production"

# 設定の確認
firebase functions:config:get

# デプロイ
firebase deploy --only functions
```

## 4. セキュリティに関する注意事項

### ⚠️ 重要な注意事項

1. **絶対にGitにコミットしない**
   - `.env`ファイル
   - サービスアカウントキーのJSONファイル
   - これらは`.gitignore`に追加済み

2. **環境変数の管理**
   - 本番環境では環境変数管理サービス（Vercel、Netlify等）を使用
   - CICDでは、シークレット管理機能を使用

3. **アクセス権限の制限**
   - サービスアカウントには必要最小限の権限のみ付与
   - 定期的に権限を見直す

## 5. トラブルシューティング

### エラー: "FIREBASE_SERVICE_ACCOUNT environment variable is not set"

環境変数が正しく設定されていません。以下を確認：
- `.env`ファイルが存在するか
- 環境変数名が正しいか
- JSON形式が正しいか（1行になっているか）

### エラー: "Invalid FIREBASE_SERVICE_ACCOUNT configuration"

JSONの形式が正しくありません。以下を確認：
- JSONが適切にエスケープされているか
- 改行文字が`\n`として含まれているか
- クォートが正しく閉じられているか

### エラー: "Permission denied"

サービスアカウントの権限が不足しています：
1. Firebase Consoleでサービスアカウントの権限を確認
2. 必要な権限：
   - Firebase Admin SDK Administrator
   - Cloud Storage Admin（Storage操作用）

## 6. 参考リンク

- [Firebase Admin SDK セットアップ](https://firebase.google.com/docs/admin/setup)
- [Firebase Functions 環境設定](https://firebase.google.com/docs/functions/config-env)
- [サービスアカウントのベストプラクティス](https://cloud.google.com/iam/docs/best-practices-for-securing-service-accounts)