export const getExternalHttpUrl = (
  target: EventTarget | null,
  currentUrl: string
): string | null => {
  if (!(target instanceof Element)) return null

  const anchor = target.closest<HTMLAnchorElement>('a[target="_blank"]')
  if (!anchor || anchor.hasAttribute('download')) return null

  const href = anchor.getAttribute('href')
  if (!href) return null

  try {
    const url = new URL(href, currentUrl)
    const current = new URL(currentUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin === current.origin) {
      return null
    }
    return url.href
  } catch {
    return null
  }
}
