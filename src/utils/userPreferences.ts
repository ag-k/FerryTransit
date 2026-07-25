export type SupportedLocale = 'ja' | 'en'

export const LOCALE_STORAGE_KEY = 'ferry-transit-locale'

const isSupportedLocale = (value: string | null): value is SupportedLocale => {
  return value === 'ja' || value === 'en'
}

export const readPreferredLocale = (storage: Pick<Storage, 'getItem'>): SupportedLocale | null => {
  try {
    const value = storage.getItem(LOCALE_STORAGE_KEY)
    return isSupportedLocale(value) ? value : null
  } catch {
    return null
  }
}

export const savePreferredLocale = (
  storage: Pick<Storage, 'setItem'>,
  locale: SupportedLocale
) => {
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // ストレージが利用できない環境でも言語切替自体は継続する。
  }
}

/**
 * The default locale has no URL prefix. Redirect only the unprefixed root when
 * the user explicitly selected English; explicit deep-link locales win.
 */
export const getPreferredLocaleRootRedirect = (
  path: string,
  preferredLocale: SupportedLocale | null
): string | null => path === '/' && preferredLocale === 'en' ? '/en' : null
