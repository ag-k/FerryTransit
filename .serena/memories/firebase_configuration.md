# Firebase設定情報

## プロジェクト情報
- **プロジェクトID**: `oki-ferryguide`
- **デフォルトストレージバケット**: `oki-ferryguide.firebasestorage.app`

## 使用サービス
- Firebase Authentication（認証）
- Firebase Firestore（データベース）
- Firebase Storage（ファイルストレージ）
- Firebase Hosting（ホスティング）
- Firebase Functions（サーバーレス関数）

## セキュリティルール
### Firestoreルール
- ファイル: `src/firestore.rules`
- 公開データ: 誰でも読み取り可能
- 管理データ: 認証済み管理者のみアクセス可能

### Storageルール
- ファイル: `src/storage.rules`
- 公開フォルダ: 誰でも読み取り可能
- 管理フォルダ: 認証済み管理者のみアクセス可能

## デプロイコマンド
```bash
# ルールのデプロイ
firebase deploy --only firestore:rules,storage:rules

# 全体デプロイ
firebase deploy

# ホスティングのみ
firebase deploy --only hosting
```

## 環境変数設定
`.env`ファイルに以下を設定：
```
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## 管理者設定
Firebase Admin SDKを使用した管理者作成：
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
node src/scripts/setup-admin.js [email] [password] [role]
```

## CORS設定
Firebase Storageで公開データにアクセスするため：
```bash
gcloud config set project oki-ferryguide
gsutil cors set src/cors.json gs://oki-ferryguide.firebasestorage.app
```

## 主要コレクション
- `news` - お知らせ
- `discounts` - 割引設定
- `peakPeriods` - 繁忙期設定
- `timetables` - 時刻表データ
- `fares` - 料金データ
- `alerts` - 運行アラート

## 注意事項
- SPAのため`/server/api`は使用しない
- すべてのデータ取得はFirebase経由
- デプロイ前に必ず`firebase login`で認証