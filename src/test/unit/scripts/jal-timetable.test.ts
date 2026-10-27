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

  it("年をまたぐ日本語の日付範囲を展開する", () => {
    const period = parsePublicationPeriod("20261025_20270131");
    const dates = parseJapaneseDateExpression("12月26日～1月3日", period);

    expect(dates).toEqual([
      "2026-12-26",
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
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

  it("複数の時刻変更と年またぎ期間が連結された備考を解釈する", () => {
    const period = parsePublicationPeriod("20261025_20270131");
    const effects = parseTimetableEffects(
      "12月1～25日・1月4日10分遅発12月26日～1月3日25分早発",
      period,
    );

    expect(effects).toHaveLength(2);
    expect(effects[0]).toMatchObject({
      action: "遅発",
      minutes: 10,
      dates: expect.arrayContaining(["2026-12-01", "2026-12-25", "2027-01-04"]),
    });
    expect(effects[0].dates).toHaveLength(26);
    expect(effects[1]).toMatchObject({
      action: "早発",
      minutes: 25,
      dates: [
        "2026-12-26",
        "2026-12-27",
        "2026-12-28",
        "2026-12-29",
        "2026-12-30",
        "2026-12-31",
        "2027-01-01",
        "2027-01-02",
        "2027-01-03",
      ],
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

describe("JAL 2026年度冬ダイヤ", () => {
  // 自動取得で変わる公開JSONではなく、固定入力で期間分割を検証する。
  // この入力は解析の回帰テスト用であり、最新の公式ダイヤを表すものではない。
  const schedules = [
    ["20261025_20261130", ["12:20", "13:10"], ["13:40", "14:20"], ""],
    ["20261201_20270131", ["12:30", "13:20"], ["13:50", "14:30"], "12月18日～1月4日35分早発"],
    ["20270201_20270228", ["13:35", "14:25"], ["14:55", "15:35"], ""],
    ["20270301_20270327", ["13:50", "14:35"], ["15:05", "15:45"], ""],
  ] as const;
  const observations = schedules.flatMap(([value, outboundTimes, inboundTimes, remarks]) => [
    {
      route,
      direction: outbound,
      period: parsePublicationPeriod(value),
      row: { flight: "JAL2331", departureTime: outboundTimes[0], arrivalTime: outboundTimes[1], remarks },
    },
    {
      route,
      direction: { departure: "AIRPORT_OKI", arrival: "AIRPORT_ITAMI" },
      period: parsePublicationPeriod(value),
      row: { flight: "JAL2332", departureTime: inboundTimes[0], arrivalTime: inboundTimes[1], remarks },
    },
  ]);
  const izumoRoute = { name: "JAL_OKI_IZUMO", slug: "jal_oki_izumo" };
  const publishedTrips = buildJalTimetableTrips([
    ...observations,
    {
      route: izumoRoute,
      direction: { departure: "AIRPORT_IZUMO", arrival: "AIRPORT_OKI" },
      period: parsePublicationPeriod("20260601_20270327"),
      row: { flight: "JAL3433", departureTime: "09:00", arrivalTime: "09:30", remarks: "" },
    },
    {
      route: izumoRoute,
      direction: { departure: "AIRPORT_OKI", arrival: "AIRPORT_IZUMO" },
      period: parsePublicationPeriod("20260601_20270327"),
      row: { flight: "JAL3434", departureTime: "10:00", arrivalTime: "10:30", remarks: "" },
    },
  ]);

  it("伊丹線の全期間と時刻を反映する", () => {
    const winterTrips = publishedTrips
      .filter((trip) => trip.name === "JAL_OKI_ITAMI" && String(trip.start_date) >= "2026-10-25")
      .map((trip) => ({
        flight: trip.vehicle_id,
        startDate: trip.start_date,
        endDate: trip.end_date,
        departureTime: trip.departure_time,
        arrivalTime: trip.arrival_time,
      }));

    expect(winterTrips).toEqual([
      { flight: "JAL2331", startDate: "2026-10-25", endDate: "2026-11-30", departureTime: "12:20", arrivalTime: "13:10" },
      { flight: "JAL2331", startDate: "2026-12-01", endDate: "2026-12-17", departureTime: "12:30", arrivalTime: "13:20" },
      { flight: "JAL2331", startDate: "2026-12-18", endDate: "2027-01-04", departureTime: "11:55", arrivalTime: "12:45" },
      { flight: "JAL2331", startDate: "2027-01-05", endDate: "2027-01-31", departureTime: "12:30", arrivalTime: "13:20" },
      { flight: "JAL2331", startDate: "2027-02-01", endDate: "2027-02-28", departureTime: "13:35", arrivalTime: "14:25" },
      { flight: "JAL2331", startDate: "2027-03-01", endDate: "2027-03-27", departureTime: "13:50", arrivalTime: "14:35" },
      { flight: "JAL2332", startDate: "2026-10-25", endDate: "2026-11-30", departureTime: "13:40", arrivalTime: "14:20" },
      { flight: "JAL2332", startDate: "2026-12-01", endDate: "2026-12-17", departureTime: "13:50", arrivalTime: "14:30" },
      { flight: "JAL2332", startDate: "2026-12-18", endDate: "2027-01-04", departureTime: "13:15", arrivalTime: "13:55" },
      { flight: "JAL2332", startDate: "2027-01-05", endDate: "2027-01-31", departureTime: "13:50", arrivalTime: "14:30" },
      { flight: "JAL2332", startDate: "2027-02-01", endDate: "2027-02-28", departureTime: "14:55", arrivalTime: "15:35" },
      { flight: "JAL2332", startDate: "2027-03-01", endDate: "2027-03-27", departureTime: "15:05", arrivalTime: "15:45" },
    ]);
  });

  it("出雲線の現行ダイヤを冬ダイヤ終了日まで継続する", () => {
    const izumoTrips = publishedTrips.filter((trip) => trip.name === "JAL_OKI_IZUMO");

    expect(izumoTrips).toEqual([
      expect.objectContaining({
        vehicle_id: "JAL3433",
        start_date: "2026-06-01",
        end_date: "2027-03-27",
        departure_time: "09:00",
        arrival_time: "09:30",
      }),
      expect.objectContaining({
        vehicle_id: "JAL3434",
        start_date: "2026-06-01",
        end_date: "2027-03-27",
        departure_time: "10:00",
        arrival_time: "10:30",
      }),
    ]);
  });
});
