import { describe, expect, it } from 'vitest'
import {
  calculateInnerIslandVehicleFare,
  calculateOkiKisenVehicleFare,
  calculateVehicleFareForShip,
  canCarryVehicle
} from '@/utils/vehicleFare'
import type { FareMaster, FareRoute, VehicleFare } from '@/types/fare'

const okiVehicleFare: VehicleFare = {
  under3m: 13750,
  under4m: 18260,
  under5m: 22870,
  under6m: 27390,
  under7m: 35530,
  under8m: 40700,
  under9m: 45760,
  under10m: 50820,
  under11m: 55870,
  under12m: 60940,
  over12mPer1m: 5070
}

const fareRoute: FareRoute = {
  id: 'hondo-saigo',
  departure: 'HONDO_SHICHIRUI',
  arrival: 'SAIGO',
  fares: {
    adult: 3520,
    child: 1760,
    vehicle: okiVehicleFare
  },
  vesselType: 'ferry'
}

const fareMaster: FareMaster = {
  innerIslandFare: {
    adult: 300,
    child: 100
  },
  innerIslandVehicleFare: {
    under5m: 1000,
    under7m: 2000,
    under10m: 3000,
    over10m: 3000
  },
  discounts: {},
  notes: []
}

describe('vehicleFare utils', () => {
  it('detects ships that can carry vehicles', () => {
    expect(canCarryVehicle('FERRY_OKI')).toBe(true)
    expect(canCarryVehicle('FERRY_DOZEN')).toBe(true)
    expect(canCarryVehicle('RAINBOWJET')).toBe(false)
    expect(canCarryVehicle('ISOKAZE')).toBe(false)
  })

  it('calculates Oki Kisen ferry vehicle fare under 5m', () => {
    expect(calculateOkiKisenVehicleFare(okiVehicleFare, 5)).toBe(22870)
  })

  it('calculates Oki Kisen ferry vehicle fare over 12m', () => {
    expect(calculateOkiKisenVehicleFare(okiVehicleFare, 14)).toBe(71080)
  })

  it('calculates Ferry Dozen vehicle fare under 5m', () => {
    expect(calculateInnerIslandVehicleFare(fareMaster.innerIslandVehicleFare, 5)).toBe(1000)
  })

  it('calculates Ferry Dozen vehicle fare over 10m', () => {
    expect(calculateInnerIslandVehicleFare(fareMaster.innerIslandVehicleFare, 13)).toBe(4500)
  })

  it('returns null when vehicle fare data is missing', () => {
    expect(calculateVehicleFareForShip('FERRY_OKI', undefined, fareMaster, 5)).toBeNull()
    expect(calculateVehicleFareForShip('FERRY_DOZEN', undefined, { discounts: {}, notes: [] }, 5)).toBeNull()
  })

  it('calculates vehicle fare by ship type', () => {
    expect(calculateVehicleFareForShip('FERRY_OKI', fareRoute, fareMaster, 5)).toBe(22870)
    expect(calculateVehicleFareForShip('FERRY_DOZEN', undefined, fareMaster, 5)).toBe(1000)
  })
})
