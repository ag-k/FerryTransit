---
inclusion: always
---

# 国際化（i18n）ガイドライン

## 基本設定

### サポート言語

- **日本語 (ja)**: プライマリ言語
- **英語 (en)**: セカンダリ言語

### 設定ファイル

```typescript
// i18n.config.ts
export default defineI18nConfig(() => ({
  legacy: false,
  locale: "ja",
  fallbackLocale: "en",
  messages: {
    ja: () => import("~/i18n/locales/ja.json"),
    en: () => import("~/i18n/locales/en.json"),
  },
}));
```

### Nuxt 設定

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@nuxtjs/i18n"],
  i18n: {
    locales: [
      { code: "ja", name: "日本語", file: "ja.json" },
      { code: "en", name: "English", file: "en.json" },
    ],
    defaultLocale: "ja",
    strategy: "prefix_except_default",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
  },
});
```

## 翻訳キー構造

### 階層構造

```json
{
  "common": {
    "loading": "読み込み中...",
    "error": "エラーが発生しました",
    "save": "保存",
    "cancel": "キャンセル",
    "confirm": "確認",
    "delete": "削除"
  },
  "navigation": {
    "timetable": "時刻表",
    "transit": "乗換案内",
    "status": "運行状況",
    "settings": "設定",
    "favorites": "お気に入り",
    "history": "履歴"
  },
  "pages": {
    "timetable": {
      "title": "フェリー時刻表",
      "departure": "出発港",
      "arrival": "到着港",
      "date": "日付",
      "search": "検索"
    },
    "transit": {
      "title": "乗換案内",
      "route": "経路",
      "duration": "所要時間",
      "fare": "料金"
    }
  },
  "components": {
    "portSelector": {
      "placeholder": "港を選択してください",
      "saigo": "西郷",
      "hishiura": "菱浦",
      "beppu": "別府",
      "goura": "来居"
    }
  },
  "ferry": {
    "ships": {
      "oki": "フェリーおき",
      "shirashima": "フェリーしらしま",
      "kuniga": "フェリーくにが",
      "dozen": "フェリーどうぜん"
    },
    "status": {
      "normal": "通常運航",
      "delayed": "遅延",
      "cancelled": "欠航"
    }
  },
  "admin": {
    "title": "管理画面",
    "login": "ログイン",
    "logout": "ログアウト",
    "dashboard": "ダッシュボード",
    "timetable": "時刻表管理",
    "news": "お知らせ管理"
  }
}
```

## 使用方法

### テンプレートでの使用

```vue
<template>
  <div>
    <!-- 基本的な使用 -->
    <h1>{{ $t("pages.timetable.title") }}</h1>

    <!-- パラメータ付き -->
    <p>{{ $t("ferry.departureTime", { time: "08:00" }) }}</p>

    <!-- 複数形対応 -->
    <p>{{ $t("search.results", { count: resultCount }) }}</p>

    <!-- 条件分岐 -->
    <span :class="statusClass">
      {{ $t(`ferry.status.${ferry.status}`) }}
    </span>
  </div>
</template>
```

### Composition API での使用

```vue
<script setup>
const { t, locale } = useI18n();

// 翻訳の取得
const title = computed(() => t("pages.timetable.title"));

// 動的キー
const getStatusText = (status) => {
  return t(`ferry.status.${status}`);
};

// 言語切り替え
const switchLanguage = (lang) => {
  locale.value = lang;
};
</script>
```

### JavaScript/TypeScript での使用

```typescript
// composables/useRouteSearch.ts
export const useRouteSearch = () => {
  const { t } = useI18n();

  const validateInput = (departure: string, arrival: string) => {
    if (!departure) {
      return t("validation.departureRequired");
    }
    if (!arrival) {
      return t("validation.arrivalRequired");
    }
    return null;
  };

  return { validateInput };
};
```

## 翻訳キー命名規則

### 1. 階層構造

- **common**: 共通で使用される文言
- **navigation**: ナビゲーション関連
- **pages**: ページ固有の文言
- **components**: コンポーネント固有の文言
- **validation**: バリデーションメッセージ
- **error**: エラーメッセージ

### 2. 命名規則

```json
{
  "pages": {
    "pageName": {
      "title": "ページタイトル",
      "subtitle": "サブタイトル",
      "description": "説明文",
      "actions": {
        "save": "保存",
        "edit": "編集"
      }
    }
  }
}
```

### 3. 動的コンテンツ

```json
{
  "messages": {
    "welcome": "こんにちは、{name}さん",
    "itemCount": "{count}件の結果",
    "lastUpdated": "{date}に更新"
  }
}
```

## 地域固有の対応

### 日付・時刻フォーマット

```vue
<template>
  <div>
    <!-- 日本語: 2024年1月15日 -->
    <!-- 英語: January 15, 2024 -->
    <p>{{ $d(new Date(), "long") }}</p>

    <!-- 時刻表示 -->
    <span>{{ $d(departureTime, "time") }}</span>
  </div>
</template>

<script setup>
// i18n.config.ts での設定
const datetimeFormats = {
  ja: {
    short: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    time: { hour: "2-digit", minute: "2-digit" },
  },
  en: {
    short: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    time: { hour: "2-digit", minute: "2-digit", hour12: true },
  },
};
</script>
```

### 数値フォーマット

```vue
<template>
  <div>
    <!-- 料金表示 -->
    <span>{{ $n(fare, "currency") }}</span>

    <!-- パーセント表示 -->
    <span>{{ $n(0.85, "percent") }}</span>
  </div>
</template>

<script setup>
// 数値フォーマット設定
const numberFormats = {
  ja: {
    currency: { style: "currency", currency: "JPY" },
    percent: { style: "percent" },
  },
  en: {
    currency: { style: "currency", currency: "JPY" },
    percent: { style: "percent" },
  },
};
</script>
```

## 複数形対応

### 英語の複数形

```json
{
  "en": {
    "search": {
      "result": "no results | one result | {count} results"
    }
  },
  "ja": {
    "search": {
      "result": "{count}件の結果"
    }
  }
}
```

### 使用例

```vue
<template>
  <p>{{ $tc("search.result", resultCount, { count: resultCount }) }}</p>
</template>
```

## 言語切り替え機能

### 言語切り替えコンポーネント

```vue
<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100"
    >
      <Icon :name="currentLanguage.flag" class="w-4 h-4" />
      <span>{{ currentLanguage.name }}</span>
      <Icon name="chevron-down" class="w-4 h-4" />
    </button>

    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
    >
      <button
        v-for="lang in availableLanguages"
        :key="lang.code"
        @click="switchLanguage(lang.code)"
        class="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100"
        :class="{ 'bg-blue-50': locale === lang.code }"
      >
        <Icon :name="lang.flag" class="w-4 h-4 mr-3" />
        {{ lang.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
const { locale, locales } = useI18n();
const localePath = useLocalePath();

const availableLanguages = [
  { code: "ja", name: "日本語", flag: "flag-jp" },
  { code: "en", name: "English", flag: "flag-us" },
];

const currentLanguage = computed(() =>
  availableLanguages.find((lang) => lang.code === locale.value)
);

const switchLanguage = async (langCode) => {
  await navigateTo(switchLocalePath(langCode));
  showDropdown.value = false;
};
</script>
```

## SEO 対応

### メタタグの国際化

```vue
<script setup>
const { t } = useI18n();

useSeoMeta({
  title: t("pages.timetable.meta.title"),
  description: t("pages.timetable.meta.description"),
  ogTitle: t("pages.timetable.meta.ogTitle"),
  ogDescription: t("pages.timetable.meta.ogDescription"),
});
</script>
```

### hreflang 設定

```vue
<script setup>
useHead({
  link: [
    {
      rel: "alternate",
      hreflang: "ja",
      href: "https://ferry-transit.com/ja/timetable",
    },
    {
      rel: "alternate",
      hreflang: "en",
      href: "https://ferry-transit.com/en/timetable",
    },
  ],
});
</script>
```

## 翻訳管理

### 翻訳ファイルの検証

```typescript
// scripts/validate-translations.ts
import jaTranslations from "../i18n/locales/ja.json";
import enTranslations from "../i18n/locales/en.json";

const validateTranslations = () => {
  const jaKeys = getAllKeys(jaTranslations);
  const enKeys = getAllKeys(enTranslations);

  const missingInEn = jaKeys.filter((key) => !enKeys.includes(key));
  const missingInJa = enKeys.filter((key) => !jaKeys.includes(key));

  if (missingInEn.length > 0) {
    console.error("Missing English translations:", missingInEn);
  }

  if (missingInJa.length > 0) {
    console.error("Missing Japanese translations:", missingInJa);
  }
};
```

### 未使用キーの検出

```bash
# 使用されていない翻訳キーを検出
npm run i18n:unused-keys
```

## ベストプラクティス

### 1. キー設計

- **階層を浅く**: 3 階層以下に制限
- **意味のある名前**: 内容が推測できる命名
- **一貫性**: 同じ概念には同じキー名を使用

### 2. 翻訳品質

- **自然な表現**: 機械翻訳ではなく自然な文章
- **文脈を考慮**: 使用される場面を考慮した翻訳
- **文字数制限**: UI の制約を考慮した長さ

### 3. メンテナンス

- **定期的な見直し**: 翻訳の品質チェック
- **バージョン管理**: 翻訳の変更履歴を管理
- **レビュープロセス**: ネイティブスピーカーによるレビュー

### 4. パフォーマンス

- **遅延読み込み**: 必要な言語のみ読み込み
- **キャッシュ**: 翻訳データのキャッシュ
- **最小化**: 不要な翻訳キーの削除

## トラブルシューティング

### よくある問題

1. **翻訳が表示されない**

   - キーの存在確認
   - ファイルパスの確認
   - 構文エラーのチェック

2. **動的キーが動作しない**

   ```vue
   <!-- ❌ 間違い -->
   <span>{{ $t('status.' + statusValue) }}</span>

   <!-- ✅ 正しい -->
   <span>{{ $t(`status.${statusValue}`) }}</span>
   ```

3. **パラメータが反映されない**

   ```vue
   <!-- ❌ 間違い -->
   <span>{{ $t('welcome', name) }}</span>

   <!-- ✅ 正しい -->
   <span>{{ $t('welcome', { name }) }}</span>
   ```
