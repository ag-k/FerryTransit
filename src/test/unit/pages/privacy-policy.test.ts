import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/pages/privacy.vue'), 'utf8')

describe('mobile app privacy policy', () => {
  it('states that Firebase Analytics is not used in the mobile app in both languages', () => {
    expect(source).toContain('モバイルアプリではFirebase Analyticsを使用しません')
    expect(source).toContain('Firebase Analytics is not used in the mobile app')
  })

  it('records the privacy policy revision date', () => {
    expect(source).toContain('最終改定日: 2026年7月22日')
    expect(source).toContain('Last Updated: July 22, 2026')
  })
})
