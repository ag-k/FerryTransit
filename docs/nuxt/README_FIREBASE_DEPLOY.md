# Firebase デプロイガイド

このドキュメントでは、FerryTransit Nuxt3アプリケーションをFirebaseにデプロイする手順を説明します。

## 前提条件

- Firebase CLI がインストールされていること
- Firebase アカウントを持っていること
- Node.js 18 以上がインストールされていること

## セットアップ手順

### 1. Firebase CLI のインストール

```bash
npm install -g firebase-tools
```

### 2. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com) にログイン
2. 新しいプロジェクトを作成
3. 以下のサービスを有効化：
   - Authentication
   - Firestore Database
   - Storage
   - Hosting
   - Functions

### 3. Firebase CLI でログイン

```bash
firebase login
```

### 4. プロジェクトの初期化

```bash
# プロジェクトルートで実行
firebase init

# 以下のサービスを選択:
# - Firestore
# - Functions
# - Hosting
# - Storage
# - Emulators
```

### 5. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集して、Firebase の情報を入力：

```env
NUXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NUXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### 6. ローカル開発環境のセットアップ

```bash
# Firebase Emulators を起動
npm run firebase:emulators

# 別のターミナルで Nuxt 開発サーバーを起動
npm run dev
```

## Firestore データ構造

### コレクション設計

```
firestore/
├── ports/                    # 港情報
│   └── {portId}
│       ├── code: string
│       ├── nameJa: string
│       ├── nameEn: string
│       ├── latitude: number
│       ├── longitude: number
│       └── isMainland: boolean
│
├── ships/                    # 船舶情報
│   └── {shipId}
│       ├── code: string
│       ├── nameJa: string
│       ├── nameEn: string
│       ├── capacityPassengers: number
│       ├── capacityCars: number
│       └── speedKnots: number
│
├── routes/                   # 航路情報
│   └── {routeId}
│       ├── fromPortId: string
│       ├── fromPortCode: string
│       ├── toPortId: string
│       ├── toPortCode: string
│       ├── shipId: string
│       ├── durationMinutes: number
│       └── distanceKm: number
│
├── timetables/              # 時刻表
│   └── {timetableId}
│       ├── routeId: string
│       ├── departureTime: string
│       ├── arrivalTime: string
│       ├── validFrom: timestamp
│       ├── validUntil: timestamp | null
│       ├── dayOfWeek: number[]
│       ├── isSpecialSchedule: boolean
│       ├── specialDates: string[]
│       ├── excludedDates: string[]
│       ├── notesJa: string
│       └── notesEn: string
│
├── fares/                   # 料金情報
│   └── {fareId}
│       ├── routeId: string
│       ├── passengerType: string
│       ├── fareClass: string
│       ├── price: number
│       └── peakSeasonPrice: number
│
├── announcements/           # お知らせ
│   └── {announcementId}
│       ├── titleJa: string
│       ├── titleEn: string
│       ├── contentJa: string
│       ├── contentEn: string
│       ├── type: string
│       ├── priority: number
│       ├── isActive: boolean
│       ├── displayFrom: timestamp
│       └── displayUntil: timestamp
│
└── operationAlerts/         # 運航アラート
    └── {alertId}
        ├── routeId: string
        ├── alertDate: string
        ├── status: string
        ├── delayMinutes: number
        ├── reasonJa: string
        └── reasonEn: string
```

### 初期データの投入

```bash
# Firestore にサンプルデータを投入
node scripts/seed-firestore.js
```

## デプロイ手順

### 1. Functions の依存関係インストール

```bash
cd functions
npm install
cd ..
```

### 2. Nuxt アプリケーションのビルド

```bash
npm run build
```

### 3. Firebase へのデプロイ

```bash
# すべてをデプロイ
npm run deploy

# または個別にデプロイ
npm run firebase:deploy:hosting    # Hosting のみ
npm run firebase:deploy:functions  # Functions のみ
```

## Firebase Functions

### 実装済み Functions

1. **getTimetableData**: 時刻表データの取得
   - 入力: fromPort, toPort, date
   - 出力: 該当する時刻表データ

2. **nuxtApp**: Nuxt SSR ハンドラー（開発中）

### Functions のローカルテスト

```bash
cd functions
npm run serve
```

## セキュリティ設定

### Firestore Security Rules

`firestore.rules` ファイルで以下のルールを設定：

- 公開データ（港、船、時刻表など）は誰でも読み取り可能
- 管理者のみ書き込み可能
- お知らせは有効期間内のもののみ公開

### Authentication 設定

Firebase Console で以下を設定：

1. メール/パスワード認証を有効化
2. 管理者ユーザーの作成
3. カスタムクレームで管理者権限を付与

```javascript
// 管理者権限の付与（Firebase Admin SDK）
await admin.auth().setCustomUserClaims(uid, { admin: true })
```

## パフォーマンス最適化

### Firestore インデックス

`firestore.indexes.json` で以下のインデックスを定義：

- 時刻表の効率的なクエリ用インデックス
- ログデータの日付順インデックス
- お知らせの有効期間フィルタ用インデックス

### キャッシュ戦略

- Firestore のオフライン永続性を有効化
- 静的アセットは Firebase Hosting の CDN でキャッシュ
- Functions のレスポンスキャッシュを適切に設定

## 監視とログ

### Firebase Console での監視

- **Performance Monitoring**: アプリのパフォーマンスを監視
- **Crashlytics**: クラッシュレポートの確認
- **Analytics**: ユーザー行動の分析
- **Functions Logs**: Cloud Functions のログ確認

### ログの確認

```bash
# Functions のログを表示
firebase functions:log

# 特定の Function のログのみ表示
firebase functions:log --only getTimetableData
```

## トラブルシューティング

### デプロイエラー

1. **権限エラー**: Firebase プロジェクトの権限を確認
2. **ビルドエラー**: Node.js バージョンを確認（18以上）
3. **Functions エラー**: `functions/package.json` の依存関係を確認

### Firestore エラー

1. **インデックスエラー**: Firebase Console でインデックスを作成
2. **権限エラー**: Security Rules を確認
3. **クォータエラー**: Firebase プランをアップグレード

## 本番環境の考慮事項

1. **環境変数**: 本番用の環境変数を設定
2. **ドメイン設定**: カスタムドメインを Firebase Hosting に設定
3. **バックアップ**: Firestore の自動バックアップを設定
4. **監視**: アラート設定で異常を検知
5. **スケーリング**: Functions の同時実行数を調整