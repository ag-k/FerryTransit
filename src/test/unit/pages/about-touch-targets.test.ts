import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('About page touch targets', () => {
  it('主要3導線を48px以上の操作領域として表示する', () => {
    const fileContent = readFileSync(resolve(process.cwd(), 'src/pages/about.vue'), 'utf8')
    const accessibleActionClasses = fileContent.match(/class="inline-flex min-h-12 items-center/g) ?? []

    expect(accessibleActionClasses).toHaveLength(3)
  })
})
