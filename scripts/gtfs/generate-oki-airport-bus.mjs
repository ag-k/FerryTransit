#!/usr/bin/env node
/* eslint-disable no-console */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { pathToFileURL } from 'url'

const ROOT = process.cwd()
const INPUT_FILE = join(ROOT, 'gtfs', 'raw', 'air', 'jal_oki_timetable.json')
const OUTPUT_FILE = join(ROOT, 'gtfs', 'generated', 'bus', 'oki_airport_bus_timetable.json')

const AIRPORT_OKI = 'AIRPORT_OKI'
const SAIGO = 'SAIGO'
const OKI_ICHIBATA_OFFICE = 'BUS_OKINOSHIMA_eigyosho'
const FIRST_TRIP_ID = 8100001

export function generateOkiAirportBusTrips(airTrips) {
  if (!Array.isArray(airTrips)) {
    throw new TypeError('航空便データは配列形式である必要があります')
  }

  const sortedTrips = [...airTrips].sort((a, b) => {
    const aTripId = Number(a.trip_id)
    const bTripId = Number(b.trip_id)
    if (Number.isFinite(aTripId) && Number.isFinite(bTripId) && aTripId !== bTripId) {
      return aTripId - bTripId
    }
    return String(a.trip_id).localeCompare(String(b.trip_id))
  })

  const busTrips = []

  for (const airTrip of sortedTrips) {
    if (airTrip.arrival === AIRPORT_OKI) {
      busTrips.push(...createAirportToOfficeTrips(airTrip, FIRST_TRIP_ID + busTrips.length))
    }
    if (airTrip.departure === AIRPORT_OKI) {
      busTrips.push(...createOfficeToAirportTrips(airTrip, FIRST_TRIP_ID + busTrips.length))
    }
  }

  return busTrips
}

function createAirportToOfficeTrips(airTrip, tripId) {
  const nextTripId = tripId + 1
  const airportDepartureTime = addMinutes(airTrip.arrival_time, 15)
  const saigoArrivalTime = addMinutes(airTrip.arrival_time, 25)
  const saigoDepartureTime = addMinutes(airTrip.arrival_time, 26)
  const officeArrivalTime = addMinutes(airTrip.arrival_time, 30)

  return [
    createBusTrip({
      sourceTrip: airTrip,
      tripId,
      nextTripId,
      departure: AIRPORT_OKI,
      departureType: 'AIRPORT',
      departureTime: airportDepartureTime,
      arrival: SAIGO,
      arrivalType: 'PORT',
      arrivalTime: saigoArrivalTime
    }),
    createBusTrip({
      sourceTrip: airTrip,
      tripId: nextTripId,
      departure: SAIGO,
      departureType: 'PORT',
      departureTime: saigoDepartureTime,
      arrival: OKI_ICHIBATA_OFFICE,
      arrivalType: 'STOP',
      arrivalTime: officeArrivalTime
    })
  ]
}

function createOfficeToAirportTrips(airTrip, tripId) {
  const nextTripId = tripId + 1
  const officeDepartureTime = addMinutes(airTrip.departure_time, -55)
  const saigoArrivalTime = addMinutes(airTrip.departure_time, -51)
  const saigoDepartureTime = addMinutes(airTrip.departure_time, -50)
  const airportArrivalTime = addMinutes(airTrip.departure_time, -40)

  return [
    createBusTrip({
      sourceTrip: airTrip,
      tripId,
      nextTripId,
      departure: OKI_ICHIBATA_OFFICE,
      departureType: 'STOP',
      departureTime: officeDepartureTime,
      arrival: SAIGO,
      arrivalType: 'PORT',
      arrivalTime: saigoArrivalTime
    }),
    createBusTrip({
      sourceTrip: airTrip,
      tripId: nextTripId,
      departure: SAIGO,
      departureType: 'PORT',
      departureTime: saigoDepartureTime,
      arrival: AIRPORT_OKI,
      arrivalType: 'AIRPORT',
      arrivalTime: airportArrivalTime
    })
  ]
}

function createBusTrip({
  sourceTrip,
  tripId,
  nextTripId,
  departure,
  departureType,
  departureTime,
  arrival,
  arrivalType,
  arrivalTime
}) {
  return {
    trip_id: String(tripId),
    start_date: sourceTrip.start_date,
    end_date: sourceTrip.end_date,
    active_days: Array.isArray(sourceTrip.active_days)
      ? [...sourceTrip.active_days]
      : sourceTrip.active_days,
    name: 'OKI_AIRPORT_BUS',
    mode: 'BUS',
    operator_id: 'OKI_ICHIBATA',
    service_id: `oki_airport_bus_${sourceTrip.service_id}`,
    departure,
    departure_type: departureType,
    departure_time: departureTime,
    arrival,
    arrival_type: arrivalType,
    arrival_time: arrivalTime,
    ...(nextTripId ? { next_id: String(nextTripId) } : {}),
    status: 0
  }
}

function addMinutes(time, offsetMinutes) {
  const totalMinutes = parseTimeToMinutes(time) + offsetMinutes
  if (totalMinutes < 0 || totalMinutes >= 24 * 60) {
    throw new RangeError(`日跨ぎする時刻は生成できません: ${time} (${offsetMinutes}分)`)
  }
  return formatMinutes(totalMinutes)
}

function parseTimeToMinutes(time) {
  const value = String(time)
  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) {
    throw new Error(`時刻の形式が不正です: ${value}`)
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours >= 24 ||
    minutes < 0 ||
    minutes >= 60
  ) {
    throw new Error(`時刻の値が不正です: ${value}`)
  }

  return hours * 60 + minutes
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function main() {
  const airTrips = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'))
  const busTrips = generateOkiAirportBusTrips(airTrips)

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(busTrips, null, 2)}\n`, 'utf-8')

  console.log(`隠岐空港連絡バス時刻表を生成しました: ${OUTPUT_FILE}`)
  console.log(`trips=${busTrips.length}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
}
