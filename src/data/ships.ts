export type ShipId =
  | 'FERRY_OKI'
  | 'FERRY_SHIRASHIMA'
  | 'FERRY_KUNIGA'
  | 'RAINBOWJET'
  | 'ISOKAZE'
  | 'FERRY_DOZEN'

type ShipOperatorKey = 'OKI_KISEN' | 'OKI_DOUZEN'

export type ShipDetails = {
  operatorKey: ShipOperatorKey
  capacityPassengers?: number
  capacityCars?: number | null
  carCarry?: boolean | null
  cabinTypes?: string[]
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
  }
}
