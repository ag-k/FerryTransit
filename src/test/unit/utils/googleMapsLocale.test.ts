import { describe, it, expect } from 'vitest'
import { getGoogleMapsLocaleOptions } from '@/utils/googleMapsLocale'

describe('getGoogleMapsLocaleOptions', () => {
  it('ja 系は language=ja / region=JP を返す', () => {
    expect(getGoogleMapsLocaleOptions('ja')).toEqual({
      language: 'ja',
      region: 'JP',
      routesApiLanguageCode: 'ja'
    })
    expect(getGoogleMapsLocaleOptions('ja-JP')).toEqual({
      language: 'ja',
      region: 'JP',
      routesApiLanguageCode: 'ja'
    })
    expect(getGoogleMapsLocaleOptions('ja_JP')).toEqual({
      language: 'ja',
      region: 'JP',
      routesApiLanguageCode: 'ja'
    })
  })

  it('en 系は language=en / region=JP を返す', () => {
    expect(getGoogleMapsLocaleOptions('en')).toEqual({
      language: 'en',
      region: 'JP',
      routesApiLanguageCode: 'en'
    })
    expect(getGoogleMapsLocaleOptions('en-US')).toEqual({
      language: 'en',
      region: 'JP',
      routesApiLanguageCode: 'en'
    })
  })

  it('不正値は安全に ja 扱いにフォールバックする', () => {
    expect(getGoogleMapsLocaleOptions(null)).toEqual({
      language: 'ja',
      region: 'JP',
      routesApiLanguageCode: 'ja'
    })
    expect(getGoogleMapsLocaleOptions(undefined)).toEqual({
      language: 'ja',
      region: 'JP',
      routesApiLanguageCode: 'ja'
    })
    expect(getGoogleMapsLocaleOptions({})).toEqual({
      language: 'ja',
      region: 'JP',
      routesApiLanguageCode: 'ja'
    })
  })
})
