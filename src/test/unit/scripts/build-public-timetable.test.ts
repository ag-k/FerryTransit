import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
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
  buildTimetablePipeline: (options?: { dryRun?: boolean }) => {
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

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("buildPublicTimetable", () => {
  it("コード管理された実ソースから航空便と隠岐空港連絡バスを含む公開時刻表を生成する", () => {
    const result = buildPublicTimetable();

    expect(result.summary.total).toBeGreaterThan(900);
    expect(result.summary.byName.JAL_OKI_ITAMI).toBe(8);
    expect(result.summary.byName.JAL_OKI_IZUMO).toBe(2);
    expect(result.summary.byName.OKI_AIRPORT_BUS).toBe(20);
    expect(result.summary.byMode.AIR).toBe(10);
    expect(result.summary.byMode.BUS).toBe(20);
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
    const airportBusFile = resolve("gtfs/generated/bus/oki_airport_bus_timetable.json");
    const publicTimetableFile = resolve("gtfs/generated/public/timetable.json");
    const beforeAirportBus = readFileSync(airportBusFile, "utf-8");
    const beforePublicTimetable = readFileSync(publicTimetableFile, "utf-8");

    const result = buildTimetablePipeline({ dryRun: true });

    expect(result.busTrips).toHaveLength(20);
    expect(result.trips.length).toBeGreaterThan(900);
    expect(readFileSync(airportBusFile, "utf-8")).toBe(beforeAirportBus);
    expect(readFileSync(publicTimetableFile, "utf-8")).toBe(beforePublicTimetable);
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
