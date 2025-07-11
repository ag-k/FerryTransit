# Firebase Storage セキュリティルール設定ガイド

## 概要

このドキュメントでは、FerryTransitアプリケーションのFirebase Storageセキュリティルールについて説明します。

## セキュリティルールの適用方法

### 1. Firebase Console から適用

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクトを選択
3. 左メニューから「Storage」を選択
4. 「ルール」タブをクリック
5. `src/storage.rules` の内容をコピーして貼り付け
6. 「公開」をクリック

### 2. Firebase CLI から適用

```bash
# Firebase CLI のインストール（未インストールの場合）
npm install -g firebase-tools

# Firebase にログイン
firebase login

# プロジェクトディレクトリで初期化
firebase init storage

# firebase.json に以下を追加
{
  "storage": {
    "rules": "src/storage.rules"
  }
}

# ルールをデプロイ
firebase deploy --only storage:rules
```

## ストレージ構造とアクセス権限

### 1. 公開ファイル（誰でも読み取り可能）

| パス | 読み取り | 書き込み | 説明 |
|------|---------|---------|------|
| /public/** | 全員 | 管理者のみ | 公開ファイル全般 |
| /data/timetable.json | 全員 | 管理者のみ | 時刻表データ |
| /data/fare-master.json | 全員 | 管理者のみ | 料金マスター |
| /data/holidays.json | 全員 | 管理者のみ | 祝日データ |
| /images/ships/** | 全員 | 管理者のみ | 船舶画像 |
| /images/ports/** | 全員 | 管理者のみ | 港画像 |
| /images/announcements/** | 全員 | 管理者のみ | お知らせ画像 |
| /cache/public/** | 全員 | 管理者のみ | 公開キャッシュ |

### 2. 管理者専用ファイル

| パス | 読み取り | 書き込み | 削除 | 説明 |
|------|---------|---------|------|------|
| /admin/** | 管理者 | 管理者 | 管理者 | 管理者用ファイル |
| /backups/** | 管理者 | 管理者 | スーパー管理者 | バックアップ |
| /exports/** | 管理者 | 管理者 | 管理者 | エクスポートデータ |
| /imports/{adminId}/** | 本人管理者 | 本人管理者 | 本人管理者 | インポート用一時ファイル |
| /logs/** | 管理者 | システムのみ | スーパー管理者 | ログファイル |

### 3. ユーザー個別ファイル

| パス | 読み取り | 書き込み | 削除 | 説明 |
|------|---------|---------|------|------|
| /users/{userId}/profile/** | 全員 | 本人のみ | 本人・管理者 | プロファイル画像 |
| /temp/{userId}/** | 本人・管理者 | 本人のみ | 本人・管理者 | 一時ファイル |

### 4. 特殊なファイル

| パス | 読み取り | 書き込み | 説明 |
|------|---------|---------|------|
| /logs/errors/** | 管理者 | 認証ユーザー（作成のみ） | エラーログ |
| /cache/private/{adminId}/** | 本人管理者 | 本人管理者 | プライベートキャッシュ |
| /dev/** | 管理者 | 開発者のみ | 開発用（本番では無効化） |

## ファイルタイプとサイズ制限

### 許可されるファイルタイプ

#### 画像ファイル
- JPEG/JPG
- PNG
- GIF
- WebP

#### ドキュメントファイル
- PDF
- JSON
- CSV
- Excel (xls, xlsx)
- ZIP (バックアップのみ)

### ファイルサイズ制限

- **画像ファイル**: 最大 5MB
- **ドキュメント**: 最大 50MB
- **バックアップ**: 最大 100MB

## セキュリティ機能の実装例

### 1. ファイルタイプの検証

```javascript
// 画像ファイルのみ許可
function isAllowedImageType() {
  return request.resource.contentType.matches('image/(jpeg|jpg|png|gif|webp)');
}
```

### 2. ファイルサイズの制限

```javascript
// 5MB以下の画像のみ許可
function isValidImageSize() {
  return request.resource.size < 5 * 1024 * 1024;
}
```

### 3. ユーザー認証とCustom Claims

```javascript
// 管理者のみアップロード可能
allow write: if isAdmin() && isAllowedImageType() && isValidImageSize();
```

### 4. パス別のアクセス制御

```javascript
// ユーザー自身のファイルのみアクセス可能
match /users/{userId}/profile/{imageId} {
  allow write: if isOwner(userId);
}
```

## 実装時の注意事項

### 1. 本番環境での設定

```javascript
// 開発用パスは本番環境で必ず無効化
match /dev/{allPaths=**} {
  allow read: if false;
  allow write: if false;
}
```

### 2. 一時ファイルの管理

一時ファイル（/temp/）は定期的に削除する必要があります。
Cloud Functionsでの自動削除の実装例：

```javascript
// 24時間経過した一時ファイルを削除
exports.cleanupTempFiles = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'temp/' });
    
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24時間
    
    const deletePromises = files
      .filter(file => {
        const created = new Date(file.metadata.timeCreated).getTime();
        return now - created > maxAge;
      })
      .map(file => file.delete());
    
    await Promise.all(deletePromises);
  });
```

### 3. バックアップの管理

```javascript
// バックアップファイルは管理者のみ作成可能、スーパー管理者のみ削除可能
match /backups/{fileName} {
  allow write: if isAdmin();
  allow delete: if isSuperAdmin();
}
```

## テスト方法

### 1. ルールのテスト

```javascript
// Firebase Rules Unit Testing
const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

// 認証なしでは公開ファイルのみ読める
await assertSucceeds(
  storage.ref('public/test.json').getDownloadURL()
);

// 認証なしでは管理者ファイルは読めない
await assertFails(
  storage.ref('admin/test.json').getDownloadURL()
);
```

### 2. ファイルアップロードのテスト

```javascript
// 正しいファイルタイプとサイズ
const validImage = new File([''], 'test.jpg', { type: 'image/jpeg' });
await assertSucceeds(
  storage.ref('images/test.jpg').put(validImage)
);

// 不正なファイルタイプ
const invalidFile = new File([''], 'test.exe', { type: 'application/x-msdownload' });
await assertFails(
  storage.ref('images/test.exe').put(invalidFile)
);
```

## トラブルシューティング

### 1. アップロードが失敗する場合

1. ファイルタイプが許可されているか確認
2. ファイルサイズが制限内か確認
3. 適切な権限（Custom Claims）があるか確認
4. パスが正しいか確認

### 2. CORS エラーが発生する場合

CORS設定を追加（`cors.json`）：

```json
[
  {
    "origin": ["https://your-domain.com", "http://localhost:3000"],
    "method": ["GET", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type"]
  }
]
```

適用：
```bash
gsutil cors set cors.json gs://your-bucket-name
```

### 3. 権限エラーのデバッグ

Firebase ConsoleのStorageルールシミュレータを使用して、特定のリクエストがなぜ拒否されるかを確認できます。

## セキュリティのベストプラクティス

1. **最小権限の原則**: 必要最小限のアクセス権限のみを付与
2. **ファイルタイプの制限**: 許可するファイルタイプを明示的に指定
3. **サイズ制限**: 適切なファイルサイズ制限を設定
4. **パスの分離**: 公開/非公開データを明確に分離
5. **定期的な監査**: アクセスログを定期的に確認
6. **自動クリーンアップ**: 一時ファイルの自動削除を実装