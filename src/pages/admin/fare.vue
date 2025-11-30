<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">料金管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        フェリーと高速船の料金表を管理します
      </p>
    </div>

    <!-- タブ -->
    <div class="mb-6">
      <nav class="flex space-x-4" aria-label="Tabs">
        <button v-for="tab in tabs" :key="tab.id" :class="[
          activeTab === tab.id
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          'px-3 py-2 font-medium text-sm rounded-md'
        ]" @click="activeTab = tab.id">
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- アクションボタン -->
    <div class="mb-4 flex justify-between items-center">
      <div class="flex space-x-2">
        <button :disabled="isLoading"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
          @click="refreshData">
          <ArrowPathIcon class="h-5 w-5 inline mr-1" />
          {{ isLoading ? '読み込み中...' : '更新' }}
        </button>
        <button :disabled="isPublishing"
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          @click="publishFareData">
          <CloudArrowUpIcon class="h-5 w-5 inline mr-1" />
          {{ isPublishing ? '公開中...' : 'データ公開' }}
        </button>
      </div>
    </div>

    <!-- 料金表 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">
              {{ activeTabData.title }}
            </h2>
            <p v-if="activeVersionLabel" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ activeVersionLabel }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <template v-if="activeTab === 'ferry' || activeTab === 'highspeed'">
              <label class="text-sm text-gray-500 dark:text-gray-400">
                版
              </label>
              <select v-model="activeVersionId"
                class="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm">
                <option v-if="activeVersionOptions.length === 0" disabled value="">
                  版が未作成
                </option>
                <option v-for="version in activeVersionOptions" :key="version.id" :value="version.id">
                  {{ version.name || version.effectiveFrom }}
                </option>
              </select>
              <button class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                @click="openCreateVersionModal(activeTab === 'ferry' ? 'ferry' : 'highspeed')">
                <PlusIcon class="h-4 w-4 inline mr-1" />
                新しい版
              </button>
              <button v-if="activeVersionId" :disabled="isDeletingVersion || isEditingVersion"
                class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 text-sm"
                @click="openEditVersionModal">
                <PencilIcon class="h-4 w-4 inline mr-1" />
                版を編集
              </button>
              <button v-if="activeVersionId" :disabled="isDeletingVersion"
                class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 text-sm"
                @click="openDeleteVersionModal">
                <TrashIcon class="h-4 w-4 inline mr-1" />
                版を削除
              </button>
            </template>
            <button class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm" @click="showEditModal = true">
              <PencilIcon class="h-4 w-4 inline mr-1" />
              {{ activeTab === 'discount' ? '割引編集' : '料金編集' }}
            </button>
          </div>
        </div>

        <!-- フェリー料金表 -->
        <div v-if="activeTab === 'ferry'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  区間
                </th>
                <th v-for="field in SEAT_CLASS_FIELDS" :key="field.key"
                  class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  {{ field.label }}
                </th>
                <th v-for="field in VEHICLE_SIZE_FIELDS" :key="field.key"
                  class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  車両（{{ field.label }}）
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="category in ferryCategories" :key="category.id">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ category.label }}
                </td>
                <td v-for="field in SEAT_CLASS_FIELDS" :key="field.key"
                  class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  {{ formatCurrency(category.seatClass[field.key]) }}
                </td>
                <td v-for="field in VEHICLE_SIZE_FIELDS" :key="field.key"
                  class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  {{ formatCurrency(category.vehicle[field.key]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 高速船料金表 -->
        <div v-else-if="activeTab === 'highspeed'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  区間
                </th>
                <th
                  class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  大人
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="fare in highspeedFares" :key="fare.route">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ fare.routeLabel || fare.route }}
                </td>
                <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                  {{ formatCurrency(fare.adult) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 内航船料金表 -->
        <div v-else-if="activeTab === 'local'" class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">島前内航船共通料金</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      区分
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      大人
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      小人
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      島前内航船共通
                    </td>
                    <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                      {{ formatCurrency(innerIslandFare?.adult) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                      {{ formatCurrency(innerIslandFare?.child) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">車両料金</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      車両サイズ
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                      料金
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr v-for="(value, key) in innerIslandVehicleFare" :key="key">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ formatVehicleSizeLabel(key) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">
                      {{ formatCurrency(value) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 割引設定 -->
        <div v-else-if="activeTab === 'discount'" class="space-y-4">
          <div v-for="discount in discounts" :key="discount.id" class="border dark:border-gray-700 rounded-lg p-4">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium text-gray-900 dark:text-white">
                  {{ resolveDiscountName(discount) }}
                </h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ resolveDiscountDescription(discount) }}
                </p>
                <p class="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {{ formatDiscountPercent(discount) }}% 割引
                </p>
              </div>
              <span :class="[
                'px-2 py-1 text-xs rounded-full',
                discount.active
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              ]">
                {{ isDiscountActive(discount) ? '有効' : '無効' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 編集モーダル -->
    <FormModal :open="showEditModal" :title="`${activeTabData.title}の編集`" :loading="isSaving" size="xl"
      @close="showEditModal = false" @submit="saveFareData">
      <div class="space-y-4">
        <!-- フェリー料金編集 -->
        <div v-if="activeTab === 'ferry'">
          <div v-for="category in editingFerryCategories" :key="category.id"
            class="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h4 class="font-medium text-gray-900 dark:text-gray-100">
                {{ category.label }}
              </h4>
              <p class="text-xs text-gray-500 dark:text-gray-400 md:text-right">
                対象路線: {{ category.routeIds.join(', ') }}
              </p>
            </div>
            <div class="space-y-4 mt-3">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-sm font-medium text-gray-700 dark:text-gray-200">座席区分</h5>
                  <span class="text-xs text-gray-400 dark:text-gray-500">円</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div v-for="field in SEAT_CLASS_FIELDS" :key="field.key">
                    <label class="text-xs text-gray-500">{{ field.label }}</label>
                    <input v-model.number="category.seatClass[field.key]" type="number" min="0"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors">
                  </div>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <h5 class="text-sm font-medium text-gray-700 dark:text-gray-200">車両サイズ</h5>
                  <span class="text-xs text-gray-400 dark:text-gray-500">円</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div v-for="field in VEHICLE_SIZE_FIELDS" :key="field.key">
                    <label class="text-xs text-gray-500">{{ field.label }}</label>
                    <input v-model.number="category.vehicle[field.key]" type="number" min="0"
                      class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 高速船料金編集 -->
        <div v-else-if="activeTab === 'highspeed'">
          <div v-for="(fare, index) in editingHighspeedFares" :key="index" class="border-b pb-4 mb-4">
            <h4 class="font-medium mb-2">{{ fare.routeLabel || fare.route }}</h4>
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label class="text-xs text-gray-500">大人</label>
                <input v-model.number="fare.adult" type="number" min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors">
              </div>
            </div>
          </div>
        </div>

        <!-- 内航船料金編集 -->
        <div v-else-if="activeTab === 'local'" class="space-y-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">島前内航船共通料金</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  大人料金（円）
                </label>
                <input v-model.number="editingInnerIslandFare.adult" type="number" min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  小人料金（円）
                </label>
                <input v-model.number="editingInnerIslandFare.child" type="number" min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors">
              </div>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">車両料金</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="(value, key) in editingInnerIslandVehicleFare" :key="key">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {{ formatVehicleSizeLabel(key) }}（円）
                </label>
                <input v-model.number="editingInnerIslandVehicleFare[key]" type="number" min="0"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors">
              </div>
            </div>
          </div>
        </div>

        <!-- 割引設定編集 -->
        <div v-else-if="activeTab === 'discount'" class="space-y-6">
          <div v-if="!editingDiscounts.length"
            class="rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            割引設定がありません。「割引を追加」から新しい割引を作成できます。
          </div>
          <div v-for="(discount, index) in editingDiscounts" :key="discount.formKey"
            class="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="flex-1 space-y-2">
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400">
                  割引ID
                </label>
                <input v-model="discount.id" type="text" :disabled="discount.originalId !== null"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="例: student">
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  公開データでの識別子です。既存の割引では変更できません。
                </p>
              </div>
              <div class="flex items-start justify-end">
                <button type="button"
                  class="inline-flex items-center rounded-md border border-red-200 dark:border-red-600 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="editingDiscounts.length <= 1" @click="removeDiscount(index)">
                  <TrashIcon class="mr-1 h-4 w-4" />
                  削除
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  表示名（日本語）
                </label>
                <input v-model="discount.name" type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: 学生割引">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  表示名（英語）
                  <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">(任意)</span>
                </label>
                <input v-model="discount.nameEn" type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: Student Discount">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  表示名 i18nキー
                  <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">(任意)</span>
                </label>
                <input v-model="discount.nameKey" type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: DISCOUNT_STUDENT">
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div class="lg:col-span-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  説明（日本語）
                </label>
                <textarea v-model="discount.description" rows="2"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: 学生証の提示が必要です"></textarea>
              </div>
              <div class="lg:col-span-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  説明（英語）
                  <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">(任意)</span>
                </label>
                <textarea v-model="discount.descriptionEn" rows="2"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: Student ID required"></textarea>
              </div>
              <div class="lg:col-span-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  説明 i18nキー
                  <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">(任意)</span>
                </label>
                <input v-model="discount.descriptionKey" type="text"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: DISCOUNT_STUDENT_DESC">
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  割引率（%）
                </label>
                <input v-model.number="discount.ratePercent" type="number" min="0" max="100" step="0.1"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: 15">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  適用後係数（自動計算）
                </label>
                <input :value="formatRateMultiplierValue(discount.ratePercent)" type="text" readonly
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-gray-500 dark:text-gray-400 focus:outline-none text-sm">
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  保存時にこの係数が rate / rateMultiplier として保存されます。
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  最低人数
                  <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">(任意)</span>
                </label>
                <input v-model.number="discount.minPeople" type="number" min="0" step="1"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                  placeholder="例: 15">
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                適用条件タグ
                <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">(カンマまたは改行区切り)</span>
              </label>
              <textarea v-model="discount.conditionsText" rows="2"
                class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors text-sm"
                placeholder="例: group,student"></textarea>
            </div>

            <ToggleSwitch v-model:checked="discount.active" label="割引を有効化" description="無効化すると公開データから除外されます。" />
          </div>

          <div class="pt-2">
            <button type="button"
              class="inline-flex items-center rounded-md border border-dashed border-blue-300 dark:border-blue-500 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
              @click="addDiscount()">
              <PlusIcon class="mr-1 h-4 w-4" />
              割引を追加
            </button>
          </div>
        </div>

      </div>
    </FormModal>

    <FormModal :open="showVersionModal" title="新しい版を作成" :loading="isSavingVersion" @close="closeVersionModal"
      @submit="createVersion">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            船種
          </label>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ versionForm.vesselType === 'ferry' ? 'フェリー' : '高速船' }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            版名称（任意）
          </label>
          <input v-model="versionForm.name" type="text"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            placeholder="例: 2024年4月改定">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            適用開始日
          </label>
          <input v-model="versionForm.effectiveFrom" type="date"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            既存版からコピー（任意）
          </label>
          <select v-model="versionForm.copyFromVersionId"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors">
            <option :value="null">
              コピーしない
            </option>
            <option v-for="version in copySourceVersions" :key="version.id" :value="version.id">
              {{ formatVersionLabel(version) }}
            </option>
          </select>
        </div>
      </div>
    </FormModal>

    <FormModal :open="showEditVersionModal" title="版を編集" :loading="isEditingVersion" @close="closeEditVersionModal"
      @submit="updateVersion">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            船種
          </label>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ editVersionForm.vesselType === 'ferry' ? 'フェリー' : '高速船' }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            版名称（任意）
          </label>
          <input v-model="editVersionForm.name" type="text"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            placeholder="例: 2024年4月改定">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            説明（任意）
          </label>
          <textarea v-model="editVersionForm.description" rows="3"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            placeholder="版の説明を入力してください"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            適用開始日
          </label>
          <input v-model="editVersionForm.effectiveFrom" type="date"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required>
        </div>
      </div>
    </FormModal>

    <FormModal :open="showDeleteVersionModal" title="版を削除" confirm-text="削除する" cancel-text="キャンセル"
      :loading="isDeletingVersion || deleteVersionInfo.isLoading"
      :loading-text="isDeletingVersion ? '削除中...' : '読み込み中...'" variant="danger" @close="closeDeleteVersionModal"
      @submit="confirmDeleteVersion">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        {{ deleteVersionInfo.vesselType === 'ferry' ? 'フェリー' : '高速船' }}の版
        「{{ deleteVersionInfo.name || '名称未設定' }}」
        （適用開始日: {{ deleteVersionInfo.effectiveFrom || '未設定' }}）を削除します。
      </p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-3">
        <span v-if="deleteVersionInfo.isLoading">
          関連する料金を確認しています...
        </span>
        <span v-else>
          この版に紐づく料金データ {{ deleteVersionInfo.fareCount ?? 0 }} 件が同時に削除されます。
        </span>
      </p>
      <p class="text-sm text-red-600 dark:text-red-400 mt-3">
        この操作は取り消せません。必要に応じて事前にバックアップを取得してください。
      </p>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import { PencilIcon, CloudArrowUpIcon, ArrowPathIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { orderBy, where } from 'firebase/firestore'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useDataPublish } from '~/composables/useDataPublish'
import type { FareVersion, VesselType } from '~/types/fare'
import FormModal from '~/components/admin/FormModal.vue'
import ToggleSwitch from '~/components/common/ToggleSwitch.vue'
import { createLogger } from '~/utils/logger'
import { roundUpToTen } from '~/utils/currency'
import {
  HIGHSPEED_ROUTE_TRANSLATION_KEYS,
  ROUTE_METADATA,
  normalizeRouteId,
  mapHighspeedToCanonicalRoute,
  getHighspeedRouteLabel,
  resolveHighspeedRouteInfo
} from '~/utils/fareRoutes'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getCollection, batchWrite, createDocument, deleteDocument, updateDocument, getDocument } = useAdminFirestore()
const { publishData } = useDataPublish()
const { $toast } = useNuxtApp()
const logger = createLogger('AdminFarePage')
const { t, locale } = useI18n()

type FareDoc = Record<string, any>

type FerryCategoryDefinition = {
  id: string
  label: string
  translationKey: string
  routeIds: string[]
}

type SeatClassKey = 'class2' | 'class2Special' | 'class1' | 'classSpecial' | 'specialRoom'
type VehicleSizeKey =
  | 'under3m'
  | 'under4m'
  | 'under5m'
  | 'under6m'
  | 'under7m'
  | 'under8m'
  | 'under9m'
  | 'under10m'
  | 'under11m'
  | 'under12m'
  | 'over12mPer1m'

const SEAT_CLASS_FIELDS: Array<{ key: SeatClassKey; label: string }> = [
  { key: 'class2', label: '2等' },
  { key: 'class2Special', label: '特2等' },
  { key: 'class1', label: '1等' },
  { key: 'classSpecial', label: '特等' },
  { key: 'specialRoom', label: '特別室' }
]

const VEHICLE_SIZE_FIELDS: Array<{ key: VehicleSizeKey; label: string }> = [
  { key: 'under3m', label: '〜3m' },
  { key: 'under4m', label: '〜4m' },
  { key: 'under5m', label: '〜5m' },
  { key: 'under6m', label: '〜6m' },
  { key: 'under7m', label: '〜7m' },
  { key: 'under8m', label: '〜8m' },
  { key: 'under9m', label: '〜9m' },
  { key: 'under10m', label: '〜10m' },
  { key: 'under11m', label: '〜11m' },
  { key: 'under12m', label: '〜12m' },
  { key: 'over12mPer1m', label: '12m超(1m毎)' }
]

type DiscountFormItem = {
  formKey: string
  id: string
  originalId: string | null
  name: string
  nameEn: string
  nameKey: string
  description: string
  descriptionEn: string
  descriptionKey: string
  ratePercent: number | null
  minPeople: number | null
  active: boolean
  conditionsText: string
}

type DiscountDoc = {
  id?: string
  name?: string | null
  nameEn?: string | null
  nameKey?: string | null
  description?: string | null
  descriptionEn?: string | null
  descriptionKey?: string | null
  rate?: number | null
  rateMultiplier?: number | null
  ratePercent?: number | null
  minPeople?: number | null
  active?: boolean
  conditions?: string[]
}

let discountFormKeySeed = 0

const nextDiscountFormKey = () => `discount-${Date.now()}-${discountFormKeySeed++}`

const isDiscountActive = (discount: DiscountDoc | null | undefined): boolean => {
  if (!discount || typeof discount !== 'object') return true
  if (typeof discount.active === 'boolean') {
    return discount.active
  }
  return true
}

const clampPercent = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

const calculateMultiplierFromPercent = (percent: number | null | undefined): number => {
  const normalized = clampPercent(percent)
  const multiplier = 1 - normalized / 100
  return Number(multiplier.toFixed(4))
}

const formatRateMultiplierValue = (percent: number | null | undefined): string => {
  return calculateMultiplierFromPercent(percent).toFixed(4)
}

const resolveDiscountMultiplier = (
  discount: DiscountDoc | null | undefined
): number => {
  if (!discount || typeof discount !== 'object') return 1

  const multiplier = discount.rateMultiplier
  if (typeof multiplier === 'number' && !Number.isNaN(multiplier)) {
    if (multiplier < 0) return 0
    if (multiplier > 1) return 1
    return multiplier
  }

  const ratePercent = discount.ratePercent
  if (typeof ratePercent === 'number' && !Number.isNaN(ratePercent)) {
    return calculateMultiplierFromPercent(ratePercent)
  }

  const rate = discount.rate
  if (typeof rate === 'number' && !Number.isNaN(rate)) {
    if (rate >= 0 && rate <= 1) {
      return rate
    }
    if (rate > 1) {
      return calculateMultiplierFromPercent(rate)
    }
  }

  return 1
}

const resolveDiscountPercentNumber = (
  discount: DiscountDoc | null | undefined
): number => {
  if (!discount || typeof discount !== 'object') return 0

  const ratePercent = discount.ratePercent
  if (typeof ratePercent === 'number' && !Number.isNaN(ratePercent)) {
    return clampPercent(ratePercent)
  }

  const rate = discount.rate
  if (typeof rate === 'number' && !Number.isNaN(rate) && rate > 1) {
    return clampPercent(rate)
  }

  const multiplier = resolveDiscountMultiplier(discount)
  const percent = (1 - multiplier) * 100
  return clampPercent(percent)
}

const formatDiscountPercent = (discount: DiscountDoc): string => {
  const percent = resolveDiscountPercentNumber(discount)
  const rounded = Math.round(percent * 10) / 10
  if (Number.isNaN(rounded)) return '0'
  return Number.isInteger(rounded) ? `${Math.trunc(rounded)}` : rounded.toFixed(1)
}

const createDiscountFormItem = (
  discount: DiscountDoc | null | undefined,
  overrides: Partial<DiscountFormItem> = {}
): DiscountFormItem => {
  const originalId = typeof discount?.id === 'string' ? discount.id : null
  const percent = typeof discount !== 'undefined' && discount !== null
    ? resolveDiscountPercentNumber(discount)
    : null
  const item: DiscountFormItem = {
    formKey: nextDiscountFormKey(),
    id: originalId ?? '',
    originalId,
    name: typeof discount?.name === 'string' ? discount.name : '',
    nameEn: typeof discount?.nameEn === 'string' ? discount.nameEn : '',
    nameKey: typeof discount?.nameKey === 'string' ? discount.nameKey : '',
    description: typeof discount?.description === 'string' ? discount.description : '',
    descriptionEn: typeof discount?.descriptionEn === 'string' ? discount.descriptionEn : '',
    descriptionKey: typeof discount?.descriptionKey === 'string' ? discount.descriptionKey : '',
    ratePercent: percent !== null ? clampPercent(percent) : null,
    minPeople: typeof discount?.minPeople === 'number' && !Number.isNaN(discount.minPeople)
      ? discount.minPeople
      : null,
    active: isDiscountActive(discount),
    conditionsText: Array.isArray(discount?.conditions)
      ? discount.conditions
        .filter(condition => typeof condition === 'string' && condition.trim().length > 0)
        .join(', ')
      : ''
  }

  return {
    ...item,
    ...overrides,
    formKey: overrides.formKey ?? item.formKey
  }
}

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const parseConditionsText = (text: string | null | undefined): string[] => {
  if (typeof text !== 'string') return []
  const tokens = text
    .split(/[\n,]/)
    .map(token => token.trim())
    .filter(token => token.length > 0)

  return Array.from(new Set(tokens))
}

type FerryCategoryRecord = {
  id: string
  label: string
  translationKey: string
  routeIds: string[]
  docIds: Record<string, string | null>
  seatClass: Record<SeatClassKey, number | null>
  vehicle: Record<VehicleSizeKey, number | null>
}

const FERRY_CATEGORY_DEFINITIONS: FerryCategoryDefinition[] = [
  {
    id: 'hondo-oki',
    label: '本土〜隠岐',
    translationKey: 'HONDO_OKI',
    routeIds: [
      'hondo-saigo',
      'saigo-hondo',
      'hondo-beppu',
      'beppu-hondo',
      'hondo-hishiura',
      'hishiura-hondo',
      'hondo-kuri',
      'kuri-hondo'
    ]
  },
  {
    id: 'dozen-dogo',
    label: '島前〜島後',
    translationKey: 'DOZEN_DOGO',
    routeIds: [
      'saigo-beppu',
      'beppu-saigo',
      'saigo-hishiura',
      'hishiura-saigo',
      'saigo-kuri',
      'kuri-saigo'
    ]
  },
  {
    id: 'beppu-hishiura',
    label: '別府〜菱浦（島前）',
    translationKey: 'BEPPU_HISHIURA',
    routeIds: ['beppu-hishiura', 'hishiura-beppu']
  },
  {
    id: 'hishiura-kuri',
    label: '菱浦〜来居（島前）',
    translationKey: 'HISHIURA_KURI',
    routeIds: ['hishiura-kuri', 'kuri-hishiura']
  },
  {
    id: 'kuri-beppu',
    label: '来居〜別府（島前）',
    translationKey: 'KURI_BEPPU',
    routeIds: ['kuri-beppu', 'beppu-kuri']
  }
]

const CATEGORY_BY_ID = FERRY_CATEGORY_DEFINITIONS.reduce<Record<string, FerryCategoryDefinition>>((acc, def) => {
  acc[def.id] = def
  return acc
}, {})

const isHighspeedKuriRoute = (fare: FareDoc): boolean => {
  const routeCandidates = [
    typeof fare.route === 'string' ? fare.route : null,
    typeof fare.routeName === 'string' ? fare.routeName : null,
    typeof fare.displayName === 'string' ? fare.displayName : null
  ]
  const canonical = mapHighspeedToCanonicalRoute(routeCandidates.find(candidate => candidate !== null))
  return canonical === 'hishiura-kuri' || canonical === 'kuri-beppu'
}

const translateIfPossible = (value?: string | null): string | null => {
  if (!value) return null
  const translated = t(value)
  if (translated !== value || /^[A-Z0-9_]+$/.test(value)) {
    return translated
  }
  return value
}

const resolveDiscountName = (discount: DiscountDoc): string => {
  const localeValue = typeof locale.value === 'string' ? locale.value.toLowerCase() : 'ja'
  const primaryText = localeValue.startsWith('en') ? discount.nameEn : discount.name
  const secondaryText = localeValue.startsWith('en') ? discount.name : discount.nameEn
  const candidates = [
    discount.nameKey,
    primaryText,
    secondaryText,
    discount.name,
    discount.nameEn,
    discount.id
  ]
  for (const candidate of candidates) {
    const translated = translateIfPossible(candidate)
    if (translated && translated.trim()) {
      return translated
    }
  }
  return discount.id ?? '-'
}

const resolveDiscountDescription = (discount: DiscountDoc): string => {
  const localeValue = typeof locale.value === 'string' ? locale.value.toLowerCase() : 'ja'
  const primaryText = localeValue.startsWith('en') ? discount.descriptionEn : discount.description
  const secondaryText = localeValue.startsWith('en') ? discount.description : discount.descriptionEn
  const candidates = [
    discount.descriptionKey,
    primaryText,
    secondaryText,
    discount.description,
    discount.descriptionEn
  ]
  for (const candidate of candidates) {
    const translated = translateIfPossible(candidate)
    if (translated && translated.trim()) {
      return translated
    }
  }
  return ''
}

const buildFareDocId = (versionId: string, routeId: string) => `fare-${versionId}-${routeId}`

const pickNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

const extractPassenger = (doc: FareDoc): { adult: number | null; child: number | null } => {
  if (!doc) return { adult: null, child: null }
  const fares = doc.fares ?? {}
  const adult = pickNumber(fares.adult ?? doc.adult)
  const child = pickNumber(fares.child ?? doc.child)
  return { adult, child }
}

const extractSeatClass = (doc: FareDoc): Record<SeatClassKey, number | null> => {
  const base = SEAT_CLASS_FIELDS.reduce<Record<SeatClassKey, number | null>>((acc, field) => {
    acc[field.key] = null
    return acc
  }, {} as Record<SeatClassKey, number | null>)

  if (!doc) return base

  const seatClass = doc.fares?.seatClass ?? doc.seatClass ?? {}

  SEAT_CLASS_FIELDS.forEach(({ key }) => {
    const value = pickNumber(seatClass[key])
    if (value !== null) {
      base[key] = value
    }
  })

  return base
}

const extractDisabledFare = (doc: FareDoc): { adult: number | null; child: number | null } => {
  if (!doc) return { adult: null, child: null }
  const fares = doc.fares?.disabled ?? doc.disabled ?? {}
  const adult = pickNumber(fares.adult ?? doc.disabledAdult)
  const child = pickNumber(fares.child ?? doc.disabledChild)
  return { adult, child }
}

const extractVehicle = (doc: FareDoc): Record<VehicleSizeKey, number | null> => {
  const base = VEHICLE_SIZE_FIELDS.reduce<Record<VehicleSizeKey, number | null>>((acc, field) => {
    acc[field.key] = null
    return acc
  }, {} as Record<VehicleSizeKey, number | null>)

  if (!doc) return base

  const vehicle = doc.fares?.vehicle ?? doc.vehicle ?? {}

  VEHICLE_SIZE_FIELDS.forEach(({ key }) => {
    if (key === 'under3m') {
      const fallback = pickNumber(vehicle[key] ?? doc.car3m)
      if (fallback !== null) base[key] = fallback
      return
    }
    if (key === 'under4m') {
      const fallback = pickNumber(vehicle[key] ?? doc.car4m)
      if (fallback !== null) base[key] = fallback
      return
    }
    if (key === 'under5m') {
      const fallback = pickNumber(vehicle[key] ?? doc.car5m)
      if (fallback !== null) base[key] = fallback
      return
    }
    const value = pickNumber(vehicle[key])
    if (value !== null) {
      base[key] = value
    }
  })

  return base
}

const createEmptyCategoryRecord = (def: FerryCategoryDefinition): FerryCategoryRecord => ({
  id: def.id,
  label: def.label,
  translationKey: def.translationKey,
  routeIds: [...def.routeIds],
  docIds: def.routeIds.reduce<Record<string, string | null>>((acc, routeId) => {
    acc[routeId] = null
    return acc
  }, {}),
  seatClass: SEAT_CLASS_FIELDS.reduce<Record<SeatClassKey, number | null>>((acc, field) => {
    acc[field.key] = null
    return acc
  }, {} as Record<SeatClassKey, number | null>),
  vehicle: VEHICLE_SIZE_FIELDS.reduce<Record<VehicleSizeKey, number | null>>((acc, field) => {
    acc[field.key] = null
    return acc
  }, {} as Record<VehicleSizeKey, number | null>)
})

const cloneCategoryRecord = (category: FerryCategoryRecord): FerryCategoryRecord => ({
  ...category,
  routeIds: [...category.routeIds],
  docIds: { ...category.docIds },
  seatClass: { ...category.seatClass },
  vehicle: { ...category.vehicle }
})

const CHILD_DISCOUNT_RATE = 0.5

const calculateChildFare = (adult: number | null | undefined): number | null => {
  if (adult === null || typeof adult === 'undefined') return null
  const value = adult * CHILD_DISCOUNT_RATE
  return roundUpToTen(value)
}

const buildFerryCategories = (fareDocs: Array<FareDoc & { id?: string }>): FerryCategoryRecord[] => {
  const routeDocMap = new Map<string, FareDoc & { id?: string }>()
  const categoryFallback: Record<string, FareDoc | null> = {}

  fareDocs.forEach(doc => {
    // categoryId が存在する場合は、categoryFallback に優先的に登録
    const categoryId = typeof doc.categoryId === 'string' ? doc.categoryId : null
    if (categoryId && CATEGORY_BY_ID[categoryId] && !categoryFallback[categoryId]) {
      categoryFallback[categoryId] = doc
      return
    }
    // categoryId が存在しない場合のみ、routeId から routeDocMap に登録
    let routeId = normalizeRouteId(doc.route)
    if (!routeId && doc.routeName) {
      routeId = normalizeRouteId(doc.routeName)
    }
    if (!routeId && doc.id) {
      routeId = normalizeRouteId(doc.id)
    }
    if (routeId) {
      routeDocMap.set(routeId, doc)
    }
  })

  return FERRY_CATEGORY_DEFINITIONS.map(def => {
    const record = createEmptyCategoryRecord(def)
    let baseDoc: FareDoc | undefined

    def.routeIds.forEach(routeId => {
      const doc = routeDocMap.get(routeId)
      if (doc) {
        record.docIds[routeId] = doc.id ?? null
        if (!baseDoc) {
          baseDoc = doc
        }
      }
    })

    if (!baseDoc && categoryFallback[def.id]) {
      baseDoc = categoryFallback[def.id] ?? undefined
    }

    if (baseDoc) {
      const passenger = extractPassenger(baseDoc)
      const disabled = extractDisabledFare(baseDoc)
      const seatClass = extractSeatClass(baseDoc)
      const vehicle = extractVehicle(baseDoc)
      record.seatClass = seatClass
      record.vehicle = vehicle
    }

    return record
  })
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || typeof value === 'undefined') return '—'
  return `¥${Math.round(value).toLocaleString()}`
}

const tabs = [
  { id: 'ferry', name: 'フェリー料金' },
  { id: 'highspeed', name: '高速船料金' },
  { id: 'local', name: '内航船料金' },
  { id: 'discount', name: '割引設定' }
]

const activeTab = ref('ferry')
const showEditModal = ref(false)
const isSaving = ref(false)
const isPublishing = ref(false)
const isLoading = ref(false)

// データ
const ferryCategories = ref<FerryCategoryRecord[]>([])
const highspeedFares = ref<FareDoc[]>([])
const discounts = ref<DiscountDoc[]>([])

const ferryVersions = ref<Array<FareVersion & { id: string }>>([])
const highspeedVersions = ref<Array<FareVersion & { id: string }>>([])
const selectedFerryVersionId = ref<string | null>(null)
const selectedHighspeedVersionId = ref<string | null>(null)
const versionsInitialized = ref(false)

// 編集用データ
const editingFerryCategories = ref<FerryCategoryRecord[]>([])
const editingHighspeedFares = ref<FareDoc[]>([])
const editingDiscounts = ref<DiscountFormItem[]>([])

// 内航船料金データ
const innerIslandFare = ref<{ adult: number | null; child: number | null } | null>(null)
const innerIslandVehicleFare = ref<Record<string, number> | null>(null)
const editingInnerIslandFare = ref<{ adult: number | null; child: number | null }>({
  adult: null,
  child: null
})
const editingInnerIslandVehicleFare = ref<Record<string, number>>({})

// 版作成モーダル
const showVersionModal = ref(false)
const isSavingVersion = ref(false)
const versionForm = reactive<{
  vesselType: VesselType
  name: string
  effectiveFrom: string
  copyFromVersionId: string | null
}>({
  vesselType: 'ferry',
  name: '',
  effectiveFrom: '',
  copyFromVersionId: null
})

const showEditVersionModal = ref(false)
const isEditingVersion = ref(false)
const editVersionForm = reactive<{
  versionId: string
  vesselType: VesselType
  name: string
  description: string
  effectiveFrom: string
}>({
  versionId: '',
  vesselType: 'ferry',
  name: '',
  description: '',
  effectiveFrom: ''
})

const showDeleteVersionModal = ref(false)
const isDeletingVersion = ref(false)
const deleteVersionInfo = reactive<{
  versionId: string
  vesselType: VesselType
  name: string
  effectiveFrom: string
  fareCount: number | null
  fareIds: string[]
  isLoading: boolean
}>({
  versionId: '',
  vesselType: 'ferry',
  name: '',
  effectiveFrom: '',
  fareCount: null,
  fareIds: [],
  isLoading: false
})

const resetDeleteVersionInfo = () => {
  deleteVersionInfo.versionId = ''
  deleteVersionInfo.vesselType = 'ferry'
  deleteVersionInfo.name = ''
  deleteVersionInfo.effectiveFrom = ''
  deleteVersionInfo.fareCount = null
  deleteVersionInfo.fareIds = []
  deleteVersionInfo.isLoading = false
}

const activeTabData = computed(() => {
  switch (activeTab.value) {
    case 'ferry':
      return { title: 'フェリー料金表' }
    case 'highspeed':
      return { title: '高速船料金表' }
    case 'local':
      return { title: '内航船料金表' }
    case 'discount':
      return { title: '割引設定' }
    default:
      return { title: '' }
  }
})

const formatVersionLabel = (version: FareVersion | null | undefined): string => {
  if (!version) return ''
  const label = version.name || '現行版'
  if (version.effectiveFrom === '1970-01-01') {
    return label
  }
  return `${label}（適用開始日: ${version.effectiveFrom}）`
}

const getVersionById = (versions: Array<FareVersion & { id: string }>, id: string | null) => {
  if (!id) return null
  return versions.find(version => version.id === id) ?? null
}

const activeVersionOptions = computed(() => {
  if (activeTab.value === 'ferry') {
    return ferryVersions.value
  }
  if (activeTab.value === 'highspeed') {
    return highspeedVersions.value
  }
  return []
})

const activeVersionId = computed<string | null>({
  get() {
    if (activeTab.value === 'ferry') {
      return selectedFerryVersionId.value
    }
    if (activeTab.value === 'highspeed') {
      return selectedHighspeedVersionId.value
    }
    return null
  },
  set(value) {
    if (activeTab.value === 'ferry') {
      selectedFerryVersionId.value = value
    } else if (activeTab.value === 'highspeed') {
      selectedHighspeedVersionId.value = value
    }
  }
})

const activeVersionMetadata = computed(() => {
  if (activeTab.value === 'ferry') {
    return getVersionById(ferryVersions.value, selectedFerryVersionId.value)
  }
  if (activeTab.value === 'highspeed') {
    return getVersionById(highspeedVersions.value, selectedHighspeedVersionId.value)
  }
  return null
})

const activeVersionLabel = computed(() => {
  return formatVersionLabel(activeVersionMetadata.value)
})

const copySourceVersions = computed(() => {
  return versionForm.vesselType === 'ferry'
    ? ferryVersions.value
    : highspeedVersions.value
})

const parseEffectiveTimestamp = (value: string): number => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const determineDefaultVersionId = (versions: Array<FareVersion & { id: string }>): string | null => {
  if (!versions.length) return null
  const now = Date.now()
  const sorted = [...versions].sort((a, b) => parseEffectiveTimestamp(b.effectiveFrom) - parseEffectiveTimestamp(a.effectiveFrom))
  const active = sorted.find(version => parseEffectiveTimestamp(version.effectiveFrom) <= now)
  return (active ?? sorted[sorted.length - 1]).id
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const loadFareVersions = async () => {
  const versionDocs = await getCollection<FareVersion & { id: string }>(
    'fareVersions',
    [orderBy('effectiveFrom', 'desc')]
  )

  ferryVersions.value = versionDocs
    .filter(version => version.vesselType === 'ferry')
    .sort((a, b) => parseEffectiveTimestamp(b.effectiveFrom) - parseEffectiveTimestamp(a.effectiveFrom))

  highspeedVersions.value = versionDocs
    .filter(version => version.vesselType === 'highspeed')
    .sort((a, b) => parseEffectiveTimestamp(b.effectiveFrom) - parseEffectiveTimestamp(a.effectiveFrom))

  if (!selectedFerryVersionId.value || !getVersionById(ferryVersions.value, selectedFerryVersionId.value)) {
    selectedFerryVersionId.value = determineDefaultVersionId(ferryVersions.value)
  }

  if (!selectedHighspeedVersionId.value || !getVersionById(highspeedVersions.value, selectedHighspeedVersionId.value)) {
    selectedHighspeedVersionId.value = determineDefaultVersionId(highspeedVersions.value)
  }
}

const loadFaresForType = async (vesselType: VesselType) => {
  const constraints = [where('type', '==', vesselType), orderBy('route')]
  const fareDocs = await getCollection<(FareDoc & { id: string })>('fares', constraints)

  const targetVersionId = vesselType === 'ferry' ? selectedFerryVersionId.value : selectedHighspeedVersionId.value

  let filtered = fareDocs
  if (targetVersionId) {
    filtered = fareDocs.filter(fare => fare.versionId === targetVersionId)
    // categoryId が設定されているデータがない場合、categoryId が設定されている versionId を探す
    if (vesselType === 'ferry' && filtered.length > 0) {
      const hasCategoryId = filtered.some(doc => doc.categoryId)
      if (!hasCategoryId) {
        // categoryId が設定されているデータの versionId を探す
        const docsWithCategoryId = fareDocs.filter(doc => doc.categoryId)
        const versionIdsWithCategoryId = Array.from(new Set(docsWithCategoryId.map(doc => doc.versionId).filter(Boolean)))
        if (versionIdsWithCategoryId.length > 0) {
          // 最も新しい versionId を選択
          const sortedVersionIds = versionIdsWithCategoryId.sort().reverse()
          const fallbackVersionId = sortedVersionIds[0]
          if (fallbackVersionId) {
            filtered = fareDocs.filter(fare => fare.versionId === fallbackVersionId)
            // selectedFerryVersionId も更新
            if (vesselType === 'ferry' && selectedFerryVersionId.value !== fallbackVersionId) {
              selectedFerryVersionId.value = fallbackVersionId
            }
          }
        }
      }
    }
    if (!filtered.length) {
      // 互換性のためversionIdが未設定のデータをフォールバック
      filtered = fareDocs.filter(fare => !fare.versionId)
    }
  }

  if (vesselType === 'ferry') {
    const categories = buildFerryCategories(filtered)
    ferryCategories.value = categories
    editingFerryCategories.value = categories.map(category => cloneCategoryRecord(category))
  } else if (vesselType === 'highspeed') {
    const sorted = filtered.sort((a, b) => {
      const routeA = typeof a.route === 'string' ? a.route : ''
      const routeB = typeof b.route === 'string' ? b.route : ''
      return routeA.localeCompare(routeB)
    })

    const withoutKuri = sorted.filter(fare => !isHighspeedKuriRoute(fare))

    const enriched = withoutKuri.map(fare => {
      const { routeId, label } = resolveHighspeedRouteInfo(fare)
      const adult = pickNumber(fare.adult)
      const child = pickNumber(fare.child) ?? calculateChildFare(adult)
      const disabled = extractDisabledFare(fare)
      return {
        ...fare,
        route: routeId ?? (typeof fare.route === 'string' ? mapHighspeedToCanonicalRoute(fare.route) ?? fare.route : ''),
        routeLabel: label,
        displayName: fare.displayName ?? label,
        routeName: fare.routeName ?? label,
        adult,
        child: calculateChildFare(adult),
        disabledAdult: disabled.adult,
        disabledChild: disabled.child ?? (disabled.adult ? calculateChildFare(disabled.adult) : null)
      }
    })

    highspeedFares.value = enriched
    editingHighspeedFares.value = highspeedFares.value.map(fare => ({ ...fare }))
  }
}

const loadDiscounts = async () => {
  const discountData = await getCollection<DiscountDoc & { id: string }>('discounts', [orderBy('name')])
  discounts.value = discountData
}

const addDiscount = () => {
  editingDiscounts.value.push(
    createDiscountFormItem(null, {
      id: '',
      originalId: null,
      name: '',
      nameEn: '',
      description: '',
      descriptionEn: '',
      ratePercent: 0,
      active: true,
      conditionsText: ''
    })
  )
}

const removeDiscount = (index: number) => {
  if (index < 0 || index >= editingDiscounts.value.length) return
  editingDiscounts.value.splice(index, 1)
}

const openCreateVersionModal = (vesselType: VesselType) => {
  versionForm.vesselType = vesselType
  versionForm.name = ''
  versionForm.effectiveFrom = ''
  versionForm.copyFromVersionId = vesselType === 'ferry'
    ? selectedFerryVersionId.value
    : selectedHighspeedVersionId.value
  showVersionModal.value = true
}

const closeVersionModal = () => {
  showVersionModal.value = false
  versionForm.name = ''
  versionForm.effectiveFrom = ''
  versionForm.copyFromVersionId = null
}

const openEditVersionModal = () => {
  const version = activeVersionMetadata.value
  if (!version) {
    $toast.error('編集する版が選択されていません')
    return
  }

  editVersionForm.versionId = version.id
  editVersionForm.vesselType = version.vesselType
  editVersionForm.name = version.name || ''
  editVersionForm.description = version.description || ''
  editVersionForm.effectiveFrom = version.effectiveFrom || ''
  showEditVersionModal.value = true
}

const closeEditVersionModal = () => {
  showEditVersionModal.value = false
  editVersionForm.versionId = ''
  editVersionForm.vesselType = 'ferry'
  editVersionForm.name = ''
  editVersionForm.description = ''
  editVersionForm.effectiveFrom = ''
}

const updateVersion = async () => {
  if (!editVersionForm.versionId) {
    $toast.error('編集対象の版が見つかりません')
    return
  }

  if (!editVersionForm.effectiveFrom) {
    $toast.error('適用開始日を入力してください')
    return
  }

  // 日付形式のバリデーション
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(editVersionForm.effectiveFrom)) {
    $toast.error('適用開始日は正しい日付形式（YYYY-MM-DD）で入力してください')
    return
  }

  isEditingVersion.value = true
  try {
    await updateDocument('fareVersions', editVersionForm.versionId, {
      name: editVersionForm.name.trim() || null,
      description: editVersionForm.description.trim() || null,
      effectiveFrom: editVersionForm.effectiveFrom
    })

    await loadFareVersions()

    // 現在選択中の版を更新した場合は、データを再読み込み
    if (editVersionForm.vesselType === 'ferry' && selectedFerryVersionId.value === editVersionForm.versionId) {
      await loadFaresForType('ferry')
    } else if (editVersionForm.vesselType === 'highspeed' && selectedHighspeedVersionId.value === editVersionForm.versionId) {
      await loadFaresForType('highspeed')
    }

    $toast.success('版情報を更新しました')
    closeEditVersionModal()
  } catch (error) {
    logger.error('Failed to update fare version', error)
    $toast.error('版情報の更新に失敗しました')
  } finally {
    isEditingVersion.value = false
  }
}

const openDeleteVersionModal = async () => {
  const version = activeVersionMetadata.value
  if (!version) {
    $toast.error('削除する版が選択されていません')
    return
  }

  resetDeleteVersionInfo()
  deleteVersionInfo.versionId = version.id
  deleteVersionInfo.vesselType = version.vesselType
  deleteVersionInfo.name = version.name || ''
  deleteVersionInfo.effectiveFrom = version.effectiveFrom || ''
  deleteVersionInfo.isLoading = true
  showDeleteVersionModal.value = true

  try {
    const fares = await getCollection<(FareDoc & { id: string })>('fares', [
      where('versionId', '==', version.id)
    ])
    deleteVersionInfo.fareIds = fares.map(fare => fare.id)
    deleteVersionInfo.fareCount = fares.length
  } catch (error) {
    logger.error('Failed to load fares for delete preview', error)
    deleteVersionInfo.fareCount = null
    $toast.error('関連する料金の取得に失敗しました')
  } finally {
    deleteVersionInfo.isLoading = false
  }
}

const closeDeleteVersionModal = () => {
  showDeleteVersionModal.value = false
  resetDeleteVersionInfo()
}

const confirmDeleteVersion = async () => {
  if (!deleteVersionInfo.versionId) {
    $toast.error('削除対象の版が見つかりません')
    return
  }

  isDeletingVersion.value = true
  versionsInitialized.value = false

  try {
    let fareIds = [...deleteVersionInfo.fareIds]

    if (deleteVersionInfo.fareCount === null) {
      try {
        const fares = await getCollection<(FareDoc & { id: string })>('fares', [
          where('versionId', '==', deleteVersionInfo.versionId)
        ])
        fareIds = fares.map(fare => fare.id)
      } catch (error) {
        logger.error('Failed to refresh fares before deletion', error)
      }
    }

    if (fareIds.length) {
      for (const chunk of chunkArray(fareIds, 450)) {
        const operations = chunk.map(id => ({
          type: 'delete' as const,
          collection: 'fares',
          id
        }))
        await batchWrite(operations)
      }
    }

    await deleteDocument('fareVersions', deleteVersionInfo.versionId)

    if (deleteVersionInfo.vesselType === 'ferry' && selectedFerryVersionId.value === deleteVersionInfo.versionId) {
      selectedFerryVersionId.value = null
    }
    if (deleteVersionInfo.vesselType === 'highspeed' && selectedHighspeedVersionId.value === deleteVersionInfo.versionId) {
      selectedHighspeedVersionId.value = null
    }

    await loadFareVersions()

    if (deleteVersionInfo.vesselType === 'ferry') {
      await loadFaresForType('ferry')
    } else if (deleteVersionInfo.vesselType === 'highspeed') {
      await loadFaresForType('highspeed')
    }

    $toast.success('版を削除しました')
    closeDeleteVersionModal()
  } catch (error) {
    logger.error('Failed to delete fare version', error)
    $toast.error('版の削除に失敗しました')
  } finally {
    versionsInitialized.value = true
    isDeletingVersion.value = false
  }
}

const mapFareEntryForCreate = (fare: FareDoc, versionId: string) => {
  const passenger = extractPassenger(fare)
  const disabled = extractDisabledFare(fare)
  const seatClass = extractSeatClass(fare)
  const vehicle = extractVehicle(fare)
  const adult = passenger.adult ?? null
  const child = calculateChildFare(passenger.adult)
  const disabledAdult = disabled.adult ?? null
  const disabledChild = disabled.adult ? calculateChildFare(disabled.adult) : null
  const normalizedRoute = normalizeRouteId(fare.route ?? fare.routeName)
  const routeMetadata = normalizedRoute ? ROUTE_METADATA[normalizedRoute] : null
  const departure =
    typeof fare.departure === 'string' && fare.departure.trim().length
      ? fare.departure.trim()
      : routeMetadata?.departure ?? null
  const arrival =
    typeof fare.arrival === 'string' && fare.arrival.trim().length
      ? fare.arrival.trim()
      : routeMetadata?.arrival ?? null

  const payload: Record<string, any> = {
    type: fare.type ?? fare.vesselType ?? 'ferry',
    versionId,
    adult,
    child,
    disabledAdult,
    disabledChild,
    car3m: vehicle.under3m ?? null,
    car4m: vehicle.under4m ?? null,
    car5m: vehicle.under5m ?? null,
    seatClass,
    vehicle,
    fares: {
      adult,
      child,
      seatClass,
      vehicle,
      disabled: {
        adult: disabledAdult,
        child: disabledChild
      }
    },
    departure,
    arrival
  }

  if (normalizedRoute) {
    payload.route = normalizedRoute
    payload.routeName = normalizedRoute
  } else if (typeof fare.route === 'string') {
    payload.route = fare.route
  }

  if (fare.categoryId) payload.categoryId = fare.categoryId
  if (fare.displayName) payload.displayName = fare.displayName

  return payload
}

const createVersion = async () => {
  if (!versionForm.effectiveFrom) {
    $toast.error('適用開始日を入力してください')
    return
  }

  isSavingVersion.value = true
  try {
    const newVersionId = await createDocument('fareVersions', {
      vesselType: versionForm.vesselType,
      name: versionForm.name || null,
      effectiveFrom: versionForm.effectiveFrom,
      createdAt: new Date().toISOString()
    })

    const copyFromId = versionForm.copyFromVersionId && versionForm.copyFromVersionId !== 'null'
      ? versionForm.copyFromVersionId
      : null

    if (copyFromId) {
      const constraints = [where('type', '==', versionForm.vesselType), orderBy('route')]
      const sourceFares = await getCollection<(FareDoc & { id: string })>('fares', constraints)
      const faresToCopy = sourceFares.filter(fare => fare.versionId === copyFromId)

      if (faresToCopy.length) {
        const operations = faresToCopy.map(fare => ({
          type: 'create' as const,
          collection: 'fares',
          data: mapFareEntryForCreate(fare, newVersionId)
        }))

        await batchWrite(operations)
      }
    }

    await loadFareVersions()

    if (versionForm.vesselType === 'ferry') {
      selectedFerryVersionId.value = newVersionId
    } else if (versionForm.vesselType === 'highspeed') {
      selectedHighspeedVersionId.value = newVersionId
    }

    await loadFaresForType(versionForm.vesselType)

    showVersionModal.value = false
    $toast.success('新しい版を作成しました')
  } catch (error) {
    logger.error('Failed to create fare version', error)
    $toast.error('版の作成に失敗しました')
  } finally {
    isSavingVersion.value = false
  }
}

watch(selectedFerryVersionId, async () => {
  if (!versionsInitialized.value) return
  try {
    await loadFaresForType('ferry')
  } catch (error) {
    logger.error('Failed to load ferry fares for selected version', error)
    $toast.error('フェリー料金の読み込みに失敗しました')
  }
})

watch(selectedHighspeedVersionId, async () => {
  if (!versionsInitialized.value) return
  try {
    await loadFaresForType('highspeed')
  } catch (error) {
    logger.error('Failed to load highspeed fares for selected version', error)
    $toast.error('高速船料金の読み込みに失敗しました')
  }
})

const loadInnerIslandFare = async () => {
  try {
    const { getDocument } = useAdminFirestore()
    const doc = await getDocument('innerIslandFares', 'default')
    
    if (doc) {
      innerIslandFare.value = doc.innerIslandFare ?? null
      innerIslandVehicleFare.value = doc.innerIslandVehicleFare ?? null
    } else {
      // デフォルト値を設定
      innerIslandFare.value = { adult: 300, child: 100 }
      innerIslandVehicleFare.value = {
        under5m: 1000,
        under7m: 2000,
        under10m: 3000,
        over10m: 3000
      }
    }
  } catch (error) {
    logger.error('Failed to load inner island fare', error)
    // デフォルト値を設定
    innerIslandFare.value = { adult: 300, child: 100 }
    innerIslandVehicleFare.value = {
      under5m: 1000,
      under7m: 2000,
      under10m: 3000,
      over10m: 3000
    }
  }
}

const formatVehicleSizeLabel = (key: string): string => {
  const labels: Record<string, string> = {
    under5m: '5m未満',
    under7m: '7m未満',
    under10m: '10m未満',
    over10m: '10m以上'
  }
  return labels[key] || key
}

const loadFareData = async () => {
  isLoading.value = true
  try {
    versionsInitialized.value = false
    await loadFareVersions()
    await Promise.all([
      loadFaresForType('ferry'),
      loadFaresForType('highspeed'),
      loadInnerIslandFare()
    ])
    versionsInitialized.value = true

    // 高速船料金が空の場合はデフォルトを設定
    if (highspeedFares.value.length === 0) {
      initializeDefaults()
    }

    // 割引設定
    await loadDiscounts()
  } catch (error) {
    logger.error('Failed to load fare data', error)
    // エラー時は初期データを設定
    setDefaultData()
  } finally {
    isLoading.value = false
  }
}

const setDefaultData = () => {
  const defaultCategoryValues: Record<
    string,
    {
      adult: number
      child?: number
      disabled?: {
        adult?: number
        child?: number
      }
      seatClass: Partial<Record<SeatClassKey, number>>
      vehicle: Partial<Record<VehicleSizeKey, number>>
    }
  > = {
    'hondo-oki': {
      adult: 3520,
      child: 1760,
      seatClass: {
        class2: 3510,
        class2Special: 4520,
        class1: 6360,
        classSpecial: 7930,
        specialRoom: 8890
      },
      vehicle: {
        under3m: 13750,
        under4m: 18260,
        under5m: 22870,
        under6m: 27390,
        under7m: 35530,
        under8m: 40700,
        under9m: 45760,
        under10m: 50820,
        under11m: 55870,
        under12m: 60940,
        over12mPer1m: 5070
      }
    },
    'dozen-dogo': {
      adult: 1540,
      child: 770,
      seatClass: {
        class2: 1600,
        class2Special: 2120,
        class1: 2910,
        classSpecial: 3630,
        specialRoom: 4120
      },
      vehicle: {
        under3m: 5600,
        under4m: 7470,
        under5m: 9360,
        under6m: 11220,
        under7m: 13200,
        under8m: 15180,
        under9m: 17060,
        under10m: 18920,
        under11m: 20800,
        under12m: 22660,
        over12mPer1m: 1880
      }
    },
    'beppu-hishiura': {
      adult: 410,
      child: 205,
      seatClass: {
        class2: 410,
        class2Special: 630,
        class1: 650,
        classSpecial: 830,
        specialRoom: 1150
      },
      vehicle: {
        under3m: 950,
        under4m: 1260,
        under5m: 1590,
        under6m: 1900,
        under7m: 2230,
        under8m: 2560,
        under9m: 2870,
        under10m: 3200,
        under11m: 3510,
        under12m: 3810,
        over12mPer1m: 310
      }
    },
    'hishiura-kuri': {
      adult: 780,
      child: 390,
      seatClass: {
        class2: 780,
        class2Special: 1040,
        class1: 1390,
        classSpecial: 1730,
        specialRoom: 2040
      },
      vehicle: {
        under3m: 950,
        under4m: 1260,
        under5m: 1590,
        under6m: 1900,
        under7m: 2230,
        under8m: 2560,
        under9m: 2870,
        under10m: 3200,
        under11m: 3510,
        under12m: 3810,
        over12mPer1m: 310
      }
    },
    'kuri-beppu': {
      adult: 780,
      child: 390,
      seatClass: {
        class2: 780,
        class2Special: 1040,
        class1: 1390,
        classSpecial: 1730,
        specialRoom: 2040
      },
      vehicle: {
        under3m: 950,
        under4m: 1260,
        under5m: 1590,
        under6m: 1900,
        under7m: 2230,
        under8m: 2560,
        under9m: 2870,
        under10m: 3200,
        under11m: 3510,
        under12m: 3810,
        over12mPer1m: 310
      }
    }
  }

  const defaultCategories = FERRY_CATEGORY_DEFINITIONS.map(def => {
    const record = createEmptyCategoryRecord(def)
    const defaults = defaultCategoryValues[def.id]
    if (defaults) {
      SEAT_CLASS_FIELDS.forEach(({ key }) => {
        const value = defaults.seatClass?.[key]
        record.seatClass[key] = typeof value === 'number' ? value : null
      })
      VEHICLE_SIZE_FIELDS.forEach(({ key }) => {
        const value = defaults.vehicle?.[key]
        record.vehicle[key] = typeof value === 'number' ? value : null
      })
    }
    return record
  })

  ferryCategories.value = defaultCategories
  editingFerryCategories.value = defaultCategories.map(category => cloneCategoryRecord(category))

  // デフォルトの高速船料金
  const defaultHighspeedRouteIds: Array<keyof typeof HIGHSPEED_ROUTE_TRANSLATION_KEYS> = [
    'hondo-oki',
    'dozen-dogo',
    'beppu-hishiura'
  ]
  const defaultHighspeedAdults = [6430, 4890, 4890]
  const defaultHighspeedChildren = [3220, 2450, 2450]

  highspeedFares.value = defaultHighspeedRouteIds.map((routeId, index) => {
    const label = getHighspeedRouteLabel(routeId) ?? routeId
    const adult = defaultHighspeedAdults[index]
    return {
      route: routeId,
      routeLabel: label,
      displayName: label,
      routeName: label,
      adult,
      child: calculateChildFare(adult),
      disabledAdult: null,
      disabledChild: null,
      type: 'highspeed',
      versionId: selectedHighspeedVersionId.value ?? undefined
    }
  })

  editingHighspeedFares.value = highspeedFares.value.map(fare => ({ ...fare }))

  // デフォルトの割引設定
  discounts.value = [
    {
      id: '1',
      name: '島民割引',
      nameEn: 'Resident Discount',
      description: '隠岐諸島に住所を有する方',
      descriptionEn: 'For residents living in the Oki Islands',
      rate: 30,
      active: true,
      conditions: ['residence']
    },
    {
      id: '2',
      name: '団体割引',
      nameEn: 'Group Discount',
      description: '15名以上の団体',
      descriptionEn: 'Available for groups of 15 or more passengers',
      rate: 10,
      active: true,
      conditions: ['group']
    },
    {
      id: '3',
      name: '学生割引',
      nameEn: 'Student Discount',
      description: '学生証の提示が必要',
      descriptionEn: 'Student ID is required at boarding',
      rate: 20,
      active: true,
      conditions: ['student']
    },
    {
      id: '4',
      name: '障害者割引',
      nameEn: 'Accessibility Discount',
      description: '障害者手帳の提示が必要',
      descriptionEn: 'Disability certificate required',
      rate: 50,
      active: true,
      conditions: ['disability']
    }
  ]
  editingHighspeedFares.value = highspeedFares.value.map(fare => ({ ...fare }))
}

const saveFareData = async () => {
  isSaving.value = true
  try {
    if (activeTab.value === 'ferry') {
      if (!selectedFerryVersionId.value) {
        $toast.error('フェリー料金を保存する版を選択してください')
        return
      }

      const versionId = selectedFerryVersionId.value
      const operations: Array<{
        type: 'update' | 'create'
        collection: string
        id?: string | null
        data: Record<string, any>
      }> = []

      editingFerryCategories.value.forEach(category => {
        category.routeIds.forEach(routeId => {
          const metadata = ROUTE_METADATA[routeId]
          const targetDocId = category.docIds[routeId] ?? buildFareDocId(versionId, routeId)
          const adult = pickNumber(category.seatClass.second)
          const child = calculateChildFare(adult)
          const disabledAdult = pickNumber(category.disabledAdult)
          const disabledChild = disabledAdult ? calculateChildFare(disabledAdult) : null
          const seatClassPayload = SEAT_CLASS_FIELDS.reduce<Record<SeatClassKey, number | null>>((acc, field) => {
            acc[field.key] = pickNumber(category.seatClass[field.key])
            return acc
          }, {} as Record<SeatClassKey, number | null>)
          const vehiclePayload = VEHICLE_SIZE_FIELDS.reduce<Record<VehicleSizeKey, number | null>>((acc, field) => {
            acc[field.key] = pickNumber(category.vehicle[field.key])
            return acc
          }, {} as Record<VehicleSizeKey, number | null>)
          const payload: Record<string, any> = {
            route: routeId,
            routeName: routeId,
            type: 'ferry',
            versionId,
            categoryId: category.id,
            displayName: category.label,
            adult,
            child,
            disabledAdult,
            disabledChild,
            car3m: vehiclePayload.under3m ?? null,
            car4m: vehiclePayload.under4m ?? null,
            car5m: vehiclePayload.under5m ?? null,
            car6m: vehiclePayload.under6m ?? null,
            car7m: vehiclePayload.under7m ?? null,
            car8m: vehiclePayload.under8m ?? null,
            car9m: vehiclePayload.under9m ?? null,
            car10m: vehiclePayload.under10m ?? null,
            car11m: vehiclePayload.under11m ?? null,
            car12m: vehiclePayload.under12m ?? null,
            over12mPer1m: vehiclePayload.over12mPer1m ?? null,
            seatClass: seatClassPayload,
            vehicle: vehiclePayload,
            disabled: {
              adult: disabledAdult,
              child: disabledChild
            },
            fares: {
              adult,
              child,
              seatClass: seatClassPayload,
              vehicle: vehiclePayload,
              disabled: {
                adult: disabledAdult,
                child: disabledChild
              }
            }
          }

          if (metadata) {
            payload.departure = metadata.departure
            payload.arrival = metadata.arrival
          }

          operations.push({
            type: category.docIds[routeId] ? 'update' : 'create',
            collection: 'fares',
            id: targetDocId,
            data: payload
          })
        })
      })

      if (operations.length) {
        await batchWrite(operations)
      }

      await loadFaresForType('ferry')
      $toast.success('フェリー料金を更新しました')
    } else if (activeTab.value === 'highspeed') {
      // 高速船料金の保存
      if (!selectedHighspeedVersionId.value) {
        $toast.error('高速船料金を保存する版を選択してください')
        return
      }

      const targetFares = editingHighspeedFares.value.filter(fare => !isHighspeedKuriRoute(fare))

      const operations = targetFares.map(fare => {
        const { routeId, label } = resolveHighspeedRouteInfo(fare)
        const adult = pickNumber(fare.adult)
        const child = pickNumber(fare.child)
        const disabledAdult = pickNumber(fare.disabledAdult)
        const disabledChild = pickNumber(fare.disabledChild)
        const resolvedRoute = routeId ?? normalizeRouteId(label) ?? normalizeRouteId(fare.route ?? null) ?? (typeof fare.route === 'string' ? fare.route : null)
        const routeMetadata = resolvedRoute ? ROUTE_METADATA[resolvedRoute] : null
        const departure =
          typeof fare.departure === 'string' && fare.departure.trim().length
            ? fare.departure.trim()
            : routeMetadata?.departure ?? null
        const arrival =
          typeof fare.arrival === 'string' && fare.arrival.trim().length
            ? fare.arrival.trim()
            : routeMetadata?.arrival ?? null
        return {
          type: fare.id ? 'update' as const : 'create' as const,
          collection: 'fares',
          id: fare.id,
          data: {
            route: resolvedRoute ?? label,
            routeName: label,
            displayName: label,
            adult,
            child: child ?? calculateChildFare(adult),
            disabled: {
              adult: disabledAdult,
              child: disabledChild ?? (disabledAdult ? calculateChildFare(disabledAdult) : null)
            },
            disabledAdult,
            disabledChild: disabledChild ?? (disabledAdult ? calculateChildFare(disabledAdult) : null),
            type: 'highspeed',
            versionId: selectedHighspeedVersionId.value,
            departure,
            arrival,
            fares: {
              adult,
              child: child ?? calculateChildFare(adult),
              disabled: {
                adult: disabledAdult,
                child: disabledChild ?? (disabledAdult ? calculateChildFare(disabledAdult) : null)
              }
            }
          }
        }
      })
      if (operations.length) {
        await batchWrite(operations)
      }

      await loadFaresForType('highspeed')
      $toast.success('高速船料金を更新しました')
    } else if (activeTab.value === 'discount') {
      const originalMap = new Map<string, DiscountDoc>()
      discounts.value.forEach(discount => {
        if (typeof discount.id === 'string' && discount.id.trim().length > 0) {
          originalMap.set(discount.id.trim(), discount)
        }
      })

      const idsToDelete = new Set(originalMap.keys())
      const seenIds = new Set<string>()
      const operations: Array<{
        type: 'create' | 'update'
        collection: string
        id: string
        data: Record<string, any>
      }> = []

      for (let index = 0; index < editingDiscounts.value.length; index += 1) {
        const form = editingDiscounts.value[index]
        const docId = typeof form.id === 'string' ? form.id.trim() : ''

        if (!docId) {
          $toast.error(`割引IDが未入力です（#${index + 1}）`)
          return
        }

        if (seenIds.has(docId)) {
          $toast.error(`割引ID「${docId}」が重複しています`)
          return
        }
        seenIds.add(docId)

        const percent = clampPercent(form.ratePercent)
        const percentRounded = Math.round(percent * 10) / 10
        const rateMultiplier = calculateMultiplierFromPercent(percentRounded)
        const minPeople = typeof form.minPeople === 'number' && !Number.isNaN(form.minPeople)
          ? Math.max(0, Math.floor(form.minPeople))
          : null
        const conditions = parseConditionsText(form.conditionsText)

        const payload: Record<string, any> = {
          name: toNullableString(form.name),
          nameEn: toNullableString(form.nameEn),
          nameKey: toNullableString(form.nameKey),
          description: toNullableString(form.description),
          descriptionEn: toNullableString(form.descriptionEn),
          descriptionKey: toNullableString(form.descriptionKey),
          rate: rateMultiplier,
          rateMultiplier,
          ratePercent: percentRounded,
          minPeople,
          active: Boolean(form.active),
          conditions
        }

        if (form.originalId && form.originalId !== docId) {
          idsToDelete.add(form.originalId)
        }
        idsToDelete.delete(docId)

        const operationType: 'create' | 'update' = originalMap.has(docId) ? 'update' : 'create'
        operations.push({
          type: operationType,
          collection: 'discounts',
          id: docId,
          data: payload
        })
      }

      const deleteOperations = Array.from(idsToDelete).map(id => ({
        type: 'delete' as const,
        collection: 'discounts',
        id
      }))

      const batched = [...operations, ...deleteOperations]
      if (batched.length) {
        await batchWrite(batched)
      }

      await loadDiscounts()
      $toast.success('割引設定を更新しました')
    } else if (activeTab.value === 'local') {
      // 内航船料金の保存
      const { createDocument, updateDocument, getDocument } = useAdminFirestore()
      
      const innerIslandFareData = {
        adult: editingInnerIslandFare.value.adult ?? null,
        child: editingInnerIslandFare.value.child ?? null
      }
      
      const innerIslandVehicleFareData: Record<string, number | null> = {}
      Object.entries(editingInnerIslandVehicleFare.value).forEach(([key, value]) => {
        innerIslandVehicleFareData[key] = value ?? null
      })
      
      // 既存のドキュメントを確認
      const existingDoc = await getDocument('innerIslandFares', 'default')
      
      const payload = {
        innerIslandFare: innerIslandFareData,
        innerIslandVehicleFare: innerIslandVehicleFareData,
        updatedAt: new Date()
      }
      
      if (existingDoc) {
        await updateDocument('innerIslandFares', 'default', payload)
      } else {
        await createDocument('innerIslandFares', {
          ...payload,
          createdAt: new Date()
        }, 'default')
      }
      
      await loadInnerIslandFare()
      $toast.success('内航船料金を更新しました')
    }

    showEditModal.value = false
  } catch (error) {
    logger.error('Failed to save fare data', error)
    $toast.error('保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const publishFareData = async () => {
  isPublishing.value = true
  try {
    await publishData('fare')
    $toast.success('料金データを公開しました')
  } catch (error) {
    logger.error('Failed to publish fare data', error)
    $toast.error('データの公開に失敗しました')
  } finally {
    isPublishing.value = false
  }
}

const refreshData = () => {
  loadFareData()
}

// 編集モーダルを開く際に編集用データを更新
watch(showEditModal, (isOpen) => {
  if (isOpen) {
    if (activeTab.value === 'ferry') {
      editingFerryCategories.value = ferryCategories.value.map(category => cloneCategoryRecord(category))
    } else if (activeTab.value === 'highspeed') {
      editingHighspeedFares.value = highspeedFares.value.map(fare => ({ ...fare }))
    } else if (activeTab.value === 'local') {
      // 内航船料金の編集用データを初期化
      editingInnerIslandFare.value = {
        adult: innerIslandFare.value?.adult ?? null,
        child: innerIslandFare.value?.child ?? null
      }
      editingInnerIslandVehicleFare.value = innerIslandVehicleFare.value
        ? { ...innerIslandVehicleFare.value }
        : {
            under5m: 1000,
            under7m: 2000,
            under10m: 3000,
            over10m: 3000
          }
    } else if (activeTab.value === 'discount') {
      const discountForms = discounts.value.map(discount => createDiscountFormItem(discount))
      editingDiscounts.value = discountForms.length
        ? discountForms
        : [
          createDiscountFormItem(null, {
            id: '',
            originalId: null,
            name: '',
            nameEn: '',
            description: '',
            descriptionEn: '',
            ratePercent: 0,
            active: true
          })
        ]
    }
  }
})

onMounted(() => {
  loadFareData()
})
</script>
