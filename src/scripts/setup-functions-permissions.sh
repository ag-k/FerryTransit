#!/bin/bash

# Firebase Functions v2 デプロイ用権限設定スクリプト

echo "=== Firebase Functions v2 権限設定スクリプト ==="
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

# App Engine デフォルトサービスアカウント（Functions v2 で使用）
APP_ENGINE_SA="${PROJECT_ID}@appspot.gserviceaccount.com"
echo "App Engine サービスアカウント: $APP_ENGINE_SA"
echo ""

# 権限を確認して付与
echo "=== App Engine サービスアカウントに権限を付与 ==="

ROLES=(
    "roles/cloudfunctions.invoker"
    "roles/run.invoker"
    "roles/eventarc.eventReceiver"
    "roles/artifactregistry.reader"
    "roles/storage.objectAdmin"
    "roles/firestore.serviceAgent"
    "roles/datastore.user"
    "roles/pubsub.publisher"
    "roles/cloudscheduler.jobRunner"
)

for role in "${ROLES[@]}"; do
    echo -n "付与中: $role ... "
    if gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${APP_ENGINE_SA}" \
        --role="$role" \
        --condition=None \
        --quiet 2>/dev/null; then
        echo "✅"
    else
        echo "⚠️  (既に付与されている可能性があります)"
    fi
done

echo ""
echo "=== Compute Engine デフォルトサービスアカウントに権限を付与 ==="
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "Compute Engine サービスアカウント: $COMPUTE_SA"
echo ""

COMPUTE_ROLES=(
    "roles/cloudfunctions.developer"
    "roles/iam.serviceAccountUser"
    "roles/run.admin"
    "roles/storage.admin"
)

for role in "${COMPUTE_ROLES[@]}"; do
    echo -n "付与中: $role ... "
    if gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${COMPUTE_SA}" \
        --role="$role" \
        --condition=None \
        --quiet 2>/dev/null; then
        echo "✅"
    else
        echo "⚠️  (既に付与されている可能性があります)"
    fi
done

echo ""
echo "=== Firebase Admin SDK 用の権限を付与 ==="

# Firebase Admin SDK が使用するサービスアカウントを探す
FIREBASE_SA=$(gcloud iam service-accounts list --filter="email:firebase-adminsdk" --format="value(email)" | head -1)

if [ ! -z "$FIREBASE_SA" ]; then
    echo "Firebase Admin SDK サービスアカウント: $FIREBASE_SA"
    
    FIREBASE_ROLES=(
        "roles/firebaseauth.admin"
        "roles/firestore.serviceAgent"
        "roles/storage.admin"
    )
    
    for role in "${FIREBASE_ROLES[@]}"; do
        echo -n "付与中: $role ... "
        if gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:${FIREBASE_SA}" \
            --role="$role" \
            --condition=None \
            --quiet 2>/dev/null; then
            echo "✅"
        else
            echo "⚠️  (既に付与されている可能性があります)"
        fi
    done
else
    echo "⚠️  Firebase Admin SDK サービスアカウントが見つかりません"
fi

echo ""
echo "=== Cloud Build 用の権限を付与（存在する場合） ==="

# Cloud Build サービスアカウント（存在する場合）
BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
if gcloud iam service-accounts describe "$BUILD_SA" &>/dev/null; then
    echo "Cloud Build サービスアカウント: $BUILD_SA"
    
    BUILD_ROLES=(
        "roles/cloudfunctions.developer"
        "roles/run.admin"
        "roles/iam.serviceAccountUser"
        "roles/artifactregistry.writer"
        "roles/storage.admin"
    )
    
    for role in "${BUILD_ROLES[@]}"; do
        echo -n "付与中: $role ... "
        if gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:${BUILD_SA}" \
            --role="$role" \
            --condition=None \
            --quiet 2>/dev/null; then
            echo "✅"
        else
            echo "⚠️  (既に付与されている可能性があります)"
        fi
    done
else
    echo "⚠️  Cloud Build サービスアカウントはまだ作成されていません（初回デプロイ時に作成されます）"
fi

echo ""
echo "=== API の有効化を再確認 ==="

REQUIRED_APIS=(
    "cloudfunctions.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "run.googleapis.com"
    "eventarc.googleapis.com"
    "pubsub.googleapis.com"
    "cloudscheduler.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
    "compute.googleapis.com"
    "storage.googleapis.com"
    "firestore.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    echo -n "確認中: $api ... "
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo "✅"
    else
        echo -n "有効化中 ... "
        if gcloud services enable $api --quiet 2>/dev/null; then
            echo "✅"
        else
            echo "❌"
        fi
    fi
done

echo ""
echo "=== 完了 ==="
echo ""
echo "✅ 権限設定が完了しました"
echo ""
echo "次のステップ:"
echo "1. 5分程度待って権限が反映されるのを待つ"
echo "2. cd src/functions"
echo "3. npm run deploy"
echo ""
echo "デプロイ時にまだエラーが出る場合:"
echo "1. gcloud auth application-default login を実行"
echo "2. Firebase Console でプロジェクトの課金が有効か確認"
echo "3. 既存の関数を削除してから再デプロイ: firebase functions:delete <function-name>"