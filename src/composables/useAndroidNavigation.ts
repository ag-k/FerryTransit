import { Capacitor } from '@capacitor/core'

const DEFAULT_NAVIGATION_BAR_HEIGHT = 20
const MIN_ANDROID_BOTTOM_OFFSET = 32
const EXTRA_ANDROID_BOTTOM_CLEARANCE = 12
const ANDROID_BOTTOM_OFFSET_VAR = '--android-bottom-offset'

const setAndroidBottomOffset = (height: number) => {
  if (!process.client) return
  document.documentElement.style.setProperty(ANDROID_BOTTOM_OFFSET_VAR, `${height}px`)
}

export const useAndroidNavigation = () => {
  const isAndroid = ref(false)
  const navigationBarHeight = ref(DEFAULT_NAVIGATION_BAR_HEIGHT)

  onMounted(() => {
    isAndroid.value = Capacitor.getPlatform() === 'android'

    if (!isAndroid.value) {
      setAndroidBottomOffset(0)
      return
    }

    const visualViewport = window.visualViewport

    const calculateNavigationBarHeight = () => {
      let detectedHeight = DEFAULT_NAVIGATION_BAR_HEIGHT

      // 方法1: Visual Viewport APIを使用
      if (visualViewport) {
        const heightDifference = window.innerHeight - visualViewport.height
        if (heightDifference > 0 && heightDifference < 200) {
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
        detectedHeight = Math.max(detectedHeight, 24)
      }

      // 方法4: CSS変数から取得（フォールバック）
      const rootStyles = getComputedStyle(document.documentElement)
      const cssNavHeight = rootStyles.getPropertyValue('--android-navigation-bar-height')
      if (cssNavHeight) {
        const cssHeight = parseInt(cssNavHeight, 10)
        if (cssHeight > 0) {
          detectedHeight = Math.max(detectedHeight, cssHeight)
        }
      }

      navigationBarHeight.value = Math.max(
        MIN_ANDROID_BOTTOM_OFFSET,
        Math.min(detectedHeight + EXTRA_ANDROID_BOTTOM_CLEARANCE, 100)
      )
      setAndroidBottomOffset(navigationBarHeight.value)
    }

    const handleOrientationChange = () => {
      window.setTimeout(calculateNavigationBarHeight, 500)
    }

    window.setTimeout(calculateNavigationBarHeight, 100)

    visualViewport?.addEventListener('resize', calculateNavigationBarHeight)
    window.addEventListener('resize', calculateNavigationBarHeight)
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('focus', calculateNavigationBarHeight)
    window.addEventListener('blur', calculateNavigationBarHeight)

    onUnmounted(() => {
      visualViewport?.removeEventListener('resize', calculateNavigationBarHeight)
      window.removeEventListener('resize', calculateNavigationBarHeight)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('focus', calculateNavigationBarHeight)
      window.removeEventListener('blur', calculateNavigationBarHeight)
      setAndroidBottomOffset(0)
    })
  })

  return {
    isAndroid: readonly(isAndroid),
    navigationBarHeight: readonly(navigationBarHeight)
  }
}
