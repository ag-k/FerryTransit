# Firebase Storage データアップロードガイド

## 概要

このガイドでは、FerryTransit の時刻表データを Firebase Storage にアップロードする方法を説明します。

## 前提条件

1. Firebase プロジェクトが作成済み
2. Firebase Admin SDK の認証情報を持っている
3. Node.js がインストールされている

## セットアップ

### 1. Firebase プロジェクトの設定

Firebase Console で以下を確認：
- Storage バケットが有効化されている
- Storage のルールが適切に設定されている

推奨される Storage ルール：
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // データディレクトリは誰でも読み取り可能
    match /data/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### 2. 認証情報の設定

#### 方法1: サービスアカウントキーを使用（推奨）

1. Firebase Console → プロジェクトの設定 → サービスアカウント
2. 「新しい秘密鍵を生成」をクリック
3. ダウンロードした JSON ファイルを安全な場所に保存
4. 環境変数を設定：

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
export FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
```

#### 方法2: デフォルト認証（GCP環境）

Google Cloud Platform 上で実行する場合は、デフォルトの認証情報が使用されます。

### 3. 依存関係のインストール

```bash
cd src/functions
npm install
```

## 使用方法

### データのアップロード

```bash
# プロジェクトのルートディレクトリから実行
node src/scripts/upload-to-storage.js
```

成功すると以下のような出力が表示されます：

```
🚀 Firebase Storage へのデータアップロードを開始します...
   バケット: your-project-id.appspot.com

✅ アップロード成功: src/public/data/timetable.json → data/timetable.json
   公開URL: https://storage.googleapis.com/your-project-id.appspot.com/data/timetable.json
✅ アップロード成功: src/public/data/fare-master.json → data/fare-master.json
   公開URL: https://storage.googleapis.com/your-project-id.appspot.com/data/fare-master.json
✅ アップロード成功: src/public/data/holidays.json → data/holidays.json
   公開URL: https://storage.googleapis.com/your-project-id.appspot.com/data/holidays.json

📊 結果: 3/3 ファイルのアップロードに成功しました
```

## トラブルシューティング

### エラー: 認証失敗

```
Error: Could not load the default credentials
```

→ 環境変数 `GOOGLE_APPLICATION_CREDENTIALS` が正しく設定されているか確認

### エラー: バケットが見つからない

```
Error: Bucket not found
```

→ 環境変数 `FIREBASE_STORAGE_BUCKET` が正しいバケット名に設定されているか確認

### エラー: 権限がない

```
Error: Permission denied
```

→ サービスアカウントに Storage Admin の権限があるか確認

## 自動化

GitHub Actions や CI/CD パイプラインでの自動アップロード：

```yaml
- name: Upload to Firebase Storage
  env:
    GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
  run: |
    echo "$GOOGLE_APPLICATION_CREDENTIALS" > /tmp/service-account.json
    export GOOGLE_APPLICATION_CREDENTIALS="/tmp/service-account.json"
    node src/scripts/upload-to-storage.js
```

## データの更新頻度

- 時刻表データ: 運航スケジュール変更時
- 料金データ: 料金改定時
- 祝日データ: 年1回（年末）

## 注意事項

1. **セキュリティ**: サービスアカウントキーは Git にコミットしない
2. **キャッシュ**: ブラウザキャッシュは15分に設定されている
3. **公開設定**: アップロードされたファイルは自動的に公開される