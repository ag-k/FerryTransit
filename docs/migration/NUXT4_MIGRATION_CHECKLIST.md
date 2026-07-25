# Nuxt 4 移行チェックリスト

最終更新: 2026-03-22

## 目的

- Nuxt 3.21 系から Nuxt 4 系へ、安全に段階移行する。
- 既存の画面構成、Firebase 連携、Capacitor ビルドを壊さない。
- 既存の TypeScript エラー解消は別トラックに分離し、Nuxt 4 移行と混ぜない。

## 開始時点のベースライン

- 現在の本体は `nuxt@3.21.x`、Node は `v20.19.6`。
- `npm run build` は成功している。
- `npm run typecheck` は既存エラー 719 件で失敗している。
- アプリは `ssr: false`。
- `srcDir: "src/"` を使っている。
- `src/public` を使っている。
- `src/server` は残っているが、静的配信前提の移行では依存しない。
- 主要依存は `@nuxtjs/i18n`、`@pinia/nuxt`、`@nuxt/icon`、`@nuxtjs/google-fonts`、`@nuxtjs/tailwindcss`。

## 現在の進捗

- `nuxt@4.4.2` への更新が完了している。
- `npm run build` が Nuxt 4 上で成功している。
- `npm run generate` が Nuxt 4 上で成功し、`.output/public` を生成できている。
- `CAPACITOR_BUILD=true npm run generate` も成功している。
- `src/public` 配下の `favicon.ico`、`apple-touch-icon.png`、`robots.txt`、`data/holidays.json` が生成物に含まれることを確認済み。
- 生成物ベースの `rg 'pages/admin|layouts/admin|middleware/admin|/admin'` 件数は通常ビルドで `9`、Capacitor ビルドで `0` だった。
- `npm run typecheck` の既存失敗は別トラックのまま据え置く。

## スコープ

### この移行でやること

- Nuxt 4 互換動作への事前切り替え
- Nuxt 本体の 4 系への更新
- 最低限必要な設定変更
- Web と Capacitor 向けの回帰確認

### この移行でやらないこと

- 719 件の型エラー一掃
- `app/`, `server/`, `public/`, `shared/` への全面再配置
- UI 改修や機能追加
- Cloud Functions 側の設計変更

## 重要な論点

- 最大のリスクは `srcDir: "src/"` と `src/public` の組み合わせ。
- `experimental.treeshakeClientOnly: false` は Nuxt 4 で削除前提。
- `useAsyncData` / `useFetch` の利用はほぼ無いため、データ取得レイヤーの破壊的変更は低リスク。
- `ssr: false` のため、今回の移行では `/server/api` を前提にしない。

## PR 方針

- 1 PR 1 目的で切る。
- Nuxt 4 移行と型修正を混ぜない。
- 依存更新は「その PR で必要な範囲だけ」に留める。
- 各 PR で `npm run build` を必須ゲートにする。
- 型検査は「総数を増やさない」を最低条件にする。

## PR1: 互換動作の先行適用

### 目的

- まだ Nuxt 3.21 系のまま、Nuxt 4 相当の挙動を先に踏む。

### 変更チェック

- [x] `nuxt.config.ts` に `future.compatibilityVersion: 4` を追加する
- [x] `experimental.treeshakeClientOnly` を削除する
- [x] `dir.public: "src/public"` を明示する
- [x] 既存の `srcDir: "src/"` は維持する
- [x] 互換フラグは必要になったものだけ一時追加する
- [ ] 互換フラグを追加した理由を PR 説明に残す

### 確認チェック

- [x] `npm run build`
- [ ] `/`
- [ ] `/status`
- [ ] `/transit`
- [ ] `/fare`
- [ ] `/news`
- [ ] `/settings`
- [ ] `/admin/login`
- [x] `/favicon.ico`
- [x] `/apple-touch-icon.png`
- [x] `/robots.txt`
- [x] `/data/holidays.json`

### 完了条件

- 互換動作で build が通る。
- 主要ルートと公開アセットが現行同等で動く。
- 追加した互換フラグの有無と理由が説明できる。

## PR2: Nuxt 4 本体への更新

### 目的

- Nuxt 本体を 4 系へ上げる。

### 変更チェック

- [x] `nuxt` を 4 系へ更新する
- [x] lockfile を更新する
- [x] 互換フラグのうち不要になったものを外す
- [x] `nuxt.config.ts` の非推奨設定が残っていないか確認する
- [x] 依存モジュールはビルドを止めるものだけ更新する
- [x] `compatibilityDate` は同 PR ではむやみに動かさない

### 確認チェック

- [x] `npm run build`
- [x] `npm run generate`
- [x] `.output/public` が生成される
- [ ] i18n の切り替えが動く
- [ ] Firebase 関連プラグインが初期化できる
- [ ] `<head>` の title / meta が主要画面で崩れない

### 完了条件

- Nuxt 4 で build と generate が通る。
- 主要機能に明確な回帰が無い。

## PR3: Capacitor / 管理画面 / デプロイ経路の回帰確認

### 目的

- このリポジトリ固有の運用経路が Nuxt 4 でも維持できるか確認する。

### 変更チェック

- [x] `CAPACITOR_BUILD=true` 時のページ除外が維持されるか確認する
- [x] `pages:extend` による admin pruning が維持されるか確認する
- [ ] `nitro.prerender.ignore` の admin 除外が維持されるか確認する
- [x] `src/public` 配下の静的ファイルが配信されるか確認する
- [x] 必要ならドキュメントに既知制約を追記する

### 確認チェック

- [x] `CAPACITOR_BUILD=true npm run generate`
- [x] `/favicon.ico`
- [x] `/apple-touch-icon.png`
- [x] `/robots.txt`
- [x] `/data/holidays.json`
- [x] 通常ビルド生成物に admin 関連コードが含まれる
- [x] Capacitor 向け生成物に admin 関連コードが含まれない

### 完了条件

- Web 配布と Capacitor 配布の両方で想定構成が守られる。
- 静的配信前提の構成が守られている。

## PR4: 後続の整理タスクを分離

### 目的

- Nuxt 4 移行後の残課題を別チケット化する。

### チェック

- [ ] `app/` / `server/` / `public/` / `shared/` への正規化を別チケット化する
- [ ] `tailwind.config.js` の `content` パス更新を別チケット化する
- [ ] 使っていない `src/server` の扱いを別チケット化する
- [ ] TypeScript エラー 719 件の削減方針を別チケット化する
- [ ] `nuxt typecheck` を CI の正式ゲートに戻す条件を定義する

### 完了条件

- 「今すぐ必要な移行」と「後でやる整理」が分離されている。

## 実行コマンド一覧

```bash
npm run build
npm run generate
CAPACITOR_BUILD=true npm run generate
npx serve .output/public
```

## 手動確認メモ

- 主要画面の描画崩れはスクリーンショットで残す。
- i18n は `ja` / `en` の両方で確認する。
- Firebase は emulator / 非 emulator の両方で設定崩れがないか見る。
- admin 関連は通常ビルドと Capacitor ビルドで挙動差を確認する。

## 2026-03-22 実行メモ

- 実行コマンド:
  - `npm run build`
  - `npm run generate`
  - `CAPACITOR_BUILD=true npm run generate`
- 主要結果:
  - Nuxt 4.4.2 で `build` / `generate` は成功した。
  - 通常ビルドの生成物では admin 関連文字列のヒット数が `9`。
  - Capacitor ビルドの生成物では同ヒット数が `0`。
  - `src/public` 配下の主要静的アセットは両方の生成物に存在した。
- 残作業:
  - i18n 切り替えの手動確認
  - Firebase 初期化の手動確認
  - 主要画面の title / meta の目視確認

## 保留事項

- 既存の `package.json` / `package-lock.json` 変更が別件なら、Nuxt 4 移行 PR と混ぜない。
- `npm run typecheck` の既存失敗は移行完了条件に入れない。
- ただし移行 PR で型エラー総数を増やした場合は差し戻す。

## 参考

- https://nuxt.com/docs/3.x/getting-started/upgrade
- https://nuxt.com/docs/4.x/getting-started/upgrade
