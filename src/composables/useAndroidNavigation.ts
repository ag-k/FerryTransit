import { Capacitor } from '@capacitor/core'

export const useAndroidNavigation = () => {
  const isAndroid = ref(false)
  const navigationBarHeight = ref(20) // デフォルト値を20pxに設定

  onMounted(() => {
    isAndroid.value = Capacitor.getPlatform() === 'android'
    
    if (isAndroid.value) {
      // Androidのナビゲーションバーの高さを検出する複数の方法
      const calculateNavigationBarHeight = () => {
        let detectedHeight = 20 // デフォルト値
        
        // 方法1: Visual Viewport APIを使用
        const visualViewport = (window as any).visualViewport
        if (visualViewport) {
          const heightDifference = window.innerHeight - visualViewport.height
          if (heightDifference > 0 && heightDifference < 200) { // 妥当な範囲内
            detectedHeight = heightDifference
          }
        } else {
          // 方法2: スクリーンサイズとウィンドウサイズの差を計算
          const screenHeight = screen.height
          const windowHeight = window.innerHeight
          const heightDiff = screenHeight - windowHeight
          
          if (heightDiff > 0 && heightDiff < 200) {
            detectedHeight = heightDiff
          }
        }
        
        // 方法3: デバイスピクセル比率を考慮
        const pixelRatio = window.devicePixelRatio || 1
        if (pixelRatio > 2) {
          // 高解像度デバイスではナビゲーションバーが高くなる傾向
          detectedHeight = Math.max(detectedHeight, 24)
        }
        
        // 方法4: CSS変数から取得（フォールバック）
        const rootStyles = getComputedStyle(document.documentElement)
        const cssNavHeight = rootStyles.getPropertyValue('--android-navigation-bar-height')
        if (cssNavHeight) {
          const cssHeight = parseInt(cssNavHeight)
          if (cssHeight > 0) {
            detectedHeight = Math.max(detectedHeight, cssHeight)
          }
        }
        
        // 最低でも20px、最大でも100pxに制限
        navigationBarHeight.value = Math.max(20, Math.min(detectedHeight, 100))
      }

      // 初回計算
      setTimeout(calculateNavigationBarHeight, 100) // 少し遅延して実行
      
      // 画面サイズ変更時に再計算
      if (visualViewport) {
        visualViewport.addEventListener('resize', calculateNavigationBarHeight)
      }
      window.addEventListener('resize', calculateNavigationBarHeight)
      
      // 画面の向き変更時に再計算
      window.addEventListener('orientationchange', () => {
        setTimeout(calculateNavigationBarHeight, 500) // 向き変更後はより長く待機
      })
      
      // フォーカス/ブラー時にも再計算（ソフトキーボード対策）
      window.addEventListener('focus', calculateNavigationBarHeight)
      window.addEventListener('blur', calculateNavigationBarHeight)
    }
  })

  return {
    isAndroid: readonly(isAndroid),
    navigationBarHeight: readonly(navigationBarHeight)
  }
}
