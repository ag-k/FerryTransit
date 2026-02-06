import { App } from '@capacitor/app'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { createLogger } from '~/utils/logger'

export default defineNuxtPlugin(() => {
  const logger = createLogger('CapacitorPlugin')
  if (Capacitor.isNativePlatform()) {
    const rgbStringToHex = (rgbString: string, fallbackHex: string) => {
      const match = rgbString.trim().match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
      if (!match) return fallbackHex

      const toHex = (value: string) => Number(value).toString(16).padStart(2, '0')
      return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`.toUpperCase()
    }

    const getSemanticBgColor = (className: string, fallbackHex: string) => {
      if (!process.client) return fallbackHex

      const probe = document.createElement('div')
      probe.className = className
      probe.style.position = 'fixed'
      probe.style.top = '-9999px'
      probe.style.left = '-9999px'
      probe.style.opacity = '0'
      probe.style.pointerEvents = 'none'
      document.body.appendChild(probe)

      const rgbColor = getComputedStyle(probe).backgroundColor
      probe.remove()
      return rgbStringToHex(rgbColor, fallbackHex)
    }

    // プラットフォームクラスをbodyに追加
    if (Capacitor.getPlatform() === 'android') {
      document.body.classList.add('platform-android')
    } else if (Capacitor.getPlatform() === 'ios') {
      document.body.classList.add('platform-ios')
    }
    
    // ステータスバーの設定（iOSテーマ連動）
    const applyStatusBarTheme = (theme: 'light' | 'dark') => {
      if (Capacitor.getPlatform() !== 'ios') return

      const backgroundColor = theme === 'dark'
        ? getSemanticBgColor('bg-app-surface', '#0F172A')
        : getSemanticBgColor('bg-app-primary', '#0047AB')
      // Capacitor iOS: 'DARK' はライトコンテンツ（白文字）
      const style = 'DARK'

      // WebViewをステータスバー配下まで広げ、Webヘッダ色と一体化させる
      StatusBar.setOverlaysWebView({ overlay: true }).catch(error => {
        logger.error('Failed to set status bar overlay mode', error)
      })

      StatusBar.setStyle({ style }).catch(error => {
        logger.error('Failed to set status bar style', error)
      })
      StatusBar.setBackgroundColor({ color: backgroundColor }).catch(error => {
        logger.error('Failed to set status bar background color', error)
      })
    }

    if (Capacitor.getPlatform() === 'ios') {
      const uiStore = useUIStore()
      const { currentTheme } = storeToRefs(uiStore)

      // 初期表示時に適用
      applyStatusBarTheme(currentTheme.value)

      // テーマ切替時（light / dark / system の実効値変化）に反映
      watch(currentTheme, (theme) => {
        applyStatusBarTheme(theme)
      })
    } else {
      // iOS以外は従来設定を維持
      StatusBar.setStyle({ style: 'LIGHT' }).catch(error => {
        logger.error('Failed to set status bar style', error)
      })
      StatusBar.setBackgroundColor({ color: '#3B82F6' }).catch(error => {
        logger.error('Failed to set status bar background color', error)
      })
    }
    
    // Androidのナビゲーションバーを設定
    if (Capacitor.getPlatform() === 'android') {
      // ナビゲーションバーの色を設定
      try {
        // @ts-ignore - Android specific API
        if (window.AndroidInterface) {
          // @ts-ignore
          window.AndroidInterface.setNavigationBarColor('#FFFFFF')
        }
      } catch (error) {
        logger.info('Android navigation bar color setting not available')
      }
    }

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
