#!/bin/bash

# Artifact Registry 権限修正スクリプト

echo "=== Artifact Registry 権限修正スクリプト ==="
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

# リポジトリの存在確認
echo "=== Artifact Registry リポジトリの確認 ==="
if gcloud artifacts repositories describe gcf-artifacts \
    --location=asia-northeast1 \
    --format="value(name)" 2>/dev/null; then
    echo "✅ リポジトリ 'gcf-artifacts' は存在します"
else
    echo "⚠️  リポジトリが存在しません。作成します..."
    gcloud artifacts repositories create gcf-artifacts \
        --repository-format=docker \
        --location=asia-northeast1 \
        --description="Cloud Functions artifacts" \
        --quiet
    echo "✅ リポジトリを作成しました"
fi

echo ""
echo "=== サービスアカウントへの権限付与 ==="

# Cloud Build サービスアカウント
BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
echo "Cloud Build サービスアカウント: $BUILD_SA"

# App Engine デフォルトサービスアカウント
APP_ENGINE_SA="${PROJECT_ID}@appspot.gserviceaccount.com"
echo "App Engine サービスアカウント: $APP_ENGINE_SA"

# Compute Engine デフォルトサービスアカウント
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "Compute Engine サービスアカウント: $COMPUTE_SA"

echo ""
echo "=== Artifact Registry への権限を付与 ==="

# 各サービスアカウントに権限を付与
for SA in "$BUILD_SA" "$APP_ENGINE_SA" "$COMPUTE_SA"; do
    echo ""
    echo "サービスアカウント: $SA"
    
    # Artifact Registry 管理者権限
    echo -n "  Artifact Registry Admin 権限を付与... "
    if gcloud artifacts repositories add-iam-policy-binding gcf-artifacts \
        --location=asia-northeast1 \
        --member="serviceAccount:${SA}" \
        --role="roles/artifactregistry.admin" \
        --quiet 2>/dev/null; then
        echo "✅"
    else
        echo "⚠️  (既に付与されている可能性があります)"
    fi
    
    # Artifact Registry Writer 権限（プロジェクトレベル）
    echo -n "  Artifact Registry Writer 権限を付与（プロジェクトレベル）... "
    if gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SA}" \
        --role="roles/artifactregistry.writer" \
        --condition=None \
        --quiet 2>/dev/null; then
        echo "✅"
    else
        echo "⚠️  (既に付与されている可能性があります)"
    fi
done

echo ""
echo "=== Cloud Functions サービスエージェントに権限を付与 ==="

# Cloud Functions サービスエージェント
GCF_SA="service-${PROJECT_NUMBER}@gcf-admin-robot.iam.gserviceaccount.com"
echo "Cloud Functions サービスエージェント: $GCF_SA"

echo -n "  Artifact Registry Writer 権限を付与... "
if gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${GCF_SA}" \
    --role="roles/artifactregistry.writer" \
    --condition=None \
    --quiet 2>/dev/null; then
    echo "✅"
else
    echo "⚠️  (既に付与されている可能性があります)"
fi

echo ""
echo "=== Cloud Build 設定の確認 ==="

# Cloud Build の設定を確認
echo "Cloud Build のデフォルトプールを確認..."
gcloud builds worker-pools list --region=asia-northeast1 2>/dev/null || echo "デフォルトプールを使用"

echo ""
echo "=== 権限の伝播を待機 ==="
echo "権限が反映されるまで30秒待機します..."
sleep 30

echo ""
echo "✅ 権限設定が完了しました"
echo ""
echo "次のステップ:"
echo "1. cd src/functions"
echo "2. npm run deploy"
echo ""
echo "それでもエラーが出る場合:"
echo "1. 5分程度待ってから再試行"
echo "2. 既存の関数を削除してから再デプロイ"
echo "   firebase functions:delete --force"