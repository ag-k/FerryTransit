export type GoogleMapsLocaleOptions = {
  /** Google Maps JS API の language パラメータ */
  language: 'ja' | 'en'
  /** Google Maps JS API の region パラメータ（地図の地域バイアス） */
  region: 'JP'
  /** Google Routes API (computeRoutes) の languageCode */
  routesApiLanguageCode: 'ja' | 'en'
}

const normalizeLocale = (locale: unknown): string => {
  if (typeof locale !== 'string') return 'ja'
  return locale.trim().toLowerCase().replace('_', '-')
}

export const getGoogleMapsLocaleOptions = (locale: unknown): GoogleMapsLocaleOptions => {
  const normalized = normalizeLocale(locale)
  const isEnglish = normalized === 'en' || normalized.startsWith('en-')

  return {
    language: isEnglish ? 'en' : 'ja',
    // 本アプリの地図/経路の対象は日本固定なので region は JP に寄せる
    region: 'JP',
    routesApiLanguageCode: isEnglish ? 'en' : 'ja'
  }
}
