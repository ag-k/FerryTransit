import { describe, expect, it } from 'vitest'

describe('DOM fixture script isolation', () => {
  it.each(['text/javascript', 'module'])('does not evaluate an inserted %s script', async (type) => {
    const browser = window as unknown as {
      __ferryScriptProbe?: boolean
      happyDOM: {
        settings: { disableJavaScriptEvaluation: boolean }
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
      expect(browser.happyDOM.settings.disableJavaScriptEvaluation).toBe(true)
      expect(browser.__ferryScriptProbe).toBeUndefined()
    } finally {
      script.remove()
      delete browser.__ferryScriptProbe
    }
  })
})
