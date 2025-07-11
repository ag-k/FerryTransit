/**
 * Firebase Admin SDK を使用して管理者アカウントを設定するスクリプト
 * 
 * 使用方法:
 * 1. Firebase Console からサービスアカウントキーをダウンロード
 * 2. GOOGLE_APPLICATION_CREDENTIALS 環境変数にパスを設定
 * 3. node scripts/setup-admin.js を実行
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// 環境変数からサービスアカウントキーのパスを取得
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  console.error('❌ エラー: GOOGLE_APPLICATION_CREDENTIALS 環境変数が設定されていません');
  console.log('以下のコマンドで設定してください:');
  console.log('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"');
  process.exit(1);
}

// Firebase Admin SDK の初期化
let auth, db;
try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount)
  });
  auth = getAuth();
  db = getFirestore();
  console.log('✅ Firebase Admin SDK を初期化しました');
} catch (error) {
  console.error('❌ Firebase Admin SDK の初期化に失敗しました:', error);
  process.exit(1);
}

// 管理者情報
const ADMIN_EMAIL = process.argv[2] || 'admin@example.com';
const ADMIN_PASSWORD = process.argv[3] || 'Admin123!';
const IS_SUPER_ADMIN = process.argv[4] === 'super';

async function setupAdmin() {
  try {
    console.log('🔍 管理者アカウントの設定を開始します...');
    console.log(`📧 メールアドレス: ${ADMIN_EMAIL}`);
    console.log(`🔑 権限レベル: ${IS_SUPER_ADMIN ? 'スーパー管理者' : '一般管理者'}`);
    
    let user;
    
    // 既存のユーザーを検索
    try {
      user = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log('✅ 既存のユーザーが見つかりました');
    } catch (error) {
      // ユーザーが存在しない場合は新規作成
      console.log('📝 新しい管理者アカウントを作成します...');
      user = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        emailVerified: true,
        displayName: IS_SUPER_ADMIN ? 'スーパー管理者' : '一般管理者'
      });
      console.log('✅ 管理者アカウントを作成しました');
    }
    
    // カスタムクレームを設定
    const customClaims = {
      admin: true,
      role: IS_SUPER_ADMIN ? 'super' : 'general'
    };
    
    await auth.setCustomUserClaims(user.uid, customClaims);
    console.log('✅ カスタムクレームを設定しました:', customClaims);
    
    // Firestore に管理者情報を保存
    await db.collection('admins').doc(user.uid).set({
      email: ADMIN_EMAIL,
      displayName: user.displayName || '',
      role: IS_SUPER_ADMIN ? 'super' : 'general',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Firestore に管理者情報を保存しました');
    
    // 設定完了メッセージ
    console.log('\n🎉 管理者アカウントの設定が完了しました！');
    console.log('以下の情報でログインできます:');
    console.log(`📧 メールアドレス: ${ADMIN_EMAIL}`);
    if (!user.uid) {
      console.log(`🔑 パスワード: ${ADMIN_PASSWORD}`);
    } else {
      console.log('🔑 パスワード: (既存のパスワードを使用)');
    }
    console.log(`👤 権限: ${IS_SUPER_ADMIN ? 'スーパー管理者' : '一般管理者'}`);
    console.log('\n💡 ヒント: パスワードを変更する場合は Firebase Console から行ってください');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// ヘルプメッセージ
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
使用方法:
  node scripts/setup-admin.js [email] [password] [role]

引数:
  email     - 管理者のメールアドレス (デフォルト: admin@example.com)
  password  - 管理者のパスワード (デフォルト: Admin123!)
  role      - 'super' を指定するとスーパー管理者、それ以外は一般管理者

例:
  # デフォルト設定で一般管理者を作成
  node scripts/setup-admin.js

  # カスタムメールアドレスでスーパー管理者を作成
  node scripts/setup-admin.js superadmin@example.com MySecurePass123! super

前提条件:
  1. Firebase プロジェクトが作成されていること
  2. Firebase Authentication が有効化されていること
  3. サービスアカウントキーがダウンロードされていること
  4. GOOGLE_APPLICATION_CREDENTIALS 環境変数が設定されていること
  `);
  process.exit(0);
}

// メイン処理を実行
setupAdmin().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});