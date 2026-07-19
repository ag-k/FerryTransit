export interface DeepLinkRouter {
  isReady: () => Promise<void>
  replace: (path: string) => Promise<unknown> | unknown
}

export const parseDeepLinkPath = (url?: string | null): string | null => {
  if (!url) return null

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'ferrytransit:') return null

    const hostBasedPath = parsed.host && parsed.host !== 'app' ? `/${parsed.host}` : ''
    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : ''
    const path = pathname || hostBasedPath || '/'

    return `${path}${parsed.search || ''}${parsed.hash || ''}`
  } catch {
    return null
  }
}

export const navigateToDeepLink = async (
  router: DeepLinkRouter,
  url?: string | null,
): Promise<string | null> => {
  const path = parseDeepLinkPath(url)
  if (!path) return null

  // コールド起動時は初期ナビゲーション完了前にreplaceすると、
  // Nuxtの初期ルートで上書きされるため、必ずrouterの準備を待つ。
  await router.isReady()
  await router.replace(path)
  return path
}
