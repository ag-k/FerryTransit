---
inclusion: always
---

# Firebase 統合ガイドライン

## プロジェクト設定

### Firebase プロジェクト情報

- **プロジェクト ID**: `oki-ferryguide`
- **デフォルトストレージバケット**: `oki-ferryguide.firebasestorage.app`
- **リージョン**: `asia-northeast1` (東京)

### 環境設定

```bash
# Firebase CLI のインストール
npm install -g firebase-tools

# プロジェクトの選択
firebase use oki-ferryguide

# ログイン確認
firebase login
```

## Firestore データベース

### コレクション構造

```
/timetables          # 時刻表データ
/fares              # 料金データ
/peakPeriods        # 繁忙期設定
/discounts          # 割引設定
/alerts             # 運航アラート
/news               # お知らせ
/holidays           # 祝日データ
/adminLogs          # 管理者操作ログ
/publishHistory     # 公開履歴
```

### ドキュメント設計例

```typescript
// timetables コレクション
interface TimetableDocument {
  id: string;
  route: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  ship: string;
  operationDays: string[];
  validFrom: Timestamp;
  validTo: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// news コレクション
interface NewsDocument {
  id: string;
  title: { ja: string; en: string };
  content: { ja: string; en: string };
  category: "info" | "alert" | "maintenance";
  published: boolean;
  publishedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### セキュリティルール

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 公開データ（読み取り専用）
    match /{collection}/{document} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // 管理者ログ（管理者のみ）
    match /adminLogs/{document} {
      allow read, write: if isAdmin();
    }

    function isAdmin() {
      return request.auth != null &&
             request.auth.token.admin == true;
    }
  }
}
```

## Firebase Storage

### ディレクトリ構造

```
/data/
  ├── timetable.json      # 公開用時刻表データ
  ├── fare-master.json    # 公開用料金データ
  ├── holidays.json       # 公開用祝日データ
  └── alerts.json         # 公開用アラートデータ
/preview/                 # プレビュー用データ
/backups/                 # バックアップデータ
  └── YYYY-MM-DD/
/uploads/                 # 一時アップロード
```

### CORS 設定

```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

### セキュリティルール

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 公開データ（読み取り専用）
    match /data/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // プレビューデータ（管理者のみ）
    match /preview/{allPaths=**} {
      allow read, write: if isAdmin();
    }

    // バックアップ（管理者のみ）
    match /backups/{allPaths=**} {
      allow read, write: if isAdmin();
    }

    function isAdmin() {
      return request.auth != null &&
             request.auth.token.admin == true;
    }
  }
}
```

## Firebase Authentication

### 管理者権限設定

```typescript
// カスタムクレームの設定
const adminClaims = {
  admin: true,
  role: "super" | "editor" | "viewer",
};

// Firebase Admin SDK での設定
await admin.auth().setCustomUserClaims(uid, adminClaims);
```

### 権限レベル

- **super**: 全ての操作が可能
- **editor**: データの編集・公開が可能
- **viewer**: データの閲覧のみ可能

### 認証フロー

```typescript
// composables/useAdminAuth.ts
export const useAdminAuth = () => {
  const user = ref(null);
  const isAdmin = computed(() => user.value?.admin === true);

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdTokenResult();
    user.value = { ...credential.user, ...token.claims };
  };

  return { user, isAdmin, signIn };
};
```

## データ操作パターン

### 読み取り操作

```typescript
// composables/useFirestore.ts
export const useFirestore = () => {
  const getTimetables = async () => {
    const snapshot = await getDocs(collection(db, "timetables"));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  return { getTimetables };
};
```

### 書き込み操作（管理者のみ）

```typescript
// composables/useAdminFirestore.ts
export const useAdminFirestore = () => {
  const addTimetable = async (data: TimetableData) => {
    const docRef = await addDoc(collection(db, "timetables"), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const updateTimetable = async (id: string, data: Partial<TimetableData>) => {
    await updateDoc(doc(db, "timetables", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  };

  return { addTimetable, updateTimetable };
};
```

### バッチ操作

```typescript
const batchUpdate = async (updates: Array<{ id: string; data: any }>) => {
  const batch = writeBatch(db);

  updates.forEach(({ id, data }) => {
    const docRef = doc(db, "timetables", id);
    batch.update(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
};
```

## リアルタイム更新

### リスナーの設定

```typescript
export const useRealtimeData = () => {
  const alerts = ref([]);

  const startListening = () => {
    const unsubscribe = onSnapshot(collection(db, "alerts"), (snapshot) => {
      alerts.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    });

    return unsubscribe;
  };

  return { alerts, startListening };
};
```

## エラーハンドリング

### Firebase エラーの処理

```typescript
const handleFirebaseError = (error: FirebaseError) => {
  const errorMessages = {
    "auth/user-not-found": "ユーザーが見つかりません",
    "auth/wrong-password": "パスワードが間違っています",
    "permission-denied": "アクセス権限がありません",
    unavailable: "サービスが一時的に利用できません",
  };

  return errorMessages[error.code] || "予期しないエラーが発生しました";
};
```

## パフォーマンス最適化

### クエリ最適化

```typescript
// インデックスを活用したクエリ
const getActiveAlerts = async () => {
  const q = query(
    collection(db, "alerts"),
    where("active", "==", true),
    where("validTo", ">", new Date()),
    orderBy("validTo"),
    limit(10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
};
```

### キャッシュ戦略

```typescript
// オフライン対応
const enableOfflineSupport = () => {
  enableNetwork(db);

  // キャッシュからの読み取りを優先
  const getFromCache = async (collectionName: string) => {
    const snapshot = await getDocs(collection(db, collectionName), {
      source: "cache",
    });
    return snapshot.docs.map((doc) => doc.data());
  };
};
```

## デプロイメント

### ルールのデプロイ

```bash
# Firestore ルールのみ
firebase deploy --only firestore:rules

# Storage ルールのみ
firebase deploy --only storage

# 両方同時
firebase deploy --only firestore:rules,storage:rules
```

### データの初期化

```bash
# Firestore にサンプルデータを投入
node src/scripts/seed-firestore.js

# 管理者アカウントの作成
node src/scripts/setup-admin.js admin@example.com password123 super
```

## 監視・ログ

### 操作ログの記録

```typescript
const logAdminAction = async (action: string, details: any) => {
  await addDoc(collection(db, "adminLogs"), {
    action,
    details,
    userId: auth.currentUser?.uid,
    timestamp: serverTimestamp(),
    userAgent: navigator.userAgent,
  });
};
```

### パフォーマンス監視

```typescript
// Firebase Performance Monitoring
import { getPerformance, trace } from "firebase/performance";

const perf = getPerformance();
const dataLoadTrace = trace(perf, "data_load");

dataLoadTrace.start();
// データ読み込み処理
dataLoadTrace.stop();
```

## セキュリティベストプラクティス

### 1. 認証の強化

- 強力なパスワードポリシー
- 多要素認証の検討
- セッションタイムアウトの設定

### 2. データ保護

- 機密データの暗号化
- 最小権限の原則
- 定期的な権限見直し

### 3. 監査ログ

- 全ての管理者操作をログ記録
- 異常なアクセスパターンの検知
- 定期的なログ分析
