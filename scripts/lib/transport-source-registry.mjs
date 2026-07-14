import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TRANSPORT_SOURCE_OPERATIONS, getTransportSourceOperation } from '../../config/transport-sources.mjs'
import { BUS_FEED_REGISTRY } from '../generated/bus-feed-config.mjs'

export function loadTransportSourceRegistry(root = process.cwd()) {
  const feeds = BUS_FEED_REGISTRY.feeds.map(feed => {
    const operation = getTransportSourceOperation(feed.sourceId)
    const metadataPath = join(root, 'gtfs', 'sources', `${feed.id}.bus.json`)
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
    if (metadata.id !== feed.id || metadata.mode !== 'bus') {
      throw new Error(`${metadataPath}: id または mode がバスフィード設定と一致しません`)
    }
    return Object.freeze({ ...operation, ...metadata, id: feed.id, sourceId: operation.id, busFeed: feed, metadataPath })
  })

  const feedBySourceId = new Map(feeds.map(feed => [feed.sourceId, feed]))
  const sources = Object.values(TRANSPORT_SOURCE_OPERATIONS)
    .map(operation => {
      const feed = feedBySourceId.get(operation.id)
      return feed ? Object.freeze({ ...feed, id: operation.id, feedId: feed.id }) : operation
    })
  return Object.freeze({
    version: 1,
    sources: Object.freeze(sources),
    feeds: Object.freeze(feeds),
    byId: Object.freeze(Object.fromEntries(sources.map(source => [source.id, source]))),
    feedById: Object.freeze(Object.fromEntries(feeds.map(feed => [feed.id, feed])))
  })
}
