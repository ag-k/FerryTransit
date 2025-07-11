# Cloud Build権限エラーの解決方法

Firebase Functions v2のデプロイ時に「missing permission on the build service account」エラーが発生した場合の解決方法です。

## エラーの原因

Firebase Functions v2では、Cloud BuildサービスアカウントにCloud Run、Eventarc、Pub/Subなどの追加権限が必要です。

## 解決方法

### 方法1: 自動修正スクリプトの実行（推奨）

```bash
# スクリプトを実行
./src/scripts/fix-cloud-build-permissions.sh
```

### 方法2: 手動で権限を付与

1. **プロジェクト番号を確認**
   ```bash
   gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
   ```

2. **必要な権限を付与**
   ```bash
   # PROJECT_NUMBERを実際の値に置き換えてください
   PROJECT_ID=YOUR_PROJECT_ID
   PROJECT_NUMBER=YOUR_PROJECT_NUMBER
   BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
   
   # Cloud Functions Developer
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/cloudfunctions.developer"
   
   # Service Account User
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/iam.serviceAccountUser"
   
   # Cloud Run Admin
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/run.admin"
   
   # Eventarc Developer
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/eventarc.developer"
   
   # Pub/Sub Admin
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/pubsub.admin"
   
   # Storage Admin
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/storage.admin"
   
   # Artifact Registry Writer
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/artifactregistry.writer"
   ```

3. **デフォルトサービスアカウントにも権限を付与**
   ```bash
   DEFAULT_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
   
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${DEFAULT_SA}" \
     --role="roles/iam.serviceAccountTokenCreator"
   ```

### 方法3: Firebase Console から設定

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクトを選択
3. 左メニューの歯車アイコン → 「プロジェクトの設定」
4. 「サービスアカウント」タブを選択
5. 「Google Cloud Console で管理」をクリック
6. IAM & 管理 → IAM に移動
7. 以下のサービスアカウントを見つける：
   - `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`
   - `PROJECT_NUMBER-compute@developer.gserviceaccount.com`
8. 上記の権限を付与

## 権限の説明

| ロール | 説明 |
|--------|------|
| Cloud Functions Developer | Functions の作成・更新・削除 |
| Service Account User | サービスアカウントとしての実行権限 |
| Cloud Run Admin | Functions v2 の基盤となる Cloud Run の管理 |
| Eventarc Developer | イベントトリガーの設定 |
| Pub/Sub Admin | スケジュール関数の設定 |
| Storage Admin | Cloud Storage へのアクセス |
| Artifact Registry Writer | コンテナイメージの保存 |
| Service Account Token Creator | サービスアカウントのトークン生成 |

## 確認方法

権限が正しく設定されているか確認：

```bash
# Cloud Buildサービスアカウントの権限を確認
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:PROJECT_NUMBER@cloudbuild.gserviceaccount.com"
```

## トラブルシューティング

1. **権限の反映に時間がかかる場合**
   - 権限の変更が反映されるまで数分かかることがあります
   - 5分程度待ってから再度デプロイを試してください

2. **組織ポリシーによる制限**
   - 組織レベルでポリシーが設定されている場合は、組織管理者に相談してください

3. **既存の関数がある場合**
   - 既存の関数を削除してから再デプロイすることで解決する場合があります
   ```bash
   firebase functions:delete FUNCTION_NAME
   ```

## 関連リンク

- [Firebase Functions v2 ドキュメント](https://firebase.google.com/docs/functions/beta)
- [Cloud Build トラブルシューティング](https://cloud.google.com/functions/docs/troubleshooting#build-service-account)
- [IAM ロールリファレンス](https://cloud.google.com/iam/docs/understanding-roles)