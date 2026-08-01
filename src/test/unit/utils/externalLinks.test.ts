import { describe, expect, it } from 'vitest'
import { getExternalHttpUrl } from '~/utils/externalLinks'

describe('getExternalHttpUrl', () => {
  const currentUrl = 'capacitor://localhost/transit'

  it('returns the URL for an external target-blank link clicked through a child', () => {
    const anchor = document.createElement('a')
    anchor.href = 'https://www.jal.co.jp/jp/ja/dom/fare/'
    anchor.target = '_blank'
    const child = document.createElement('span')
    anchor.appendChild(child)

    expect(getExternalHttpUrl(child, currentUrl)).toBe(
      'https://www.jal.co.jp/jp/ja/dom/fare/'
    )
  })

  it.each([
    ['same-origin link', 'capacitor://localhost/settings', '_blank'],
    ['non-http link', 'mailto:info@example.com', '_blank'],
    ['non-target-blank link', 'https://www.jal.co.jp/', '_self']
  ])('ignores a %s', (_label, href, target) => {
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.target = target

    expect(getExternalHttpUrl(anchor, currentUrl)).toBeNull()
  })
})
