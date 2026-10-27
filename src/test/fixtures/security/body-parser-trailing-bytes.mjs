// Bounded regression probe using HTTP message streams without listening sockets.
import assert from 'node:assert/strict'
import { IncomingMessage } from 'node:http'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { Duplex } from 'node:stream'
import { gzipSync } from 'node:zlib'

const require = createRequire(resolve(process.argv[2]))
const parser = require('body-parser').json()
const parse = (payload, compressed = false) => new Promise((done) => {
  const socket = new Duplex({ read () {}, write (_chunk, _encoding, next) { next() } })
  const req = new IncomingMessage(socket)
  req.method = 'POST'
  req.url = '/regression'
  req.headers = { 'content-type': 'application/json', 'content-length': String(payload.length),
    ...(compressed ? { 'content-encoding': 'gzip' } : {}) }
  parser(req, {}, (error) => {
    socket.destroy()
    done({ status: error ? error.status || 400 : 200, body: req.body })
  })
  req.push(payload)
  req.push(null)
})
const json = Buffer.from('{"ok":true}')
const payload = Buffer.concat([gzipSync(json), Buffer.from('trailing')])
assert(payload.length < 128)
const first = await parse(payload, true)
assert([200, 400].includes(first.status))
await new Promise(done => setTimeout(done, 25))
const second = await parse(json)
assert.equal(second.status, 200)
assert.equal(second.body.ok, true)
console.log(JSON.stringify({ firstStatus: first.status, followingStatus: second.status,
  payloadBytes: payload.length, listeningSockets: 0, noExternalApi: true }))
