---
inclusion: always
---

# UI/UX ガイドライン

## デザインシステム

### カラーパレット

```scss
// プライマリカラー（隠岐の海をイメージ）
$primary-50: #eff6ff;
$primary-500: #3b82f6;
$primary-900: #1e3a8a;

// セカンダリカラー（フェリーをイメージ）
$secondary-50: #f0f9ff;
$secondary-500: #0ea5e9;
$secondary-900: #0c4a6e;

// ニュートラル
$gray-50: #f9fafb;
$gray-500: #6b7280;
$gray-900: #111827;

// ステータスカラー
$success: #10b981;
$warning: #f59e0b;
$error: #ef4444;
$info: #3b82f6;
```

### タイポグラフィ

```scss
// フォントファミリー
$font-sans: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
$font-mono: "SF Mono", "Monaco", "Consolas", monospace;

// フォントサイズ（Tailwind準拠）
$text-xs: 0.75rem; // 12px
$text-sm: 0.875rem; // 14px
$text-base: 1rem; // 16px
$text-lg: 1.125rem; // 18px
$text-xl: 1.25rem; // 20px
$text-2xl: 1.5rem; // 24px
$text-3xl: 1.875rem; // 30px
```

### スペーシング

```scss
// Tailwind スペーシングスケール
$spacing-1: 0.25rem; // 4px
$spacing-2: 0.5rem; // 8px
$spacing-4: 1rem; // 16px
$spacing-6: 1.5rem; // 24px
$spacing-8: 2rem; // 32px
$spacing-12: 3rem; // 48px
```

## レスポンシブデザイン

### ブレークポイント

```scss
// Tailwind ブレークポイント
$sm: 640px; // スマートフォン（縦）
$md: 768px; // タブレット（縦）
$lg: 1024px; // タブレット（横）・小型PC
$xl: 1280px; // デスクトップ
$2xl: 1536px; // 大型デスクトップ
```

### モバイルファースト設計

```vue
<template>
  <!-- モバイル: 1列、タブレット以上: 2列 -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- コンテンツ -->
  </div>

  <!-- モバイル: 小さいテキスト、デスクトップ: 大きいテキスト -->
  <h1 class="text-xl md:text-3xl font-bold">
    {{ $t("pages.timetable.title") }}
  </h1>
</template>
```

## ナビゲーション設計

### モバイルナビゲーション（下タブ）

```vue
<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
    <div class="flex justify-around py-2">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.name"
        :to="item.path"
        class="flex flex-col items-center py-1 px-2"
        :class="{ 'text-primary-500': $route.path === item.path }"
      >
        <Icon :name="item.icon" class="w-6 h-6" />
        <span class="text-xs mt-1">{{ $t(item.label) }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
const navigationItems = [
  {
    name: "timetable",
    path: "/timetable",
    icon: "schedule",
    label: "nav.timetable",
  },
  {
    name: "transit",
    path: "/transit",
    icon: "directions",
    label: "nav.transit",
  },
  { name: "status", path: "/status", icon: "info", label: "nav.status" },
  {
    name: "settings",
    path: "/settings",
    icon: "settings",
    label: "nav.settings",
  },
];
</script>
```

### デスクトップナビゲーション（サイドバー）

```vue
<template>
  <aside class="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0">
    <div class="flex flex-col flex-grow bg-white border-r">
      <!-- ロゴ・ブランディング -->
      <div class="flex items-center px-4 py-6">
        <img src="/logo.svg" alt="FerryTransit" class="h-8 w-auto" />
      </div>

      <!-- ナビゲーションメニュー -->
      <nav class="flex-1 px-4 space-y-2">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.name"
          :to="item.path"
          class="flex items-center px-3 py-2 rounded-md hover:bg-gray-100"
        >
          <Icon :name="item.icon" class="w-5 h-5 mr-3" />
          {{ $t(item.label) }}
        </NuxtLink>
      </nav>
    </div>
  </aside>
</template>
```

## コンポーネント設計

### ボタンコンポーネント

```vue
<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <Icon v-if="loading" name="loading" class="animate-spin mr-2" />
    <Icon v-else-if="icon" :name="icon" class="mr-2" />
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
});

const buttonClasses = computed(() => [
  "inline-flex items-center justify-center font-medium rounded-md transition-colors",
  "focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    // バリアント
    "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500":
      props.variant === "primary",
    "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500":
      props.variant === "secondary",
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50":
      props.variant === "outline",
    "text-gray-700 hover:bg-gray-100": props.variant === "ghost",

    // サイズ
    "px-3 py-1.5 text-sm": props.size === "sm",
    "px-4 py-2 text-base": props.size === "md",
    "px-6 py-3 text-lg": props.size === "lg",

    // 状態
    "opacity-50 cursor-not-allowed": props.disabled || props.loading,
  },
]);
</script>
```

### カードコンポーネント

```vue
<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="px-6 py-4 border-b border-gray-200">
      <slot name="header" />
    </div>

    <div class="px-6 py-4">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="px-6 py-4 border-t border-gray-200 bg-gray-50"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  shadow?: "none" | "sm" | "md" | "lg";
  padding?: "none" | "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  shadow: "md",
  padding: "md",
});

const cardClasses = computed(() => [
  "bg-white rounded-lg border border-gray-200",
  {
    "shadow-none": props.shadow === "none",
    "shadow-sm": props.shadow === "sm",
    "shadow-md": props.shadow === "md",
    "shadow-lg": props.shadow === "lg",
  },
]);
</script>
```

## フォーム設計

### 入力フィールド

```vue
<template>
  <div class="space-y-1">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <input
      :id="inputId"
      v-model="modelValue"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :class="inputClasses"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />

    <p v-if="error" class="text-sm text-red-600">
      {{ error }}
    </p>

    <p v-else-if="hint" class="text-sm text-gray-500">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string;
  type?: string;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
});

const inputId = computed(
  () => `input-${Math.random().toString(36).substr(2, 9)}`
);

const inputClasses = computed(() => [
  "block w-full px-3 py-2 border rounded-md shadow-sm",
  "focus:outline-none focus:ring-1 focus:border-primary-500 focus:ring-primary-500",
  {
    "border-gray-300": !props.error,
    "border-red-300 focus:border-red-500 focus:ring-red-500": props.error,
    "bg-gray-50 cursor-not-allowed": props.disabled,
  },
]);
</script>
```

### セレクトボックス

```vue
<template>
  <div class="space-y-1">
    <label
      v-if="label"
      :for="selectId"
      class="block text-sm font-medium text-gray-700"
    >
      {{ label }}
    </label>

    <select
      :id="selectId"
      v-model="modelValue"
      :class="selectClasses"
      :disabled="disabled"
    >
      <option v-if="placeholder" value="" disabled>
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
interface Option {
  value: string | number;
  label: string;
}

interface Props {
  modelValue: string | number;
  options: Option[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const selectClasses = computed(() => [
  "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
  "focus:outline-none focus:ring-1 focus:border-primary-500 focus:ring-primary-500",
  "bg-white",
  {
    "bg-gray-50 cursor-not-allowed": props.disabled,
  },
]);
</script>
```

## ダークモード対応

### テーマ切り替え

```vue
<template>
  <button
    @click="toggleTheme"
    class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
    :aria-label="$t('theme.toggle')"
  >
    <Icon
      :name="isDark ? 'sun' : 'moon'"
      class="w-5 h-5 text-gray-600 dark:text-gray-400"
    />
  </button>
</template>

<script setup>
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === "dark");

const toggleTheme = () => {
  colorMode.preference = isDark.value ? "light" : "dark";
};
</script>
```

### ダークモード対応クラス

```vue
<template>
  <!-- 背景色 -->
  <div class="bg-white dark:bg-gray-900">
    <!-- テキスト色 -->
    <h1 class="text-gray-900 dark:text-white">タイトル</h1>

    <!-- ボーダー -->
    <div class="border-gray-200 dark:border-gray-700">
      <!-- カード -->
      <div class="bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-900/20">
        コンテンツ
      </div>
    </div>
  </div>
</template>
```

## アクセシビリティ

### キーボードナビゲーション

```vue
<template>
  <div
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
    class="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
  >
    クリック可能な要素
  </div>
</template>
```

### ARIA 属性

```vue
<template>
  <!-- ボタン -->
  <button :aria-expanded="isOpen" :aria-controls="menuId" aria-haspopup="true">
    メニュー
  </button>

  <!-- メニュー -->
  <ul :id="menuId" role="menu" :aria-hidden="!isOpen" class="absolute z-10">
    <li role="menuitem">
      <a href="/timetable">時刻表</a>
    </li>
  </ul>

  <!-- フォーム -->
  <label for="departure-port">出発港</label>
  <select
    id="departure-port"
    aria-describedby="departure-help"
    :aria-invalid="hasError"
  >
    <!-- オプション -->
  </select>
  <div id="departure-help" class="text-sm text-gray-500">
    出発する港を選択してください
  </div>
</template>
```

### スクリーンリーダー対応

```vue
<template>
  <!-- 視覚的に隠すが、スクリーンリーダーには読み上げられる -->
  <span class="sr-only">
    {{ $t("accessibility.loading") }}
  </span>

  <!-- 装飾的な要素はスクリーンリーダーから隠す -->
  <Icon name="decorative-icon" aria-hidden="true" />

  <!-- 代替テキスト -->
  <img :src="ferry.image" :alt="$t('ferry.imageAlt', { name: ferry.name })" />
</template>
```

## パフォーマンス最適化

### 画像最適化

```vue
<template>
  <!-- レスポンシブ画像 -->
  <picture>
    <source
      media="(min-width: 768px)"
      :srcset="`${image.large}.webp`"
      type="image/webp"
    />
    <source media="(min-width: 768px)" :srcset="image.large" />
    <source :srcset="`${image.small}.webp`" type="image/webp" />
    <img
      :src="image.small"
      :alt="image.alt"
      loading="lazy"
      class="w-full h-auto"
    />
  </picture>
</template>
```

### 遅延読み込み

```vue
<template>
  <!-- 大きなコンポーネントの遅延読み込み -->
  <Suspense>
    <template #default>
      <LazyTimetableChart />
    </template>
    <template #fallback>
      <SkeletonLoader />
    </template>
  </Suspense>
</template>

<script setup>
// 動的インポート
const LazyTimetableChart = defineAsyncComponent(() =>
  import("~/components/TimetableChart.vue")
);
</script>
```

## エラー表示

### エラーメッセージ

```vue
<template>
  <!-- インライン エラー -->
  <div v-if="error" class="rounded-md bg-red-50 p-4">
    <div class="flex">
      <Icon name="exclamation-triangle" class="h-5 w-5 text-red-400" />
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">
          {{ $t("error.title") }}
        </h3>
        <p class="mt-2 text-sm text-red-700">
          {{ error }}
        </p>
      </div>
    </div>
  </div>

  <!-- トースト通知 -->
  <Transition name="toast">
    <div
      v-if="showToast"
      class="fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg"
    >
      <div class="p-4">
        <div class="flex items-start">
          <Icon :name="toastIcon" :class="toastIconClass" />
          <div class="ml-3 w-0 flex-1">
            <p class="text-sm font-medium text-gray-900">
              {{ toastTitle }}
            </p>
            <p class="mt-1 text-sm text-gray-500">
              {{ toastMessage }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
```

## ローディング状態

### スケルトンローダー

```vue
<template>
  <div class="animate-pulse">
    <!-- ヘッダー -->
    <div class="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>

    <!-- コンテンツ行 -->
    <div class="space-y-3">
      <div class="h-4 bg-gray-200 rounded w-full"></div>
      <div class="h-4 bg-gray-200 rounded w-5/6"></div>
      <div class="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>

    <!-- ボタン -->
    <div class="h-10 bg-gray-200 rounded w-32 mt-6"></div>
  </div>
</template>
```

### スピナー

```vue
<template>
  <div class="flex items-center justify-center">
    <div
      class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"
    ></div>
    <span class="ml-2 text-sm text-gray-600">
      {{ $t("common.loading") }}
    </span>
  </div>
</template>
```
