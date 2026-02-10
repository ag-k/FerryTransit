export interface Holiday {
  date: string
  nameKey: string
  type: 'national' | 'bank' | 'local'
}

export interface SpecialOperation {
  date: string
  operationType: 'reduced' | 'extra' | 'cancelled'
  descriptionKey: string
}

export interface HolidayMaster {
  holidays: Holiday[]
  specialOperations: SpecialOperation[]
}
