# Firebase Storage セットアップガイド

## 概要

このドキュメントでは、FerryTransit管理画面でファイルアップロード機能を使用するための Firebase Storage のセットアップ手順を説明します。

## 前提条件

- Firebase プロジェクトが作成済み
- Firebase Admin SDK のセットアップが完了済み
- 管理者アカウントが作成済み

## セットアップ手順

### 1. Firebase Console で Storage を有効化

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクトを選択
3. 左メニューから「Storage」を選択
4. 「始める」をクリック
5. セキュリティルールを選択（開発中は「テストモード」、本番環境では「本番モード」）
6. Cloud Storage のロケーションを選択（asia-northeast1 を推奨）

### 2. Storage セキュリティルールの設定

Firebase Console の Storage > Rules で以下のルールを設定：

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 管理者のみがアクセス可能
    match /admin/{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.admin == true;
    }
    
    // バックアップファイル
    match /backups/{fileName} {
      allow read: if request.auth != null 
        && request.auth.token.admin == true;
      allow write: if request.auth != null 
        && request.auth.token.admin == true
        && request.resource.size < 50 * 1024 * 1024; // 50MB以下
    }
    
    // 公開データ（時刻表、料金表など）
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.token.admin == true;
    }
    
    // 一時ファイル（24時間後に自動削除）
    match /temp/{userId}/{fileName} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

### 3. CORS 設定（必要な場合）

クロスオリジンアクセスを許可する場合は、以下の手順で設定：

1. `cors.json` ファイルを作成：

```json
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

2. gsutil を使用して設定を適用：

```bash
gsutil cors set cors.json gs://your-bucket-name
```

### 4. 環境変数の設定

`.env` ファイルに Storage バケット名を追加：

```env
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 5. ライフサイクルルールの設定（推奨）

一時ファイルの自動削除を設定：

1. `lifecycle.json` ファイルを作成：

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 1,
          "matchesPrefix": ["temp/"]
        }
      }
    ]
  }
}
```

2. gsutil を使用して設定を適用：

```bash
gsutil lifecycle set lifecycle.json gs://your-bucket-name
```

## 使用方法

### ファイルアップロード

```typescript
import { useFirebaseStorage } from '~/composables/useFirebaseStorage'

const { uploadFile } = useFirebaseStorage()

// ファイルをアップロード
const file = new File(['content'], 'test.txt')
const downloadURL = await uploadFile('public/test.txt', file)
```

### ファイルダウンロード

```typescript
const { downloadFile } = useFirebaseStorage()

// ダウンロードURLを取得
const url = await downloadFile('public/test.txt')
```

### ファイル削除

```typescript
const { deleteFile } = useFirebaseStorage()

// ファイルを削除
await deleteFile('public/test.txt')
```

## ストレージ構造

```
/
├── admin/          # 管理者専用ファイル
├── backups/        # データバックアップ
├── public/         # 公開データ
│   ├── timetables/ # 時刻表データ
│   ├── fares/      # 料金表データ
│   └── news/       # お知らせ画像
└── temp/           # 一時ファイル（自動削除）
```

## セキュリティのベストプラクティス

1. **最小権限の原則**: 必要最小限のアクセス権限のみを付与
2. **ファイルサイズ制限**: アップロードサイズに上限を設定
3. **ファイルタイプ検証**: 許可されたファイルタイプのみを受け付ける
4. **定期的な監査**: Storage の使用状況を定期的に確認
5. **バックアップ**: 重要なデータは定期的にバックアップ

## トラブルシューティング

### CORS エラーが発生する場合

1. ブラウザのコンソールでエラーメッセージを確認
2. `cors.json` の origin に現在のドメインが含まれているか確認
3. gsutil コマンドで CORS 設定が適用されているか確認：
   ```bash
   gsutil cors get gs://your-bucket-name
   ```

### アップロードが失敗する場合

1. Firebase Authentication でログインしているか確認
2. ユーザーに admin 権限があるか確認
3. セキュリティルールが正しく設定されているか確認
4. ファイルサイズが制限内か確認

### ダウンロードURLが取得できない場合

1. ファイルが存在するか確認
2. セキュリティルールで読み取り権限があるか確認
3. Storage バケット名が正しく設定されているか確認