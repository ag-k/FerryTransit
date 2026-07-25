const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

declare global {
  interface Window {
    L?: any
  }
}

let leafletPromise: Promise<any> | null = null

const loadStyleOnce = (href: string): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve()
  const existing = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${href}"]`)
  if (existing) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`))
    document.head.appendChild(link)
  })
}

const loadScriptOnce = (src: string): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve()
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
  if (existing) {
    if (window.L) return Promise.resolve()
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

export const ensureLeafletLoaded = () => {
  if (typeof window === 'undefined') {
    throw new TypeError('Leaflet can only be loaded in the browser.')
  }

  if (window.L) return window.L
  if (!leafletPromise) {
    leafletPromise = (async () => {
      await loadStyleOnce(LEAFLET_CSS_URL)
      await loadScriptOnce(LEAFLET_JS_URL)

      if (!window.L) {
        throw new Error('Leaflet (window.L) is not available after loading scripts.')
      }

      return window.L
    })().catch((error) => {
      leafletPromise = null
      throw error
    })
  }

  return leafletPromise
}
