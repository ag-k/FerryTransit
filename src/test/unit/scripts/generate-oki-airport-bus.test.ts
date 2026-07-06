import { describe, it, expect } from "vitest";
import { resolve } from "path";
import { pathToFileURL } from "url";

type AirTripFixture = {
  trip_id: string;
  start_date: string;
  end_date: string;
  active_days: number[];
  name: string;
  mode: string;
  operator_id: string;
  service_id: string;
  departure: string;
  departure_type: string;
  departure_time: string;
  arrival: string;
  arrival_type: string;
  arrival_time: string;
  status: number;
};

type GeneratedBusTrip = {
  trip_id: string;
  start_date: string;
  end_date: string;
  active_days: number[];
  name: string;
  mode: string;
  operator_id: string;
  service_id: string;
  departure: string;
  departure_type: string;
  departure_time: string;
  arrival: string;
  arrival_type: string;
  arrival_time: string;
  next_id?: string;
  status: number;
};

type GeneratorModule = {
  generateOkiAirportBusTrips: (airTrips: AirTripFixture[]) => GeneratedBusTrip[];
};

const scriptUrl = pathToFileURL(resolve("scripts/gtfs/generate-oki-airport-bus.mjs")).href;
const { generateOkiAirportBusTrips } = await import(scriptUrl) as GeneratorModule;

const baseAirTrip = {
  start_date: "2026-03-29",
  end_date: "2026-07-31",
  active_days: [0, 1, 2, 3, 4, 5, 6],
  name: "JAL_OKI_ITAMI",
  mode: "AIR",
  operator_id: "JAL",
  service_id: "jal_oki_itami_20260329_20260731",
  status: 0,
} satisfies Omit<
  AirTripFixture,
  "trip_id" | "departure" | "departure_type" | "departure_time" | "arrival" | "arrival_type" | "arrival_time"
>;

describe("generateOkiAirportBusTrips", () => {
  it("航空便の隠岐空港発着時刻からnext_id連結の空港連絡バスを生成する", () => {
    const trips: AirTripFixture[] = [
      {
        ...baseAirTrip,
        trip_id: "8000002",
        departure: "AIRPORT_OKI",
        departure_type: "AIRPORT",
        departure_time: "15:05",
        arrival: "AIRPORT_ITAMI",
        arrival_type: "AIRPORT",
        arrival_time: "15:45",
      },
      {
        ...baseAirTrip,
        trip_id: "8000001",
        departure: "AIRPORT_ITAMI",
        departure_type: "AIRPORT",
        departure_time: "13:45",
        arrival: "AIRPORT_OKI",
        arrival_type: "AIRPORT",
        arrival_time: "14:35",
      },
      {
        ...baseAirTrip,
        trip_id: "8000999",
        departure: "AIRPORT_ITAMI",
        departure_type: "AIRPORT",
        departure_time: "18:00",
        arrival: "AIRPORT_IZUMO",
        arrival_type: "AIRPORT",
        arrival_time: "18:50",
      },
    ];

    const busTrips = generateOkiAirportBusTrips(trips);

    expect(busTrips).toHaveLength(4);
    expect(busTrips[0]).toMatchObject({
      trip_id: "8100001",
      start_date: "2026-03-29",
      end_date: "2026-07-31",
      active_days: [0, 1, 2, 3, 4, 5, 6],
      name: "OKI_AIRPORT_BUS",
      mode: "BUS",
      operator_id: "OKI_ICHIBATA",
      service_id: "oki_airport_bus_jal_oki_itami_20260329_20260731",
      departure: "AIRPORT_OKI",
      departure_type: "AIRPORT",
      departure_time: "14:50",
      arrival: "SAIGO",
      arrival_type: "PORT",
      arrival_time: "15:00",
      next_id: "8100002",
      status: 0,
    });
    expect(busTrips[1]).toMatchObject({
      trip_id: "8100002",
      start_date: "2026-03-29",
      end_date: "2026-07-31",
      active_days: [0, 1, 2, 3, 4, 5, 6],
      name: "OKI_AIRPORT_BUS",
      mode: "BUS",
      operator_id: "OKI_ICHIBATA",
      service_id: "oki_airport_bus_jal_oki_itami_20260329_20260731",
      departure: "SAIGO",
      departure_type: "PORT",
      departure_time: "15:01",
      arrival: "BUS_OKINOSHIMA_eigyosho",
      arrival_type: "STOP",
      arrival_time: "15:05",
      status: 0,
    });
    expect(busTrips[1].next_id).toBeUndefined();
    expect(busTrips[2]).toMatchObject({
      trip_id: "8100003",
      start_date: "2026-03-29",
      end_date: "2026-07-31",
      active_days: [0, 1, 2, 3, 4, 5, 6],
      name: "OKI_AIRPORT_BUS",
      mode: "BUS",
      operator_id: "OKI_ICHIBATA",
      service_id: "oki_airport_bus_jal_oki_itami_20260329_20260731",
      departure: "BUS_OKINOSHIMA_eigyosho",
      departure_type: "STOP",
      departure_time: "14:10",
      arrival: "SAIGO",
      arrival_type: "PORT",
      arrival_time: "14:14",
      next_id: "8100004",
      status: 0,
    });
    expect(busTrips[3]).toMatchObject({
      trip_id: "8100004",
      start_date: "2026-03-29",
      end_date: "2026-07-31",
      active_days: [0, 1, 2, 3, 4, 5, 6],
      name: "OKI_AIRPORT_BUS",
      mode: "BUS",
      operator_id: "OKI_ICHIBATA",
      departure: "SAIGO",
      departure_type: "PORT",
      departure_time: "14:15",
      arrival: "AIRPORT_OKI",
      arrival_type: "AIRPORT",
      arrival_time: "14:25",
      status: 0,
    });
    expect(busTrips[3].next_id).toBeUndefined();
  });

  it("trip_id は8便から16 Tripの決定的な連番になり重複しない", () => {
    const trips: AirTripFixture[] = [
      {
        ...baseAirTrip,
        trip_id: "8000006",
        service_id: "jal_oki_itami_20260829_20261024",
        departure: "AIRPORT_OKI",
        departure_type: "AIRPORT",
        departure_time: "15:05",
        arrival: "AIRPORT_ITAMI",
        arrival_type: "AIRPORT",
        arrival_time: "15:45",
      },
      {
        ...baseAirTrip,
        trip_id: "8000102",
        service_id: "jal_oki_izumo_20260329_20261024",
        departure: "AIRPORT_OKI",
        departure_type: "AIRPORT",
        departure_time: "10:00",
        arrival: "AIRPORT_IZUMO",
        arrival_type: "AIRPORT",
        arrival_time: "10:30",
      },
      {
        ...baseAirTrip,
        trip_id: "8000005",
        service_id: "jal_oki_itami_20260829_20261024",
        departure: "AIRPORT_ITAMI",
        departure_type: "AIRPORT",
        departure_time: "13:45",
        arrival: "AIRPORT_OKI",
        arrival_type: "AIRPORT",
        arrival_time: "14:35",
      },
      {
        ...baseAirTrip,
        trip_id: "8000002",
        departure: "AIRPORT_OKI",
        departure_type: "AIRPORT",
        departure_time: "15:05",
        arrival: "AIRPORT_ITAMI",
        arrival_type: "AIRPORT",
        arrival_time: "15:45",
      },
      {
        ...baseAirTrip,
        trip_id: "8000004",
        service_id: "jal_oki_itami_20260801_20260828",
        departure: "AIRPORT_OKI",
        departure_type: "AIRPORT",
        departure_time: "13:45",
        arrival: "AIRPORT_ITAMI",
        arrival_type: "AIRPORT",
        arrival_time: "14:30",
      },
      {
        ...baseAirTrip,
        trip_id: "8000001",
        departure: "AIRPORT_ITAMI",
        departure_type: "AIRPORT",
        departure_time: "13:45",
        arrival: "AIRPORT_OKI",
        arrival_type: "AIRPORT",
        arrival_time: "14:35",
      },
      {
        ...baseAirTrip,
        trip_id: "8000003",
        start_date: "2026-08-01",
        end_date: "2026-08-28",
        active_days: [1, 3, 5],
        service_id: "jal_oki_itami_20260801_20260828",
        departure: "AIRPORT_ITAMI",
        departure_type: "AIRPORT",
        departure_time: "12:15",
        arrival: "AIRPORT_OKI",
        arrival_type: "AIRPORT",
        arrival_time: "13:05",
      },
      {
        ...baseAirTrip,
        trip_id: "8000101",
        service_id: "jal_oki_izumo_20260329_20261024",
        departure: "AIRPORT_IZUMO",
        departure_type: "AIRPORT",
        departure_time: "09:00",
        arrival: "AIRPORT_OKI",
        arrival_type: "AIRPORT",
        arrival_time: "09:30",
      },
    ];

    const busTrips = generateOkiAirportBusTrips(trips);
    const tripIds = busTrips.map(trip => trip.trip_id);

    expect(busTrips).toHaveLength(16);
    expect(tripIds).toEqual([
      "8100001",
      "8100002",
      "8100003",
      "8100004",
      "8100005",
      "8100006",
      "8100007",
      "8100008",
      "8100009",
      "8100010",
      "8100011",
      "8100012",
      "8100013",
      "8100014",
      "8100015",
      "8100016",
    ]);
    expect(new Set(tripIds).size).toBe(tripIds.length);
    expect(busTrips[4]).toMatchObject({
      trip_id: "8100005",
      start_date: "2026-08-01",
      end_date: "2026-08-28",
      active_days: [1, 3, 5],
      next_id: "8100006",
    });
    expect(busTrips[5]).toMatchObject({
      trip_id: "8100006",
      start_date: "2026-08-01",
      end_date: "2026-08-28",
      active_days: [1, 3, 5],
    });
    expect(busTrips[5].next_id).toBeUndefined();
  });
});
