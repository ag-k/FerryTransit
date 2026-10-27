import { describe, expect, it, vi } from 'vitest'

describe('DOM fixture script isolation', () => {
  it.each(['text/javascript', 'module'])('does not evaluate an inserted %s script', async (type) => {
    const browser = window as unknown as {
      __ferryScriptProbe?: boolean
      happyDOM: {
        settings: { enableJavaScriptEvaluation: boolean }
        waitUntilComplete: () => Promise<void>
      }
    }
    const script = document.createElement('script')
    script.type = type
    script.textContent = 'window.__ferryScriptProbe = true'
    delete browser.__ferryScriptProbe
    try {
      document.body.appendChild(script)
      await browser.happyDOM.waitUntilComplete()
      expect(browser.happyDOM.settings.enableJavaScriptEvaluation).toBe(false)
      expect(browser.__ferryScriptProbe).toBeUndefined()
    } finally {
      script.remove()
      delete browser.__ferryScriptProbe
    }
  })
})


describe('DOM fixture resource isolation', () => {
  it.each(['stylesheet', 'iframe'])('does not fetch an inserted %s resource', async (type) => {
    const browser = window as unknown as {
      happyDOM: {
        settings: {
          enableCSSFileLoading: boolean
          enableIframePageLoading: boolean
          fetch: { interceptor: unknown }
        }
        waitUntilComplete: () => Promise<void>
      }
    }
    const settings = browser.happyDOM.settings
    const originalInterceptor = settings.fetch.interceptor
    const request = vi.fn(async () => new Response('', { status: 200 }))
    settings.fetch.interceptor = { beforeAsyncRequest: request }
    const element = document.createElement(type === 'stylesheet' ? 'link' : 'iframe')
    const resourceUrl = `https://ferry-qa.invalid/${type}`
    if (element instanceof HTMLLinkElement) {
      element.rel = 'stylesheet'
      element.href = resourceUrl
    } else {
      element.setAttribute('src', resourceUrl)
    }
    const resourceError = vi.fn()
    element.addEventListener('error', resourceError)
    try {
      document.body.appendChild(element)
      await browser.happyDOM.waitUntilComplete()
      expect(settings.enableCSSFileLoading).toBe(false)
      expect(settings.enableIframePageLoading).toBe(false)
      expect(element.getAttribute(type === 'stylesheet' ? 'href' : 'src')).toBe(resourceUrl)
      expect(request).not.toHaveBeenCalled()
      expect(resourceError).toHaveBeenCalledTimes(1)
    } finally {
      element.remove()
      settings.fetch.interceptor = originalInterceptor
    }
  })
})
