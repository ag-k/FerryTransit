# お知らせ機能仕様書

## 概要

隠岐航路案内のお知らせ機能は、管理者が運航情報やキャンペーン情報などを作成・管理し、ユーザーに配信するためのシステムです。

## データ構造

### News インターフェース

```typescript
interface News {
  id?: string; // 自動生成されるID
  category: "announcement" | "maintenance" | "feature" | "campaign"; // カテゴリー
  title: string; // タイトル（日本語）必須
  titleEn?: string; // タイトル（英語）
  content: string; // 本文（日本語）必須
  contentEn?: string; // 本文（英語）
  status: "draft" | "published" | "scheduled" | "archived"; // 公開状態
  priority: "low" | "medium" | "high" | "urgent"; // 優先度
  publishDate: Date | string; // 公開日時
  isPinned: boolean; // 固定表示フラグ
  author?: string; // 作成者
  viewCount?: number; // 閲覧数
  hasDetail?: boolean; // 詳細ページの有無
  detailContent?: string; // 詳細ページコンテンツ（Markdown）
  detailContentEn?: string; // 詳細ページコンテンツ（英語）
}
```

## システムアーキテクチャ

### データフロー

```
管理画面（Admin）           Firestore              Firebase Storage        ユーザー画面
     │                        │                          │                    │
     ├─[作成/編集]──────────→│                          │                    │
     │                        │                          │                    │
     ├─[データ公開]──────────→├─[published only]───────→│                    │
     │                        │                          │                    │
     │                        │                          ├─[news.json]───────→│
     │                        │                          │                    │
     │                        │                          │←─[fetch]───────────┤
     │                        │                          │                    │
     │                        │                          │                 [30分キャッシュ]
```

### データ保存場所

1. **Firestore**: `/news` コレクション

   - すべてのお知らせデータ（下書き含む）
   - 管理者のみアクセス可能

2. **Firebase Storage**: `/data/news.json`
   - 公開中のお知らせのみ
   - 誰でもアクセス可能（CORS 設定済み）
   - 30 分間のローカルストレージキャッシュ

## 機能詳細

### 1. 管理機能（Admin）

#### データ入力画面 (`/admin/news/edit`)

**入力項目：**

- カテゴリー（必須）
  - お知らせ (announcement)
  - メンテナンス (maintenance)
  - 新機能 (feature)
  - キャンペーン (campaign)
- 優先度
  - 低 (low)
  - 中 (medium) - デフォルト
  - 高 (high)
  - 緊急 (urgent)
- タイトル
  - 日本語（必須）
  - 英語（任意）
- 本文
  - 日本語（必須）
  - 英語（任意）
- 公開設定
  - ステータス（下書き/公開/予約/アーカイブ）
  - 公開日時
  - 固定表示（isPinned）
- 詳細ページ
  - 詳細ページの有無（hasDetail）
  - 詳細コンテンツ（Markdown 形式）

#### 管理画面一覧 (`/admin/news/index`)

**機能：**

- お知らせ一覧表示
- フィルタリング（カテゴリー、ステータス）
- 並び替え（公開日時降順）
- 一括操作（削除、ステータス変更）
- データ公開（Firebase Storage への反映）
- 予約投稿の自動公開（1 分ごとにチェック）

### 2. 表示機能（User）

#### コンポーネント構成

1. **NewsSection** (`components/news/NewsSection.vue`)

   - ホームページ等で使用
   - 固定お知らせ優先表示
   - 表示件数制限（デフォルト 3 件）

2. **NewsCard** (`components/news/NewsCard.vue`)

   - 個別のお知らせ表示
   - カテゴリーバッジ
   - 優先度による色分け
   - 固定アイコン表示

3. **お知らせ一覧ページ** (`/news`)

   - 全お知らせの一覧
   - カテゴリーフィルター
   - ページネーション（10 件/ページ）

4. **お知らせ詳細ページ** (`/news/[id]`)
   - Markdown レンダリング
   - パンくずリスト
   - SEO 最適化

### 3. データ取得と管理（useNews）

**主要機能：**

```typescript
// お知らせデータの取得
const { news, loading, error } = useNews();

// カテゴリー別フィルタ
const announcementNews = getNewsByCategory("announcement");

// 最新のお知らせ取得
const latestNews = getLatestNews(5);

// 固定/通常お知らせの分離
const { pinnedNews, regularNews } = useNews();
```

**キャッシュ戦略：**

- 30 分間のローカルストレージキャッシュ
- キャッシュキー: `ferry-news-cache`
- タイムスタンプベースの有効期限管理

## セキュリティ

### Firestore ルール

```javascript
match /news/{newsId} {
  // 読み取り: 公開されているニュースは誰でも、それ以外は管理者のみ
  allow read: if resource.data.status == 'published' || isAdmin();

  // 作成: 管理者のみ（必須フィールドチェック付き）
  allow create: if isAdmin() &&
    request.resource.data.keys().hasAll(['category', 'title', 'content', 'status']);

  // 更新・削除: 管理者のみ
  allow update, delete: if isAdmin();
}
```

### Firebase Storage CORS 設定

```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 300
  }
]
```

## 多言語対応

- タイトルと本文は日本語・英語の 2 言語対応
- ロケールに応じて自動切り替え
- カテゴリー名も翻訳キーで管理

### 翻訳キー（i18n）

```
news.title              お知らせ / News
news.noNews             現在お知らせはありません / No news at this time
news.viewAll            すべて見る / View all
news.pageTitle          お知らせ一覧 / News
news.allCategories      すべてのカテゴリー / All Categories
news.category.*         各カテゴリーの翻訳
```

## パフォーマンス最適化

1. **データ量削減**

   - 公開中のデータのみを Storage に保存
   - 必要最小限のフィールドのみエクスポート

2. **キャッシュ活用**

   - 30 分間のローカルストレージキャッシュ
   - Storage アクセスの削減

3. **遅延読み込み**
   - 詳細コンテンツは詳細ページでのみ取得
   - 一覧では要約のみ表示

## 運用フロー

1. **お知らせ作成**

   - 管理者が管理画面から新規作成
   - 下書き保存で内容確認

2. **公開設定**

   - 即時公開または予約投稿
   - 固定表示の設定

3. **データ反映**

   - 「データ公開」ボタンで Storage へ反映
   - ユーザー画面に即座に表示

4. **更新・削除**
   - Firestore で編集
   - 再度「データ公開」で反映
