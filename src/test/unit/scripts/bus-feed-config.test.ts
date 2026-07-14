import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const generatorUrl = pathToFileURL(resolve('scripts/config/generate-bus-feed-config.mjs')).href
const generatedUrl = pathToFileURL(resolve('scripts/generated/bus-feed-config.mjs')).href
const { renderAppConfig, renderNodeConfig, validateBusFeedRegistry } = await import(generatorUrl)
const { BUS_FEED_REGISTRY } = await import(generatedUrl)

describe('bus feed config generator', () => {
  it('正本とNode・アプリ生成物が一致する', () => {
    const registry = validateBusFeedRegistry(JSON.parse(readFileSync(resolve('config/bus-feeds.json'), 'utf8')))
    expect(BUS_FEED_REGISTRY).toEqual(registry)
    expect(readFileSync(resolve('scripts/generated/bus-feed-config.mjs'), 'utf8')).toBe(renderNodeConfig(registry))
    expect(readFileSync(resolve('src/generated/busFeedConfig.ts'), 'utf8')).toBe(renderAppConfig(registry))
  })

  it('重複したfeed idを拒否する', () => {
    const feed = BUS_FEED_REGISTRY.feeds[0]
    expect(() => validateBusFeedRegistry({ version: 1, feeds: [feed, feed] })).toThrow(/重複/)
  })
})
