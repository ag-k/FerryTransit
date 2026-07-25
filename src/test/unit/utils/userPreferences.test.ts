import { describe, expect, it, vi } from 'vitest'
import {
  LOCALE_STORAGE_KEY,
  getPreferredLocaleRootRedirect,
  readPreferredLocale,
  savePreferredLocale
} from '@/utils/userPreferences'

describe('userPreferences', () => {
  it.each(['ja', 'en'] as const)('対応言語 %s を保存・復元する', (locale) => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    }

    savePreferredLocale(storage, locale)

    expect(values.get(LOCALE_STORAGE_KEY)).toBe(locale)
    expect(readPreferredLocale(storage)).toBe(locale)
  })

  it('未対応値は復元しない', () => {
    expect(readPreferredLocale({ getItem: () => 'fr' })).toBeNull()
  })

  it('Storage例外時も言語切替を妨げない', () => {
    const getItem = vi.fn(() => {
      throw new Error('unavailable')
    })
    const setItem = vi.fn(() => {
      throw new Error('unavailable')
    })

    expect(readPreferredLocale({ getItem })).toBeNull()
    expect(() => savePreferredLocale({ setItem }, 'en')).not.toThrow()
  })

  it('保存済み英語では未接頭辞のルートだけを英語ルートへ正規化する', () => {
    expect(getPreferredLocaleRootRedirect('/', 'en')).toBe('/en')
    expect(getPreferredLocaleRootRedirect('/transit', 'en')).toBeNull()
    expect(getPreferredLocaleRootRedirect('/ja/status', 'en')).toBeNull()
    expect(getPreferredLocaleRootRedirect('/en', 'ja')).toBeNull()
    expect(getPreferredLocaleRootRedirect('/', null)).toBeNull()
  })
})
