import { useUIStore } from '@/stores/ui'

export default defineNuxtPlugin(() => {
  const uiStore = useUIStore()
  
  // クライアントサイドでのみテーマを初期化
  uiStore.initializeTheme()
})
