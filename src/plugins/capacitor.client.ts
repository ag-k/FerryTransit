import { App } from '@capacitor/app'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'
import { createLogger } from '~/utils/logger'

export default defineNuxtPlugin(() => {
  const logger = createLogger('CapacitorPlugin')
  if (Capacitor.isNativePlatform()) {
    // ステータスバーの設定
    StatusBar.setStyle({ style: 'LIGHT' }).catch(error => {
      logger.error('Failed to set status bar style', error)
    })
    StatusBar.setBackgroundColor({ color: '#3B82F6' }).catch(error => {
      logger.error('Failed to set status bar background color', error)
    })

    // スプラッシュスクリーンを3秒後に非表示
    setTimeout(() => {
      SplashScreen.hide().catch(error => {
        logger.error('Failed to hide splash screen', error)
      })
    }, 3000)

    // バックボタンの処理（Android）
    if (Capacitor.getPlatform() === 'android') {
      App.addListener('backButton', ({ canGoBack }) => {
        const router = useRouter()
        if (!canGoBack || router.currentRoute.value.path === '/') {
          App.exitApp()
        } else {
          router.back()
        }
      })
    }
  }
})
