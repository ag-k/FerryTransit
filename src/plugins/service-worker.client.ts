import { Capacitor } from '@capacitor/core'
import { createLogger } from '~/utils/logger'
import {
  cleanupNativeServiceWorkerState,
  shouldRegisterServiceWorker
} from '~/utils/serviceWorker'

const isJavaScriptResponse = (response: Response) => {
  const contentType = response.headers.get('content-type') || ''
  return response.ok && contentType.includes('javascript')
}

export const registerServiceWorker = async (isNativePlatform = Capacitor.isNativePlatform()) => {
  if (!shouldRegisterServiceWorker({
    isNativePlatform,
    serviceWorkerSupported: 'serviceWorker' in navigator,
    protocol: location.protocol
  })) {
    return null
  }

  const response = await fetch('/sw.js', {
    cache: 'no-store',
    method: 'HEAD'
  })
  if (!isJavaScriptResponse(response)) {
    return null
  }

  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export default defineNuxtPlugin(() => {
  const logger = createLogger('ServiceWorkerPlugin')

  if (Capacitor.isNativePlatform()) {
    if ('serviceWorker' in navigator) {
      cleanupNativeServiceWorkerState(navigator.serviceWorker, globalThis.caches)
        .catch((error) => {
          logger.warn('Native Service Worker cleanup failed', error)
        })
    }
    return
  }

  const register = () => {
    registerServiceWorker()
      .then((registration) => {
        if (registration) {
          logger.debug('Service Worker registered', registration.scope)
        }
      })
      .catch((error) => {
        logger.warn('Service Worker registration failed', error)
      })
  }

  if (document.readyState === 'complete') {
    register()
  } else {
    window.addEventListener('load', register, { once: true })
  }
})
