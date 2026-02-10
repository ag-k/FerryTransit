#!/bin/bash

# Cloud Build Service Account権限修正スクリプト
# Firebase Functions v2のデプロイに必要な権限を付与します

echo "=== Cloud Build Service Account権限修正スクリプト ==="
echo ""

# プロジェクトIDを取得
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "エラー: プロジェクトIDが設定されていません"
    echo "実行: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "プロジェクトID: $PROJECT_ID"
echo ""

# プロジェクト番号を取得
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
echo "プロジェクト番号: $PROJECT_NUMBER"
echo ""

# Cloud Buildサービスアカウント
BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
echo "Cloud Buildサービスアカウント: $BUILD_SERVICE_ACCOUNT"
echo ""

echo "必要な権限を付与します..."

# 1. Cloud Functions Developer権限
echo "1. Cloud Functions Developer権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/cloudfunctions.developer"

# 2. Service Account User権限
echo "2. Service Account User権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/iam.serviceAccountUser"

# 3. Cloud Run Admin権限（Functions v2に必要）
echo "3. Cloud Run Admin権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/run.admin"

# 4. Eventarc Developer権限（Functions v2に必要）
echo "4. Eventarc Developer権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/eventarc.developer"

# 5. Pub/Sub Admin権限（スケジュール関数に必要）
echo "5. Pub/Sub Admin権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/pubsub.admin"

# 6. Storage Admin権限（Storageアクセスに必要）
echo "6. Storage Admin権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/storage.admin"

# 7. Artifact Registry権限
echo "7. Artifact Registry権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${BUILD_SERVICE_ACCOUNT}" \
    --role="roles/artifactregistry.writer"

echo ""
echo "✅ 権限の付与が完了しました"
echo ""
echo "デフォルトのCompute Engineサービスアカウントにも権限を付与します..."

# デフォルトのCompute Engineサービスアカウント
DEFAULT_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Service Account Token Creator権限
echo "Service Account Token Creator権限を付与..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${DEFAULT_SERVICE_ACCOUNT}" \
    --role="roles/iam.serviceAccountTokenCreator"

echo ""
echo "✅ すべての権限設定が完了しました"
echo ""
echo "次のステップ:"
echo "1. cd src/functions"
echo "2. npm run deploy"