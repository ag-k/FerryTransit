import { useUIStore } from '@/stores/ui'

export default defineNuxtPlugin(() => {
  const uiStore = useUIStore()
  
  // クライアントサイドでのみテーマを初期化
  uiStore.initializeTheme()
  
  // デバッグ用ログ
  console.log('Theme plugin initialized, current theme:', uiStore.theme)
})