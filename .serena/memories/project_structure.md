# プロジェクト構造

## ルートディレクトリ
```
FerryTransit/
├── src/                    # Nuxt3アプリケーション本体
├── archive/                # AngularJS版（レガシー、参照のみ）
├── i18n/                   # 多言語対応
│   └── locales/           # ロケールファイル
│       ├── ja.json        # 日本語
│       └── en.json        # 英語
├── docs/                   # ドキュメント
│   ├── phase-plans/       # フェーズごとの計画
│   ├── work-logs/         # 日付ごとの作業ログ
│   └── migration/         # 移行関連ドキュメント
├── package.json           # プロジェクト設定
├── nuxt.config.ts        # Nuxt設定
├── firebase.json         # Firebase設定
├── capacitor.config.ts   # Capacitor設定
├── bugs.md               # 障害管理
└── CLAUDE.md             # Claude Code用ガイドライン
```

## src/ディレクトリ構造
```
src/
├── assets/               # 静的アセット（CSS、画像など）
├── components/           # Vueコンポーネント
├── composables/          # Composable関数
├── layouts/             # レイアウトコンポーネント
├── middleware/          # ルートミドルウェア
├── pages/               # ページコンポーネント（ルート）
├── plugins/             # Nuxtプラグイン
├── public/              # 公開静的ファイル
├── stores/              # Piniaストア
├── types/               # TypeScript型定義
├── data/                # 静的データファイル
├── scripts/             # ユーティリティスクリプト
├── server/              # サーバーサイドコード（未使用）
├── functions/           # Firebase Functions
├── tests/               # テストファイル
├── ios/                 # iOS用Capacitorプロジェクト
├── android/             # Android用Capacitorプロジェクト
├── firestore.rules      # Firestoreセキュリティルール
└── storage.rules        # Storageセキュリティルール
```

## 重要な設定ファイル
- `nuxt.config.ts` - Nuxt設定（srcDirを'src/'に設定）
- `firebase.json` - Firebase設定
- `firestore.rules` - Firestoreルール
- `storage.rules` - Storageルール
- `i18n.config.ts` - 国際化設定

## 注意事項
- SPAのため`/server/api`ディレクトリは使用禁止
- すべてのデータ取得はFirebase Storage/Firestore経由