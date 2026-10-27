import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { pathToFileURL } from "url";
import { afterEach, describe, expect, it } from "vitest";

type TimetableTrip = {
  trip_id: string;
  start_date: string;
  end_date: string;
  name: string;
  departure: string;
  departure_time: string;
  arrival: string;
  arrival_time: string;
  mode?: string;
};

type BuildPublicTimetableModule = {
  buildPublicTimetable: (
    sources?: Array<{
      id: string;
      label?: string;
      file: string;
      replaceNames?: string[];
      trips?: TimetableTrip[];
    }>,
    options?: { root?: string }
  ) => {
    trips: TimetableTrip[];
    sourceSummaries: Array<{ id: string; count: number; removed: number }>;
    summary: {
      total: number;
      byName: Record<string, number>;
      byMode: Record<string, number>;
    };
  };
  validateTimetable: (trips: TimetableTrip[]) => unknown;
};

const scriptUrl = pathToFileURL(resolve("scripts/timetable/build-public-timetable.mjs")).href;
const { buildPublicTimetable, validateTimetable } = await import(scriptUrl) as BuildPublicTimetableModule;
const pipelineScriptUrl = pathToFileURL(resolve("scripts/timetable/build-timetable-pipeline.mjs")).href;
const { buildTimetablePipeline } = await import(pipelineScriptUrl) as {
  buildTimetablePipeline: (options?: { root?: string; dryRun?: boolean }) => {
    busTrips: TimetableTrip[];
    trips: TimetableTrip[];
  };
};

const tempDirs: string[] = [];

const createTempRoot = () => {
  const dir = mkdtempSync(join(tmpdir(), "public-timetable-"));
  tempDirs.push(dir);
  return dir;
};

const writeJson = (root: string, file: string, data: unknown) => {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), `${JSON.stringify(data, null, 2)}\n`, "utf-8");
};

const createTrip = (overrides: Partial<TimetableTrip>): TimetableTrip => ({
  trip_id: "1",
  start_date: "2026-03-29",
  end_date: "2026-10-24",
  name: "FERRY_OKI",
  departure: "SAIGO",
  departure_time: "09:00",
  arrival: "HONDO_SHICHIRUI",
  arrival_time: "11:25",
  ...overrides,
});

const createPipelineFixture = () => {
  const root = createTempRoot();
  const airTrips = [
    {
      ...createTrip({ trip_id: "8000001", name: "JAL_OKI_ITAMI", mode: "AIR", departure: "AIRPORT_ITAMI", arrival: "AIRPORT_OKI", departure_time: "12:20", arrival_time: "13:10" }),
      service_id: "fixed_inbound",
      active_days: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      ...createTrip({ trip_id: "8000002", name: "JAL_OKI_ITAMI", mode: "AIR", departure: "AIRPORT_OKI", arrival: "AIRPORT_ITAMI", departure_time: "13:40", arrival_time: "14:20" }),
      service_id: "fixed_outbound",
      active_days: [0, 1, 2, 3, 4, 5, 6],
    },
  ];
  writeJson(root, "timetable.json", [createTrip({})]);
  writeJson(root, "gtfs/raw/air/jal_oki_timetable.json", airTrips);
  // 正常生成なら必ず変わる内容にし、同一JSONの書き直しを見逃さない。
  writeJson(root, "gtfs/generated/bus/oki_airport_bus_timetable.json", [{ unchanged: "bus" }]);
  writeJson(root, "gtfs/generated/public/timetable.json", [{ unchanged: "public" }]);
  return { root, airTrips };
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("buildPublicTimetable", () => {
  it("コード管理された実ソースから航空便と隠岐空港連絡バスを含む公開時刻表を生成する", () => {
    const airTrips = JSON.parse(readFileSync(resolve("gtfs/raw/air/jal_oki_timetable.json"), "utf-8")) as TimetableTrip[];
    const busTrips = JSON.parse(readFileSync(resolve("gtfs/generated/bus/oki_airport_bus_timetable.json"), "utf-8")) as TimetableTrip[];
    const result = buildPublicTimetable();

    // 自動取得で便数・掲載期間が変わっても、入力を欠落・改変せず合成する。
    expect(result.summary.total).toBeGreaterThan(900);
    expect(airTrips.filter(trip => trip.name === "JAL_OKI_ITAMI").length).toBeGreaterThan(0);
    expect(airTrips.filter(trip => trip.name === "JAL_OKI_IZUMO").length).toBeGreaterThan(0);
    expect(busTrips.length).toBeGreaterThan(0);
    expect(result.trips.filter(trip => trip.mode === "AIR")).toEqual(airTrips);
    expect(result.trips.filter(trip => trip.mode === "BUS")).toEqual(busTrips);
    expect(result.summary.byName.JAL_OKI_ITAMI).toBe(airTrips.filter(trip => trip.name === "JAL_OKI_ITAMI").length);
    expect(result.summary.byName.JAL_OKI_IZUMO).toBe(airTrips.filter(trip => trip.name === "JAL_OKI_IZUMO").length);
    expect(result.summary.byName.OKI_AIRPORT_BUS).toBe(busTrips.length);
    expect(result.summary.byMode.AIR).toBe(airTrips.length);
    expect(result.summary.byMode.BUS).toBe(busTrips.length);
  });

  it("生成物の便名を置換対象に指定すると既存データを除去してから追加する", () => {
    const root = createTempRoot();
    writeJson(root, "base.json", [
      createTrip({ trip_id: "1", name: "FERRY_OKI" }),
      createTrip({ trip_id: "2", name: "OKI_AIRPORT_BUS", mode: "BUS" }),
    ]);
    writeJson(root, "generated.json", [
      createTrip({
        trip_id: "3",
        name: "OKI_AIRPORT_BUS",
        mode: "BUS",
        departure: "SAIGO",
        arrival: "AIRPORT_OKI",
      }),
    ]);

    const result = buildPublicTimetable([
      { id: "base", file: "base.json" },
      { id: "generated", file: "generated.json", replaceNames: ["OKI_AIRPORT_BUS"] },
    ], { root });

    expect(result.sourceSummaries[1]?.removed).toBe(1);
    expect(result.summary.total).toBe(2);
    expect(result.summary.byName.OKI_AIRPORT_BUS).toBe(1);
    expect(result.trips.find(trip => trip.name === "OKI_AIRPORT_BUS")?.trip_id).toBe("3");
  });

  it("dry-runでは連絡バスと公開時刻表の管理対象ファイルを書き換えない", () => {
    const { root } = createPipelineFixture();
    const airportBusFile = join(root, "gtfs/generated/bus/oki_airport_bus_timetable.json");
    const publicTimetableFile = join(root, "gtfs/generated/public/timetable.json");
    const airFile = join(root, "gtfs/raw/air/jal_oki_timetable.json");
    const beforeAir = readFileSync(airFile, "utf-8");
    const beforeAirportBus = readFileSync(airportBusFile, "utf-8");
    const beforePublicTimetable = readFileSync(publicTimetableFile, "utf-8");

    const result = buildTimetablePipeline({ root, dryRun: true });

    expect(result.busTrips).toHaveLength(4);
    expect(result.trips).toHaveLength(7);
    expect(readFileSync(airFile, "utf-8")).toBe(beforeAir);
    expect(readFileSync(airportBusFile, "utf-8")).toBe(beforeAirportBus);
    expect(readFileSync(publicTimetableFile, "utf-8")).toBe(beforePublicTimetable);
  });

  it("通常生成では指定した一時rootのバス・公開時刻表を更新する", () => {
    const { root, airTrips } = createPipelineFixture();
    const result = buildTimetablePipeline({ root });

    expect(result.busTrips).toHaveLength(4);
    expect(result.trips).toHaveLength(7);
    expect(JSON.parse(readFileSync(join(root, "gtfs/generated/bus/oki_airport_bus_timetable.json"), "utf-8"))).toEqual(result.busTrips);
    expect(JSON.parse(readFileSync(join(root, "gtfs/generated/public/timetable.json"), "utf-8"))).toEqual(result.trips);
    expect(JSON.parse(readFileSync(join(root, "gtfs/raw/air/jal_oki_timetable.json"), "utf-8"))).toEqual(airTrips);
  });

  it("trip_id の重複は公開時刻表として拒否する", () => {
    expect(() => validateTimetable([
      createTrip({ trip_id: "1" }),
      createTrip({ trip_id: "1", name: "RAINBOWJET" }),
    ])).toThrow(/trip_id が重複/);
  });

  it.each([
    ["ISOKAZE", "1000"],
    ["ISOKAZE", "2999"],
    ["FERRY_DOZEN", "1000"],
    ["FERRY_DOZEN", "2999"],
  ])("%s の公式便で旧アプリの臨時便予約ID %sを拒否する", (name, tripId) => {
    expect(() => validateTimetable([
      createTrip({ trip_id: tripId, name }),
    ])).toThrow(/旧アプリの臨時便予約ID帯 1000〜2999/);
  });

  it.each(["999", "3000"])("予約ID帯の境界外 %s は利用できる", (tripId) => {
    expect(() => validateTimetable([
      createTrip({ trip_id: tripId, name: "ISOKAZE" }),
    ])).not.toThrow();
  });
});
