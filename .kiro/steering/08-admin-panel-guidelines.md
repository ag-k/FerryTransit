---
inclusion: fileMatch
fileMatchPattern: "**/admin/**"
---

# 管理画面ガイドライン

## 管理画面概要

FerryTransit の管理画面は、フェリー運航データの管理、ユーザー分析、システム監視を行うための Web ベースの管理システムです。

### アクセス権限レベル

- **super**: 全ての機能にアクセス可能（システム管理者）
- **editor**: データの編集・公開が可能（運航管理者）
- **viewer**: データの閲覧のみ可能（一般管理者）

## 認証・セキュリティ

### ログイン機能

```vue
<!-- pages/admin/login.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ $t("admin.login.title") }}
        </h2>
      </div>

      <form @submit.prevent="handleLogin" class="mt-8 space-y-6">
        <div>
          <label for="email" class="sr-only">{{
            $t("admin.login.email")
          }}</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="relative block w-full px-3 py-2 border border-gray-300 rounded-md"
            :placeholder="$t('admin.login.emailPlaceholder')"
          />
        </div>

        <div>
          <label for="password" class="sr-only">{{
            $t("admin.login.password")
          }}</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            class="relative block w-full px-3 py-2 border border-gray-300 rounded-md"
            :placeholder="$t('admin.login.passwordPlaceholder')"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {{ loading ? $t("common.loading") : $t("admin.login.submit") }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false,
  middleware: "guest",
});

const { signIn } = useAdminAuth();
const form = reactive({ email: "", password: "" });
const loading = ref(false);
const error = ref("");

const handleLogin = async () => {
  loading.value = true;
  error.value = "";

  try {
    await signIn(form.email, form.password);
    await navigateTo("/admin");
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>
```

### 権限チェックミドルウェア

```typescript
// middleware/admin.ts
export default defineNuxtRouteMiddleware((to) => {
  const { user, isAdmin } = useAdminAuth();

  if (!user.value || !isAdmin.value) {
    throw createError({
      statusCode: 403,
      statusMessage: "アクセス権限がありません",
    });
  }

  // 特定の権限が必要なページのチェック
  const requiredRole = to.meta.adminRole;
  if (
    requiredRole &&
    user.value.role !== "super" &&
    user.value.role !== requiredRole
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "必要な権限がありません",
    });
  }
});
```

## レイアウト設計

### 管理画面レイアウト

```vue
<!-- components/admin/AdminLayout.vue -->
<template>
  <div class="min-h-screen bg-gray-100">
    <!-- サイドバー -->
    <AdminSidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

    <!-- メインコンテンツエリア -->
    <div class="lg:pl-64">
      <!-- ヘッダー -->
      <AdminHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <!-- ページコンテンツ -->
      <main class="py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
const sidebarOpen = ref(false);
</script>
```

### サイドバーナビゲーション

```vue
<!-- components/admin/AdminSidebar.vue -->
<template>
  <div
    class="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 lg:static lg:inset-auto"
  >
    <div class="flex items-center justify-center h-16 bg-gray-900">
      <h1 class="text-white text-xl font-bold">{{ $t("admin.title") }}</h1>
    </div>

    <nav class="mt-5 px-2">
      <NuxtLink
        v-for="item in navigationItems"
        :key="item.name"
        :to="item.href"
        class="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
        :class="{ 'bg-gray-800 text-white': $route.path === item.href }"
      >
        <Icon :name="item.icon" class="mr-4 h-6 w-6" />
        {{ $t(item.label) }}
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup>
const navigationItems = [
  {
    name: "dashboard",
    href: "/admin",
    icon: "dashboard",
    label: "admin.nav.dashboard",
  },
  {
    name: "timetable",
    href: "/admin/timetable",
    icon: "schedule",
    label: "admin.nav.timetable",
  },
  {
    name: "fare",
    href: "/admin/fare",
    icon: "payments",
    label: "admin.nav.fare",
  },
  {
    name: "news",
    href: "/admin/news",
    icon: "article",
    label: "admin.nav.news",
  },
  {
    name: "alerts",
    href: "/admin/alerts",
    icon: "warning",
    label: "admin.nav.alerts",
  },
  {
    name: "analytics",
    href: "/admin/analytics",
    icon: "analytics",
    label: "admin.nav.analytics",
  },
  {
    name: "users",
    href: "/admin/users",
    icon: "people",
    label: "admin.nav.users",
  },
];
</script>
```

## データ管理機能

### 時刻表管理

```vue
<!-- pages/admin/timetable.vue -->
<template>
  <div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900">
          {{ $t("admin.timetable.title") }}
        </h1>
        <p class="mt-2 text-sm text-gray-700">
          {{ $t("admin.timetable.description") }}
        </p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <button
          @click="showAddModal = true"
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {{ $t("admin.timetable.add") }}
        </button>
      </div>
    </div>

    <!-- フィルター -->
    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <select v-model="filters.route" class="rounded-md border-gray-300">
        <option value="">{{ $t("admin.timetable.allRoutes") }}</option>
        <option v-for="route in routes" :key="route" :value="route">
          {{ route }}
        </option>
      </select>

      <select v-model="filters.ship" class="rounded-md border-gray-300">
        <option value="">{{ $t("admin.timetable.allShips") }}</option>
        <option v-for="ship in ships" :key="ship" :value="ship">
          {{ ship }}
        </option>
      </select>

      <input
        v-model="filters.search"
        type="text"
        :placeholder="$t('admin.timetable.searchPlaceholder')"
        class="rounded-md border-gray-300"
      />
    </div>

    <!-- データテーブル -->
    <DataTable
      :data="filteredTimetables"
      :columns="tableColumns"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <!-- 編集モーダル -->
    <FormModal
      v-if="showEditModal"
      :title="$t('admin.timetable.editTitle')"
      @close="showEditModal = false"
      @save="handleSave"
    >
      <TimetableForm v-model="editingItem" />
    </FormModal>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
  adminRole: "editor",
});

const { timetables, updateTimetable, deleteTimetable } = useAdminTimetable();
const filters = reactive({ route: "", ship: "", search: "" });
const showEditModal = ref(false);
const editingItem = ref(null);

const tableColumns = [
  { key: "departure", label: "admin.timetable.departure" },
  { key: "arrival", label: "admin.timetable.arrival" },
  { key: "departureTime", label: "admin.timetable.departureTime" },
  { key: "ship", label: "admin.timetable.ship" },
  { key: "actions", label: "admin.common.actions" },
];

const filteredTimetables = computed(() => {
  return timetables.value.filter((item) => {
    if (filters.route && !item.route.includes(filters.route)) return false;
    if (filters.ship && item.ship !== filters.ship) return false;
    if (
      filters.search &&
      !item.departure.includes(filters.search) &&
      !item.arrival.includes(filters.search)
    )
      return false;
    return true;
  });
});

const handleEdit = (item) => {
  editingItem.value = { ...item };
  showEditModal.value = true;
};

const handleSave = async (data) => {
  await updateTimetable(data);
  showEditModal.value = false;
  // データの再読み込み
};

const handleDelete = async (item) => {
  if (confirm($t("admin.common.confirmDelete"))) {
    await deleteTimetable(item.id);
  }
};
</script>
```

### CSV インポート機能

```vue
<!-- components/admin/CsvImport.vue -->
<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700">
        {{ $t("admin.import.selectFile") }}
      </label>
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        @change="handleFileSelect"
        class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
      />
    </div>

    <div v-if="previewData.length > 0">
      <h3 class="text-lg font-medium text-gray-900">
        {{ $t("admin.import.preview") }}
      </h3>
      <div class="mt-2 overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                v-for="header in headers"
                :key="header"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(row, index) in previewData.slice(0, 5)" :key="index">
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-end space-x-3">
        <button
          @click="clearPreview"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {{ $t("common.cancel") }}
        </button>
        <button
          @click="importData"
          :disabled="importing"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {{
            importing ? $t("admin.import.importing") : $t("admin.import.import")
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(["imported"]);

const fileInput = ref(null);
const previewData = ref([]);
const headers = ref([]);
const importing = ref(false);

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const csv = e.target.result;
    parseCSV(csv);
  };
  reader.readAsText(file);
};

const parseCSV = (csv) => {
  const lines = csv.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return;

  headers.value = lines[0].split(",").map((h) => h.trim());
  previewData.value = lines
    .slice(1)
    .map((line) => line.split(",").map((cell) => cell.trim()));
};

const importData = async () => {
  importing.value = true;
  try {
    const { importTimetableCSV } = useAdminTimetable();
    await importTimetableCSV(previewData.value, headers.value);
    emit("imported");
    clearPreview();
  } catch (error) {
    console.error("インポートエラー:", error);
  } finally {
    importing.value = false;
  }
};

const clearPreview = () => {
  previewData.value = [];
  headers.value = [];
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};
</script>
```

## 分析・監視機能

### ダッシュボード

```vue
<!-- pages/admin/index.vue -->
<template>
  <div>
    <h1 class="text-2xl font-semibold text-gray-900">
      {{ $t("admin.dashboard.title") }}
    </h1>

    <!-- 統計カード -->
    <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardCard
        v-for="stat in stats"
        :key="stat.name"
        :title="$t(stat.title)"
        :value="stat.value"
        :change="stat.change"
        :icon="stat.icon"
      />
    </div>

    <!-- チャート -->
    <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ $t("admin.dashboard.accessTrend") }}
          </h3>
          <StatisticsChart :data="accessData" type="line" />
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900">
            {{ $t("admin.dashboard.popularRoutes") }}
          </h3>
          <StatisticsChart :data="routeData" type="bar" />
        </div>
      </div>
    </div>

    <!-- 最近のアクティビティ -->
    <div class="mt-8">
      <div class="bg-white shadow overflow-hidden sm:rounded-md">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            {{ $t("admin.dashboard.recentActivity") }}
          </h3>
        </div>
        <ul class="divide-y divide-gray-200">
          <li
            v-for="activity in recentActivities"
            :key="activity.id"
            class="px-4 py-4 sm:px-6"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <Icon
                  :name="activity.icon"
                  class="h-5 w-5 text-gray-400 mr-3"
                />
                <p class="text-sm font-medium text-gray-900">
                  {{ activity.description }}
                </p>
              </div>
              <div class="text-sm text-gray-500">
                {{ formatDate(activity.timestamp) }}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "admin",
});

const { stats, accessData, routeData, recentActivities } =
  await useAdminDashboard();

const formatDate = (date) => {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};
</script>
```

### アナリティクス

```typescript
// composables/useAdminAnalytics.ts
export const useAdminAnalytics = () => {
  const getAccessStats = async (period: "day" | "week" | "month" = "week") => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(endDate.getDate() - 1);
        break;
      case "week":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    // Firebase Analytics または独自ログから統計を取得
    const stats = await fetchAnalyticsData(startDate, endDate);

    return {
      totalViews: stats.pageViews,
      uniqueUsers: stats.uniqueUsers,
      averageSessionDuration: stats.avgSessionDuration,
      bounceRate: stats.bounceRate,
    };
  };

  const getPopularRoutes = async () => {
    // 検索ログから人気ルートを分析
    const searchLogs = await getSearchLogs();
    const routeCounts = {};

    searchLogs.forEach((log) => {
      const route = `${log.departure}-${log.arrival}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    });

    return Object.entries(routeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([route, count]) => ({ route, count }));
  };

  const getUserBehaviorAnalysis = async () => {
    // ユーザー行動の分析
    return {
      mostUsedFeatures: await getMostUsedFeatures(),
      deviceBreakdown: await getDeviceBreakdown(),
      languagePreferences: await getLanguagePreferences(),
    };
  };

  return {
    getAccessStats,
    getPopularRoutes,
    getUserBehaviorAnalysis,
  };
};
```

## データ公開機能

### 公開プロセス

```vue
<!-- components/admin/DataPublisher.vue -->
<template>
  <div class="space-y-6">
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          {{ $t("admin.publish.title") }}
        </h3>
        <div class="mt-2 max-w-xl text-sm text-gray-500">
          <p>{{ $t("admin.publish.description") }}</p>
        </div>

        <!-- プレビュー -->
        <div class="mt-5">
          <button
            @click="generatePreview"
            :disabled="generating"
            class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {{
              generating
                ? $t("admin.publish.generating")
                : $t("admin.publish.preview")
            }}
          </button>
        </div>

        <!-- プレビュー結果 -->
        <div v-if="previewData" class="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 class="text-sm font-medium text-gray-900">
            {{ $t("admin.publish.previewData") }}
          </h4>
          <div class="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="font-medium"
                >{{ $t("admin.publish.timetableCount") }}:</span
              >
              {{ previewData.timetableCount }}
            </div>
            <div>
              <span class="font-medium"
                >{{ $t("admin.publish.fareCount") }}:</span
              >
              {{ previewData.fareCount }}
            </div>
            <div>
              <span class="font-medium"
                >{{ $t("admin.publish.newsCount") }}:</span
              >
              {{ previewData.newsCount }}
            </div>
          </div>
        </div>

        <!-- 公開ボタン -->
        <div class="mt-5">
          <button
            @click="publishData"
            :disabled="!previewData || publishing"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {{
              publishing
                ? $t("admin.publish.publishing")
                : $t("admin.publish.publish")
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- 公開履歴 -->
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          {{ $t("admin.publish.history") }}
        </h3>
        <div class="mt-4">
          <div class="flow-root">
            <ul class="-mb-8">
              <li
                v-for="(item, index) in publishHistory"
                :key="item.id"
                class="relative pb-8"
              >
                <div
                  v-if="index !== publishHistory.length - 1"
                  class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                ></div>
                <div class="relative flex space-x-3">
                  <div
                    class="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white"
                  >
                    <Icon name="check" class="h-5 w-5 text-white" />
                  </div>
                  <div
                    class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4"
                  >
                    <div>
                      <p class="text-sm text-gray-500">
                        {{ $t("admin.publish.publishedBy") }}
                        <span class="font-medium text-gray-900">{{
                          item.publishedBy
                        }}</span>
                      </p>
                    </div>
                    <div
                      class="text-right text-sm whitespace-nowrap text-gray-500"
                    >
                      {{ formatDate(item.publishedAt) }}
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { generatePreview, publishData, getPublishHistory } = useDataPublish();

const generating = ref(false);
const publishing = ref(false);
const previewData = ref(null);
const publishHistory = ref([]);

const generatePreview = async () => {
  generating.value = true;
  try {
    previewData.value = await generatePreview();
  } finally {
    generating.value = false;
  }
};

const publishData = async () => {
  publishing.value = true;
  try {
    await publishData();
    // 成功通知
    previewData.value = null;
    await loadPublishHistory();
  } finally {
    publishing.value = false;
  }
};

const loadPublishHistory = async () => {
  publishHistory.value = await getPublishHistory();
};

onMounted(() => {
  loadPublishHistory();
});
</script>
```

## セキュリティ考慮事項

### 操作ログ記録

```typescript
// composables/useAdminLogger.ts
export const useAdminLogger = () => {
  const logAction = async (action: string, details: any = {}) => {
    const { user } = useAdminAuth();

    const logEntry = {
      action,
      details,
      userId: user.value?.uid,
      userEmail: user.value?.email,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      ipAddress: await getClientIP(), // 実装が必要
    };

    await addDoc(collection(db, "adminLogs"), logEntry);
  };

  const getActionLogs = async (limit = 100) => {
    const q = query(
      collection(db, "adminLogs"),
      orderBy("timestamp", "desc"),
      limit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  };

  return { logAction, getActionLogs };
};
```

### 入力値検証

```typescript
// utils/adminValidation.ts
export const validateTimetableInput = (data: any) => {
  const errors: string[] = [];

  // 必須フィールド
  if (!data.departure) errors.push("出発港は必須です");
  if (!data.arrival) errors.push("到着港は必須です");
  if (!data.departureTime) errors.push("出発時刻は必須です");

  // フォーマット検証
  if (
    data.departureTime &&
    !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.departureTime)
  ) {
    errors.push("出発時刻の形式が正しくありません");
  }

  // 論理検証
  if (data.departure === data.arrival) {
    errors.push("出発港と到着港は異なる必要があります");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

## パフォーマンス最適化

### データ仮想化

```vue
<!-- components/admin/VirtualizedTable.vue -->
<template>
  <div class="h-96 overflow-auto">
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        :style="{
          position: 'absolute',
          top: item.top + 'px',
          left: 0,
          right: 0,
          height: itemHeight + 'px',
        }"
        class="flex items-center px-4 border-b border-gray-200"
      >
        <slot :item="item.data" />
      </div>
    </div>
  </div>
</template>

<script setup>
interface Props {
  items: any[]
  itemHeight: number
}

const props = defineProps<Props>()
const containerRef = ref(null)
const scrollTop = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const visibleItems = computed(() => {
  const containerHeight = 384 // h-96 = 384px
  const startIndex = Math.floor(scrollTop.value / props.itemHeight)
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / props.itemHeight) + 1,
    props.items.length
  )

  return props.items.slice(startIndex, endIndex).map((item, index) => ({
    id: item.id,
    data: item,
    top: (startIndex + index) * props.itemHeight
  }))
})

onMounted(() => {
  const container = containerRef.value
  if (container) {
    container.addEventListener('scroll', () => {
      scrollTop.value = container.scrollTop
    })
  }
})
</script>
```
