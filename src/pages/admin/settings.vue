<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">システム設定</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        システム全体の設定を管理します
      </p>
    </div>

    <div class="space-y-6">
      <!-- サイト設定 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          サイト設定
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              サイト名
            </label>
            <input
              v-model="siteSettings.siteName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              サイト説明
            </label>
            <textarea
              v-model="siteSettings.siteDescription"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              メンテナンスモード
            </label>
            <ToggleSwitch
              :checked="siteSettings.maintenanceMode"
              @update:checked="siteSettings.maintenanceMode = $event"
              label="メンテナンスモードを有効にする"
              description="有効にすると、管理者以外はサイトにアクセスできなくなります"
            />
          </div>
        </div>
      </div>

      <!-- API設定 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          API設定
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              船舶状況API URL
            </label>
            <input
              v-model="apiSettings.shipStatusApiUrl"
              type="url"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              APIタイムアウト (ms)
            </label>
            <input
              v-model.number="apiSettings.apiTimeout"
              type="number"
              min="1000"
              max="30000"
              step="1000"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              キャッシュ
            </label>
            <ToggleSwitch
              :checked="apiSettings.cacheEnabled"
              @update:checked="apiSettings.cacheEnabled = $event"
              label="APIキャッシュを有効にする"
              description="APIレスポンスをキャッシュしてパフォーマンスを向上させます"
            />
          </div>

          <div v-if="apiSettings.cacheEnabled">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              キャッシュ期間 (分)
            </label>
            <input
              v-model.number="apiSettings.cacheDuration"
              type="number"
              min="1"
              max="60"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <!-- 通知設定 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          通知設定
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              管理者メールアドレス
            </label>
            <input
              v-model="notificationSettings.adminEmail"
              type="email"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <ToggleSwitch
              :checked="notificationSettings.emailOnError"
              @update:checked="notificationSettings.emailOnError = $event"
              label="エラー通知"
              description="システムエラー発生時にメール通知を送信します"
            />
          </div>

          <div>
            <ToggleSwitch
              :checked="notificationSettings.emailOnDataUpdate"
              @update:checked="notificationSettings.emailOnDataUpdate = $event"
              label="データ更新通知"
              description="データ更新時にメール通知を送信します"
            />
          </div>
        </div>
      </div>

      <!-- データ管理設定 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          データ管理
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              データ保存期間（日数）
            </label>
            <input
              v-model.number="dataSettings.retentionDays"
              type="number"
              min="7"
              max="365"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <ToggleSwitch
              :checked="dataSettings.autoBackup"
              @update:checked="dataSettings.autoBackup = $event"
              label="自動バックアップ"
              description="データの自動バックアップを有効にします"
            />
          </div>

          <div v-if="dataSettings.autoBackup">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              バックアップ間隔
            </label>
            <select
              v-model="dataSettings.backupInterval"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
              <option value="monthly">毎月</option>
            </select>
          </div>
        </div>
      </div>

      <!-- セキュリティ設定 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
          セキュリティ設定
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              セッションタイムアウト (分)
            </label>
            <input
              v-model.number="securitySettings.sessionTimeout"
              type="number"
              min="5"
              max="120"
              step="5"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <ToggleSwitch
              :checked="securitySettings.twoFactorEnabled"
              @update:checked="securitySettings.twoFactorEnabled = $event"
              label="二要素認証"
              description="管理者アカウントの二要素認証を有効にします"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              最大ログイン試行回数
            </label>
            <input
              v-model.number="securitySettings.maxLoginAttempts"
              type="number"
              min="3"
              max="10"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <!-- システム設定（一般ユーザー向け設定と同じコンポーネント） -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <SystemSettings />
      </div>

      <!-- 保存ボタン -->
      <div class="flex justify-end space-x-3">
        <button
          @click="resetSettings"
          type="button"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
        >
          リセット
        </button>
        <button
          @click="saveSettings"
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
          :disabled="saving"
        >
          <span v-if="!saving">保存</span>
          <span v-else class="flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            保存中...
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import SystemSettings from '~/components/settings/SystemSettings.vue'
import ToggleSwitch from '~/components/common/ToggleSwitch.vue'
import { useToast } from '~/composables/useToast'
import { useAdminFirebase } from '~/composables/useAdminFirebase'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
const { success: showSuccess, error: showError } = useToast()
const saving = ref(false)

// Get Firebase instance
let db: any = null
try {
  const firebase = useAdminFirebase()
  db = firebase.db
} catch (error) {
  console.error('Failed to get Firebase:', error)
}

// サイト設定
const siteSettings = ref({
  siteName: '隠岐フェリーガイド',
  siteDescription: '隠岐諸島のフェリー時刻表と航路情報',
  maintenanceMode: false
})

// API設定
const apiSettings = ref({
  shipStatusApiUrl: 'https://ship.nkk-oki.com/api',
  apiTimeout: 10000,
  cacheEnabled: true,
  cacheDuration: 5
})

// 通知設定
const notificationSettings = ref({
  adminEmail: '',
  emailOnError: true,
  emailOnDataUpdate: false
})

// データ管理設定
const dataSettings = ref({
  retentionDays: 90,
  autoBackup: true,
  backupInterval: 'daily'
})

// セキュリティ設定
const securitySettings = ref({
  sessionTimeout: 30,
  twoFactorEnabled: false,
  maxLoginAttempts: 5
})

// 設定を読み込む
const loadSettings = async () => {
  if (!db) {
    console.error('Firebase db not available')
    showError('Firebaseが初期化されていません')
    return
  }
  
  try {
    const settingsDoc = await getDoc(doc(db, 'adminSettings', 'global'))
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data()
      if (data.site) siteSettings.value = { ...siteSettings.value, ...data.site }
      if (data.api) apiSettings.value = { ...apiSettings.value, ...data.api }
      if (data.notification) notificationSettings.value = { ...notificationSettings.value, ...data.notification }
      if (data.data) dataSettings.value = { ...dataSettings.value, ...data.data }
      if (data.security) securitySettings.value = { ...securitySettings.value, ...data.security }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    showError('設定の読み込みに失敗しました')
  }
}

// 設定を保存する
const saveSettings = async () => {
  if (!db) {
    console.error('Firebase db not available')
    showError('Firebaseが初期化されていません')
    return
  }
  
  saving.value = true
  
  try {
    await setDoc(doc(db, 'adminSettings', 'global'), {
      site: siteSettings.value,
      api: apiSettings.value,
      notification: notificationSettings.value,
      data: dataSettings.value,
      security: securitySettings.value,
      updatedAt: new Date().toISOString()
    })
    
    showSuccess('設定を保存しました')
  } catch (error) {
    console.error('Failed to save settings:', error)
    showError('設定の保存に失敗しました')
  } finally {
    saving.value = false
  }
}

// 設定をリセット
const resetSettings = () => {
  if (confirm('設定を初期値に戻しますか？')) {
    loadSettings()
  }
}

onMounted(() => {
  loadSettings()
})
</script>