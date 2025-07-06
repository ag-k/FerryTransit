<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 transition-colors p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        ダークテーマテスト
      </h1>
      
      <div class="grid gap-6">
        <!-- 基本的なダークモードテスト -->
        <div class="p-6 bg-gray-100 dark:bg-slate-800 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            基本的なダークモード
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            このカードは標準のTailwindカラーを使用しています。
          </p>
        </div>
        
        <!-- より深い色のテスト -->
        <div class="p-6 bg-white dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            深い色のテスト
          </h2>
          <p class="text-gray-600 dark:text-slate-300">
            このカードはより深いダークテーマカラーを使用しています。
          </p>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-2">
            ミューテッドテキスト
          </p>
          <a href="#" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-2 inline-block">
            リンクのテスト
          </a>
        </div>
        
        <!-- テーマ切り替えボタン -->
        <div class="flex gap-4">
          <button
            @click="setTheme('light')"
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
            :class="{ 'ring-2 ring-blue-500': uiStore.theme === 'light' }"
          >
            ライト
          </button>
          <button
            @click="setTheme('dark')"
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
            :class="{ 'ring-2 ring-blue-500': uiStore.theme === 'dark' }"
          >
            ダーク
          </button>
          <button
            @click="setTheme('system')"
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
            :class="{ 'ring-2 ring-blue-500': uiStore.theme === 'system' }"
          >
            システム
          </button>
        </div>
        
        <!-- デバッグ情報 -->
        <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">
          <p class="text-gray-700 dark:text-gray-300">
            現在のテーマ設定: {{ uiStore.theme }}
          </p>
          <p class="text-gray-700 dark:text-gray-300">
            実効テーマ: {{ uiStore.currentTheme }}
          </p>
          <p class="text-gray-700 dark:text-gray-300">
            HTMLクラス: <span id="html-classes"></span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const setTheme = (theme: 'light' | 'dark' | 'system') => {
  uiStore.setTheme(theme)
  updateDebugInfo()
}

const updateDebugInfo = () => {
  if (process.client) {
    nextTick(() => {
      const htmlClasses = document.documentElement.className
      const debugElement = document.getElementById('html-classes')
      if (debugElement) {
        debugElement.textContent = htmlClasses || '(なし)'
      }
    })
  }
}

onMounted(() => {
  updateDebugInfo()
})

// テーマが変更されたときもデバッグ情報を更新
watch(() => uiStore.theme, () => {
  updateDebugInfo()
})
</script>