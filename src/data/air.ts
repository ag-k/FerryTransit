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

export const AIRPORT_LABELS: Record<string, string> = AIRPORTS.reduce<Record<string, string>>((labels, airport) => {
  labels[airport.id] = airport.name
  return labels
}, {})
