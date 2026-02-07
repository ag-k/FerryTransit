#!/usr/bin/env node

import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'

const args = process.argv.slice(2)

const readArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`)
  if (index === -1) return defaultValue
  const value = args[index + 1]
  if (!value || value.startsWith('--')) return defaultValue
  return value
}

const host = readArg('host', process.env.APPSTORE_SERVER_HOST || '127.0.0.1')
const port = Number(readArg('port', process.env.APPSTORE_SERVER_PORT || '4173'))
const requestedRoot = readArg('root', process.env.APPSTORE_STATIC_ROOT || '')

const rootCandidates = [
  requestedRoot,
  '.output/public',
  'src/.output/public',
  'src/ios/App/App/public',
  'dist'
].filter(Boolean)

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
}

const fileExists = async (targetPath) => {
  try {
    const stat = await fs.stat(targetPath)
    return stat.isFile() || stat.isDirectory()
  } catch {
    return false
  }
}

const resolveStaticRoot = async () => {
  for (const candidate of rootCandidates) {
    const absolute = path.resolve(process.cwd(), candidate)
    const indexPath = path.join(absolute, 'index.html')
    if (await fileExists(indexPath)) {
      return absolute
    }
  }

  throw new Error(
    `静的配信ディレクトリが見つかりません。候補: ${rootCandidates.join(', ')}`
  )
}

const safeJoin = (rootPath, requestPath) => {
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  const target = path.join(rootPath, normalized)
  if (!target.startsWith(rootPath)) {
    return null
  }
  return target
}

const sendFile = async (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  const contentType = mimeTypes[ext] || 'application/octet-stream'
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  })
  createReadStream(filePath).pipe(res)
}

const start = async () => {
  const rootPath = await resolveStaticRoot()

  const server = http.createServer(async (req, res) => {
    const method = req.method || 'GET'
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405)
      res.end()
      return
    }

    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`)
    let requestPath = decodeURIComponent(requestUrl.pathname)
    if (requestPath.endsWith('/')) {
      requestPath += 'index.html'
    }

    const resolved = safeJoin(rootPath, requestPath.replace(/^\//, ''))
    const fallbackPath = path.join(rootPath, 'index.html')

    let filePath = resolved
    let shouldFallback = false

    if (!filePath) {
      shouldFallback = true
    } else {
      try {
        const stat = await fs.stat(filePath)
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html')
        }
        await fs.access(filePath)
      } catch {
        shouldFallback = true
      }
    }

    if (shouldFallback) {
      filePath = fallbackPath
    }

    try {
      if (method === 'HEAD') {
        const ext = path.extname(filePath).toLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store'
        })
        res.end()
        return
      }

      await sendFile(res, filePath)
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`Internal Server Error: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  })

  await new Promise((resolve) => server.listen(port, host, resolve))
  // eslint-disable-next-line no-console
  console.log(`SPA server started: http://${host}:${port}`)
  // eslint-disable-next-line no-console
  console.log(`Serving static root: ${rootPath}`)

  const shutdown = () => {
    server.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
