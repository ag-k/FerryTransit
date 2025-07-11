# Cloud Build エラーの解決方法

## エラーの詳細

すべてのFirebase Functions のデプロイで以下のエラーが発生：
```
Build failed with status: FAILURE and message: An unexpected error occurred
```

## 調査結果

1. **環境変数の問題ではない**: `ADMIN_SERVICE_ACCOUNT` を削除済み
2. **コードの問題ではない**: シンプルなテスト関数でも同じエラー
3. **プロジェクトレベルの設定問題**: Cloud Build の設定に問題がある

## 解決方法

### 1. Firebase Console での確認

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクト「oki-ferryguide」を選択
3. 左メニューの「Functions」を確認
4. 「プロジェクトの設定」> 「全般」で課金が有効か確認

### 2. Google Cloud Console での確認

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクト「oki-ferryguide」を選択
3. 以下を確認：
   - **課金アカウント**: 「課金」メニューで有効になっているか
   - **Cloud Build API**: 「APIとサービス」で有効か
   - **Artifact Registry**: 「Artifact Registry」でリポジトリが作成されているか

### 3. Cloud Build の設定をリセット

```bash
# Cloud Build のキャッシュをクリア
gcloud builds list --limit=10 --filter="status=FAILURE"

# Artifact Registry のクリーンアップ
gcloud artifacts repositories list --location=asia-northeast1

# もしリポジトリが存在する場合、削除して再作成
# gcloud artifacts repositories delete gcf-artifacts --location=asia-northeast1
```

### 4. Firebase プロジェクトの再初期化

```bash
# 現在のディレクトリで
cd /Users/ag/works/FerryTransit

# Firebase プロジェクトを再選択
firebase use --clear
firebase use oki-ferryguide

# Functions を再初期化（既存のコードは保持）
firebase init functions
# 既存のファイルを上書きしないよう注意
```

### 5. 手動でのCloud Run サービス作成

エラーメッセージに「Cloud Run service was not found」とある場合：

```bash
# Cloud Run サービスを手動で作成
gcloud run deploy gettimetabledata \
  --region=asia-northeast1 \
  --platform=managed \
  --allow-unauthenticated
```

### 6. 最小限のデプロイテスト

```bash
cd src/functions

# 最小限の関数でテスト
cat > src/hello.ts << 'EOF'
export const helloWorld = require('firebase-functions').https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});
EOF

# index.ts を一時的に変更
cp src/index.ts src/index.ts.backup
echo "export * from './hello'" > src/index.ts

# デプロイ
npm run deploy
```

### 7. 既知の問題と対処法

#### A. Region の問題
- `asia-northeast1` でエラーが出る場合、`us-central1` でテスト
- firebase.json から `"runtime": "nodejs18"` を削除

#### B. 権限の問題
```bash
# プロジェクトオーナー権限を確認
gcloud projects get-iam-policy oki-ferryguide \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

#### C. Cloud Build サービスアカウントの再作成
```bash
# サービスアカウントを確認
gcloud iam service-accounts list

# Cloud Build サービスアカウントに権限を再付与
PROJECT_NUMBER=$(gcloud projects describe oki-ferryguide --format="value(projectNumber)")
gcloud projects add-iam-policy-binding oki-ferryguide \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder" \
  --condition=None
```

## 推奨される次のステップ

1. **Firebase サポートに連絡**
   - エラーログのURLを提供
   - プロジェクトIDを伝える

2. **新しいプロジェクトでテスト**
   - 新しいFirebaseプロジェクトを作成
   - 同じコードをデプロイしてみる

3. **ローカルエミュレータの使用**
   ```bash
   firebase emulators:start --only functions
   ```

## 回避策

Cloud Functions のデプロイができない間は：

1. **Firebase Hosting + Cloud Run を使用**
2. **Vercel Functions や Netlify Functions を使用**
3. **ローカルエミュレータで開発を継続**

## 関連リンク

- [Cloud Build トラブルシューティング](https://cloud.google.com/build/docs/troubleshooting)
- [Firebase Functions デプロイエラー](https://firebase.google.com/docs/functions/troubleshooting)
- [Cloud Run サービスの手動作成](https://cloud.google.com/run/docs/deploying)