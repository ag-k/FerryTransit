#!/bin/bash

# Firebase Functions 初期化スクリプト

echo "=== Firebase Functions 初期化スクリプト ==="
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

# Firebase プロジェクトとして初期化されているか確認
echo "=== Firebase プロジェクトの確認 ==="
if ! firebase projects:list 2>/dev/null | grep -q "$PROJECT_ID"; then
    echo "⚠️  このプロジェクトはFirebaseプロジェクトとして初期化されていません"
    echo ""
    echo "以下のコマンドを実行してください:"
    echo "firebase use --add"
    echo ""
    exit 1
fi

echo "✅ Firebaseプロジェクトとして認識されています"
echo ""

# 現在のFirebaseプロジェクトを確認
echo "=== 現在のFirebaseプロジェクト ==="
firebase use
echo ""

# Functions の初期化状態を確認
echo "=== Functions の設定を確認 ==="
if [ ! -f "src/functions/package.json" ]; then
    echo "⚠️  Functions が初期化されていません"
    echo "firebase init functions を実行してください"
    exit 1
fi

echo "✅ Functions ディレクトリが存在します"
echo ""

# 必要なAPIを有効化
echo "=== 必要なAPIを有効化 ==="
APIS=(
    "cloudfunctions.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "run.googleapis.com"
    "eventarc.googleapis.com"
    "pubsub.googleapis.com"
    "cloudscheduler.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo -n "有効化中: $api ... "
    if gcloud services enable $api --quiet 2>/dev/null; then
        echo "✅"
    else
        echo "⚠️  (既に有効化されている可能性があります)"
    fi
done

echo ""
echo "=== デフォルト認証の設定 ==="
echo "現在の認証情報:"
gcloud auth list
echo ""

# Application Default Credentials の確認
if [ ! -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
    echo "⚠️  Application Default Credentials が設定されていません"
    echo ""
    echo "以下のコマンドを実行してください:"
    echo "gcloud auth application-default login"
    echo ""
fi

echo ""
echo "=== サービスアカウントの作成（必要な場合） ==="

# Functions用のサービスアカウントを作成
FUNCTIONS_SA="firebase-functions@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$FUNCTIONS_SA" &>/dev/null; then
    echo "Functions用サービスアカウントを作成します..."
    gcloud iam service-accounts create firebase-functions \
        --display-name="Firebase Functions Service Account" \
        --quiet
    
    # 必要な権限を付与
    ROLES=(
        "roles/cloudfunctions.developer"
        "roles/iam.serviceAccountUser"
        "roles/storage.admin"
        "roles/firestore.serviceAgent"
        "roles/pubsub.publisher"
    )
    
    for role in "${ROLES[@]}"; do
        gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:${FUNCTIONS_SA}" \
            --role="$role" \
            --quiet
    done
    
    echo "✅ サービスアカウントを作成し、権限を付与しました"
else
    echo "✅ Functions用サービスアカウントは既に存在します"
fi

echo ""
echo "=== 完了 ==="
echo ""
echo "設定が完了しました。次のコマンドでデプロイを実行してください:"
echo ""
echo "cd src/functions"
echo "npm run deploy"
echo ""
echo "エラーが続く場合は、以下を確認してください:"
echo "1. gcloud auth application-default login を実行"
echo "2. firebase login:refresh を実行"
echo "3. Firebase Console でプロジェクトの課金が有効になっているか確認"