import { ref as storageRef, getDownloadURL, getMetadata, getBytes } from 'firebase/storage'
import { useFirebase } from './useFirebase'
import { createLogger } from '~/utils/logger'

export interface StorageFile {
  url: string
  metadata: {
    size: number
    contentType: string
    updated: Date
  }
}

export const useFirebaseStorage = () => {
  const { storage } = useFirebase()
  const logger = createLogger('useFirebaseStorage')

  /**
   * Firebase Storage からファイルのダウンロード URL を取得
   */
  const getFileUrl = async (path: string): Promise<string> => {
    try {
      const fileRef = storageRef(storage, path)
      const url = await getDownloadURL(fileRef)
      return url
    } catch (error) {
      logger.error(`Failed to get download URL for ${path}`, error)
      throw error
    }
  }
  
  /**
   * Firebase Storage からファイルのメタデータを取得
   */
  const getFileMetadata = async (path: string) => {
    try {
      const fileRef = storageRef(storage, path)
      const metadata = await getMetadata(fileRef)
      return {
        size: metadata.size,
        contentType: metadata.contentType || 'application/octet-stream',
        updated: new Date(metadata.updated)
      }
    } catch (error) {
      logger.error(`Failed to get metadata for ${path}`, error)
      throw error
    }
  }
  
  /**
   * Firebase Storage から JSON ファイルを取得してパース
   */
  const getJsonFile = async <T = any>(path: string): Promise<T> => {
    try {
      const fileRef = storageRef(storage, path)
      const bytes = await getBytes(fileRef)

      // ArrayBuffer を文字列に変換
      const decoder = new TextDecoder('utf-8')
      const jsonString = decoder.decode(bytes)

      // JSON をパース
      const data = JSON.parse(jsonString) as T
      return data
    } catch (error) {
      logger.error(`Failed to get JSON file from ${path}`, error)
      throw error
    }
  }
  
  /**
   * Firebase Storage から JSON ファイルを取得（キャッシュ機能付き）
   */
  const getCachedJsonFile = async <T = any>(
    path: string, 
    cacheKey: string,
    cacheMinutes: number = 15
  ): Promise<T> => {
    // ブラウザ環境でのみキャッシュを使用
    if (process.client) {
      try {
        const cached = localStorage.getItem(cacheKey)
        const cacheTime = localStorage.getItem(`${cacheKey}_time`)
        
        if (cached && cacheTime) {
          const cacheAge = Date.now() - parseInt(cacheTime)
          const maxAge = cacheMinutes * 60 * 1000
          
          if (cacheAge < maxAge) {
            logger.debug(`Using cached data for ${path}`)
            return JSON.parse(cached) as T
          }
        }
      } catch (e) {
        logger.warn('Failed to read from cache', e)
      }
    }
    
    // Firebase Storage から取得
    logger.debug(`Fetching JSON from storage for ${path}`)
    const data = await getJsonFile<T>(path)
    
    // キャッシュに保存
    if (process.client) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data))
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString())
      } catch (e) {
        logger.warn('Failed to save to cache', e)
      }
    }
    
    return data
  }
  
  /**
   * ファイルの存在確認
   */
  const fileExists = async (path: string): Promise<boolean> => {
    try {
      const fileRef = storageRef(storage, path)
      await getMetadata(fileRef)
      return true
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        return false
      }
      throw error
    }
  }
  
  return {
    getFileUrl,
    getFileMetadata,
    getJsonFile,
    getCachedJsonFile,
    fileExists
  }
}
