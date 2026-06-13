import type { Trip } from '@/types'

export type AirportLocation = {
  id: string
  name: string
  nameEn: string
  lat: number
  lng: number
}

export const AIRPORTS: AirportLocation[] = [
  {
    id: 'AIRPORT_OKI',
    name: '隠岐空港',
    nameEn: 'Oki Airport',
    lat: 36.1783,
    lng: 133.3233
  },
  {
    id: 'AIRPORT_IZUMO',
    name: '出雲空港',
    nameEn: 'Izumo Airport',
    lat: 35.4136,
    lng: 132.89
  },
  {
    id: 'AIRPORT_ITAMI',
    name: '大阪（伊丹）空港',
    nameEn: 'Osaka Itami Airport',
    lat: 34.7855,
    lng: 135.4382
  }
]

const AIR_ACTIVE_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const AIR_TIMETABLE: Trip[] = [
  {
    tripId: 8_000_001,
    startDate: '2026-03-29',
    endDate: '2026-07-31',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_ITAMI',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_itami_20260329_20260731',
    vehicleId: 'JAL2331',
    departure: 'AIRPORT_ITAMI',
    departureType: 'AIRPORT',
    departureTime: '13:45',
    arrival: 'AIRPORT_OKI',
    arrivalType: 'AIRPORT',
    arrivalTime: '14:35',
    status: 0
  },
  {
    tripId: 8_000_002,
    startDate: '2026-03-29',
    endDate: '2026-07-31',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_ITAMI',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_itami_20260329_20260731',
    vehicleId: 'JAL2332',
    departure: 'AIRPORT_OKI',
    departureType: 'AIRPORT',
    departureTime: '15:05',
    arrival: 'AIRPORT_ITAMI',
    arrivalType: 'AIRPORT',
    arrivalTime: '15:45',
    status: 0
  },
  {
    tripId: 8_000_003,
    startDate: '2026-08-01',
    endDate: '2026-08-28',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_ITAMI',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_itami_20260801_20260828',
    vehicleId: 'JAL2331',
    departure: 'AIRPORT_ITAMI',
    departureType: 'AIRPORT',
    departureTime: '12:15',
    arrival: 'AIRPORT_OKI',
    arrivalType: 'AIRPORT',
    arrivalTime: '13:05',
    status: 0
  },
  {
    tripId: 8_000_004,
    startDate: '2026-08-01',
    endDate: '2026-08-28',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_ITAMI',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_itami_20260801_20260828',
    vehicleId: 'JAL2332',
    departure: 'AIRPORT_OKI',
    departureType: 'AIRPORT',
    departureTime: '13:45',
    arrival: 'AIRPORT_ITAMI',
    arrivalType: 'AIRPORT',
    arrivalTime: '14:30',
    status: 0
  },
  {
    tripId: 8_000_005,
    startDate: '2026-08-29',
    endDate: '2026-10-24',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_ITAMI',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_itami_20260829_20261024',
    vehicleId: 'JAL2331',
    departure: 'AIRPORT_ITAMI',
    departureType: 'AIRPORT',
    departureTime: '13:45',
    arrival: 'AIRPORT_OKI',
    arrivalType: 'AIRPORT',
    arrivalTime: '14:35',
    status: 0
  },
  {
    tripId: 8_000_006,
    startDate: '2026-08-29',
    endDate: '2026-10-24',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_ITAMI',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_itami_20260829_20261024',
    vehicleId: 'JAL2332',
    departure: 'AIRPORT_OKI',
    departureType: 'AIRPORT',
    departureTime: '15:05',
    arrival: 'AIRPORT_ITAMI',
    arrivalType: 'AIRPORT',
    arrivalTime: '15:45',
    status: 0
  },
  {
    tripId: 8_000_101,
    startDate: '2026-03-29',
    endDate: '2026-10-24',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_IZUMO',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_izumo_20260329_20261024',
    vehicleId: 'JAL3433',
    departure: 'AIRPORT_IZUMO',
    departureType: 'AIRPORT',
    departureTime: '09:00',
    arrival: 'AIRPORT_OKI',
    arrivalType: 'AIRPORT',
    arrivalTime: '09:30',
    status: 0
  },
  {
    tripId: 8_000_102,
    startDate: '2026-03-29',
    endDate: '2026-10-24',
    activeDays: AIR_ACTIVE_DAYS,
    name: 'JAL_OKI_IZUMO',
    mode: 'AIR',
    operatorId: 'JAL',
    serviceId: 'jal_oki_izumo_20260329_20261024',
    vehicleId: 'JAL3434',
    departure: 'AIRPORT_OKI',
    departureType: 'AIRPORT',
    departureTime: '10:00',
    arrival: 'AIRPORT_IZUMO',
    arrivalType: 'AIRPORT',
    arrivalTime: '10:30',
    status: 0
  }
]

export const AIRPORT_LABELS: Record<string, string> = AIRPORTS.reduce<Record<string, string>>((labels, airport) => {
  labels[airport.id] = airport.name
  return labels
}, {})
