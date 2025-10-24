import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export const useDataManagement = () => {
  const { batchWrite, logAdminAction, getCollection } = useAdminFirestore()

  // ========================================
  // インポート機能
  // ========================================

  /**
   * CSVファイルのインポート
   */
  const importCSV = (
    file: File,
    dataType: 'timetable' | 'fare' | 'holidays'
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    return new Promise((resolve, reject) => {
      const errors: string[] = []
      let success = 0
      let failed = 0

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const data = results.data as any[]
            const operations = []

            for (const [index, row] of data.entries()) {
              try {
                const validatedData = validateImportData(row, dataType)
                operations.push({
                  type: 'create' as const,
                  collection: `${dataType}s`,
                  data: validatedData
                })
                success++
              } catch (error) {
                failed++
                errors.push(`行 ${index + 2}: ${error.message}`)
              }
            }

            // バッチで保存
            if (operations.length > 0) {
              await batchWrite(operations)
            }

            await logAdminAction('import', dataType, '', {
              format: 'csv',
              total: data.length,
              success,
              failed
            })

            resolve({ success, failed, errors })
          } catch (error) {
            reject(error)
          }
        },
        error: (error) => {
          reject(new Error(`CSVパースエラー: ${error.message}`))
        }
      })
    })
  }

  /**
   * Excelファイルのインポート
   */
  const importExcel = async (
    file: File,
    dataType: 'timetable' | 'fare' | 'holidays'
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // 最初のシートを取得
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // JSONに変換
      const data = XLSX.utils.sheet_to_json(worksheet)
      
      const errors: string[] = []
      let success = 0
      let failed = 0
      const operations = []

      for (const [index, row] of data.entries()) {
        try {
          const validatedData = validateImportData(row, dataType)
          operations.push({
            type: 'create' as const,
            collection: `${dataType}s`,
            data: validatedData
          })
          success++
        } catch (error) {
          failed++
          errors.push(`行 ${index + 2}: ${error.message}`)
        }
      }

      // バッチで保存
      if (operations.length > 0) {
        await batchWrite(operations)
      }

      await logAdminAction('import', dataType, '', {
        format: 'excel',
        total: data.length,
        success,
        failed
      })

      return { success, failed, errors }
    } catch (error) {
      throw new Error(`Excelファイルの読み込みに失敗しました: ${error.message}`)
    }
  }

  /**
   * JSONファイルのインポート
   */
  const importJSON = async (
    file: File,
    dataType: 'timetable' | 'fare' | 'holidays'
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!Array.isArray(data)) {
        throw new TypeError('JSONファイルは配列形式である必要があります')
      }

      const errors: string[] = []
      let success = 0
      let failed = 0
      const operations = []

      for (const [index, item] of data.entries()) {
        try {
          const validatedData = validateImportData(item, dataType)
          operations.push({
            type: 'create' as const,
            collection: `${dataType}s`,
            data: validatedData
          })
          success++
        } catch (error) {
          failed++
          errors.push(`要素 ${index + 1}: ${error.message}`)
        }
      }

      // バッチで保存
      if (operations.length > 0) {
        await batchWrite(operations)
      }

      await logAdminAction('import', dataType, '', {
        format: 'json',
        total: data.length,
        success,
        failed
      })

      return { success, failed, errors }
    } catch (error) {
      throw new Error(`JSONファイルの解析に失敗しました: ${error.message}`)
    }
  }

  // ========================================
  // エクスポート機能
  // ========================================

  /**
   * データのエクスポート
   */
  const exportData = async (
    dataType: 'timetable' | 'fare' | 'holidays' | 'alerts' | 'announcements',
    format: 'json' | 'csv' | 'excel'
  ): Promise<Blob> => {
    const data = await getCollection(`${dataType}s`)

    let blob: Blob

    switch (format) {
      case 'json':
        blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        })
        break

      case 'csv': {
        const csv = Papa.unparse(data)
        blob = new Blob([csv], {
          type: 'text/csv;charset=utf-8;'
        })
        break
      }

      case 'excel': {
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, dataType)
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        break
      }

      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    await logAdminAction('export', dataType, '', {
      format,
      count: data.length
    })

    return blob
  }

  /**
   * ファイルダウンロード
   */
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ========================================
  // データ検証
  // ========================================

  /**
   * インポートデータの検証
   */
  const validateImportData = (data: any, dataType: string): any => {
    switch (dataType) {
      case 'timetable':
        return validateTimetableImport(data)
      case 'fare':
        return validateFareImport(data)
      case 'holidays':
        return validateHolidayImport(data)
      default:
        throw new Error(`Unknown data type: ${dataType}`)
    }
  }

  /**
   * 時刻表データの検証
   */
  const validateTimetableImport = (data: any) => {
    const required = ['name', 'departure', 'arrival', 'departureTime', 'arrivalTime']
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`必須フィールド「${field}」が見つかりません`)
      }
    }

    // 時刻の形式を検証
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(data.departureTime)) {
      throw new Error(`出発時刻の形式が不正です: ${data.departureTime}`)
    }
    if (!timeRegex.test(data.arrivalTime)) {
      throw new Error(`到着時刻の形式が不正です: ${data.arrivalTime}`)
    }

    return {
      name: data.name.trim(),
      departure: data.departure.trim(),
      arrival: data.arrival.trim(),
      departureTime: data.departureTime,
      arrivalTime: data.arrivalTime,
      status: parseInt(data.status) || 0,
      price: parseInt(data.price) || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      via: data.via || null
    }
  }

  /**
   * 料金データの検証
   */
  const validateFareImport = (data: any) => {
    const required = ['route', 'adult', 'child']
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`必須フィールド「${field}」が見つかりません`)
      }
    }

    return {
      route: data.route.trim(),
      adult: parseInt(data.adult),
      child: parseInt(data.child),
      car3m: data.car3m ? parseInt(data.car3m) : null,
      car4m: data.car4m ? parseInt(data.car4m) : null,
      car5m: data.car5m ? parseInt(data.car5m) : null,
      type: data.type || 'ferry'
    }
  }

  /**
   * 祝日データの検証
   */
  const validateHolidayImport = (data: any) => {
    if (!data.date || !data.name) {
      throw new Error('日付と名称は必須です')
    }

    // 日付形式の検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.date)) {
      throw new Error(`日付の形式が不正です: ${data.date}`)
    }

    return {
      date: data.date,
      name: data.name.trim(),
      nameEn: data.nameEn?.trim() || ''
    }
  }

  // ========================================
  // 一括操作
  // ========================================

  /**
   * 一括更新
   */
  const bulkUpdate = async (
    collection: string,
    updates: Array<{ id: string; data: any }>
  ): Promise<void> => {
    const operations = updates.map(update => ({
      type: 'update' as const,
      collection,
      id: update.id,
      data: update.data
    }))

    await batchWrite(operations)
  }

  /**
   * 一括削除
   */
  const bulkDelete = async (
    collection: string,
    ids: string[]
  ): Promise<void> => {
    const operations = ids.map(id => ({
      type: 'delete' as const,
      collection,
      id
    }))

    await batchWrite(operations)
  }

  return {
    // インポート
    importCSV,
    importExcel,
    importJSON,

    // エクスポート
    exportData,
    downloadFile,

    // 一括操作
    bulkUpdate,
    bulkDelete,

    // 検証
    validateImportData
  }
}
