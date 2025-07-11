# Firebase Storage 有効化手順

## エラーの原因

`firebasestorage.googleapis.com` APIが有効化されていないため、Storage ルールのデプロイができません。

## 解決手順

### 方法1: Firebase Console から有効化（推奨）

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクト `oki-ferryguide` を選択
3. 左メニューから **「Storage」** をクリック
4. **「始める」** ボタンをクリック
5. セキュリティルールの選択画面で以下を選択：
   - 開発中: **「テストモードで開始」**
   - 本番: **「本番モードで開始」**
6. Cloud Storage のロケーションを選択：
   - **asia-northeast1** (東京) を推奨
7. **「完了」** をクリック

### 方法2: Google Cloud Console から有効化

1. [Google Cloud Console](https://console.cloud.google.com) にアクセス
2. プロジェクト `oki-ferryguide` を選択
3. 左メニューから **「APIとサービス」** → **「ライブラリ」**
4. 検索バーで **「Firebase Storage」** を検索
5. **「Cloud Storage API」** と **「Cloud Storage for Firebase API」** を有効化

### 方法3: gcloud CLI から有効化

```bash
# gcloud CLI がインストールされていない場合
# https://cloud.google.com/sdk/docs/install

# プロジェクトを設定
gcloud config set project oki-ferryguide

# 必要なAPIを有効化
gcloud services enable firebasestorage.googleapis.com
gcloud services enable storage-component.googleapis.com
gcloud services enable storage-api.googleapis.com
```

## Storage 有効化後の手順

### 1. Firebase Storage の初期化

```bash
# Firebase Storage を初期化
firebase init storage

# 以下の質問に答える：
# ? What file should be used for Storage Rules? src/storage.rules
```

### 2. firebase.json の確認

`firebase.json` に以下が追加されていることを確認：

```json
{
  "storage": {
    "rules": "src/storage.rules"
  }
}
```

### 3. Storage ルールのデプロイ

```bash
# Storage ルールのみデプロイ
firebase deploy --only storage:rules

# または、Firestore ルールと一緒にデプロイ
firebase deploy --only firestore:rules,storage:rules
```

## トラブルシューティング

### 権限エラーが続く場合

1. **プロジェクトオーナー権限の確認**
   ```bash
   # 現在のユーザーを確認
   firebase login:list
   
   # 必要に応じて再ログイン
   firebase logout
   firebase login
   ```

2. **プロジェクトの確認**
   ```bash
   # 現在のプロジェクトを確認
   firebase projects:list
   
   # プロジェクトを選択
   firebase use oki-ferryguide
   ```

3. **IAM権限の確認**
   - Google Cloud Console → IAM
   - あなたのアカウントに以下の役割があることを確認：
     - `Firebase Admin` または
     - `Editor` または
     - `Owner`

### デフォルトバケットが作成されない場合

Firebase Console でStorageを有効化すると、デフォルトバケット `oki-ferryguide.appspot.com` が自動的に作成されます。

作成されない場合は、以下を確認：
1. 課金アカウントが設定されているか
2. プロジェクトが無料枠の制限に達していないか

## 次のステップ

Storage が有効化されたら：

1. Storage ルールをデプロイ
2. Firestore ルールもデプロイ
3. 管理画面でファイルアップロード機能をテスト

```bash
# 両方のルールをデプロイ
firebase deploy --only firestore:rules,storage:rules
```