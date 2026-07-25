import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Android release resources', () => {
  it('legacy screen drawableに既定フォールバックを定義する', () => {
    const resources = readFileSync(
      'android/app/src/main/res/values/drawables.xml',
      'utf8'
    )

    expect(resources).toContain(
      '<item name="screen" type="drawable">@drawable/splash</item>'
    )
  })
})
