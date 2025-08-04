<template>
  <div class="system-settings">
    <h2 class="text-xl font-semibold mb-6 dark:text-white">システム設定</h2>
    
    <!-- 通知設定 -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-4 dark:text-white">通知</h3>
      <div class="space-y-3">
        <ToggleSwitch
          :checked="settingsStore.system.notificationSound"
          @update:checked="settingsStore.setNotificationSound"
          label="通知音"
          description="通知時に音を再生します"
        />
        <ToggleSwitch
          :checked="settingsStore.system.notificationVibration"
          @update:checked="settingsStore.setNotificationVibration"
          label="バイブレーション"
          description="通知時にバイブレーションします（対応デバイスのみ）"
        />
        <ToggleSwitch
          :checked="settingsStore.system.notificationEmail"
          @update:checked="settingsStore.updateSystemSettings({ notificationEmail: $event })"
          label="メール通知"
          description="重要な情報をメールで通知します"
        />
      </div>
    </div>

    <!-- パフォーマンス設定 -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-4 dark:text-white">パフォーマンス</h3>
      <div class="space-y-3">
        <ToggleSwitch
          :checked="settingsStore.system.enableAnimations"
          @update:checked="settingsStore.updateSystemSettings({ enableAnimations: $event })"
          label="アニメーション"
          description="画面遷移やUI要素のアニメーションを有効にします"
        />
        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            画像品質
          </label>
          <select
            v-model="settingsStore.system.imageQuality"
            @change="settingsStore.updateSystemSettings({ imageQuality: $event.target.value })"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">低画質</option>
            <option value="medium">標準画質</option>
            <option value="high">高画質</option>
          </select>
        </div>
        <ToggleSwitch
          :checked="settingsStore.system.reducedMotion"
          @update:checked="settingsStore.updateSystemSettings({ reducedMotion: $event })"
          label="モーション軽減"
          description="画面の動きを最小限に抑えます"
        />
      </div>
    </div>

    <!-- ネットワーク設定 -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-4 dark:text-white">ネットワーク</h3>
      <div class="space-y-3">
        <ToggleSwitch
          :checked="settingsStore.system.offlineMode"
          @update:checked="settingsStore.setOfflineMode"
          label="オフラインモード"
          description="キャッシュされたデータのみを使用します"
        />
        <ToggleSwitch
          :checked="settingsStore.system.dataSaver"
          @update:checked="settingsStore.setDataSaver"
          label="データ節約モード"
          description="データ使用量を削減します"
        />
        <ToggleSwitch
          :checked="settingsStore.system.autoDownloadUpdates"
          @update:checked="settingsStore.updateSystemSettings({ autoDownloadUpdates: $event })"
          label="自動アップデート"
          description="アプリのアップデートを自動でダウンロードします"
        />
        <ToggleSwitch
          :checked="settingsStore.system.wifiOnlyDownloads"
          @update:checked="settingsStore.updateSystemSettings({ wifiOnlyDownloads: $event })"
          label="Wi-Fi接続時のみダウンロード"
          description="Wi-Fi接続時のみデータをダウンロードします"
        />
      </div>
    </div>

    <!-- プライバシー設定 -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-4 dark:text-white">プライバシー</h3>
      <div class="space-y-3">
        <ToggleSwitch
          :checked="settingsStore.system.analyticsEnabled"
          @update:checked="settingsStore.setAnalyticsEnabled"
          label="利用統計の送信"
          description="アプリの改善のため利用統計を送信します"
        />
        <ToggleSwitch
          :checked="settingsStore.system.crashReportingEnabled"
          @update:checked="settingsStore.updateSystemSettings({ crashReportingEnabled: $event })"
          label="クラッシュレポート"
          description="アプリのクラッシュ情報を送信します"
        />
        <ToggleSwitch
          :checked="settingsStore.system.locationPermission"
          @update:checked="settingsStore.updateSystemSettings({ locationPermission: $event })"
          label="位置情報の使用"
          description="現在地に基づいた情報を提供します"
        />
      </div>
    </div>

    <!-- アクセシビリティ設定 -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-4 dark:text-white">アクセシビリティ</h3>
      <div class="space-y-3">
        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            フォントサイズ
          </label>
          <select
            v-model="settingsStore.system.fontSize"
            @change="settingsStore.setFontSize($event.target.value)"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="small">小</option>
            <option value="medium">標準</option>
            <option value="large">大</option>
            <option value="extra-large">特大</option>
          </select>
        </div>
        <ToggleSwitch
          :checked="settingsStore.system.highContrast"
          @update:checked="settingsStore.setHighContrast"
          label="ハイコントラスト"
          description="文字と背景のコントラストを高くします"
        />
        <ToggleSwitch
          :checked="settingsStore.system.screenReaderOptimization"
          @update:checked="settingsStore.updateSystemSettings({ screenReaderOptimization: $event })"
          label="スクリーンリーダー最適化"
          description="スクリーンリーダーでの読み上げを最適化します"
        />
      </div>
    </div>

    <!-- キャッシュ設定 -->
    <div class="mb-8">
      <h3 class="text-lg font-medium mb-4 dark:text-white">キャッシュ</h3>
      <div class="space-y-3">
        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            キャッシュサイズ ({{ settingsStore.system.cacheSize }} MB)
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="50"
            v-model.number="settingsStore.system.cacheSize"
            @change="settingsStore.setCacheSettings({ cacheSize: $event.target.value })"
            class="w-full"
          />
          <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>50 MB</span>
            <span>500 MB</span>
          </div>
        </div>
        <ToggleSwitch
          :checked="settingsStore.system.autoClearCache"
          @update:checked="settingsStore.setCacheSettings({ autoClearCache: $event })"
          label="自動キャッシュ削除"
          description="定期的にキャッシュを自動削除します"
        />
        <div v-if="settingsStore.system.autoClearCache" class="setting-item">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            削除間隔
          </label>
          <select
            v-model="settingsStore.system.cacheClearInterval"
            @change="settingsStore.setCacheSettings({ cacheClearInterval: $event.target.value })"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="daily">毎日</option>
            <option value="weekly">毎週</option>
            <option value="monthly">毎月</option>
          </select>
        </div>
        <button
          @click="clearCacheWithConfirmation"
          class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
        >
          今すぐキャッシュを削除
        </button>
      </div>
    </div>

    <!-- リセット設定 -->
    <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
      <button
        @click="resetSettingsWithConfirmation"
        class="w-full px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium"
      >
        すべての設定をリセット
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '~/stores/settings'
import ToggleSwitch from '~/components/common/ToggleSwitch.vue'
import { useI18n } from 'vue-i18n'

const settingsStore = useSettingsStore()
const { t } = useI18n()

const clearCacheWithConfirmation = () => {
  if (confirm('キャッシュを削除しますか？この操作は元に戻せません。')) {
    settingsStore.clearCache()
    alert('キャッシュが削除されました。')
  }
}

const resetSettingsWithConfirmation = () => {
  if (confirm('すべての設定をリセットしますか？この操作は元に戻せません。')) {
    settingsStore.resetSettings()
    alert('設定がリセットされました。')
    window.location.reload()
  }
}
</script>