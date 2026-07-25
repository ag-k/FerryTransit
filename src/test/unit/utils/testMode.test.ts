import { describe, expect, it } from 'vitest'
import { isBrowserTestMode, TEST_MODE_STORAGE_KEY } from '@/utils/testMode'

describe('isBrowserTestMode', () => {
  it('test-modeキーがtrueのときだけ有効になる', () => {
    expect(isBrowserTestMode({ getItem: key => key === TEST_MODE_STORAGE_KEY ? 'true' : null })).toBe(true)
    expect(isBrowserTestMode({ getItem: () => 'false' })).toBe(false)
  })

  it('Storageへアクセスできない場合は無効として扱う', () => {
    expect(isBrowserTestMode({
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      }
    })).toBe(false)
  })
})
