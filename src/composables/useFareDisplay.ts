import type { FareRoute, VehicleFare } from '@/types/fare'
import { useFareStore } from '@/stores/fare'

export const useFareDisplay = () => {
  const fareStore = process.client ? useFareStore() : null
  const { locale } = useI18n()

  // 料金フォーマット
  const formatCurrency = (amount: number): string => {
    if (locale.value === 'ja') {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    } else {
      // 英語の場合は円マークを使用
      return `¥${amount.toLocaleString()}`
    }
  }

  // 車両サイズの表示名
  const getVehicleSizeName = (size: keyof VehicleFare): string => {
    const sizeNames: Record<keyof VehicleFare, { ja: string; en: string }> = {
      under3m: { ja: '3m未満', en: 'Under 3m' },
      under4m: { ja: '3m以上4m未満', en: '3m - 4m' },
      under5m: { ja: '4m以上5m未満', en: '4m - 5m' },
      under6m: { ja: '5m以上6m未満', en: '5m - 6m' },
      over6m: { ja: '6m以上', en: 'Over 6m' }
    }
    
    return locale.value === 'ja' ? sizeNames[size].ja : sizeNames[size].en
  }

  // 料金区分の表示名
  const getFareTypeName = (type: 'adult' | 'child'): string => {
    const typeNames = {
      adult: { ja: '大人', en: 'Adult' },
      child: { ja: '小人', en: 'Child' }
    }
    
    return locale.value === 'ja' ? typeNames[type].ja : typeNames[type].en
  }

  // ルート間の料金を取得
  const getRouteFare = async (departure: string, arrival: string): Promise<FareRoute | undefined> => {
    if (!fareStore) return undefined
    await fareStore.loadFareMaster()
    return fareStore.getFareByRoute(departure, arrival)
  }

  // 料金の一括取得（料金表用）
  const getAllFares = async (): Promise<FareRoute[]> => {
    if (!fareStore) return []
    await fareStore.loadFareMaster()
    return fareStore.fareMaster?.routes || []
  }

  return {
    formatCurrency,
    getVehicleSizeName,
    getFareTypeName,
    getRouteFare,
    getAllFares
  }
}