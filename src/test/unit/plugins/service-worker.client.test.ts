import { describe, expect, it, vi } from 'vitest'
import {
  cleanupNativeServiceWorkerState,
  shouldRegisterServiceWorker
} from '@/utils/serviceWorker'

describe('Service Worker client plugin', () => {
  it('does not register the web Service Worker on a native platform', async () => {
    expect(shouldRegisterServiceWorker({
      isNativePlatform: true,
      serviceWorkerSupported: true,
      protocol: 'https:'
    })).toBe(false)
  })

  it('keeps registration enabled for the hosted web app', () => {
    expect(shouldRegisterServiceWorker({
      isNativePlatform: false,
      serviceWorkerSupported: true,
      protocol: 'https:'
    })).toBe(true)
  })

  it('removes existing registrations and only FerryTransit shell caches', async () => {
    const unregisterFirst = vi.fn(async () => true)
    const unregisterSecond = vi.fn(async () => true)
    const getRegistrations = vi.fn(async () => [
      { unregister: unregisterFirst },
      { unregister: unregisterSecond }
    ])
    const deleteCache = vi.fn(async () => true)
    const cacheStorage = {
      keys: vi.fn(async () => [
        'ferry-transit-shell-old',
        'unrelated-cache',
        'ferry-transit-shell-current'
      ]),
      delete: deleteCache
    }

    await cleanupNativeServiceWorkerState(
      { getRegistrations } as unknown as Pick<ServiceWorkerContainer, 'getRegistrations'>,
      cacheStorage
    )

    expect(unregisterFirst).toHaveBeenCalledOnce()
    expect(unregisterSecond).toHaveBeenCalledOnce()
    expect(deleteCache).toHaveBeenCalledTimes(2)
    expect(deleteCache).toHaveBeenCalledWith('ferry-transit-shell-old')
    expect(deleteCache).toHaveBeenCalledWith('ferry-transit-shell-current')
    expect(deleteCache).not.toHaveBeenCalledWith('unrelated-cache')
  })
})
