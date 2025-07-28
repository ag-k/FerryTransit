import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    // src/data/fare-master.jsonから読み込み
    const filePath = join(process.cwd(), 'src', 'data', 'fare-master.json')
    const data = await readFile(filePath, 'utf-8')
    
    // CORSヘッダーを設定
    setHeaders(event, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/json'
    })
    
    return JSON.parse(data)
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load fare data'
    })
  }
})