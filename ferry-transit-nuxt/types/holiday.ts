export interface Holiday {
  date: string
  nameKey: string
  type: 'national' | 'bank' | 'local'
}

export interface PeakSeason {
  startDate: string
  endDate: string
  nameKey: string
  surchargeRate: number
}

export interface SpecialOperation {
  date: string
  operationType: 'reduced' | 'extra' | 'cancelled'
  descriptionKey: string
}

export interface HolidayMaster {
  holidays: Holiday[]
  peakSeasons: PeakSeason[]
  specialOperations: SpecialOperation[]
}