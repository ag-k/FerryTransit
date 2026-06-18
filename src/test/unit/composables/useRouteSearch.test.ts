import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useRouteSearch } from "@/composables/useRouteSearch";
import { useFerryStore } from "@/stores/ferry";
import { mockTrips } from "@/test/mocks/mockData";
import { clearBusSearchFeedCacheForTests } from "@/utils/gtfsBusTimetable";

const storageDataUrl = (path: string): string => {
  return `https://firebasestorage.googleapis.com/v0/b/test-bucket/o/${encodeURIComponent(path)}?alt=media`;
};

// Mock useFerryData
const mockGetTripStatus = vi.fn(() => 0);
vi.mock("@/composables/useFerryData", () => ({
  useFerryData: () => ({
    getTripStatus: mockGetTripStatus,
    initializeData: vi.fn(),
  }),
}));

// Mock useHolidayCalendar
vi.mock("@/composables/useHolidayCalendar", () => ({
  useHolidayCalendar: () => ({}),
}));

// Mock useTimetableLoader
vi.mock("@/composables/useTimetableLoader", () => ({
  useTimetableLoader: () => ({
    ensureTimetableLoaded: vi.fn(),
  }),
}));

// Mock useFareStore
vi.mock("@/stores/fare", () => ({
  useFareStore: () => ({
    fareMaster: {
      routes: [
        {
          id: "hondo-shichirui-saigo",
          departure: "HONDO_SHICHIRUI",
          arrival: "SAIGO",
          fares: {
            adult: 3520,
            child: 1760,
            vehicle: {
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
              over12mPer1m: 5070,
            },
          },
        },
        {
          id: "hondo-shichirui-beppu",
          departure: "HONDO_SHICHIRUI",
          arrival: "BEPPU",
          fares: { adult: 6680, child: 3340 },
        },
        {
          id: "beppu-hishiura",
          departure: "BEPPU",
          arrival: "HISHIURA",
          fares: { adult: 410, child: 205 },
        },
        {
          id: "beppu-kuri",
          departure: "BEPPU",
          arrival: "KURI",
          fares: { adult: 780, child: 390 },
        },
        {
          id: "saigo-hishiura",
          departure: "SAIGO",
          arrival: "HISHIURA",
          fares: { adult: 1540, child: 770 },
        },
        {
          id: "hondo-shichirui-kuri",
          departure: "HONDO_SHICHIRUI",
          arrival: "KURI",
          fares: { adult: 3520, child: 1760 },
        },
      ],
      innerIslandFare: {
        adult: 300,
        child: 100,
      },
      innerIslandVehicleFare: {
        under5m: 1000,
        under7m: 2000,
        under10m: 3000,
        over10m: 3000,
      },
    },
    isLoading: { value: false },
    error: { value: null },
    getFareByRoute: vi.fn((departure, arrival, options) => {
      const routes = [
        {
          id: "hondo-shichirui-saigo",
          departure: "HONDO_SHICHIRUI",
          arrival: "SAIGO",
          fares: {
            adult: 3520,
            child: 1760,
            vehicle: {
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
              over12mPer1m: 5070,
            },
          },
        },
        {
          id: "hondo-saigo",
          departure: "HONDO",
          arrival: "SAIGO",
          fares: { adult: 3520, child: 1760 },
        },
        {
          id: "hondo-shichirui-beppu",
          departure: "HONDO_SHICHIRUI",
          arrival: "BEPPU",
          fares: { adult: 6680, child: 3340 },
        },
        {
          id: "beppu-hishiura",
          departure: "BEPPU",
          arrival: "HISHIURA",
          fares: { adult: 410, child: 205 },
        },
        {
          id: "beppu-kuri",
          departure: "BEPPU",
          arrival: "KURI",
          fares: { adult: 780, child: 390 },
        },
        {
          id: "saigo-hishiura",
          departure: "SAIGO",
          arrival: "HISHIURA",
          fares: { adult: 1540, child: 770 },
        },
        {
          id: "hishiura-saigo",
          departure: "HISHIURA",
          arrival: "SAIGO",
          fares: { adult: 1540, child: 770 },
        },
        {
          id: "hondo-shichirui-kuri",
          departure: "HONDO_SHICHIRUI",
          arrival: "KURI",
          fares: { adult: 3520, child: 1760 },
        },
        {
          id: "hondo-kuri",
          departure: "HONDO",
          arrival: "KURI",
          fares: { adult: 3520, child: 1760 },
        },
      ];
      return routes.find(
        (r) => r.departure === departure && r.arrival === arrival
      );
    }),
    loadFareMaster: vi.fn(),
  }),
}));

// Mock useI18n - Create translation function
const translations: Record<string, string> = {
  MINUTES: "分",
  HOURS: "時間",
  HONDO: "本土",
};

const mockT = vi.fn((key: string) => translations[key] || key);

// Mock useI18n from #imports
vi.mock("#imports", async () => {
  const actual = await vi.importActual("#imports");
  const { ref } = await import("vue");

  return {
    ...actual,
    useI18n: vi.fn(() => ({
      locale: ref("ja"),
      t: mockT,
    })),
    onMounted: vi.fn((fn: () => void) => fn()),
  };
});

describe("useRouteSearch", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    clearBusSearchFeedCacheForTests();
  });

  describe("getPortDisplayName", () => {
    it("should resolve bus stop codes from ferry store location labels", () => {
      const store = useFerryStore();
      store.locationLabels = {
        BUS_AMA_100_01: "豊田",
      };

      const { getPortDisplayName } = useRouteSearch();

      expect(getPortDisplayName("BUS_AMA_100_01")).toBe("豊田");
    });
  });

  describe("searchRoutes", () => {
    it("should find direct routes", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      expect(results).toHaveLength(1);
      expect(results[0].segments).toHaveLength(1);
      expect(results[0].segments[0].departure).toBe("HONDO_SHICHIRUI");
      expect(results[0].segments[0].arrival).toBe("SAIGO");
      expect(results[0].transferCount).toBe(0);
    });

    it("should find direct air routes from Oki Airport", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 8000002,
          startDate: "2026-03-29",
          endDate: "2026-07-31",
          activeDays: [0, 1, 2, 3, 4, 5, 6],
          name: "JAL_OKI_ITAMI",
          mode: "AIR",
          operatorId: "JAL",
          serviceId: "jal_oki_itami_20260329_20260731",
          vehicleId: "JAL2332",
          departure: "AIRPORT_OKI",
          departureType: "AIRPORT",
          departureTime: "15:05",
          arrival: "AIRPORT_ITAMI",
          arrivalType: "AIRPORT",
          arrivalTime: "15:45",
          status: 0,
        },
      ] as any;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "AIRPORT_OKI",
        "AIRPORT_ITAMI",
        new Date("2026-06-08T00:00:00+09:00"),
        "14:00",
        false
      );

      expect(results).toHaveLength(1);
      expect(results[0].segments).toHaveLength(1);
      expect(results[0].segments[0]).toMatchObject({
        ship: "JAL_OKI_ITAMI",
        mode: "AIR",
        vehicleId: "JAL2332",
        flightNumber: "JAL2332",
        departure: "AIRPORT_OKI",
        departureType: "AIRPORT",
        arrival: "AIRPORT_ITAMI",
        arrivalType: "AIRPORT",
      });
      expect(results[0].segments[0].fare).toBe(0);
      expect(results[0].transferCount).toBe(0);
    });

    it("should load only the selected bus feed and create direct bus candidates on demand", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;
      store.locationLabels = {
        BUS_AMA_100_01: "豊田",
        BUS_AMA_126_01: "隠岐汽船乗り場",
      };

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              version: 1,
              feedId: "ama",
              generatedAt: "2026-05-25T00:00:00.000Z",
              operatorId: "AMA_TOWN",
              townLabelKey: "AMA_CHO",
              tripName: "AMA_TOWN_BUS",
              fare: 200,
              routes: {
                R8_AMA: {
                  agencyId: "",
                  shortName: "",
                  longName: "海士島線1",
                },
              },
              stops: [
                ["BUS_AMA_100_01", "豊田", 36.105471, 133.125968],
                ["BUS_AMA_100_02", "隠岐神社前", 36.097104, 133.098744],
                ["BUS_AMA_126_01", "隠岐汽船乗り場", 36.105058, 133.076744],
              ],
              services: {
                svc_daily: {
                  startDate: "2026-01-01",
                  endDate: "2026-12-31",
                  activeDays: [0, 1, 2, 3, 4, 5, 6],
                  addedDates: [],
                  removedDates: [],
                },
              },
              trips: [
                {
                  tripId: "trip_1",
                  routeId: "R8_AMA",
                  serviceId: "svc_daily",
                  headsign: "隠岐汽船乗り場",
                  shortName: "",
                  stops: [
                    ["BUS_AMA_100_01", "15:00", "15:00"],
                    ["BUS_AMA_100_02", "15:12", "15:12"],
                    ["BUS_AMA_126_01", "15:28", "15:28"],
                  ],
                },
              ],
              departuresByStop: {
                BUS_AMA_100_01: [[0, 0]],
                BUS_AMA_100_02: [[0, 1]],
              },
            }),
        } as Response)
      );
      vi.stubGlobal("fetch", fetchMock);

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "BUS_AMA_100_01",
        "BUS_AMA_126_01",
        new Date("2026-05-25"),
        "14:00",
        false
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(storageDataUrl("data/bus-search/ama.json"));
      expect(store.timetableData.some((trip) => trip.mode === "BUS")).toBe(false);
      expect(results).toHaveLength(1);
      expect(results[0]?.segments[0]).toMatchObject({
        ship: "AMA_TOWN_BUS",
        mode: "BUS",
        departure: "BUS_AMA_100_01",
        arrival: "BUS_AMA_126_01",
        fare: 200,
      });
    });

    it("should find a same-feed bus route with one transfer when no direct bus exists", async () => {
      const store = useFerryStore();
      store.timetableData = [];
      store.locationLabels = {
        BUS_NISHINOSHIMA_nishinoshima_005: "島前病院",
        BUS_NISHINOSHIMA_nishinoshima_020: "浦郷",
        BUS_NISHINOSHIMA_nishinoshima_026: "波止",
      };

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              version: 1,
              feedId: "nishinoshima",
              generatedAt: "2026-06-09T00:00:00.000Z",
              operatorId: "NISHINOSHIMA_TOWN",
              townLabelKey: "NISHINOSHIMA_CHO",
              tripName: "NISHINOSHIMA_TOWN_BUS",
              fare: 200,
              routes: {
                NISHINOSHIMA_MAIN: {
                  agencyId: "NISHINOSHIMA_TOWN",
                  shortName: "町営バス",
                  longName: "西ノ島町営バス",
                },
                NISHINOSHIMA_HATO: {
                  agencyId: "NISHINOSHIMA_TOWN",
                  shortName: "波止線",
                  longName: "西ノ島町営バス 波止線",
                },
              },
              stops: [
                ["BUS_NISHINOSHIMA_nishinoshima_005", "島前病院", 36.106629, 133.036793],
                ["BUS_NISHINOSHIMA_nishinoshima_020", "浦郷", 36.09273782, 132.99520533],
                ["BUS_NISHINOSHIMA_nishinoshima_026", "波止", 36.07446789, 133.01485121],
              ],
              services: {
                daily: {
                  startDate: "2026-01-01",
                  endDate: "2026-12-31",
                  activeDays: [0, 1, 2, 3, 4, 5, 6],
                  addedDates: [],
                  removedDates: [],
                },
              },
              trips: [
                {
                  tripId: "B04_MAIN_0837",
                  routeId: "NISHINOSHIMA_MAIN",
                  serviceId: "daily",
                  headsign: "赤ノ江",
                  shortName: "2便",
                  stops: [
                    ["BUS_NISHINOSHIMA_nishinoshima_005", "08:37", "08:37"],
                    ["BUS_NISHINOSHIMA_nishinoshima_020", "09:01", "09:01"],
                  ],
                },
                {
                  tripId: "H02_HATO_1130",
                  routeId: "NISHINOSHIMA_HATO",
                  serviceId: "daily",
                  headsign: "島前病院",
                  shortName: "波止線 2便",
                  stops: [
                    ["BUS_NISHINOSHIMA_nishinoshima_020", "11:34", "11:34"],
                    ["BUS_NISHINOSHIMA_nishinoshima_026", "11:46", "11:46"],
                  ],
                },
              ],
              departuresByStop: {
                BUS_NISHINOSHIMA_nishinoshima_005: [[0, 0]],
                BUS_NISHINOSHIMA_nishinoshima_020: [[1, 0]],
              },
            }),
        } as Response)
      );
      vi.stubGlobal("fetch", fetchMock);

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "BUS_NISHINOSHIMA_nishinoshima_005",
        "BUS_NISHINOSHIMA_nishinoshima_026",
        new Date("2026-06-09"),
        "08:00",
        false
      );

      const transferRoute = results.find(route =>
        route.segments.map(segment => `${segment.departure}->${segment.arrival}`).join("|") ===
        "BUS_NISHINOSHIMA_nishinoshima_005->BUS_NISHINOSHIMA_nishinoshima_020|BUS_NISHINOSHIMA_nishinoshima_020->BUS_NISHINOSHIMA_nishinoshima_026"
      );
      expect(transferRoute).toBeDefined();
      expect(transferRoute?.transferCount).toBe(1);
      expect(transferRoute?.segments).toHaveLength(2);
      expect(transferRoute?.segments[0]).toMatchObject({
        ship: "NISHINOSHIMA_TOWN_BUS",
        mode: "BUS",
        departure: "BUS_NISHINOSHIMA_nishinoshima_005",
        arrival: "BUS_NISHINOSHIMA_nishinoshima_020",
        fare: 200,
      });
      expect(transferRoute?.segments[1]).toMatchObject({
        ship: "NISHINOSHIMA_TOWN_BUS",
        mode: "BUS",
        departure: "BUS_NISHINOSHIMA_nishinoshima_020",
        arrival: "BUS_NISHINOSHIMA_nishinoshima_026",
        fare: 200,
      });
    });

    it("should connect a port-badged bus stop to ferries via a walking segment", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 2001,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          name: "FERRY_DOZEN",
          departure: "HISHIURA",
          departureTime: "08:30:00" as any,
          arrival: "SAIGO",
          arrivalTime: "09:30:00" as any,
          status: 0,
        },
      ];
      store.locationLabels = {
        BUS_AMA_100_01: "豊田",
        BUS_AMA_126_01: "隠岐汽船乗り場",
        HISHIURA: "菱浦",
        SAIGO: "西郷",
      };

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              version: 1,
              feedId: "ama",
              generatedAt: "2026-05-25T00:00:00.000Z",
              operatorId: "AMA_TOWN",
              townLabelKey: "AMA_CHO",
              tripName: "AMA_TOWN_BUS",
              fare: 200,
              routes: {
                R8_AMA: {
                  agencyId: "",
                  shortName: "",
                  longName: "海士島線1",
                },
              },
              stops: [
                ["BUS_AMA_100_01", "豊田", 36.105471, 133.125968],
                ["BUS_AMA_126_01", "隠岐汽船乗り場", 36.105058, 133.076744],
              ],
              services: {
                svc_daily: {
                  startDate: "2026-01-01",
                  endDate: "2026-12-31",
                  activeDays: [0, 1, 2, 3, 4, 5, 6],
                  addedDates: [],
                  removedDates: [],
                },
              },
              trips: [
                {
                  tripId: "trip_1",
                  routeId: "R8_AMA",
                  serviceId: "svc_daily",
                  headsign: "隠岐汽船乗り場",
                  shortName: "",
                  stops: [
                    ["BUS_AMA_100_01", "08:00", "08:00"],
                    ["BUS_AMA_126_01", "08:20", "08:20"],
                  ],
                },
              ],
              departuresByStop: {
                BUS_AMA_100_01: [[0, 0]],
              },
            }),
        } as Response)
      );
      vi.stubGlobal("fetch", fetchMock);

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "BUS_AMA_100_01",
        "SAIGO",
        new Date("2026-05-25"),
        "07:50",
        false
      );

      const intermodalRoute = results.find(route =>
        route.segments.map(segment => segment.mode).join(">") === "BUS>WALK>FERRY"
      );
      expect(intermodalRoute).toBeDefined();
      expect(intermodalRoute?.segments.map(segment => [segment.departure, segment.arrival])).toEqual([
        ["BUS_AMA_100_01", "BUS_AMA_126_01"],
        ["BUS_AMA_126_01", "HISHIURA"],
        ["HISHIURA", "SAIGO"],
      ]);
      expect(intermodalRoute?.segments[1]).toMatchObject({
        ship: "WALK",
        mode: "WALK",
        fare: 0,
        passengerFare: 0,
      });
      expect(intermodalRoute?.totalFare).toBe(500);
    });

    it("should connect mainland Ichibata bus stops to ferries via Shichirui port", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 4001,
          startDate: "2026-04-01",
          endDate: "2026-12-31",
          name: "FERRY_OKI",
          departure: "HONDO_SHICHIRUI",
          departureTime: "09:00:00" as any,
          arrival: "SAIGO",
          arrivalTime: "11:25:00" as any,
          status: 0,
        },
      ];
      store.locationLabels = {
        BUS_ICHIBATA_CONNECTION_matsue_station: "松江駅",
        BUS_ICHIBATA_CONNECTION_shichirui_port: "七類港",
        HONDO_SHICHIRUI: "七類港",
        SAIGO: "西郷港",
      };

      const ichibataFeed = {
        version: 1,
        feedId: "ichibata_bus_connection",
        generatedAt: "2026-06-06T00:00:00.000Z",
        operatorId: "ICHIBATA_BUS",
        townLabelKey: "MAINLAND",
        tripName: "ICHIBATA_BUS_CONNECTION",
        fare: 1200,
        routes: {
          route_ichibata_bus_connection_https_bus_ichibata_8927b51c: {
            agencyId: "agency_ichibata_bus_connection_a97e48aa",
            shortName: "松江・七類・境港間時刻表",
            longName: "一畑バス・隠岐汽船接続バス",
          },
        },
        stops: [
          ["BUS_ICHIBATA_CONNECTION_matsue_station", "松江駅", 35.464361, 133.06285],
          ["BUS_ICHIBATA_CONNECTION_shichirui_port", "七類港", 35.571133, 133.230021],
        ],
        services: {
          service_shichirui_daily: {
            startDate: "2026-04-01",
            endDate: "2026-12-31",
            activeDays: [0, 1, 2, 3, 4, 5, 6],
            addedDates: [],
            removedDates: [],
          },
        },
        trips: [
          {
            tripId: "ICHIBATA_SHICHIRUI_0750",
            routeId: "route_ichibata_bus_connection_https_bus_ichibata_8927b51c",
            serviceId: "service_shichirui_daily",
            headsign: "七類港",
            shortName: "松江⇔七類港",
            stops: [
              ["BUS_ICHIBATA_CONNECTION_matsue_station", "07:50", "07:50"],
              ["BUS_ICHIBATA_CONNECTION_shichirui_port", "08:30", "08:30"],
            ],
          },
        ],
        departuresByStop: {
          BUS_ICHIBATA_CONNECTION_matsue_station: [[0, 0]],
        },
      };

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(ichibataFeed),
        } as Response)
      );
      vi.stubGlobal("fetch", fetchMock);

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "BUS_ICHIBATA_CONNECTION_matsue_station",
        "SAIGO",
        new Date("2026-06-01"),
        "07:40",
        false
      );

      const intermodalRoute = results.find(route =>
        route.segments.map(segment => segment.mode).join(">") === "BUS>WALK>FERRY"
      );
      expect(intermodalRoute).toBeDefined();
      expect(intermodalRoute?.segments.map(segment => [segment.departure, segment.arrival])).toEqual([
        ["BUS_ICHIBATA_CONNECTION_matsue_station", "BUS_ICHIBATA_CONNECTION_shichirui_port"],
        ["BUS_ICHIBATA_CONNECTION_shichirui_port", "HONDO_SHICHIRUI"],
        ["HONDO_SHICHIRUI", "SAIGO"],
      ]);
      expect(intermodalRoute?.segments[0]).toMatchObject({
        ship: "ICHIBATA_BUS_CONNECTION",
        mode: "BUS",
        operatorId: "ICHIBATA_BUS",
        fare: 1200,
      });
      expect(intermodalRoute?.totalFare).toBe(4720);
    });

    it("should keep through Rainbow Jet legs as one ferry segment in intermodal routes", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 9001,
          nextId: 9002,
          startDate: "2026-04-01",
          endDate: "2026-12-31",
          name: "RAINBOWJET",
          departure: "HONDO_SHICHIRUI",
          departureTime: "16:50:00" as any,
          arrival: "SAIGO",
          arrivalTime: "17:59:00" as any,
          status: 0,
        },
        {
          tripId: 9002,
          nextId: 9003,
          startDate: "2026-04-01",
          endDate: "2026-12-31",
          name: "RAINBOWJET",
          departure: "SAIGO",
          departureTime: "18:05:00" as any,
          arrival: "HISHIURA",
          arrivalTime: "18:36:00" as any,
          status: 0,
        },
        {
          tripId: 9003,
          startDate: "2026-04-01",
          endDate: "2026-12-31",
          name: "RAINBOWJET",
          departure: "HISHIURA",
          departureTime: "18:39:00" as any,
          arrival: "BEPPU",
          arrivalTime: "18:49:00" as any,
          status: 0,
        },
      ];
      store.locationLabels = {
        BUS_ICHIBATA_CONNECTION_matsue_station: "松江駅",
        BUS_ICHIBATA_CONNECTION_shichirui_port: "七類港",
        HONDO_SHICHIRUI: "七類港",
        SAIGO: "西郷港",
        HISHIURA: "菱浦港",
        BEPPU: "別府港",
      };

      const ichibataFeed = {
        version: 1,
        feedId: "ichibata_bus_connection",
        generatedAt: "2026-06-06T00:00:00.000Z",
        operatorId: "ICHIBATA_BUS",
        townLabelKey: "MAINLAND",
        tripName: "ICHIBATA_BUS_CONNECTION",
        fare: 1200,
        routes: {
          route_ichibata_bus_connection_https_bus_ichibata_8927b51c: {
            agencyId: "agency_ichibata_bus_connection_a97e48aa",
            shortName: "松江・七類・境港間時刻表",
            longName: "一畑バス・隠岐汽船接続バス",
          },
        },
        stops: [
          ["BUS_ICHIBATA_CONNECTION_matsue_station", "松江駅", 35.464361, 133.06285],
          ["BUS_ICHIBATA_CONNECTION_shichirui_port", "七類港", 35.571133, 133.230021],
        ],
        services: {
          service_shichirui_daily: {
            startDate: "2026-04-01",
            endDate: "2026-12-31",
            activeDays: [0, 1, 2, 3, 4, 5, 6],
            addedDates: [],
            removedDates: [],
          },
        },
        trips: [
          {
            tripId: "ICHIBATA_SHICHIRUI_1540",
            routeId: "route_ichibata_bus_connection_https_bus_ichibata_8927b51c",
            serviceId: "service_shichirui_daily",
            headsign: "七類港",
            shortName: "松江⇔七類港",
            stops: [
              ["BUS_ICHIBATA_CONNECTION_matsue_station", "15:40", "15:40"],
              ["BUS_ICHIBATA_CONNECTION_shichirui_port", "16:20", "16:20"],
            ],
          },
        ],
        departuresByStop: {
          BUS_ICHIBATA_CONNECTION_matsue_station: [[0, 0]],
        },
      };

      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(ichibataFeed),
        } as Response)
      );
      vi.stubGlobal("fetch", fetchMock);

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "BUS_ICHIBATA_CONNECTION_matsue_station",
        "BEPPU",
        new Date("2026-05-11"),
        "15:30",
        false
      );

      const intermodalRoute = results.find(route =>
        route.segments.map(segment => segment.mode).join(">") === "BUS>WALK>FERRY"
      );
      expect(intermodalRoute).toBeDefined();
      expect(intermodalRoute?.segments.map(segment => [segment.departure, segment.arrival])).toEqual([
        ["BUS_ICHIBATA_CONNECTION_matsue_station", "BUS_ICHIBATA_CONNECTION_shichirui_port"],
        ["BUS_ICHIBATA_CONNECTION_shichirui_port", "HONDO_SHICHIRUI"],
        ["HONDO_SHICHIRUI", "BEPPU"],
      ]);
      expect(intermodalRoute?.segments[2]).toMatchObject({
        tripId: "9001-9002-9003",
        ship: "RAINBOWJET",
        departure: "HONDO_SHICHIRUI",
        arrival: "BEPPU",
        fare: 6680,
      });
      expect(intermodalRoute?.transferCount).toBe(2);
      expect(intermodalRoute?.totalFare).toBe(7880);
    });

    it("should complete intermodal routes that need a final bus leg after a ferry transfer", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 3001,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          name: "FERRY_DOZEN",
          departure: "BEPPU",
          departureTime: "12:35:00" as any,
          arrival: "HISHIURA",
          arrivalTime: "12:47:00" as any,
          status: 0,
        },
      ];
      store.locationLabels = {
        BUS_NISHINOSHIMA_nishinoshima_026: "波止",
        BUS_NISHINOSHIMA_nishinoshima_006: "隠岐汽船（別府港）",
        BUS_AMA_126_01: "隠岐汽船乗り場",
        BUS_AMA_125_01: "高校下",
        BEPPU: "別府",
        HISHIURA: "菱浦",
      };

      const nishinoshimaFeed = {
        version: 1,
        feedId: "nishinoshima",
        generatedAt: "2026-05-25T00:00:00.000Z",
        operatorId: "NISHINOSHIMA_TOWN",
        townLabelKey: "NISHINOSHIMA_CHO",
        tripName: "NISHINOSHIMA_TOWN_BUS",
        fare: 200,
        routes: {
          NISHINOSHIMA_HATO: {
            agencyId: "NISHINOSHIMA_TOWN",
            shortName: "波止線",
            longName: "西ノ島町営バス 波止線",
          },
        },
        stops: [
          ["BUS_NISHINOSHIMA_nishinoshima_026", "波止", 36.07446789, 133.01485121],
          ["BUS_NISHINOSHIMA_nishinoshima_006", "隠岐汽船（別府港）", 36.107525, 133.041615],
        ],
        services: {
          svc_daily: {
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            activeDays: [0, 1, 2, 3, 4, 5, 6],
            addedDates: [],
            removedDates: [],
          },
        },
        trips: [
          {
            tripId: "H02_HATO_1130",
            routeId: "NISHINOSHIMA_HATO",
            serviceId: "svc_daily",
            headsign: "隠岐汽船",
            shortName: "波止線",
            stops: [
              ["BUS_NISHINOSHIMA_nishinoshima_026", "11:46", "11:46"],
              ["BUS_NISHINOSHIMA_nishinoshima_006", "12:03", "12:03"],
            ],
          },
        ],
        departuresByStop: {
          BUS_NISHINOSHIMA_nishinoshima_026: [[0, 0]],
        },
      };

      const amaFeed = {
        version: 1,
        feedId: "ama",
        generatedAt: "2026-05-25T00:00:00.000Z",
        operatorId: "AMA_TOWN",
        townLabelKey: "AMA_CHO",
        tripName: "AMA_TOWN_BUS",
        fare: 200,
        routes: {
          "10": {
            agencyId: "AMA_TOWN",
            shortName: "",
            longName: "豊田線",
          },
        },
        stops: [
          ["BUS_AMA_126_01", "隠岐汽船乗り場", 36.105058, 133.076744],
          ["BUS_AMA_125_01", "高校下", 36.103221, 133.076587],
        ],
        services: {
          svc_daily: {
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            activeDays: [0, 1, 2, 3, 4, 5, 6],
            addedDates: [],
            removedDates: [],
          },
        },
        trips: [
          {
            tripId: "R8_10_R5_1325",
            routeId: "10",
            serviceId: "svc_daily",
            headsign: "豊田",
            shortName: "",
            stops: [
              ["BUS_AMA_126_01", "13:25", "13:25"],
              ["BUS_AMA_125_01", "13:26", "13:26"],
            ],
          },
        ],
        departuresByStop: {
          BUS_AMA_126_01: [[0, 0]],
        },
      };

      const fetchMock = vi.fn((path: string) => {
        const body = path.includes("nishinoshima") ? nishinoshimaFeed : amaFeed;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(body),
        } as Response);
      });
      vi.stubGlobal("fetch", fetchMock);

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "BUS_NISHINOSHIMA_nishinoshima_026",
        "BUS_AMA_125_01",
        new Date("2026-06-01"),
        "01:15",
        false
      );

      const route = results.find(result =>
        result.segments.map(segment => segment.mode).join(">") === "BUS>WALK>FERRY>WALK>BUS"
      );
      expect(route).toBeDefined();
      expect(route?.segments.map(segment => [segment.departure, segment.arrival])).toEqual([
        ["BUS_NISHINOSHIMA_nishinoshima_026", "BUS_NISHINOSHIMA_nishinoshima_006"],
        ["BUS_NISHINOSHIMA_nishinoshima_006", "BEPPU"],
        ["BEPPU", "HISHIURA"],
        ["HISHIURA", "BUS_AMA_126_01"],
        ["BUS_AMA_126_01", "BUS_AMA_125_01"],
      ]);
    });

    it("should apply live cancellation status only when the search date is today (JST)", async () => {
      vi.useFakeTimers();
      // 2024-01-15 12:00 JST
      vi.setSystemTime(new Date("2024-01-15T03:00:00.000Z"));

      mockGetTripStatus.mockReturnValue(2);

      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const todayResults = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-15T00:00:00+09:00"),
        "08:00",
        false
      );
      expect(todayResults).toHaveLength(1);
      expect(todayResults[0].segments[0].status).toBe(2);

      const nonTodayResults = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-16T00:00:00+09:00"),
        "08:00",
        false
      );
      expect(nonTodayResults).toHaveLength(1);
      expect(nonTodayResults[0].segments[0].status).toBe(0);

      vi.useRealTimers();
    });

    it("should find transfer routes", async () => {
      const store = useFerryStore();
      store.timetableData = [
        ...mockTrips,
        {
          tripId: 4,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_DOZEN",
          departure: "SAIGO",
          departureTime: "12:00:00" as any,
          arrival: "BEPPU",
          arrivalTime: "13:30:00" as any,
          status: 0,
          price: 1680,
        },
      ];

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "BEPPU",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // Should find transfer route via SAIGO
      const transferRoute = results.find((r) => r.transferCount === 1);
      expect(transferRoute).toBeDefined();
      expect(transferRoute!.segments).toHaveLength(2);
      expect(transferRoute!.segments[0].arrival).toBe("SAIGO");
      expect(transferRoute!.segments[1].departure).toBe("SAIGO");
    });

    it("should keep existing results when car boarding is off", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "SAIGO",
        "HONDO_SHICHIRUI",
        new Date("2024-01-15"),
        "13:00",
        false
      );

      expect(
        results.some((route) =>
          route.segments.some((segment) => segment.ship === "RAINBOWJET")
        )
      ).toBe(true);
    });

    it("should exclude non-vehicle vessels when car boarding is on", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 91,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "ISOKAZE",
          departure: "BEPPU",
          departureTime: "08:00:00" as any,
          arrival: "KURI",
          arrivalTime: "08:30:00" as any,
          status: 0,
        },
        {
          tripId: 92,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_DOZEN",
          departure: "BEPPU",
          departureTime: "09:00:00" as any,
          arrival: "KURI",
          arrivalTime: "09:30:00" as any,
          status: 0,
        },
      ];

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "BEPPU",
        "KURI",
        new Date("2024-01-15"),
        "00:00",
        false,
        true,
        5
      );

      const ships = results.flatMap((route) =>
        route.segments.map((segment) => segment.ship)
      );
      expect(results.length).toBeGreaterThan(0);
      expect(ships).not.toContain("ISOKAZE");
      expect(ships).not.toContain("RAINBOWJET");
    });

    it("should exclude transfer routes with any non-vehicle segment when car boarding is on", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 101,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_DOZEN",
          departure: "BEPPU",
          departureTime: "08:00:00" as any,
          arrival: "KURI",
          arrivalTime: "08:30:00" as any,
          status: 0,
        },
        {
          tripId: 102,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "ISOKAZE",
          departure: "KURI",
          departureTime: "09:00:00" as any,
          arrival: "HISHIURA",
          arrivalTime: "09:30:00" as any,
          status: 0,
        },
      ];

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "BEPPU",
        "HISHIURA",
        new Date("2024-01-15"),
        "00:00",
        false,
        true,
        5
      );

      expect(results).toHaveLength(0);
    });

    it("should use only vehicle fare for Oki Kisen ferry routes when car boarding is on", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-15"),
        "08:00",
        false,
        true,
        5
      );

      expect(results).toHaveLength(1);
      expect(results[0].totalFare).toBe(22870);
      expect(results[0].segments[0].fare).toBe(22870);
      expect(results[0].segments[0].passengerFare).toBe(3520);
      expect(results[0].segments[0].vehicleFare).toBe(22870);
    });

    it("should use only vehicle fare for Ferry Dozen routes when car boarding is on", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "BEPPU",
        "KURI",
        new Date("2024-01-15"),
        "00:00",
        false,
        true,
        5
      );

      const ferryDozenRoute = results.find((route) =>
        route.segments.some((segment) => segment.ship === "FERRY_DOZEN")
      );
      expect(ferryDozenRoute).toBeDefined();
      expect(ferryDozenRoute?.totalFare).toBe(1000);
      expect(ferryDozenRoute?.segments[0].fare).toBe(1000);
      expect(ferryDozenRoute?.segments[0].passengerFare).toBe(300);
      expect(ferryDozenRoute?.segments[0].vehicleFare).toBe(1000);
    });

    it("should keep only the transfer route with the shortest wait time when path and vessel sequence are the same", async () => {
      const store = useFerryStore();
      store.timetableData = [
        ...mockTrips,
        // SAIGO -> BEPPU (short wait after HONDO_SHICHIRUI -> SAIGO arrives at 11:25)
        {
          tripId: 40,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_DOZEN",
          departure: "SAIGO",
          departureTime: "12:00:00" as any,
          arrival: "BEPPU",
          arrivalTime: "13:30:00" as any,
          status: 0,
        },
        // SAIGO -> BEPPU (longer wait, same ship/ports)
        {
          tripId: 41,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_DOZEN",
          departure: "SAIGO",
          departureTime: "13:00:00" as any,
          arrival: "BEPPU",
          arrivalTime: "14:30:00" as any,
          status: 0,
        },
      ];

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "BEPPU",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      const transferRoutes = results.filter((r) => r.transferCount === 1);
      // Same (HONDO_SHICHIRUI->SAIGO@FERRY_OKI, SAIGO->BEPPU@FERRY_DOZEN) should be de-duplicated
      expect(transferRoutes).toHaveLength(1);
      expect(transferRoutes[0].segments[1].ship).toBe("FERRY_DOZEN");
      expect(transferRoutes[0].segments[1].departureTime.getHours()).toBe(12);
      expect(transferRoutes[0].segments[1].departureTime.getMinutes()).toBe(0);
    });

    it("should treat different vessel types as different routes (do not de-duplicate)", async () => {
      const store = useFerryStore();
      store.timetableData = [
        ...mockTrips,
        // SAIGO -> BEPPU with FERRY_DOZEN
        {
          tripId: 50,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_DOZEN",
          departure: "SAIGO",
          departureTime: "12:00:00" as any,
          arrival: "BEPPU",
          arrivalTime: "13:30:00" as any,
          status: 0,
        },
        // SAIGO -> BEPPU with a different ship (should be a separate route signature)
        {
          tripId: 51,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "SAIGO",
          departureTime: "12:10:00" as any,
          arrival: "BEPPU",
          arrivalTime: "13:40:00" as any,
          status: 0,
        },
      ];

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "BEPPU",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      const transferRoutes = results.filter((r) => r.transferCount === 1);
      expect(transferRoutes.length).toBeGreaterThanOrEqual(2);
      const ships = transferRoutes.map((r) => r.segments[1].ship).sort();
      expect(ships).toContain("FERRY_DOZEN");
      expect(ships).toContain("FERRY_SHIRASHIMA");
    });

    it("should not de-duplicate direct routes (different departure times should remain)", async () => {
      const store = useFerryStore();
      store.timetableData = [
        ...mockTrips,
        // Add another direct trip with same ports/ship but different time
        {
          tripId: 60,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_OKI",
          departure: "HONDO_SHICHIRUI",
          departureTime: "10:00:00" as any,
          arrival: "SAIGO",
          arrivalTime: "12:25:00" as any,
          status: 0,
        },
      ];

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      const directRoutes = results.filter((r) => r.transferCount === 0);
      // Expect both direct departures to remain
      expect(directRoutes.length).toBeGreaterThanOrEqual(2);
      const depHours = directRoutes.map((r) => r.departureTime.getHours());
      expect(depHours).toContain(9);
      expect(depHours).toContain(10);
    });

    it("should handle HONDO port mapping", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO", // Generic HONDO
        "SAIGO",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // Should find routes from both HONDO_SHICHIRUI and HONDO_SAKAIMINATO
      expect(results.length).toBeGreaterThan(0);
    });

    it("should filter by arrival time in arrival mode", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-15"),
        "12:00",
        true // Arrival mode
      );

      // Should only find trips arriving before 12:00
      expect(results).toHaveLength(1);
      expect(new Date(results[0].arrivalTime).getHours()).toBeLessThanOrEqual(
        12
      );
    });

    it("should include cancelled trips (match timetable behavior)", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          ...mockTrips[0],
          status: 2, // Cancelled
        },
      ];

      // Mock getTripStatus to return the status from the trip data
      mockGetTripStatus.mockImplementation((trip) => trip.status || 0);

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // When getTripStatus returns 2 (cancelled), the trip should be included with status=2
      expect(results).toHaveLength(1);
      expect(results[0].segments[0].status).toBe(2);

      // Reset mock
      mockGetTripStatus.mockReturnValue(0);
    });

    it("should exclude routes via mainland when traveling between islands (BUG-001)", async () => {
      const store = useFerryStore();
      // Set up routes including mainland detour
      store.timetableData = [
        // Direct route: SAIGO -> HISHIURA
        {
          tripId: 10,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_DOZEN",
          departure: "SAIGO",
          departureTime: "14:00:00" as any,
          arrival: "HISHIURA",
          arrivalTime: "15:00:00" as any,
          status: 0,
          price: 1680,
        },
        // Detour via mainland: SAIGO -> HONDO
        {
          tripId: 11,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_OKI",
          departure: "SAIGO",
          departureTime: "08:00:00" as any,
          arrival: "HONDO_SHICHIRUI",
          arrivalTime: "10:25:00" as any,
          status: 0,
          price: 3510,
        },
        // Detour via mainland: HONDO -> HISHIURA
        {
          tripId: 12,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_KUNIGA",
          departure: "HONDO_SHICHIRUI",
          departureTime: "11:00:00" as any,
          arrival: "HISHIURA",
          arrivalTime: "13:50:00" as any,
          status: 0,
          price: 3300,
        },
      ];

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "SAIGO",
        "HISHIURA",
        new Date("2024-01-15"),
        "07:00",
        false
      );

      // Should only find the direct route, not the mainland detour
      expect(results).toHaveLength(1);
      expect(results[0].segments).toHaveLength(1);
      expect(results[0].segments[0].departure).toBe("SAIGO");
      expect(results[0].segments[0].arrival).toBe("HISHIURA");
      expect(results[0].segments[0].ship).toBe("FERRY_DOZEN");

      // Verify no routes go through mainland
      const mainlandRoute = results.find((r) =>
        r.segments.some(
          (s) => s.departure.includes("HONDO") || s.arrival.includes("HONDO")
        )
      );
      expect(mainlandRoute).toBeUndefined();
    });

    it("should exclude trips with mainland port as via when departure and arrival are not mainland", async () => {
      const store = useFerryStore();

      // 来居発、境港経由、西郷行き（除外されるべき）
      const tripWithMainlandVia = {
        tripId: 100,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        name: "FERRY_OKI",
        departure: "KURI",
        departureTime: "08:00:00" as any,
        arrival: "SAIGO",
        arrivalTime: "10:00:00" as any,
        status: 0,
        via: "HONDO_SAKAIMINATO", // 本土の港が経由地
      };

      // 来居発、境港経由、境港行き（除外されない - 目的地が本土の港）
      const tripWithMainlandViaToMainland = {
        tripId: 101,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        name: "FERRY_OKI",
        departure: "KURI",
        departureTime: "08:00:00" as any,
        arrival: "HONDO_SAKAIMINATO",
        arrivalTime: "10:00:00" as any,
        status: 0,
        via: "HONDO_SAKAIMINATO", // 本土の港が経由地だが、目的地も本土の港
      };

      // 境港発、境港経由、西郷行き（除外されない - 出発地が本土の港）
      const tripWithMainlandViaFromMainland = {
        tripId: 102,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        name: "FERRY_OKI",
        departure: "HONDO_SAKAIMINATO",
        departureTime: "08:00:00" as any,
        arrival: "SAIGO",
        arrivalTime: "10:00:00" as any,
        status: 0,
        via: "HONDO_SAKAIMINATO", // 本土の港が経由地だが、出発地も本土の港
      };

      // 通常の便（経由地なし）
      const normalTrip = {
        tripId: 103,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        name: "FERRY_OKI",
        departure: "KURI",
        departureTime: "08:00:00" as any,
        arrival: "SAIGO",
        arrivalTime: "10:00:00" as any,
        status: 0,
      };

      store.timetableData = [
        tripWithMainlandVia,
        tripWithMainlandViaToMainland,
        tripWithMainlandViaFromMainland,
        normalTrip,
      ];

      const { searchRoutes } = useRouteSearch();

      // 来居 → 西郷の検索
      const results = await searchRoutes(
        "KURI",
        "SAIGO",
        new Date("2024-01-15"),
        "07:00",
        false
      );

      // 来居発、境港経由、西郷行きは除外される
      expect(
        results.find((r) => r.segments[0].tripId === "100")
      ).toBeUndefined();
      // 通常の便は含まれる
      expect(results.find((r) => r.segments[0].tripId === "103")).toBeDefined();

      // 来居 → 境港の検索
      const resultsToMainland = await searchRoutes(
        "KURI",
        "HONDO_SAKAIMINATO",
        new Date("2024-01-15"),
        "07:00",
        false
      );

      // 来居発、境港経由、境港行きは除外されない（目的地が本土の港）
      expect(
        resultsToMainland.find((r) => r.segments[0].tripId === "101")
      ).toBeDefined();

      // 境港 → 西郷の検索
      const resultsFromMainland = await searchRoutes(
        "HONDO_SAKAIMINATO",
        "SAIGO",
        new Date("2024-01-15"),
        "07:00",
        false
      );

      // 境港発、境港経由、西郷行きは除外されない（出発地が本土の港）
      expect(
        resultsFromMainland.find((r) => r.segments[0].tripId === "102")
      ).toBeDefined();
    });

    it("should include second leg when first leg goes via mainland (KURI -> SAIGO via HONDO_SAKAIMINATO -> KURI -> SAIGO)", async () => {
      const store = useFerryStore();

      // 来居 → 境港（第1便、本土の港を経由）
      const firstTrip = {
        tripId: 200,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        name: "FERRY_OKI",
        departure: "KURI",
        departureTime: "08:00:00" as any,
        arrival: "HONDO_SAKAIMINATO",
        arrivalTime: "10:00:00" as any,
        status: 0,
      };

      // 境港 → 来居（第2便、本土の港から出発）
      const secondTrip = {
        tripId: 201,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        name: "FERRY_OKI",
        departure: "HONDO_SAKAIMINATO",
        departureTime: "10:30:00" as any,
        arrival: "KURI",
        arrivalTime: "12:30:00" as any,
        status: 0,
      };

      // 来居 → 西郷（第3便、目的地に到達）
      const thirdTrip = {
        tripId: 202,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        name: "FERRY_OKI",
        departure: "KURI",
        departureTime: "13:00:00" as any,
        arrival: "SAIGO",
        arrivalTime: "15:00:00" as any,
        status: 0,
      };

      store.timetableData = [firstTrip, secondTrip, thirdTrip];

      const { searchRoutes } = useRouteSearch();

      // 来居 → 西郷の検索
      const results = await searchRoutes(
        "KURI",
        "SAIGO",
        new Date("2024-01-15"),
        "07:00",
        false
      );

      // 第3便（来居 → 西郷）が結果として含まれるべき
      // 直行便として検出される場合と、第2便以降の部分だけが結果として含まれる場合の両方を考慮
      const routeWithThirdTrip = results.find((r) =>
        r.segments.some((s) => s.tripId === "202" || s.tripId === "201-202")
      );
      expect(routeWithThirdTrip).toBeDefined();

      // 第2便以降（来居→西郷）の部分が結果として含まれる
      const segment = routeWithThirdTrip?.segments.find(
        (s) => s.departure === "KURI" && s.arrival === "SAIGO"
      );
      expect(segment).toBeDefined();
      expect(segment?.tripId).toBe("202");
    });

    it("should exclude SAIGO -> HONDO_SAKAIMINATO -> BEPPU routes (mainland is intermediate)", async () => {
      const store = useFerryStore();

      store.timetableData = [
        {
          tripId: 500,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_OKI",
          departure: "SAIGO",
          departureTime: "08:00:00" as any,
          arrival: "HONDO_SAKAIMINATO",
          arrivalTime: "10:00:00" as any,
          status: 0,
        },
        {
          tripId: 501,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_OKI",
          departure: "HONDO_SAKAIMINATO",
          departureTime: "10:30:00" as any,
          arrival: "BEPPU",
          arrivalTime: "13:00:00" as any,
          status: 0,
        },
      ];

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "SAIGO",
        "BEPPU",
        new Date("2024-01-15"),
        "07:00",
        false
      );

      expect(results).toHaveLength(0);
    });

    it("should include the resumed leg after returning to departure (KURI -> HONDO_SAKAIMINATO -> KURI -> BEPPU)", async () => {
      const store = useFerryStore();

      // KURI -> HONDO_SAKAIMINATO -> KURI -> BEPPU (FERRY_SHIRASHIMA のような nextId チェーン)
      store.timetableData = [
        {
          tripId: 600,
          nextId: 601,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "KURI",
          departureTime: "10:55:00" as any,
          arrival: "HONDO_SAKAIMINATO",
          arrivalTime: "13:20:00" as any,
          status: 0,
        },
        {
          tripId: 601,
          nextId: 602,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "HONDO_SAKAIMINATO",
          departureTime: "14:10:00" as any,
          arrival: "KURI",
          arrivalTime: "16:35:00" as any,
          status: 0,
        },
        {
          tripId: 602,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "KURI",
          departureTime: "16:40:00" as any,
          arrival: "BEPPU",
          arrivalTime: "17:10:00" as any,
          status: 0,
          // 直行検索からは落ちるが、「出発地へ戻った後の区間」としては表示したいケースを想定
          via: "HONDO_SAKAIMINATO",
        },
      ];

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "KURI",
        "BEPPU",
        new Date("2024-01-15"),
        "10:00",
        false
      );

      // 本土区間を含まない（2回目の KURI→BEPPU）を含める
      const resumed = results.find((r) =>
        r.segments.some((s) => s.departure === "KURI" && s.arrival === "BEPPU")
      );
      expect(resumed).toBeDefined();
      expect(
        resumed?.segments.some(
          (s) =>
            s.departure === "HONDO_SAKAIMINATO" ||
            s.arrival === "HONDO_SAKAIMINATO"
        )
      ).toBe(false);
    });

    it("should not apply live cancellation status to resumed leg on non-today searches (JST)", async () => {
      vi.useFakeTimers();
      // 2024-01-15 12:00 JST
      vi.setSystemTime(new Date("2024-01-15T03:00:00.000Z"));
      mockGetTripStatus.mockReturnValue(2);

      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 700,
          nextId: 701,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "KURI",
          departureTime: "10:55:00" as any,
          arrival: "HONDO_SAKAIMINATO",
          arrivalTime: "13:20:00" as any,
          status: 0,
        },
        {
          tripId: 701,
          nextId: 702,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "HONDO_SAKAIMINATO",
          departureTime: "14:10:00" as any,
          arrival: "KURI",
          arrivalTime: "16:35:00" as any,
          status: 0,
        },
        {
          tripId: 702,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "KURI",
          departureTime: "16:40:00" as any,
          arrival: "BEPPU",
          arrivalTime: "17:10:00" as any,
          status: 0,
          via: "HONDO_SAKAIMINATO",
        },
      ];

      const { searchRoutes } = useRouteSearch();
      const results = await searchRoutes(
        "KURI",
        "BEPPU",
        new Date("2024-01-16T00:00:00+09:00"),
        "10:00",
        false
      );

      const resumed = results.find((r) =>
        r.segments.some((s) => s.departure === "KURI" && s.arrival === "BEPPU")
      );
      expect(resumed).toBeDefined();

      const resumedSegment = resumed?.segments.find(
        (s) => s.departure === "KURI" && s.arrival === "BEPPU"
      );
      expect(resumedSegment?.status).toBe(0);

      vi.useRealTimers();
    });

    it("should chain next_id segments on the same ship without counting as transfers", async () => {
      const store = useFerryStore();
      store.timetableData = [
        {
          tripId: 1,
          startDate: "2025-08-01",
          endDate: "2025-10-31",
          name: "ISOKAZE",
          departure: "KURI",
          departureTime: "07:17",
          arrival: "HISHIURA",
          arrivalTime: "07:35",
          status: 0,
        },
        {
          tripId: 2,
          nextId: 3,
          startDate: "2025-08-01",
          endDate: "2025-10-31",
          name: "RAINBOWJET",
          departure: "HISHIURA",
          departureTime: "08:14",
          arrival: "SAIGO",
          arrivalTime: "08:45",
          status: 0,
        },
        {
          tripId: 3,
          startDate: "2025-08-01",
          endDate: "2025-10-31",
          name: "RAINBOWJET",
          departure: "SAIGO",
          departureTime: "08:54",
          arrival: "HONDO_SHICHIRUI",
          arrivalTime: "10:03",
          status: 0,
        },
      ];

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "KURI",
        "HONDO",
        new Date("2025-09-22"),
        "00:15",
        false
      );

      const transferRoute = results.find((r) => r.transferCount === 1);
      expect(transferRoute).toBeDefined();
      expect(transferRoute!.segments).toHaveLength(2);
      expect(transferRoute!.segments[0].ship).toBe("ISOKAZE");
      expect(transferRoute!.segments[0].arrival).toBe("HISHIURA");
      expect(transferRoute!.segments[1].ship).toBe("RAINBOWJET");
      expect(transferRoute!.segments[1].departure).toBe("HISHIURA");
      expect(transferRoute!.segments[1].arrival).toBe("HONDO_SHICHIRUI");
    });
  });

  describe("formatTime", () => {
    it("should format time correctly", () => {
      const { formatTime } = useRouteSearch();

      const date = new Date("2024-01-15T09:30:00");
      const formatted = formatTime(date);

      expect(formatted).toBe("09:30");
    });
  });

  describe("calculateDuration", () => {
    it("should calculate duration in minutes", () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { calculateDuration } = useRouteSearch();

      const start = new Date("2024-01-15T09:00:00");
      const end = new Date("2024-01-15T09:45:00");

      const duration = calculateDuration(start, end);

      // Check that duration calculation is correct (45 minutes)
      // Note: In test environment, i18n may return keys instead of translations
      expect(duration).toMatch(/45/);
      expect(duration).toMatch(/(分|MINUTES)/);
    });

    it("should calculate duration in hours and minutes", () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { calculateDuration } = useRouteSearch();

      const start = new Date("2024-01-15T09:00:00");
      const end = new Date("2024-01-15T11:25:00");

      const duration = calculateDuration(start, end);

      // Check that duration calculation is correct (2 hours 25 minutes)
      // Note: In test environment, i18n may return keys instead of translations
      expect(duration).toMatch(/2/);
      expect(duration).toMatch(/(時間|HOURS)/);
      expect(duration).toMatch(/25/);
      expect(duration).toMatch(/(分|MINUTES)/);
    });

    it('should format duration for English as "h/min" with spaces', () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      // Override mocked translations for this test only
      const prevMinutes = translations.MINUTES;
      const prevHours = translations.HOURS;
      translations.MINUTES = " min";
      translations.HOURS = " h ";

      const { calculateDuration } = useRouteSearch();
      const start = new Date("2024-01-15T09:00:00");
      const end = new Date("2024-01-15T11:25:00");

      const duration = calculateDuration(start, end);
      expect(duration).toBe("2 h 25 min");

      // Restore
      translations.MINUTES = prevMinutes;
      translations.HOURS = prevHours;
    });
  });

  describe("getPortDisplayName", () => {
    beforeEach(() => {
      const store = useFerryStore();
      // Set up mock port data
      store.ports = [
        {
          PORT_ID: "SAIGO",
          PLACE_NAME_JA: "西郷港",
          PLACE_NAME_EN: "Saigo",
          PLACE_ID: 1,
        } as any,
        {
          PORT_ID: "BEPPU",
          PLACE_NAME_JA: "別府港",
          PLACE_NAME_EN: "Beppu",
          PLACE_ID: 2,
        } as any,
        {
          PORT_ID: "HONDO_SHICHIRUI",
          PLACE_NAME_JA: "七類港",
          PLACE_NAME_EN: "Shichirui",
          PLACE_ID: 3,
        } as any,
        {
          PORT_ID: "HONDO_SAKAIMINATO",
          PLACE_NAME_JA: "境港",
          PLACE_NAME_EN: "Sakaiminato",
          PLACE_ID: 4,
        } as any,
      ];
    });

    it("should return port name from ferryStore", () => {
      const { getPortDisplayName } = useRouteSearch();

      expect(getPortDisplayName("SAIGO")).toBe("西郷港");
      expect(getPortDisplayName("BEPPU")).toBe("別府港");
    });

    it("should handle HONDO_SHICHIRUI port", () => {
      const { getPortDisplayName } = useRouteSearch();

      expect(getPortDisplayName("HONDO_SHICHIRUI")).toBe("七類港");
    });

    it("should handle special HONDO case", () => {
      const { getPortDisplayName } = useRouteSearch();

      // HONDO is a special legacy port ID that should be translated via i18n
      expect(getPortDisplayName("HONDO")).toBe("本土");
    });

    it("should return empty string for empty port", () => {
      const { getPortDisplayName } = useRouteSearch();

      expect(getPortDisplayName("")).toBe("");
    });
  });

  describe("fare calculation", () => {
    it("should calculate correct fares", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "SAIGO",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // Check ferry fare (uses fare master data)
      const ferryRoute = results.find(
        (r) => r.segments[0].ship === "FERRY_OKI"
      );
      expect(ferryRoute?.totalFare).toBe(3520);
    });

    it("should calculate correct fares for local ferry (ISOKAZE)", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "BEPPU",
        "HISHIURA",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // Check local ferry fare (should use inner island fare for BEPPU-HISHIURA)
      const localFerryRoute = results.find(
        (r) => r.segments[0].ship === "ISOKAZE"
      );
      expect(localFerryRoute?.totalFare).toBe(300); // Uses innerIslandFare
    });

    it("should calculate correct fares for local ferry (FERRY_DOZEN)", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "BEPPU",
        "KURI",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // Check local ferry fare (should use inner island fare for all local ferry routes)
      const localFerryRoute = results.find(
        (r) => r.segments[0].ship === "FERRY_DOZEN"
      );
      expect(localFerryRoute?.totalFare).toBe(300); // Uses innerIslandFare (300 yen) for all local ferry routes
    });

    it("should calculate correct fares for regular ferry (FERRY_SHIRASHIMA)", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "SAIGO",
        "HISHIURA",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // Check regular ferry fare (should use fare master data for SAIGO-HISHIURA)
      const ferryRoute = results.find(
        (r) => r.segments[0].ship === "FERRY_SHIRASHIMA"
      );
      expect(ferryRoute?.totalFare).toBe(1540); // From fare master data
    });

    it("should calculate correct fares for regular ferry (FERRY_KUNIGA)", async () => {
      const store = useFerryStore();
      store.timetableData = mockTrips;

      const { searchRoutes } = useRouteSearch();

      const results = await searchRoutes(
        "HONDO_SHICHIRUI",
        "KURI",
        new Date("2024-01-15"),
        "08:00",
        false
      );

      // Check regular ferry fare (should use fare master data for HONDO-KURI)
      const ferryRoute = results.find(
        (r) => r.segments[0].ship === "FERRY_KUNIGA"
      );
      expect(ferryRoute?.totalFare).toBe(3520); // From fare master data
    });
  });

  describe("内航船（フェリーどうぜん、いそかぜ）の料金計算", () => {
    const innerIslandFare = 300; // innerIslandFare.adult

    describe("ISOKAZE（いそかぜ）の料金計算", () => {
      it("BEPPU-HISHIURAルートでinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 100,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "BEPPU",
            departureTime: "08:00:00" as any,
            arrival: "HISHIURA",
            arrivalTime: "08:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "BEPPU",
          "HISHIURA",
          new Date("2024-01-15"),
          "08:00",
          false
        );

        const isokazeRoute = results.find(
          (r) => r.segments[0].ship === "ISOKAZE"
        );
        expect(isokazeRoute).toBeDefined();
        expect(isokazeRoute?.totalFare).toBe(innerIslandFare);
        expect(isokazeRoute?.segments[0].fare).toBe(innerIslandFare);
      });

      it("HISHIURA-BEPPUルート（逆方向）でinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 101,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "HISHIURA",
            departureTime: "09:00:00" as any,
            arrival: "BEPPU",
            arrivalTime: "09:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "HISHIURA",
          "BEPPU",
          new Date("2024-01-15"),
          "09:00",
          false
        );

        const isokazeRoute = results.find(
          (r) => r.segments[0].ship === "ISOKAZE"
        );
        expect(isokazeRoute).toBeDefined();
        expect(isokazeRoute?.totalFare).toBe(innerIslandFare);
        expect(isokazeRoute?.segments[0].fare).toBe(innerIslandFare);
      });

      it("BEPPU-KURIルートでinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 102,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "BEPPU",
            departureTime: "10:00:00" as any,
            arrival: "KURI",
            arrivalTime: "10:30:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "BEPPU",
          "KURI",
          new Date("2024-01-15"),
          "10:00",
          false
        );

        const isokazeRoute = results.find(
          (r) => r.segments[0].ship === "ISOKAZE"
        );
        expect(isokazeRoute).toBeDefined();
        expect(isokazeRoute?.totalFare).toBe(innerIslandFare);
        expect(isokazeRoute?.segments[0].fare).toBe(innerIslandFare);
      });

      it("HISHIURA-KURIルートでinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 103,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "HISHIURA",
            departureTime: "11:00:00" as any,
            arrival: "KURI",
            arrivalTime: "11:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "HISHIURA",
          "KURI",
          new Date("2024-01-15"),
          "11:00",
          false
        );

        const isokazeRoute = results.find(
          (r) => r.segments[0].ship === "ISOKAZE"
        );
        expect(isokazeRoute).toBeDefined();
        expect(isokazeRoute?.totalFare).toBe(innerIslandFare);
        expect(isokazeRoute?.segments[0].fare).toBe(innerIslandFare);
      });

      it("異なるルートでも同じ料金（innerIslandFare）を使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 104,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "BEPPU",
            departureTime: "08:00:00" as any,
            arrival: "HISHIURA",
            arrivalTime: "08:20:00" as any,
            status: 0,
          },
          {
            tripId: 105,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "BEPPU",
            departureTime: "10:00:00" as any,
            arrival: "KURI",
            arrivalTime: "10:30:00" as any,
            status: 0,
          },
          {
            tripId: 106,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "HISHIURA",
            departureTime: "11:00:00" as any,
            arrival: "KURI",
            arrivalTime: "11:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();

        // BEPPU-HISHIURA
        const results1 = await searchRoutes(
          "BEPPU",
          "HISHIURA",
          new Date("2024-01-15"),
          "08:00",
          false
        );
        const route1 = results1.find((r) => r.segments[0].ship === "ISOKAZE");

        // BEPPU-KURI
        const results2 = await searchRoutes(
          "BEPPU",
          "KURI",
          new Date("2024-01-15"),
          "10:00",
          false
        );
        const route2 = results2.find((r) => r.segments[0].ship === "ISOKAZE");

        // HISHIURA-KURI
        const results3 = await searchRoutes(
          "HISHIURA",
          "KURI",
          new Date("2024-01-15"),
          "11:00",
          false
        );
        const route3 = results3.find((r) => r.segments[0].ship === "ISOKAZE");

        // すべてのルートで同じ料金を使用すること
        expect(route1?.totalFare).toBe(innerIslandFare);
        expect(route2?.totalFare).toBe(innerIslandFare);
        expect(route3?.totalFare).toBe(innerIslandFare);
        expect(route1?.totalFare).toBe(route2?.totalFare);
        expect(route2?.totalFare).toBe(route3?.totalFare);
      });
    });

    describe("FERRY_DOZEN（フェリーどうぜん）の料金計算", () => {
      it("BEPPU-HISHIURAルートでinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 200,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_DOZEN",
            departure: "BEPPU",
            departureTime: "14:00:00" as any,
            arrival: "HISHIURA",
            arrivalTime: "14:25:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "BEPPU",
          "HISHIURA",
          new Date("2024-01-15"),
          "14:00",
          false
        );

        const ferryDozenRoute = results.find(
          (r) => r.segments[0].ship === "FERRY_DOZEN"
        );
        expect(ferryDozenRoute).toBeDefined();
        expect(ferryDozenRoute?.totalFare).toBe(innerIslandFare);
        expect(ferryDozenRoute?.segments[0].fare).toBe(innerIslandFare);
      });

      it("BEPPU-KURIルートでinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 201,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_DOZEN",
            departure: "BEPPU",
            departureTime: "15:00:00" as any,
            arrival: "KURI",
            arrivalTime: "15:30:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "BEPPU",
          "KURI",
          new Date("2024-01-15"),
          "15:00",
          false
        );

        const ferryDozenRoute = results.find(
          (r) => r.segments[0].ship === "FERRY_DOZEN"
        );
        expect(ferryDozenRoute).toBeDefined();
        expect(ferryDozenRoute?.totalFare).toBe(innerIslandFare);
        expect(ferryDozenRoute?.segments[0].fare).toBe(innerIslandFare);
      });

      it("HISHIURA-KURIルートでinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 202,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_DOZEN",
            departure: "HISHIURA",
            departureTime: "16:00:00" as any,
            arrival: "KURI",
            arrivalTime: "16:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "HISHIURA",
          "KURI",
          new Date("2024-01-15"),
          "16:00",
          false
        );

        const ferryDozenRoute = results.find(
          (r) => r.segments[0].ship === "FERRY_DOZEN"
        );
        expect(ferryDozenRoute).toBeDefined();
        expect(ferryDozenRoute?.totalFare).toBe(innerIslandFare);
        expect(ferryDozenRoute?.segments[0].fare).toBe(innerIslandFare);
      });

      it("異なるルートでも同じ料金（innerIslandFare）を使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 203,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_DOZEN",
            departure: "BEPPU",
            departureTime: "14:00:00" as any,
            arrival: "HISHIURA",
            arrivalTime: "14:25:00" as any,
            status: 0,
          },
          {
            tripId: 204,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_DOZEN",
            departure: "BEPPU",
            departureTime: "15:00:00" as any,
            arrival: "KURI",
            arrivalTime: "15:30:00" as any,
            status: 0,
          },
          {
            tripId: 205,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_DOZEN",
            departure: "HISHIURA",
            departureTime: "16:00:00" as any,
            arrival: "KURI",
            arrivalTime: "16:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();

        // BEPPU-HISHIURA
        const results1 = await searchRoutes(
          "BEPPU",
          "HISHIURA",
          new Date("2024-01-15"),
          "14:00",
          false
        );
        const route1 = results1.find(
          (r) => r.segments[0].ship === "FERRY_DOZEN"
        );

        // BEPPU-KURI
        const results2 = await searchRoutes(
          "BEPPU",
          "KURI",
          new Date("2024-01-15"),
          "15:00",
          false
        );
        const route2 = results2.find(
          (r) => r.segments[0].ship === "FERRY_DOZEN"
        );

        // HISHIURA-KURI
        const results3 = await searchRoutes(
          "HISHIURA",
          "KURI",
          new Date("2024-01-15"),
          "16:00",
          false
        );
        const route3 = results3.find(
          (r) => r.segments[0].ship === "FERRY_DOZEN"
        );

        // すべてのルートで同じ料金を使用すること
        expect(route1?.totalFare).toBe(innerIslandFare);
        expect(route2?.totalFare).toBe(innerIslandFare);
        expect(route3?.totalFare).toBe(innerIslandFare);
        expect(route1?.totalFare).toBe(route2?.totalFare);
        expect(route2?.totalFare).toBe(route3?.totalFare);
      });
    });

    describe("ISOKAZE_EXの料金計算", () => {
      it("ISOKAZE_EXでもinnerIslandFareを使用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 300,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE_EX",
            departure: "BEPPU",
            departureTime: "12:00:00" as any,
            arrival: "HISHIURA",
            arrivalTime: "12:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "BEPPU",
          "HISHIURA",
          new Date("2024-01-15"),
          "12:00",
          false
        );

        const isokazeExRoute = results.find(
          (r) => r.segments[0].ship === "ISOKAZE_EX"
        );
        expect(isokazeExRoute).toBeDefined();
        expect(isokazeExRoute?.totalFare).toBe(innerIslandFare);
        expect(isokazeExRoute?.segments[0].fare).toBe(innerIslandFare);
      });
    });

    describe("内航船の複数セグメント（乗換案内）での料金計算", () => {
      it("内航船同士の乗換で各セグメントにinnerIslandFareを適用すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 400,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "BEPPU",
            departureTime: "08:00:00" as any,
            arrival: "HISHIURA",
            arrivalTime: "08:20:00" as any,
            status: 0,
          },
          {
            tripId: 401,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_DOZEN",
            departure: "HISHIURA",
            departureTime: "09:00:00" as any,
            arrival: "KURI",
            arrivalTime: "09:20:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "BEPPU",
          "KURI",
          new Date("2024-01-15"),
          "08:00",
          false
        );

        // 乗換ルートを検索
        const transferRoute = results.find((r) => r.transferCount === 1);
        expect(transferRoute).toBeDefined();
        expect(transferRoute?.segments).toHaveLength(2);

        // 各セグメントでinnerIslandFareが適用されること
        expect(transferRoute?.segments[0].fare).toBe(innerIslandFare);
        expect(transferRoute?.segments[1].fare).toBe(innerIslandFare);

        // 合計料金は各セグメントの合計
        expect(transferRoute?.totalFare).toBe(innerIslandFare * 2);
      });

      it("内航船と通常フェリーの混在ルートで正しい料金を計算すること", async () => {
        const store = useFerryStore();
        store.timetableData = [
          {
            tripId: 500,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "ISOKAZE",
            departure: "BEPPU",
            departureTime: "08:00:00" as any,
            arrival: "HISHIURA",
            arrivalTime: "08:20:00" as any,
            status: 0,
          },
          {
            tripId: 501,
            startDate: "2024-01-01",
            endDate: "2024-12-31",
            name: "FERRY_SHIRASHIMA",
            departure: "HISHIURA",
            departureTime: "09:00:00" as any,
            arrival: "SAIGO",
            arrivalTime: "10:00:00" as any,
            status: 0,
          },
        ];

        const { searchRoutes } = useRouteSearch();
        const results = await searchRoutes(
          "BEPPU",
          "SAIGO",
          new Date("2024-01-15"),
          "08:00",
          false
        );

        // 乗換ルートを検索
        const transferRoute = results.find((r) => r.transferCount === 1);
        expect(transferRoute).toBeDefined();
        expect(transferRoute?.segments).toHaveLength(2);

        // 内航船セグメントはinnerIslandFare
        expect(transferRoute?.segments[0].ship).toBe("ISOKAZE");
        expect(transferRoute?.segments[0].fare).toBe(innerIslandFare);

        // 通常フェリーセグメントはfare masterから取得
        expect(transferRoute?.segments[1].ship).toBe("FERRY_SHIRASHIMA");
        expect(transferRoute?.segments[1].fare).toBe(1540); // From fare master

        // 合計料金は各セグメントの合計
        expect(transferRoute?.totalFare).toBe(innerIslandFare + 1540);
      });
    });
  });
});
