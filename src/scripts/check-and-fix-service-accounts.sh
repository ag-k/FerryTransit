#!/bin/bash

# サービスアカウントの確認と権限修正スクリプト

echo "=== Firebase Functions サービスアカウント確認・修正スクリプト ==="
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

echo "=== 既存のサービスアカウントを確認 ==="
echo ""

# すべてのサービスアカウントをリスト
echo "プロジェクト内のサービスアカウント一覧:"
gcloud iam service-accounts list --format="table(email,displayName)"
echo ""

# Firebase関連のサービスアカウントを探す
echo "=== Firebase/Cloud Functions 関連のサービスアカウントを探しています ==="
echo ""

# 可能性のあるサービスアカウント
POSSIBLE_ACCOUNTS=(
    "${PROJECT_ID}@appspot.gserviceaccount.com"
    "firebase-adminsdk-@${PROJECT_ID}.iam.gserviceaccount.com"
    "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
    "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    "service-${PROJECT_NUMBER}@gcf-admin-robot.iam.gserviceaccount.com"
    "service-${PROJECT_NUMBER}@firebase-rules.iam.gserviceaccount.com"
)

FOUND_ACCOUNTS=()

for account in "${POSSIBLE_ACCOUNTS[@]}"; do
    if gcloud iam service-accounts describe "$account" &>/dev/null; then
        echo "✅ 見つかりました: $account"
        FOUND_ACCOUNTS+=("$account")
    else
        # ワイルドカードで検索
        if [[ "$account" == *"firebase-adminsdk-"* ]]; then
            FIREBASE_SA=$(gcloud iam service-accounts list --filter="email:firebase-adminsdk" --format="value(email)" | head -1)
            if [ ! -z "$FIREBASE_SA" ]; then
                echo "✅ 見つかりました: $FIREBASE_SA"
                FOUND_ACCOUNTS+=("$FIREBASE_SA")
            fi
        fi
    fi
done

echo ""
echo "=== 必要な権限を付与します ==="
echo ""

# App Engine デフォルトサービスアカウント（Functions v2で使用）
APP_ENGINE_SA="${PROJECT_ID}@appspot.gserviceaccount.com"
if [[ " ${FOUND_ACCOUNTS[@]} " =~ " ${APP_ENGINE_SA} " ]]; then
    echo "App Engine デフォルトサービスアカウントに権限を付与: $APP_ENGINE_SA"
    
    # 必要な権限を付与
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${APP_ENGINE_SA}" \
        --role="roles/cloudfunctions.invoker" \
        --condition=None --quiet
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${APP_ENGINE_SA}" \
        --role="roles/run.invoker" \
        --condition=None --quiet
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${APP_ENGINE_SA}" \
        --role="roles/eventarc.eventReceiver" \
        --condition=None --quiet
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${APP_ENGINE_SA}" \
        --role="roles/artifactregistry.reader" \
        --condition=None --quiet
fi

# Compute Engine デフォルトサービスアカウント
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
if [[ " ${FOUND_ACCOUNTS[@]} " =~ " ${COMPUTE_SA} " ]]; then
    echo ""
    echo "Compute Engine デフォルトサービスアカウントに権限を付与: $COMPUTE_SA"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${COMPUTE_SA}" \
        --role="roles/cloudfunctions.developer" \
        --condition=None --quiet
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${COMPUTE_SA}" \
        --role="roles/iam.serviceAccountUser" \
        --condition=None --quiet
fi

# Cloud Functions サービスエージェント
GCF_SA="service-${PROJECT_NUMBER}@gcf-admin-robot.iam.gserviceaccount.com"
if [[ " ${FOUND_ACCOUNTS[@]} " =~ " ${GCF_SA} " ]]; then
    echo ""
    echo "Cloud Functions サービスエージェントに権限を付与: $GCF_SA"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${GCF_SA}" \
        --role="roles/cloudfunctions.serviceAgent" \
        --condition=None --quiet
fi

echo ""
echo "=== API の有効化を確認 ==="
echo ""

# 必要なAPIを有効化
REQUIRED_APIS=(
    "cloudfunctions.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "run.googleapis.com"
    "eventarc.googleapis.com"
    "pubsub.googleapis.com"
    "cloudscheduler.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    echo "有効化: $api"
    gcloud services enable $api --quiet
done

echo ""
echo "=== Firebase Admin SDK の初期化 ==="
echo ""

# Firebase Admin SDK サービスアカウントが存在しない場合は作成を促す
FIREBASE_SA=$(gcloud iam service-accounts list --filter="email:firebase-adminsdk" --format="value(email)" | head -1)
if [ -z "$FIREBASE_SA" ]; then
    echo "⚠️  Firebase Admin SDK サービスアカウントが見つかりません"
    echo ""
    echo "Firebase Console で以下の手順を実行してください:"
    echo "1. https://console.firebase.google.com にアクセス"
    echo "2. プロジェクトを選択"
    echo "3. プロジェクトの設定 > サービスアカウント"
    echo "4. 「新しい秘密鍵の生成」をクリック"
    echo ""
fi

echo ""
echo "✅ 設定が完了しました"
echo ""
echo "次のステップ:"
echo "1. 数分待って権限が反映されるのを待つ"
echo "2. cd src/functions"
echo "3. npm run deploy"
echo ""
echo "それでもエラーが出る場合:"
echo "- Firebase Console でプロジェクトの初期化を確認"
echo "- gcloud auth application-default login を実行"
echo "- Firebase Admin SDK の秘密鍵を生成して環境変数に設定"