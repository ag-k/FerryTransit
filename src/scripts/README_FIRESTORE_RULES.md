# Firestore セキュリティルール設定ガイド

## 概要

このドキュメントでは、FerryTransitアプリケーションのFirestoreセキュリティルールについて説明します。

## セキュリティルールの適用方法

### 1. Firebase Console から適用

1. [Firebase Console](https://console.firebase.google.com) にアクセス
2. プロジェクトを選択
3. 左メニューから「Firestore Database」を選択
4. 「ルール」タブをクリック
5. `src/firestore.rules` の内容をコピーして貼り付け
6. 「公開」をクリック

### 2. Firebase CLI から適用

```bash
# Firebase CLI のインストール（未インストールの場合）
npm install -g firebase-tools

# Firebase にログイン
firebase login

# プロジェクトディレクトリで初期化
firebase init firestore

# ルールをデプロイ
firebase deploy --only firestore:rules
```

## ルールの構成

### 1. 公開データ（誰でも読み取り可能）

| コレクション | 読み取り | 書き込み | 説明 |
|------------|---------|---------|------|
| timetables | 全員 | 管理者のみ | 時刻表データ |
| fares | 全員 | 管理者のみ | 料金データ |
| holidays | 全員 | 管理者のみ | 祝日データ |
| shipStatus | 全員 | 管理者のみ | 運航状況 |
| announcements | 公開済みのみ | 管理者のみ | お知らせ |
| alerts | アクティブのみ | 管理者のみ | 運航アラート |

### 2. ユーザーデータ（本人と管理者のみアクセス可能）

| コレクション | 読み取り | 書き込み | 説明 |
|------------|---------|---------|------|
| users/{userId} | 本人・管理者 | 本人 | ユーザープロファイル |
| users/{userId}/settings | 本人・管理者 | 本人 | ユーザー設定 |
| users/{userId}/favorites | 本人・管理者 | 本人 | お気に入り |
| users/{userId}/searchHistory | 本人・管理者 | 本人 | 検索履歴 |

### 3. 管理者専用データ

| コレクション | 読み取り | 書き込み | 説明 |
|------------|---------|---------|------|
| admins | 管理者 | スーパー管理者 | 管理者情報 |
| adminLogs | 管理者 | 管理者（作成のみ） | 操作ログ |
| settings | 管理者 | スーパー管理者 | システム設定 |
| analytics | 管理者 | 管理者 | アナリティクス |
| pendingChanges | 管理者 | 管理者 | 承認待ちデータ |
| publishHistory | 管理者 | 管理者（作成のみ） | 公開履歴 |
| backups | 管理者 | 管理者 | バックアップ |

### 4. 特殊なデータ

| コレクション | 読み取り | 書き込み | 説明 |
|------------|---------|---------|------|
| pageViews | 管理者 | 全員（作成のみ） | ページビュー記録 |
| errorLogs | 管理者 | 全員（作成のみ） | エラーログ |
| sessions | 本人・管理者 | 本人 | セッションデータ |

## Custom Claims の設定

管理者権限は Firebase Authentication の Custom Claims で管理します。

### 管理者権限の付与（Admin SDK使用）

```javascript
// スーパー管理者の設定
await admin.auth().setCustomUserClaims(uid, {
  admin: true,
  role: 'super'
});

// 一般管理者の設定
await admin.auth().setCustomUserClaims(uid, {
  admin: true,
  role: 'general'
});
```

### 権限レベル

- **super**: スーパー管理者（全権限）
- **general**: 一般管理者（データ編集権限）

## セキュリティのベストプラクティス

### 1. 最小権限の原則

- 必要最小限の権限のみを付与
- デフォルトですべてのアクセスを拒否

### 2. データ検証

```javascript
// 必須フィールドのチェック
hasRequiredFields(['field1', 'field2', 'field3'])

// タイムスタンプの検証
request.resource.data.timestamp == request.time

// ユーザーIDの検証
request.resource.data.userId == request.auth.uid
```

### 3. 不変データの保護

```javascript
// 作成日時は変更不可
request.resource.data.createdAt == resource.data.createdAt

// ログと履歴は更新不可
allow update: if false;
```

### 4. 条件付きアクセス

```javascript
// 公開済みのお知らせのみ読み取り可能
allow read: if resource.data.status == 'published' && 
  resource.data.publishDate <= request.time;

// アクティブなアラートのみ公開
allow read: if resource.data.active == true || isAdmin();
```

## テスト方法

### 1. Firebase Emulator を使用したローカルテスト

```bash
# エミュレータの起動
firebase emulators:start --only firestore

# テストの実行
npm run test:firestore-rules
```

### 2. ルールのテスト例

```javascript
// テストファイル例
const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

// 管理者でない場合、時刻表の書き込みは失敗する
await assertFails(
  db.collection('timetables').doc('test').set({ data: 'test' })
);

// 誰でも時刻表を読める
await assertSucceeds(
  db.collection('timetables').doc('test').get()
);
```

## トラブルシューティング

### 1. 権限エラーが発生する場合

1. Custom Claims が正しく設定されているか確認
2. ルールの条件式が正しいか確認
3. Firebase Console のルールシミュレータでテスト

### 2. Custom Claims が反映されない場合

```javascript
// トークンを強制的に更新
await user.getIdToken(true);
```

### 3. ルールのデバッグ

Firebase Console のルールシミュレータを使用して、特定のリクエストがなぜ拒否されるかを確認できます。

## 注意事項

1. **本番環境への適用前に必ずテスト環境で検証**
2. **ルール変更は即座に反映される**ため、慎重に行う
3. **定期的にルールを見直し**、不要な権限を削除
4. **ログを確認**して不正なアクセス試行を監視