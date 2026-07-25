#!/usr/bin/env node
import { collectAll } from '../src/collector.mjs'

const args = new Set(process.argv.slice(2))
const save = args.has('--save') || args.has('-s')
const download = args.has('--download') || args.has('-d')

const snapshot = await collectAll({ save, download })
console.log(JSON.stringify(snapshot, null, 2))
