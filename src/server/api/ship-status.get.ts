import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  try {
    // src/public/data/ship-status.jsonから読み込み
    const filePath = join(process.cwd(), 'src', 'public', 'data', 'ship-status.json')
    const data = await readFile(filePath, 'utf-8')
    
    // CORSヘッダーを設定
    setHeaders(event, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/json'
    })
    
    return JSON.parse(data)
  } catch (error) {
    // ファイルが存在しない場合はデフォルトのデータを返す
    return {
      isokaze: null,
      dozen: null,
      ferry: null,
      lastUpdate: new Date().toISOString()
    }
  }
})