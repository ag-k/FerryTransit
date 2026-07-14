import { describe, expect, it } from "vitest";
import { resolve } from "path";
import { pathToFileURL } from "url";

type Period = { value: string; startDate: string; endDate: string };
type Route = { name: string; slug: string };
type Direction = { departure: string; arrival: string };
type Row = { flight: string; departureTime: string; arrivalTime: string; remarks: string };

type JalTimetableModule = {
  parsePublicationPeriod: (value: string) => Period;
  parseJapaneseDateExpression: (value: string, period: Period) => string[];
  parseTimetableEffects: (value: string, period: Period) => Array<{
    action: string;
    minutes: number;
    dates: string[];
  }>;
  buildJalTimetableTrips: (observations: Array<{
    route: Route;
    direction: Direction;
    period: Period;
    row: Row;
  }>) => Array<Record<string, unknown>>;
};

const scriptUrl = pathToFileURL(resolve("scripts/timetable/jal-timetable.mjs")).href;
const {
  parsePublicationPeriod,
  parseJapaneseDateExpression,
  parseTimetableEffects,
  buildJalTimetableTrips,
} = await import(scriptUrl) as JalTimetableModule;

const route = {
  name: "JAL_OKI_ITAMI",
  slug: "jal_oki_itami",
};

const outbound = {
  departure: "AIRPORT_ITAMI",
  arrival: "AIRPORT_OKI",
};

describe("JAL timetable parser", () => {
  it("公式サイトの掲載期間をISO日付へ変換する", () => {
    expect(parsePublicationPeriod("20260701_20260831")).toEqual({
      value: "20260701_20260831",
      startDate: "2026-07-01",
      endDate: "2026-08-31",
    });
  });

  it("複数月にまたがる日本語の日付範囲を展開する", () => {
    const period = parsePublicationPeriod("20260701_20260831");
    const dates = parseJapaneseDateExpression("7月30～31日・8月2、4日", period);

    expect(dates).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-02",
      "2026-08-04",
    ]);
  });

  it("早発・遅発の注記を分単位の変更として解釈する", () => {
    const period = parsePublicationPeriod("20260701_20260831");

    expect(parseTimetableEffects("8月1～28日1時間30分早発JAL運航", period)[0]).toMatchObject({
      action: "早発",
      minutes: 90,
    });
    expect(parseTimetableEffects("7月1～31日・8月29～31日1時間20分遅発", period)[0]).toMatchObject({
      action: "遅発",
      minutes: 80,
    });
  });

  it("期間ごとの基準時刻と注記を連続する運航期間へ再集約する", () => {
    const julyAugust = parsePublicationPeriod("20260701_20260831");
    const septemberOctober = parsePublicationPeriod("20260901_20261024");
    const trips = buildJalTimetableTrips([
      {
        route,
        direction: outbound,
        period: julyAugust,
        row: {
          flight: "JAL 2331 J-AIR運航",
          departureTime: "13:45",
          arrivalTime: "14:35",
          remarks: "8月1～28日1時間30分早発JAL運航",
        },
      },
      {
        route,
        direction: outbound,
        period: septemberOctober,
        row: {
          flight: "JAL 2331 J-AIR運航",
          departureTime: "13:45",
          arrivalTime: "14:35",
          remarks: "J-AIR運航",
        },
      },
    ]);

    expect(trips).toHaveLength(3);
    expect(trips).toEqual(expect.arrayContaining([
      expect.objectContaining({
        start_date: "2026-07-01",
        end_date: "2026-07-31",
        departure_time: "13:45",
        arrival_time: "14:35",
      }),
      expect.objectContaining({
        start_date: "2026-08-01",
        end_date: "2026-08-28",
        departure_time: "12:15",
        arrival_time: "13:05",
      }),
      expect.objectContaining({
        start_date: "2026-08-29",
        end_date: "2026-10-24",
        departure_time: "13:45",
        arrival_time: "14:35",
      }),
    ]));
  });

  it("運休日は期間を分割して公開データから除外する", () => {
    const period = parsePublicationPeriod("20260801_20260805");
    const trips = buildJalTimetableTrips([{
      route,
      direction: outbound,
      period,
      row: {
        flight: "JAL 2331",
        departureTime: "13:45",
        arrivalTime: "14:35",
        remarks: "8月3日運休",
      },
    }]);

    expect(trips).toEqual([
      expect.objectContaining({ start_date: "2026-08-01", end_date: "2026-08-02" }),
      expect.objectContaining({ start_date: "2026-08-04", end_date: "2026-08-05" }),
    ]);
  });

  it("未対応の備考は誤った時刻表を生成せずエラーにする", () => {
    const period = parsePublicationPeriod("20260701_20260831");
    expect(() => parseTimetableEffects("8月は時刻変更予定", period)).toThrow(/未対応の備考/);
  });
});
