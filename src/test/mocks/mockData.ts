import type { Trip, ShipStatus, FerryStatus, TransitRoute, TransitSegment } from '@/types'

export const mockTrips: Trip[] = [
  {
    tripId: 1,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'FERRY_OKI',
    departure: 'HONDO_SHICHIRUI',
    departureTime: '09:00:00' as any,
    arrival: 'SAIGO',
    arrivalTime: '11:25:00' as any,
    status: 0,
    price: 3360
  },
  {
    tripId: 2,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'RAINBOWJET',
    departure: 'SAIGO',
    departureTime: '14:00:00' as any,
    arrival: 'HONDO_SHICHIRUI',
    arrivalTime: '15:10:00' as any,
    status: 0,
    price: 6750
  },
  {
    tripId: 3,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'FERRY_DOZEN',
    departure: 'BEPPU',
    departureTime: '10:00:00' as any,
    arrival: 'SAIGO',
    arrivalTime: '11:30:00' as any,
    status: 0,
    price: 1680
  },
  {
    tripId: 4,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'ISOKAZE',
    departure: 'BEPPU',
    departureTime: '08:00:00' as any,
    arrival: 'HISHIURA',
    arrivalTime: '09:00:00' as any,
    status: 0,
    price: 410
  },
  {
    tripId: 5,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'FERRY_DOZEN',
    departure: 'BEPPU',
    departureTime: '10:00:00' as any,
    arrival: 'KURI',
    arrivalTime: '11:00:00' as any,
    status: 0,
    price: 780
  },
  {
    tripId: 6,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'FERRY_SHIRASHIMA',
    departure: 'SAIGO',
    departureTime: '08:30:00' as any,
    arrival: 'HISHIURA',
    arrivalTime: '09:30:00' as any,
    status: 0,
    price: 1540
  },
  {
    tripId: 7,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    name: 'FERRY_KUNIGA',
    departure: 'HONDO_SHICHIRUI',
    departureTime: '09:30:00' as any,
    arrival: 'KURI',
    arrivalTime: '11:45:00' as any,
    status: 0,
    price: 3520
  }
]

export const mockShipStatus: ShipStatus = {
  hasAlert: false,
  status: 0,
  date: '2024-01-15',
  updated: '2024-01-15T08:00:00',
  summary: '通常運航',
  comment: null
}

export const mockFerryStatus: FerryStatus = {
  hasAlert: false,
  date: '2024-01-15',
  ferryState: '通常運航',
  ferryComment: '',
  fastFerryState: '通常運航',
  fastFerryComment: '',
  todayWave: '1.0m',
  tomorrowWave: '1.5m'
}

export const mockTransitRoute: TransitRoute = {
  segments: [
    {
      tripId: '1',
      ship: 'FERRY_OKI',
      departure: 'HONDO_SHICHIRUI',
      arrival: 'SAIGO',
      departureTime: new Date('2024-01-15T09:00:00'),
      arrivalTime: new Date('2024-01-15T11:25:00'),
      status: 0,
      fare: 3360
    }
  ],
  departureTime: new Date('2024-01-15T09:00:00'),
  arrivalTime: new Date('2024-01-15T11:25:00'),
  totalFare: 3360,
  transferCount: 0
}

export const mockPortMaps = {
  HONDO_SHICHIRUI: '<iframe src="https://maps.google.com/maps?q=35.5,133.2"></iframe>',
  SAIGO: '<iframe src="https://maps.google.com/maps?q=36.2,133.3"></iframe>',
  BEPPU: '<iframe src="https://maps.google.com/maps?q=36.3,133.2"></iframe>'
}