export type ShipId =
  | 'FERRY_OKI'
  | 'FERRY_SHIRASHIMA'
  | 'FERRY_KUNIGA'
  | 'RAINBOWJET'
  | 'ISOKAZE'
  | 'FERRY_DOZEN'
  | 'ICHIBATA_BUS_CONNECTION'
  | 'JAL_OKI_ITAMI'
  | 'JAL_OKI_IZUMO'

type ShipOperatorKey = 'OKI_KISEN' | 'OKI_DOUZEN' | 'ICHIBATA_BUS' | 'JAL'

export type ShipDetails = {
  operatorKey: ShipOperatorKey
  mode?: 'ship' | 'bus' | 'air'
  capacityPassengers?: number
  capacityCars?: number | null
  carCarry?: boolean | null
  cabinTypes?: string[]
  routeSummaryKey?: string
  routeNameKey?: string
  fareTypeKey?: string
  fare?: number
  servicePeriod?: {
    startDate: string
    endDate: string
  }
  stops?: string[]
  sourceUrl?: string
  timetableUrl?: string
}

export const SHIP_DETAILS: Record<ShipId, ShipDetails> = {
  FERRY_OKI: {
    operatorKey: 'OKI_KISEN',
    capacityPassengers: 822,
    capacityCars: 26,
    carCarry: true,
    cabinTypes: ['2等室', '特別2等室', '1等室', '特等室（洋室）', '特等室（和室）', '特別室']
  },
  FERRY_SHIRASHIMA: {
    operatorKey: 'OKI_KISEN',
    capacityPassengers: 856,
    capacityCars: 26,
    carCarry: true,
    cabinTypes: ['2等室', '特別2等室', '1等室', '特等室（洋室）', '特等室（和室）', '特別室']
  },
  FERRY_KUNIGA: {
    operatorKey: 'OKI_KISEN',
    capacityPassengers: 823,
    capacityCars: 26,
    carCarry: true,
    cabinTypes: ['2等室', '特別2等室', '1等室', '特等室（洋室）', '特等室（和室）', '特別室']
  },
  RAINBOWJET: {
    operatorKey: 'OKI_KISEN',
    capacityPassengers: 256,
    carCarry: false,
    cabinTypes: []
  },
  ISOKAZE: {
    operatorKey: 'OKI_DOUZEN',
    capacityPassengers: 70,
    carCarry: false,
    cabinTypes: []
  },
  FERRY_DOZEN: {
    operatorKey: 'OKI_DOUZEN',
    capacityPassengers: 100,
    capacityCars: 10,
    carCarry: true,
    cabinTypes: []
  },
  ICHIBATA_BUS_CONNECTION: {
    operatorKey: 'ICHIBATA_BUS',
    mode: 'bus',
    routeSummaryKey: 'ship.modal.ichibataBusConnection.summary',
    routeNameKey: 'ship.modal.ichibataBusConnection.route',
    fareTypeKey: 'BUS_MAX_FARE',
    fare: 1200,
    servicePeriod: {
      startDate: '20260401',
      endDate: '20261231'
    },
    stops: ['松江駅', '附属学園入口', 'レインボープラザ前', '七類港', '境港'],
    sourceUrl: 'https://bus.ichibata.co.jp/oki-kisen/oki-kisen-sichirui/',
    timetableUrl: 'https://bus.ichibata.co.jp/media/oki_2026_dia.pdf'
  },
  JAL_OKI_ITAMI: {
    operatorKey: 'JAL',
    mode: 'air',
    routeSummaryKey: 'ship.modal.jalOkiItami.summary',
    routeNameKey: 'ship.modal.jalOkiItami.route',
    servicePeriod: {
      startDate: '20260329',
      endDate: '20261024'
    },
    stops: ['隠岐空港', '大阪（伊丹）空港'],
    sourceUrl: 'https://www.oki-airport.jp/news/archives/14',
    timetableUrl: 'https://www.jal.co.jp/jp/ja/dom/route/time/'
  },
  JAL_OKI_IZUMO: {
    operatorKey: 'JAL',
    mode: 'air',
    routeSummaryKey: 'ship.modal.jalOkiIzumo.summary',
    routeNameKey: 'ship.modal.jalOkiIzumo.route',
    servicePeriod: {
      startDate: '20260329',
      endDate: '20261024'
    },
    stops: ['隠岐空港', '出雲空港'],
    sourceUrl: 'https://www.oki-airport.jp/news/archives/14',
    timetableUrl: 'https://www.izumo-airport.co.jp/flight/flight-time'
  }
}
