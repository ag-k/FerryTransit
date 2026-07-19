const CACHE_PREFIX = 'ferry-transit-shell-'

export const shouldRegisterServiceWorker = ({
  isNativePlatform,
  serviceWorkerSupported,
  protocol
}: {
  isNativePlatform: boolean
  serviceWorkerSupported: boolean
  protocol: string
}) => {
  return !isNativePlatform
    && serviceWorkerSupported
    && ['http:', 'https:'].includes(protocol)
}

export const cleanupNativeServiceWorkerState = async (
  serviceWorker: Pick<ServiceWorkerContainer, 'getRegistrations'>,
  cacheStorage?: Pick<CacheStorage, 'keys' | 'delete'>
) => {
  const registrations = await serviceWorker.getRegistrations()
  await Promise.all(registrations.map(registration => registration.unregister()))

  if (!cacheStorage) {
    return
  }

  const cacheNames = await cacheStorage.keys()
  await Promise.all(
    cacheNames
      .filter(cacheName => cacheName.startsWith(CACHE_PREFIX))
      .map(cacheName => cacheStorage.delete(cacheName))
  )
}
