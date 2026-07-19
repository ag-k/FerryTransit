#!/usr/bin/env node

import WebSocket from 'ws'

const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => arg.startsWith('--') ? [arg.slice(2), all[index + 1]] : null).filter(Boolean))
if (!args.url || !args.expression) throw new Error('--url と --expression が必要です')

const socket = new WebSocket(args.url)
let id = 0
const pending = new Map()
socket.on('message', raw => {
  const message = JSON.parse(raw.toString())
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id
  pending.set(requestId, { resolve, reject })
  socket.send(JSON.stringify({ id: requestId, method, params }))
})
await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
const response = await send('Runtime.evaluate', { expression: args.expression, awaitPromise: true, returnByValue: true })
if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
console.log(JSON.stringify(response.result?.value, null, 2))
socket.close()
