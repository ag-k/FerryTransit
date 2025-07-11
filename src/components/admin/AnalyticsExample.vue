<template>
  <div class="analytics-example p-4">
    <h2 class="text-xl font-bold mb-4">Analytics Usage Example</h2>
    
    <!-- Page View Tracking Example -->
    <div class="mb-4">
      <h3 class="font-semibold mb-2">Page View Tracking:</h3>
      <button 
        @click="trackPageView" 
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Track Current Page View
      </button>
    </div>

    <!-- Search Tracking Example -->
    <div class="mb-4">
      <h3 class="font-semibold mb-2">Search Tracking:</h3>
      <button 
        @click="trackSearch" 
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Track Search (西郷 → 本土七類)
      </button>
    </div>

    <!-- Error Tracking Example -->
    <div class="mb-4">
      <h3 class="font-semibold mb-2">Error Tracking:</h3>
      <button 
        @click="trackError" 
        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Track Sample Error
      </button>
    </div>

    <!-- Custom Event Example -->
    <div class="mb-4">
      <h3 class="font-semibold mb-2">Custom Event:</h3>
      <button 
        @click="trackCustomEvent" 
        class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
      >
        Track Button Click Event
      </button>
    </div>

    <!-- Analytics Data Display -->
    <div class="mt-6 p-4 bg-gray-100 rounded">
      <h3 class="font-semibold mb-2">Current Analytics Data:</h3>
      <div v-if="analyticsStore.isLoading">Loading...</div>
      <div v-else-if="analyticsStore.analytics">
        <p>Total Page Views: {{ analyticsStore.totalPageViews }}</p>
        <p>Active Users: {{ analyticsStore.realtimeData.activeUsers }}</p>
        <p>Recent Errors: {{ analyticsStore.realtimeData.recentErrors.length }}</p>
        <p>Session ID: {{ analyticsStore.sessionData.sessionId }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAnalyticsStore } from '~/stores/analytics'
import { useRoute } from 'vue-router'

const analyticsStore = useAnalyticsStore()
const route = useRoute()

// ページビューの追跡
const trackPageView = async () => {
  await analyticsStore.trackPageView(route.path, {
    referrer: document.referrer
  })
  alert('Page view tracked!')
}

// 検索の追跡
const trackSearch = async () => {
  await analyticsStore.trackSearch('西郷', '本土七類', {
    found: true
  })
  alert('Search tracked!')
}

// エラーの追跡
const trackError = async () => {
  const sampleError = new Error('This is a sample error for analytics')
  await analyticsStore.trackError(sampleError, {
    page: route.path,
    action: 'button_click'
  })
  alert('Error tracked!')
}

// カスタムイベントの追跡
const trackCustomEvent = async () => {
  await analyticsStore.trackUserEvent('button_click', {
    button_id: 'analytics_example_button',
    page: route.path,
    timestamp: new Date().toISOString()
  })
  alert('Custom event tracked!')
}

// コンポーネントマウント時の処理
onMounted(async () => {
  // セッションの初期化
  if (!analyticsStore.sessionData.sessionId) {
    analyticsStore.initializeSession()
  }
  
  // ページビューの自動追跡
  await analyticsStore.trackPageView(route.path)
  
  // アナリティクスデータの取得
  await analyticsStore.fetchAnalytics()
  
  // デバイス情報の更新（実際の実装では適切なデバイス検出を使用）
  const deviceInfo = {
    type: window.innerWidth < 768 ? 'mobile' : 'desktop',
    os: navigator.userAgent.includes('Mac') ? 'macos' : 
        navigator.userAgent.includes('Windows') ? 'windows' : 
        navigator.userAgent.includes('Android') ? 'android' : 
        navigator.userAgent.includes('iOS') ? 'ios' : 'other'
  }
  await analyticsStore.updateDeviceStats(deviceInfo)
  
  // ユーザータイプの更新（実際の実装では適切なロジックを使用）
  const isNewUser = !localStorage.getItem('returning_user')
  if (isNewUser) {
    await analyticsStore.updateUserStats('new')
    localStorage.setItem('returning_user', 'true')
  } else {
    await analyticsStore.updateUserStats('returning')
  }
})

// コンポーネントアンマウント時の処理
onUnmounted(() => {
  // 必要に応じてセッション終了の追跡
  // analyticsStore.trackSessionEnd()
})
</script>