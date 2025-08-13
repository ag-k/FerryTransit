# コーディング規約とスタイル

## 言語設定
- **TypeScript strict mode** - 必須
- **any型の使用禁止** - unknown や適切な型を使用

## 命名規則
### ファイル名
- コンポーネント: PascalCase（例: `NewsCard.vue`）
- Composable: camelCase with use prefix（例: `useNews.ts`）
- ストア: camelCase（例: `transitStore.ts`）
- 型定義: types/配下に配置

### 変数・関数名
- 変数: camelCase
- 定数: UPPER_SNAKE_CASE
- 関数: camelCase
- インターフェース/型: PascalCase

## Vue/Nuxtスタイル
- **Composition API** を使用（Options APIは使わない）
- `<script setup>` 構文を推奨
- テンプレート内では英語のキーを使用

## スタイリング
- **Tailwind CSS** を優先使用
- カスタムスタイルは最小限に
- SCSSファイルは `assets/css/` に配置
- レスポンシブ: モバイルファーストで設計

## 国際化（i18n）
- すべてのユーザー向けテキストは i18n 経由で表示
- キー名は英語で統一
- 例: `$t('navigation.timetable')`

## コメント
- **コメントは追加しない**（CLAUDE.mdの指示通り）
- 必要な場合のみ、簡潔に

## インポート
- 絶対パス使用: `~/components/...`
- 型のインポート: `import type { ... }`

## エラーハンドリング
- try-catchで適切にエラーを処理
- ユーザーへのエラー表示は i18n 経由

## テスト
- 新機能追加時は必ずユニットテストを作成
- テストファイルは `__tests__` ディレクトリに配置
- Vitest + @vue/test-utils を使用

## セキュリティ
- シークレット・キーをコードに直接記載しない
- 環境変数を使用（.env ファイル）
- Firebase ルールで適切なアクセス制御

## アクセシビリティ
- WCAG 2.1 AA 準拠を目指す
- 適切なARIA属性を使用
- キーボードナビゲーション対応

## パフォーマンス
- 遅延ローディングを活用
- 画像は適切なサイズに最適化
- 不要な再レンダリングを避ける