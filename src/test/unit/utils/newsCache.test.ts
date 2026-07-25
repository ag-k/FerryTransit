import { describe, expect, it } from 'vitest'
import type { News } from '~/types'
import {
  NEWS_CACHE_MAX_AGE_MS,
  readNewsCache,
  writeNewsCache
} from '~/utils/newsCache'

const cachedNews: News[] = [{
  id: 'cached-news',
  category: 'announcement',
  title: 'キャッシュ済みのお知らせ',
  content: 'キャッシュ内容',
  status: 'published',
  priority: 'medium',
  publishDate: '2026-07-15T00:00:00Z',
  isPinned: false
}]

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  }
}

describe('newsCache', () => {
  it('reads a fresh cache', () => {
    const storage = createStorage()
    writeNewsCache(storage, cachedNews, 1_000)

    expect(readNewsCache(storage, { now: 1_000 + NEWS_CACHE_MAX_AGE_MS - 1 })).toEqual(cachedNews)
  })

  it('returns stale news only when stale fallback is explicitly allowed', () => {
    const storage = createStorage()
    writeNewsCache(storage, cachedNews, 1_000)
    const now = 1_000 + NEWS_CACHE_MAX_AGE_MS

    expect(readNewsCache(storage, { now })).toBeNull()
    expect(readNewsCache(storage, { allowStale: true, now })).toEqual(cachedNews)
  })

  it('preserves an empty successful result for offline fallback', () => {
    const storage = createStorage()
    writeNewsCache(storage, [], 1_000)

    expect(readNewsCache(storage, { now: 1_001 })).toEqual([])
  })

  it('rejects malformed cache metadata and non-array data', () => {
    const invalidTimeStorage = createStorage()
    invalidTimeStorage.setItem('ferry_news_cache', JSON.stringify(cachedNews))
    invalidTimeStorage.setItem('ferry_news_cache_time', 'invalid')

    const invalidDataStorage = createStorage()
    invalidDataStorage.setItem('ferry_news_cache', JSON.stringify({ news: cachedNews }))
    invalidDataStorage.setItem('ferry_news_cache_time', '1000')

    expect(readNewsCache(invalidTimeStorage, { now: 1_001 })).toBeNull()
    expect(readNewsCache(invalidDataStorage, { now: 1_001 })).toBeNull()
  })
})
