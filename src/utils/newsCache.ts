import type { News } from '~/types'

export const NEWS_CACHE_KEY = 'ferry_news_cache'
export const NEWS_CACHE_TIME_KEY = 'ferry_news_cache_time'
export const NEWS_CACHE_MAX_AGE_MS = 30 * 60 * 1000

type ReadNewsCacheOptions = {
  allowStale?: boolean
  now?: number
}

export const readNewsCache = (
  storage: Pick<Storage, 'getItem'>,
  options: ReadNewsCacheOptions = {}
): News[] | null => {
  const cached = storage.getItem(NEWS_CACHE_KEY)
  const cacheTime = storage.getItem(NEWS_CACHE_TIME_KEY)
  if (!cached || !cacheTime) {
    return null
  }

  const parsedCacheTime = Number(cacheTime)
  if (!Number.isFinite(parsedCacheTime)) {
    return null
  }

  const cacheAge = (options.now ?? Date.now()) - parsedCacheTime
  if (!options.allowStale && cacheAge >= NEWS_CACHE_MAX_AGE_MS) {
    return null
  }

  const parsed = JSON.parse(cached)
  return Array.isArray(parsed) ? parsed as News[] : null
}

export const writeNewsCache = (
  storage: Pick<Storage, 'setItem'>,
  news: News[],
  now = Date.now()
) => {
  storage.setItem(NEWS_CACHE_KEY, JSON.stringify(news))
  storage.setItem(NEWS_CACHE_TIME_KEY, now.toString())
}
