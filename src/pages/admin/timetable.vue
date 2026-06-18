<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">時刻表管理</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        船・バス・飛行機の時刻表を管理します
      </p>
    </div>

    <!-- フィルター -->
    <Card class="mb-6" padding="sm">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            交通手段
          </label>
          <select
            v-model="filters.mode"
            data-test="timetable-filter-mode"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option v-for="mode in transportModes" :key="mode.id" :value="mode.id">
              {{ mode.label }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            出発地
          </label>
          <select
            v-model="filters.departure"
            data-test="timetable-filter-departure"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option v-for="location in filterLocationOptions" :key="location.id" :value="location.id">
              {{ location.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            到着地
          </label>
          <select
            v-model="filters.arrival"
            data-test="timetable-filter-arrival"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option v-for="location in filterLocationOptions" :key="location.id" :value="location.id">
              {{ location.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            交通機関
          </label>
          <select
            v-model="filters.ship"
            data-test="timetable-filter-ship"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option v-for="transport in filterTransportOptions" :key="transport.id" :value="transport.id">
              {{ transport.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            運航状態
          </label>
          <select
            v-model="filters.status"
            data-test="timetable-filter-status"
            class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors px-3 py-2"
          >
            <option value="">すべて</option>
            <option value="0">通常運航</option>
            <option value="1">遅延</option>
            <option value="2">欠航</option>
            <option value="3">変更</option>
            <option value="4">臨時便</option>
          </select>
        </div>
      </div>
    </Card>

    <!-- アクションボタン -->
    <div class="mb-4 flex flex-col sm:flex-row gap-3 justify-between">
      <div class="flex flex-col sm:flex-row gap-2">
        <SecondaryButton
          data-test="timetable-refresh"
          class="w-full sm:w-auto"
          @click="refreshData"
        >
          <ArrowPathIcon class="h-5 w-5 inline mr-1" />
          更新
        </SecondaryButton>
        <PrimaryButton
          :disabled="isPublishing"
          data-test="timetable-publish"
          class="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 disabled:hover:bg-purple-600"
          @click="publishTimetableData"
        >
          <CloudArrowUpIcon class="h-5 w-5 inline mr-1" />
          {{ isPublishing ? '公開中...' : 'データ公開' }}
        </PrimaryButton>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <button
          data-test="timetable-import"
          class="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          @click="showImportModal = true"
        >
          <ArrowUpTrayIcon class="h-5 w-5 inline mr-1" />
          インポート
        </button>
        <button
          data-test="timetable-delete-all"
          class="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          @click="deleteAllRecords"
        >
          <TrashIcon class="h-5 w-5 inline mr-1" />
          全件削除
        </button>
        <PrimaryButton
          data-test="timetable-add"
          class="w-full sm:w-auto"
          @click="showAddModal = true"
        >
          <PlusIcon class="h-5 w-5 inline mr-1" />
          新規追加
        </PrimaryButton>
      </div>
    </div>

    <!-- データテーブル -->
    <DataTable
      :columns="columns"
      :data="filteredTimetables"
      :pagination="true"
      :page-size="20"
    >
      <template #cell-mode="{ value }">
        {{ getModeLabel(value) }}
      </template>
      <template #cell-name="{ value }">
        {{ getTransportName(value) }}
      </template>
      <template #cell-departure="{ value }">
        {{ getLocationName(value) }}
      </template>
      <template #cell-arrival="{ value }">
        {{ getLocationName(value) }}
      </template>
      <template #cell-departure_time="{ value }">
        {{ formatTime(value) }}
      </template>
      <template #cell-arrival_time="{ value }">
        {{ formatTime(value) }}
      </template>
      <template #cell-start_date="{ value }">
        {{ formatDateForDisplay(value) }}
      </template>
      <template #cell-end_date="{ value }">
        {{ formatDateForDisplay(value) }}
      </template>
      <template #cell-status="{ value }">
        <span
          :class="[
            'px-2 py-1 rounded-full text-xs font-medium',
            getStatusClass(value)
          ]"
        >
          {{ getStatusLabel(value) }}
        </span>
      </template>
      <template #row-actions="{ row }">
        <div class="flex items-center gap-1">
          <button
            data-test="timetable-edit"
            class="p-2 text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="編集"
            aria-label="時刻表を編集"
            @click="editTimetable(row)"
          >
            <PencilIcon class="h-5 w-5" />
          </button>
          <button
            data-test="timetable-delete"
            class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="削除"
            aria-label="時刻表を削除"
            @click="deleteTimetable(row)"
          >
            <TrashIcon class="h-5 w-5" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- 追加/編集モーダル -->
    <FormModal
      :open="showAddModal || showEditModal"
      :title="showAddModal ? '時刻表の追加' : '時刻表の編集'"
      :loading="isSaving"
      @close="closeModal"
      @submit="saveTimetable"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            交通手段
          </label>
          <select
            v-model="formData.mode"
            data-test="timetable-mode"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
            <option v-for="mode in transportModes" :key="mode.id" :value="mode.id">
              {{ mode.label }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              便ID (trip_id)
            </label>
            <input
              v-model="formData.trip_id"
              type="text"
              data-test="timetable-trip-id"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              次便ID (next_id)
            </label>
            <input
              v-model="formData.next_id"
              type="text"
              data-test="timetable-next-id"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="次の便IDがある場合に入力"
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            交通機関名
          </label>
          <select
            v-model="formData.name"
            data-test="timetable-name"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            required
          >
            <option value="">選択してください</option>
            <option v-for="transport in formTransportOptions" :key="transport.id" :value="transport.id">
              {{ transport.name }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              出発地
            </label>
            <select
              v-model="formData.departure"
              data-test="timetable-departure"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
              <option value="">選択してください</option>
              <option v-for="location in formLocationOptions" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              到着地
            </label>
            <select
              v-model="formData.arrival"
              data-test="timetable-arrival"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
              <option value="">選択してください</option>
              <option v-for="location in formLocationOptions" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              出発時刻
            </label>
            <input
              v-model="formData.departure_time"
              type="time"
              data-test="timetable-departure-time"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              到着時刻
            </label>
            <input
              v-model="formData.arrival_time"
              type="time"
              data-test="timetable-arrival-time"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              開始日
            </label>
            <input
              v-model="formData.start_date"
              type="date"
              data-test="timetable-start-date"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              終了日
            </label>
            <input
              v-model="formData.end_date"
              type="date"
              data-test="timetable-end-date"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              required
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            運航状態
          </label>
          <select
            v-model="formData.status"
            data-test="timetable-status"
            class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
          >
            <option value="0">通常運航</option>
            <option value="1">遅延</option>
            <option value="2">欠航</option>
            <option value="3">変更</option>
            <option value="4">臨時便</option>
          </select>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              運行事業者ID
            </label>
            <input
              v-model="formData.operator_id"
              type="text"
              data-test="timetable-operator-id"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="例: JAL, ICHIBATA_BUS"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              サービスID
            </label>
            <input
              v-model="formData.service_id"
              type="text"
              data-test="timetable-service-id"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="運行期間・曜日単位のID"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              便名・路線ID
            </label>
            <input
              v-model="formData.vehicle_id"
              type="text"
              data-test="timetable-vehicle-id"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="例: JAL2332, route_id"
            >
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              路線名・経由
            </label>
            <input
              v-model="formData.via"
              type="text"
              data-test="timetable-via"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="バス路線名や経由地"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              運賃
            </label>
            <input
              v-model.number="formData.price"
              type="number"
              min="0"
              inputmode="numeric"
              data-test="timetable-price"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="不明な場合は空欄"
            >
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            運行曜日
          </label>
          <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">
            <label
              v-for="day in weekdayOptions"
              :key="day.value"
              class="inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-2 py-2 text-sm dark:text-gray-200"
            >
              <input
                v-model="formData.active_days"
                type="checkbox"
                :value="day.value"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              {{ day.label }}
            </label>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              追加運行日
            </label>
            <input
              v-model="formData.added_dates"
              type="text"
              data-test="timetable-added-dates"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="YYYY-MM-DD, YYYY-MM-DD"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              除外運行日
            </label>
            <input
              v-model="formData.removed_dates"
              type="text"
              data-test="timetable-removed-dates"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
              placeholder="YYYY-MM-DD, YYYY-MM-DD"
            >
          </div>
        </div>
        <div v-if="formData.mode === 'AIR'" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ターミナル
            </label>
            <input
              v-model="formData.terminal"
              type="text"
              data-test="timetable-terminal"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              搭乗口
            </label>
            <input
              v-model="formData.gate"
              type="text"
              data-test="timetable-gate"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              のりば
            </label>
            <input
              v-model="formData.platform"
              type="text"
              data-test="timetable-platform"
              class="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-colors"
            >
          </div>
        </div>
      </div>
    </FormModal>

    <!-- インポートモーダル -->
    <FormModal
      :open="showImportModal"
      title="時刻表データのインポート"
      :loading="isImporting"
      @close="showImportModal = false"
      @submit="importData"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            インポート形式を選択
          </label>
          <div class="flex gap-4">
            <label class="flex items-center">
              <input
                v-model="importFormat"
                type="radio"
                value="csv"
                class="mr-2"
              >
              CSVファイル
            </label>
            <label class="flex items-center">
              <input
                v-model="importFormat"
                type="radio"
                value="json"
                class="mr-2"
              >
              JSONファイル
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ importFormat === 'csv' ? 'CSV' : 'JSON' }}ファイルを選択
          </label>
          <input
            type="file"
            :accept="importFormat === 'csv' ? '.csv' : '.json'"
            data-test="timetable-file-input"
            class="mt-1 w-full"
            @change="handleFileSelect"
          >
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <p v-if="importFormat === 'csv'">CSVファイルの形式:</p>
          <p v-else>JSONファイルの形式:</p>
          <ul class="list-disc list-inside mt-2">
            <template v-if="importFormat === 'csv'">
              <li>trip_id, next_id, mode, name, departure, arrival, departure_time, arrival_time, start_date, end_date, status</li>
              <li>任意項目: operator_id, service_id, vehicle_id, via, price, active_days, added_dates, removed_dates, platform, terminal, gate</li>
              <li>active_days, added_dates, removed_dates はセミコロン区切り（例: 1;2;3 または 2026-08-01;2026-08-02）</li>
              <li>交通機関・発着地・便IDはシステムID（例: FERRY_OKI, BUS_ICHIBATA_CONNECTION_matsue_station, AIRPORT_OKI）で入力</li>
              <li>UTF-8エンコーディング</li>
              <li>ヘッダー行あり</li>
            </template>
            <template v-else>
              <li>配列形式のJSONファイル</li>
              <li>各要素には trip_id, mode, name, departure, arrival, departure_time, arrival_time, start_date, end_date を含める</li>
              <li>交通機関・発着地・便IDはシステムID（例: FERRY_OKI, BUS_ICHIBATA_CONNECTION_matsue_station, AIRPORT_OKI）で入力</li>
              <li>UTF-8エンコーディング</li>
            </template>
          </ul>
        </div>
      </div>
    </FormModal>
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon
} from '@heroicons/vue/24/outline'
import { orderBy } from 'firebase/firestore'
import Card from '@/components/common/Card.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import SecondaryButton from '@/components/common/SecondaryButton.vue'
import type { LocationType, Port, TransportMode } from '~/types'
import { AIRPORTS } from '~/data/air'
import { loadBusStopsIndex } from '~/utils/gtfsBusTimetable'
import { useAdminFirestore } from '~/composables/useAdminFirestore'
import { useDataPublish } from '~/composables/useDataPublish'
import DataTable from '~/components/admin/DataTable.vue'
import FormModal from '~/components/admin/FormModal.vue'
import { createLogger } from '~/utils/logger'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { getCollection, createDocument, updateDocument, deleteDocument, batchWrite } = useAdminFirestore()
const { publishData } = useDataPublish()
const { $toast } = useNuxtApp()
const logger = createLogger('AdminTimetablePage')

type ManagedTransportMode = Extract<TransportMode, 'FERRY' | 'BUS' | 'AIR'>

type TransportOption = {
  id: string
  name: string
  nameEn?: string
  mode: ManagedTransportMode
  type?: string
  operatorId?: string
}

type LocationOption = {
  id: string
  name: string
  nameEn?: string
  type: LocationType
  mode: ManagedTransportMode
}

interface AdminTimetableRecord {
  id?: string
  trip_id: string
  next_id: string
  mode: ManagedTransportMode
  operator_id?: string
  service_id?: string
  vehicle_id?: string
  start_date: string
  end_date: string
  name: string
  departure: string
  departure_type?: LocationType
  departure_time: string
  arrival: string
  arrival_type?: LocationType
  arrival_time: string
  active_days?: number[]
  added_dates?: string
  removed_dates?: string
  platform?: string
  terminal?: string
  gate?: string
  status: number
  price?: number
  via?: string
}

type AdminTimetableForm = Omit<AdminTimetableRecord, 'id'>

const transportModes: Array<{ id: ManagedTransportMode, label: string }> = [
  { id: 'FERRY', label: '船' },
  { id: 'BUS', label: 'バス' },
  { id: 'AIR', label: '飛行機' }
]

const weekdayOptions = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' }
]

// 港データ
const ports = ref<Port[]>([
  { id: 'SAIGO', name: '西郷', nameEn: 'Saigo', location: { lat: 36.2, lng: 133.3 }, type: 'dogo' },
  { id: 'HISHIURA', name: '菱浦', nameEn: 'Hishiura', location: { lat: 36.1, lng: 133.2 }, type: 'dozen' },
  { id: 'BEPPU', name: '別府', nameEn: 'Beppu', location: { lat: 36.3, lng: 133.15 }, type: 'dozen' },
  { id: 'KURI', name: '来居', nameEn: 'Kuri', location: { lat: 36.05, lng: 133.1 }, type: 'dozen' },
  { id: 'HONDO_SHICHIRUI', name: '本土七類', nameEn: 'Hondo Shichirui', location: { lat: 35.5, lng: 133.2 }, type: 'mainland' },
  { id: 'HONDO_SAKAIMINATO', name: '本土境港', nameEn: 'Hondo Sakaiminato', location: { lat: 35.55, lng: 133.23 }, type: 'mainland' }
])

// 船舶データ
const ships = ref<TransportOption[]>([
  { id: 'FERRY_OKI', name: 'フェリーおき', nameEn: 'Ferry Oki', type: 'ferry', mode: 'FERRY' },
  { id: 'FERRY_SHIRASHIMA', name: 'フェリーしらしま', nameEn: 'Ferry Shirashima', type: 'ferry', mode: 'FERRY' },
  { id: 'FERRY_KUNIGA', name: 'フェリーくにが', nameEn: 'Ferry Kuniga', type: 'ferry', mode: 'FERRY' },
  { id: 'FERRY_DOZEN', name: 'フェリーどうぜん', nameEn: 'Ferry Dozen', type: 'ferry', mode: 'FERRY' },
  { id: 'ISOKAZE', name: 'いそかぜ', nameEn: 'Isokaze', type: 'local', mode: 'FERRY' },
  { id: 'RAINBOWJET', name: 'レインボージェット', nameEn: 'Rainbow Jet', type: 'highspeed', mode: 'FERRY' }
])

const busTransports = ref<TransportOption[]>([
  { id: 'AMA_TOWN_BUS', name: '海士町路線バス', mode: 'BUS', operatorId: 'AMA_TOWN' },
  { id: 'NISHINOSHIMA_TOWN_BUS', name: '西ノ島町営バス', mode: 'BUS', operatorId: 'NISHINOSHIMA_TOWN' },
  { id: 'CHIBU_VILLAGE_BUS', name: '知夫村営バス', mode: 'BUS', operatorId: 'CHIBU_VILLAGE' },
  { id: 'OKI_ICHIBATA_BUS', name: '隠岐一畑交通', mode: 'BUS', operatorId: 'OKI_ICHIBATA' },
  { id: 'OKINOSHIMA_TOWN_BUS', name: '隠岐の島町営バス', mode: 'BUS', operatorId: 'OKINOSHIMA_TOWN' },
  { id: 'ICHIBATA_BUS_CONNECTION', name: '一畑バス 隠岐汽船接続バス', mode: 'BUS', operatorId: 'ICHIBATA_BUS' }
])

const airTransports = ref<TransportOption[]>([
  { id: 'JAL_OKI_ITAMI', name: 'JAL 大阪（伊丹）線', mode: 'AIR', operatorId: 'JAL' },
  { id: 'JAL_OKI_IZUMO', name: 'JAL 出雲線', mode: 'AIR', operatorId: 'JAL' }
])

const timetables = ref<AdminTimetableRecord[]>([])
const busStopOptions = ref<LocationOption[]>([])
const filters = ref({
  mode: '',
  departure: '',
  arrival: '',
  ship: '',
  status: ''
})

const showAddModal = ref(false)
const showEditModal = ref(false)
const showImportModal = ref(false)
const isSaving = ref(false)
const isImporting = ref(false)
const isPublishing = ref(false)
const editingId = ref<string | null>(null)
const importFormat = ref<'csv' | 'json'>('csv')

const defaultFormState = (): AdminTimetableForm => ({
  trip_id: '',
  next_id: '',
  mode: 'FERRY',
  operator_id: '',
  service_id: '',
  vehicle_id: '',
  start_date: '',
  end_date: '',
  name: '',
  departure: '',
  departure_type: 'PORT',
  departure_time: '',
  arrival: '',
  arrival_type: 'PORT',
  arrival_time: '',
  active_days: [0, 1, 2, 3, 4, 5, 6],
  added_dates: '',
  removed_dates: '',
  platform: '',
  terminal: '',
  gate: '',
  status: 0,
  price: undefined,
  via: ''
})

const formData = ref<AdminTimetableForm>(defaultFormState())

const columns = [
  { key: 'trip_id', label: '便ID', sortable: true },
  { key: 'mode', label: '交通手段', sortable: true },
  { key: 'name', label: '交通機関', sortable: true },
  { key: 'departure', label: '出発地', sortable: true },
  { key: 'arrival', label: '到着地', sortable: true },
  { key: 'departure_time', label: '出発時刻', sortable: true },
  { key: 'arrival_time', label: '到着時刻', sortable: true },
  { key: 'start_date', label: '開始日', sortable: true },
  { key: 'end_date', label: '終了日', sortable: true },
  { key: 'status', label: '状態', sortable: true }
]

const filteredTimetables = computed(() => {
  return timetables.value.filter(item => {
    if (filters.value.mode && item.mode !== filters.value.mode) return false
    if (filters.value.departure && item.departure !== filters.value.departure) return false
    if (filters.value.arrival && item.arrival !== filters.value.arrival) return false
    if (filters.value.ship && item.name !== filters.value.ship) return false
    if (filters.value.status !== '' && item.status !== Number.parseInt(filters.value.status, 10)) return false
    return true
  })
})

const portLocationOptions = computed<LocationOption[]>(() => ports.value.map(port => ({
  id: port.id,
  name: port.name,
  nameEn: port.nameEn,
  type: 'PORT',
  mode: 'FERRY'
})))

const airportLocationOptions = computed<LocationOption[]>(() => AIRPORTS.map(airport => ({
  id: airport.id,
  name: airport.name,
  nameEn: airport.nameEn,
  type: 'AIRPORT',
  mode: 'AIR'
})))

const allTransportOptions = computed<TransportOption[]>(() => [
  ...ships.value,
  ...busTransports.value,
  ...airTransports.value
])

const allLocationOptions = computed<LocationOption[]>(() => [
  ...portLocationOptions.value,
  ...busStopOptions.value,
  ...airportLocationOptions.value
])

const filterTransportOptions = computed(() => {
  if (!filters.value.mode) return allTransportOptions.value
  return allTransportOptions.value.filter(transport => transport.mode === filters.value.mode)
})

const filterLocationOptions = computed(() => {
  if (!filters.value.mode) return allLocationOptions.value
  return allLocationOptions.value.filter(location => location.mode === filters.value.mode)
})

const formTransportOptions = computed(() => {
  return allTransportOptions.value.filter(transport => transport.mode === formData.value.mode)
})

const formLocationOptions = computed(() => {
  return allLocationOptions.value.filter(location => location.mode === formData.value.mode)
})

const getStatusClass = (status: number) => {
  switch (status) {
    case 0: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 1: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 2: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 3: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 4: return 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getStatusLabel = (status: number) => {
  switch (status) {
    case 0: return '通常'
    case 1: return '遅延'
    case 2: return '欠航'
    case 3: return '変更'
    case 4: return '臨時'
    default: return '不明'
  }
}

const formatTime = (time: string | Date) => {
  if (typeof time === 'string') {
    return normalizeTimeValue(time)
  }
  return new Date(time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const editTimetable = (item: AdminTimetableRecord | Record<string, any>) => {
  const record = normalizeTimetableRecord(item)
  formData.value = {
    trip_id: record.trip_id,
    next_id: record.next_id || '',
    mode: record.mode || inferModeForRecord(record),
    operator_id: record.operator_id || '',
    service_id: record.service_id || '',
    vehicle_id: record.vehicle_id || '',
    start_date: formatDateForInput(record.start_date),
    end_date: formatDateForInput(record.end_date),
    name: record.name,
    departure: record.departure,
    departure_type: record.departure_type || getLocationTypeForMode(record.mode || inferModeForRecord(record)),
    departure_time: normalizeTimeValue(record.departure_time),
    arrival: record.arrival,
    arrival_type: record.arrival_type || getLocationTypeForMode(record.mode || inferModeForRecord(record)),
    arrival_time: normalizeTimeValue(record.arrival_time),
    active_days: normalizeActiveDays(record.active_days),
    added_dates: record.added_dates || '',
    removed_dates: record.removed_dates || '',
    platform: record.platform || '',
    terminal: record.terminal || '',
    gate: record.gate || '',
    status: record.status ?? 0,
    price: record.price,
    via: record.via || ''
  }
  editingId.value = record.id || null
  showEditModal.value = true
}

const deleteTimetable = async (item: AdminTimetableRecord | Record<string, any>) => {
  const record = normalizeTimetableRecord(item)
  if (!record.id) return

  if (confirm(`${getTransportName(record.name)} の ${getLocationName(record.departure)} → ${getLocationName(record.arrival)} 便を削除しますか？`)) {
    try {
      await deleteDocument('timetables', record.id)
      await refreshData()
      $toast.success('時刻表を削除しました')
    } catch (error) {
      logger.error('Failed to delete timetable', error)
      $toast.error('削除に失敗しました')
    }
  }
}

const deleteAllRecords = async () => {
  const recordCount = timetables.value.length
  
  if (recordCount === 0) {
    $toast.info('削除対象のデータがありません')
    return
  }

  if (confirm(`本当に全${recordCount}件の時刻表データを削除しますか？\nこの操作は元に戻せません。`)) {
    if (confirm(`最終確認：全${recordCount}件の時刻表データを完全に削除します。よろしいですか？`)) {
      let deletedOperationCount = 0
      try {
        const operations = timetables.value
          .filter(record => record.id)
          .map(record => ({
            type: 'delete' as const,
            collection: 'timetables',
            id: record.id!
          }))

        if (operations.length > 0) {
          deletedOperationCount = operations.length
          await batchWrite(operations)
          $toast.success(`${operations.length}件の時刻表データを削除しました`)
          await refreshData()
        } else {
          $toast.info('削除対象のデータがありません')
        }
      } catch (error) {
        // Filter out BloomFilter warnings as they're not actionable
        if (error instanceof Error && error.message.includes('BloomFilterError')) {
          logger.warn('BloomFilter warning (non-critical)', error)
          $toast.success(`${deletedOperationCount}件の時刻表データを削除しました`)
          await refreshData()
        } else {
          logger.error('Failed to delete all records', error)
          $toast.error('全件削除に失敗しました')
        }
      }
    }
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingId.value = null
  formData.value = defaultFormState()
}

const saveTimetable = async () => {
  isSaving.value = true
  try {
    const mode = normalizeTransportModeValue(formData.value.mode)
    const payload: AdminTimetableForm = {
      trip_id: formData.value.trip_id || toStringSafe(Date.now()),
      next_id: formData.value.next_id || '',
      mode,
      operator_id: formData.value.operator_id || getDefaultOperatorId(formData.value.name),
      service_id: formData.value.service_id || '',
      vehicle_id: formData.value.vehicle_id || '',
      start_date: formatDateForStorage(formData.value.start_date),
      end_date: formatDateForStorage(formData.value.end_date),
      name: formData.value.name,
      departure: formData.value.departure,
      departure_type: formData.value.departure_type || getLocationTypeForMode(mode),
      departure_time: normalizeTimeValue(formData.value.departure_time),
      arrival: formData.value.arrival,
      arrival_type: formData.value.arrival_type || getLocationTypeForMode(mode),
      arrival_time: normalizeTimeValue(formData.value.arrival_time),
      active_days: normalizeActiveDays(formData.value.active_days),
      added_dates: normalizeDateListString(formData.value.added_dates),
      removed_dates: normalizeDateListString(formData.value.removed_dates),
      platform: formData.value.platform || '',
      terminal: formData.value.terminal || '',
      gate: formData.value.gate || '',
      status: formData.value.status ?? 0,
      via: formData.value.via || ''
    }

    // Only add price if it's a valid number
    if (formData.value.price !== undefined && formData.value.price !== null) {
      const parsedPrice = Number(formData.value.price)
      if (!Number.isNaN(parsedPrice)) {
        payload.price = parsedPrice
      }
    }

    if (editingId.value) {
      await updateDocument('timetables', editingId.value, payload)
      $toast.success('時刻表を更新しました')
    } else {
      await createDocument('timetables', payload)
      $toast.success('時刻表を追加しました')
    }

    closeModal()
    await refreshData()
  } catch (error) {
    logger.error('Failed to save timetable', error)
    $toast.error('保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const refreshData = async () => {
  try {
    const primaryData = await getCollection<any>('timetables', [orderBy('departure_time', 'asc')])
    timetables.value = primaryData.map((item: any) => normalizeTimetableRecord(item))
  } catch (error) {
    logger.warn('Failed to fetch timetables with snake_case ordering, retrying with camelCase', error)
    try {
      const fallbackData = await getCollection<any>('timetables', [orderBy('departureTime', 'asc')])
      timetables.value = fallbackData.map((item: any) => normalizeTimetableRecord(item))
    } catch (fallbackError) {
      logger.error('Failed to fetch timetables', fallbackError)
      $toast.error('データの取得に失敗しました')
    }
  }
}

const getLocationName = (locationId: string) => {
  const location = allLocationOptions.value.find(item => item.id === locationId)
  return location?.name || locationId
}

const getTransportName = (transportId: string) => {
  const transport = allTransportOptions.value.find(item => item.id === transportId)
  return transport?.name || transportId
}

const getModeLabel = (mode: string) => {
  return transportModes.find(item => item.id === mode)?.label || mode || '船'
}

const getDefaultOperatorId = (transportId: string) => {
  return allTransportOptions.value.find(item => item.id === transportId)?.operatorId || ''
}

const getLocationTypeForMode = (mode: ManagedTransportMode): LocationType => {
  if (mode === 'BUS') return 'STOP'
  if (mode === 'AIR') return 'AIRPORT'
  return 'PORT'
}

const formatDateForStorage = (value: string) => {
  if (!value) return ''
  return value.replace(/-/g, '/').trim()
}

const formatDateForInput = (value: string) => {
  if (!value) return ''
  return value.replace(/\//g, '-').trim()
}

const formatDateForDisplay = (value: string) => {
  if (!value) return ''
  // Convert YYYY/MM/DD to YYYY-MM-DD for consistent display
  return value.replace(/\//g, '-').trim()
}

const normalizeTimeValue = (value: string) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.includes(':')) {
    const [hour = '', minute = ''] = trimmed.split(':')
    if (minute === '') {
      return trimmed
    }
    return `${hour.trim().padStart(2, '0')}:${minute.trim().padStart(2, '0')}`
  }
  if (trimmed.length === 4) {
    const hourPart = trimmed.slice(0, 2)
    const minutePart = trimmed.slice(2)
    return `${hourPart.padStart(2, '0')}:${minutePart.padStart(2, '0')}`
  }
  return trimmed
}

const toStringSafe = (value: unknown) => {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

const normalizeTransportModeValue = (value: unknown): ManagedTransportMode => {
  const normalized = toStringSafe(value).trim().toUpperCase()
  if (normalized === 'BUS' || normalized === 'バス') return 'BUS'
  if (normalized === 'AIR' || normalized === 'FLIGHT' || normalized === '飛行機' || normalized === '航空') return 'AIR'
  return 'FERRY'
}

const normalizeLocationType = (value: unknown): LocationType => {
  const normalized = toStringSafe(value).trim().toUpperCase()
  if (normalized === 'STOP' || normalized === 'BUS_STOP' || normalized === '停留所' || normalized === 'バス停') return 'STOP'
  if (normalized === 'AIRPORT' || normalized === '空港') return 'AIRPORT'
  return 'PORT'
}

const inferModeForRecord = (item: Partial<AdminTimetableRecord>): ManagedTransportMode => {
  if (item.mode) return normalizeTransportModeValue(item.mode)
  const transport = allTransportOptions.value.find(option => option.id === item.name)
  if (transport) return transport.mode
  if (String(item.departure).startsWith('BUS_') || String(item.arrival).startsWith('BUS_')) return 'BUS'
  if (String(item.departure).startsWith('AIRPORT_') || String(item.arrival).startsWith('AIRPORT_')) return 'AIR'
  return 'FERRY'
}

const parseDateList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => formatDateForInput(toStringSafe(item))).filter(Boolean)
  }
  return toStringSafe(value)
    .split(/[,\n;]/)
    .map(item => formatDateForInput(item.trim()))
    .filter(Boolean)
}

const normalizeDateListString = (value: unknown): string => {
  return parseDateList(value).join(',')
}

const normalizeActiveDays = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))).sort()
  }

  const raw = toStringSafe(value).trim()
  if (!raw) return [0, 1, 2, 3, 4, 5, 6]
  const lower = raw.toLowerCase()
  if (['all', 'daily', '毎日', '全日'].includes(lower)) return [0, 1, 2, 3, 4, 5, 6]
  if (['weekday', 'weekdays', '平日'].includes(lower)) return [1, 2, 3, 4, 5]
  if (['weekend', 'weekends', '土日'].includes(lower)) return [0, 6]

  const dayNameMap: Record<string, number> = {
    sun: 0,
    sunday: 0,
    日: 0,
    mon: 1,
    monday: 1,
    月: 1,
    tue: 2,
    tuesday: 2,
    火: 2,
    wed: 3,
    wednesday: 3,
    水: 3,
    thu: 4,
    thursday: 4,
    木: 4,
    fri: 5,
    friday: 5,
    金: 5,
    sat: 6,
    saturday: 6,
    土: 6
  }

  const days = raw
    .split(/[,\s;/、]+/)
    .map(part => {
      const trimmed = part.trim().toLowerCase()
      if (!trimmed) return Number.NaN
      if (dayNameMap[trimmed] !== undefined) return dayNameMap[trimmed]
      return Number(trimmed)
    })
    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)

  return Array.from(new Set(days)).sort()
}

const normalizeTimetableRecord = (item: any): AdminTimetableRecord => {
  const rawStatus = typeof item.status === 'number'
    ? item.status
    : Number.parseInt(item.status ?? '0', 10)
  const status = Number.isNaN(rawStatus) ? 0 : rawStatus

  const hasPrice = item.price !== undefined && item.price !== null && item.price !== ''
  const price = hasPrice ? Number(item.price) : undefined

  const tripId = toStringSafe(item.trip_id ?? item.tripId)
  const mode = normalizeTransportModeValue(item.mode)

  return {
    id: item.id,
    trip_id: tripId || toStringSafe(item.id),
    next_id: toStringSafe(item.next_id ?? item.nextId),
    mode,
    operator_id: toStringSafe(item.operator_id ?? item.operatorId),
    service_id: toStringSafe(item.service_id ?? item.serviceId),
    vehicle_id: toStringSafe(item.vehicle_id ?? item.vehicleId),
    start_date: formatDateForStorage(toStringSafe(item.start_date ?? item.startDate)),
    end_date: formatDateForStorage(toStringSafe(item.end_date ?? item.endDate)),
    name: toStringSafe(item.name),
    departure: toStringSafe(item.departure),
    departure_type: item.departure_type || item.departureType
      ? normalizeLocationType(item.departure_type ?? item.departureType)
      : getLocationTypeForMode(mode),
    departure_time: normalizeTimeValue(toStringSafe(item.departure_time ?? item.departureTime)),
    arrival: toStringSafe(item.arrival),
    arrival_type: item.arrival_type || item.arrivalType
      ? normalizeLocationType(item.arrival_type ?? item.arrivalType)
      : getLocationTypeForMode(mode),
    arrival_time: normalizeTimeValue(toStringSafe(item.arrival_time ?? item.arrivalTime)),
    active_days: normalizeActiveDays(item.active_days ?? item.activeDays),
    added_dates: normalizeDateListString(item.added_dates ?? item.addedDates),
    removed_dates: normalizeDateListString(item.removed_dates ?? item.removedDates),
    platform: toStringSafe(item.platform),
    terminal: toStringSafe(item.terminal),
    gate: toStringSafe(item.gate),
    status,
    price,
    via: toStringSafe(item.via)
  }
}

const buildImportPayload = (item: any, index: number): AdminTimetableForm => {
  const mode = normalizeTransportModeValue(item.mode ?? item.transport_mode ?? item.transportMode)
  const rawStatus = Number.parseInt(item.status ?? '0', 10)
  const payload: AdminTimetableForm = {
    trip_id: toStringSafe(item.trip_id ?? item.tripId) || toStringSafe(Date.now() + index),
    next_id: toStringSafe(item.next_id ?? item.nextId),
    mode,
    operator_id: toStringSafe(item.operator_id ?? item.operatorId) || getDefaultOperatorId(toStringSafe(item.name)),
    service_id: toStringSafe(item.service_id ?? item.serviceId),
    vehicle_id: toStringSafe(item.vehicle_id ?? item.vehicleId),
    name: toStringSafe(item.name),
    departure: toStringSafe(item.departure),
    departure_type: item.departure_type || item.departureType
      ? normalizeLocationType(item.departure_type ?? item.departureType)
      : getLocationTypeForMode(mode),
    departure_time: normalizeTimeValue(toStringSafe(item.departure_time ?? item.departureTime)),
    arrival: toStringSafe(item.arrival),
    arrival_type: item.arrival_type || item.arrivalType
      ? normalizeLocationType(item.arrival_type ?? item.arrivalType)
      : getLocationTypeForMode(mode),
    arrival_time: normalizeTimeValue(toStringSafe(item.arrival_time ?? item.arrivalTime)),
    start_date: formatDateForStorage(toStringSafe(item.start_date ?? item.startDate)),
    end_date: formatDateForStorage(toStringSafe(item.end_date ?? item.endDate)),
    active_days: normalizeActiveDays(item.active_days ?? item.activeDays),
    added_dates: normalizeDateListString(item.added_dates ?? item.addedDates),
    removed_dates: normalizeDateListString(item.removed_dates ?? item.removedDates),
    platform: toStringSafe(item.platform),
    terminal: toStringSafe(item.terminal),
    gate: toStringSafe(item.gate),
    status: Number.isNaN(rawStatus) ? 0 : rawStatus,
    via: toStringSafe(item.via ?? item.route_name ?? item.routeName)
  }

  const priceCandidate = item.price ?? item.fare
  if (priceCandidate !== undefined && priceCandidate !== null && priceCandidate !== '') {
    const parsedPrice = Number(priceCandidate)
    if (!Number.isNaN(parsedPrice)) {
      payload.price = parsedPrice
    }
  }

  return payload
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (importFormat.value === 'csv') {
      importCSVFile(file)
    } else {
      importJSONFile(file)
    }
  }
}

const importCSVFile = async (file: File) => {
  try {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = (lines[0] ?? '').split(',').map(h => h.trim())

    const operations = []

    for (let i = 1; i < lines.length; i++) {
      const values = (lines[i] ?? '').split(',').map(v => v.trim())
      const row: Partial<AdminTimetableForm> & { status?: number } = {}
      let status = 0

      headers.forEach((header, index) => {
        const value = values[index]?.trim() ?? ''
        switch (header.toLowerCase()) {
          case 'trip_id':
          case 'tripid':
          case '便id':
          case '便ｉｄ':
            row.trip_id = value
            break
          case 'next_id':
          case 'nextid':
          case '次便id':
          case '次便ｉｄ':
            row.next_id = value
            break
          case 'mode':
          case 'transport_mode':
          case '交通手段':
            row.mode = normalizeTransportModeValue(value)
            break
          case 'name':
          case 'ship':
          case '船舶':
          case '船舶名':
          case '交通機関':
          case '交通機関名':
            row.name = value
            break
          case 'operator_id':
          case 'operatorid':
          case '運行事業者id':
          case '事業者id':
            row.operator_id = value
            break
          case 'service_id':
          case 'serviceid':
          case 'サービスid':
            row.service_id = value
            break
          case 'vehicle_id':
          case 'vehicleid':
          case '便名':
          case '路線id':
          case '車両id':
            row.vehicle_id = value
            break
          case 'departure':
          case 'from':
          case '出発港':
          case '出発地':
            row.departure = value
            break
          case 'departure_type':
          case 'departuretype':
          case '出発地種別':
            row.departure_type = normalizeLocationType(value)
            break
          case 'arrival':
          case 'to':
          case '到着港':
          case '目的地':
          case '到着地':
            row.arrival = value
            break
          case 'arrival_type':
          case 'arrivaltype':
          case '到着地種別':
            row.arrival_type = normalizeLocationType(value)
            break
          case 'departure_time':
          case 'departuretime':
          case '出発時刻':
            row.departure_time = value
            break
          case 'arrival_time':
          case 'arrivaltime':
          case '到着時刻':
            row.arrival_time = value
            break
          case 'start_date':
          case 'startdate':
          case '開始日':
            row.start_date = value
            break
          case 'end_date':
          case 'enddate':
          case '終了日':
            row.end_date = value
            break
          case 'status':
          case '状態':
            {
              const parsed = Number.parseInt(value, 10)
              if (!Number.isNaN(parsed)) {
                status = parsed
              }
            }
            break
          case 'active_days':
          case 'activedays':
          case '運行曜日':
          case '運行日':
            row.active_days = normalizeActiveDays(value)
            break
          case 'added_dates':
          case 'addeddates':
          case '追加運行日':
          case '追加日':
            row.added_dates = normalizeDateListString(value)
            break
          case 'removed_dates':
          case 'removeddates':
          case '除外運行日':
          case '除外日':
            row.removed_dates = normalizeDateListString(value)
            break
          case 'platform':
          case 'のりば':
            row.platform = value
            break
          case 'terminal':
          case 'ターミナル':
            row.terminal = value
            break
          case 'gate':
          case '搭乗口':
          case 'ゲート':
            row.gate = value
            break
          case 'via':
          case 'route_name':
          case 'routename':
          case '経由':
          case '路線名':
            row.via = value
            break
          case 'price':
          case '料金':
          case '運賃':
            {
              const parsed = Number.parseInt(value, 10)
              if (!Number.isNaN(parsed)) {
                row.price = parsed
              }
            }
            break
        }
      })

      const mode = normalizeTransportModeValue(row.mode)
      const payload: AdminTimetableForm = {
        trip_id: row.trip_id && row.trip_id !== '' ? row.trip_id : toStringSafe(Date.now() + i),
        next_id: row.next_id || '',
        mode,
        operator_id: row.operator_id || getDefaultOperatorId(row.name || ''),
        service_id: row.service_id || '',
        vehicle_id: row.vehicle_id || '',
        name: row.name || '',
        departure: row.departure || '',
        departure_type: row.departure_type || getLocationTypeForMode(mode),
        departure_time: normalizeTimeValue(row.departure_time || ''),
        arrival: row.arrival || '',
        arrival_type: row.arrival_type || getLocationTypeForMode(mode),
        arrival_time: normalizeTimeValue(row.arrival_time || ''),
        start_date: formatDateForStorage(row.start_date || ''),
        end_date: formatDateForStorage(row.end_date || ''),
        active_days: normalizeActiveDays(row.active_days),
        added_dates: normalizeDateListString(row.added_dates),
        removed_dates: normalizeDateListString(row.removed_dates),
        platform: row.platform || '',
        terminal: row.terminal || '',
        gate: row.gate || '',
        status,
        via: row.via || ''
      }

      // Only add price if it's a valid number
      if (row.price !== undefined && row.price !== null) {
        const parsedPrice = Number(row.price)
        if (!Number.isNaN(parsedPrice)) {
          payload.price = parsedPrice
        }
      }

      if (!payload.name || !payload.departure || !payload.arrival || !payload.departure_time || !payload.arrival_time) {
        logger.warn('Skipping CSV row due to missing required fields', { line: i + 1 })
        continue
      }

      operations.push({
        type: 'create' as const,
        collection: 'timetables',
        data: payload
      })
    }

    if (operations.length === 0) {
      $toast.info('インポート対象のデータがありません')
      return
    }

    await batchWrite(operations)
    $toast.success(`${operations.length}件のデータをインポートしました`)
  } catch (error) {
    logger.error('Failed to import CSV', error)
    $toast.error('CSVのインポートに失敗しました')
  }
}

const importJSONFile = async (file: File) => {
  try {
    const text = await file.text()
    const jsonData = JSON.parse(text) as any[]

    if (!Array.isArray(jsonData)) {
      throw new TypeError('JSONファイルは配列形式である必要があります')
    }

    const operations = []

    for (let i = 0; i < jsonData.length; i++) {
      const item = jsonData[i]
      const payload = buildImportPayload(item, i)
      
      // Validate required fields
      if (!payload.trip_id || !payload.name || !payload.departure || !payload.arrival ||
          !payload.departure_time || !payload.arrival_time || !payload.start_date || !payload.end_date) {
        logger.warn('Skipping JSON item due to missing required fields', { index: i })
        continue
      }

      operations.push({
        type: 'create' as const,
        collection: 'timetables',
        data: payload
      })
    }

    if (operations.length === 0) {
      $toast.info('インポート対象のデータがありません')
      return
    }

    await batchWrite(operations)
    $toast.success(`${operations.length}件のデータをインポートしました`)
  } catch (error) {
    logger.error('Failed to import JSON', error)
    if (error instanceof SyntaxError) {
      $toast.error('JSONファイルの形式が正しくありません')
    } else {
      $toast.error('JSONのインポートに失敗しました: ' + (error as Error).message)
    }
  }
}

const importData = async () => {
  isImporting.value = true
  try {
    showImportModal.value = false
    await refreshData()
  } catch (error) {
    logger.error('Failed to import data', error)
  } finally {
    isImporting.value = false
  }
}

const publishTimetableData = async () => {
  isPublishing.value = true
  try {
    await publishData('timetable')
    $toast.success('時刻表データを公開しました')
  } catch (error) {
    logger.error('Failed to publish data', error)
    $toast.error('データの公開に失敗しました')
  } finally {
    isPublishing.value = false
  }
}

const loadBusStopOptions = async () => {
  try {
    const busIndex = await loadBusStopsIndex()
    busStopOptions.value = busIndex.stopCodes.map(code => ({
      id: code,
      name: busIndex.locationLabels[code] || code,
      type: 'STOP',
      mode: 'BUS'
    }))
  } catch (error) {
    logger.warn('Failed to load bus stop options for admin timetable page', error)
    busStopOptions.value = []
  }
}

watch(() => formData.value.mode, (mode) => {
  const normalizedMode = normalizeTransportModeValue(mode)
  formData.value.mode = normalizedMode
  formData.value.departure_type = getLocationTypeForMode(normalizedMode)
  formData.value.arrival_type = getLocationTypeForMode(normalizedMode)

  if (formData.value.name && !formTransportOptions.value.some(option => option.id === formData.value.name)) {
    formData.value.name = ''
    formData.value.operator_id = ''
  }

  if (formData.value.departure && !formLocationOptions.value.some(option => option.id === formData.value.departure)) {
    formData.value.departure = ''
  }

  if (formData.value.arrival && !formLocationOptions.value.some(option => option.id === formData.value.arrival)) {
    formData.value.arrival = ''
  }
})

watch(() => formData.value.name, (name) => {
  if (!formData.value.operator_id) {
    formData.value.operator_id = getDefaultOperatorId(name)
  }
})

watch(() => filters.value.mode, () => {
  if (filters.value.ship && !filterTransportOptions.value.some(option => option.id === filters.value.ship)) {
    filters.value.ship = ''
  }
  if (filters.value.departure && !filterLocationOptions.value.some(option => option.id === filters.value.departure)) {
    filters.value.departure = ''
  }
  if (filters.value.arrival && !filterLocationOptions.value.some(option => option.id === filters.value.arrival)) {
    filters.value.arrival = ''
  }
})

onMounted(async () => {
  await Promise.all([
    loadBusStopOptions(),
    refreshData()
  ])
})
</script>
