import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { ref } from "vue";
import IndexPage from "@/pages/index.vue";

const mockGtfsBusTimetable = vi.hoisted(() => ({
  getLocationTypeForCode: vi.fn((value?: string) => {
    if (typeof value === "string" && value.startsWith("BUS_")) return "STOP";
    if (typeof value === "string" && value.startsWith("AIRPORT_")) return "AIRPORT";
    return "PORT";
  }),
  loadBusTripsForRoute: vi.fn(),
}));

vi.mock("@/utils/gtfsBusTimetable", () => ({
  getLocationTypeForCode: mockGtfsBusTimetable.getLocationTypeForCode,
  loadBusTripsForRoute: mockGtfsBusTimetable.loadBusTripsForRoute,
}));

// index.vue は Nuxt の auto-import を明示 import（#imports）で参照するため、テスト側でも #imports をモックする
vi.mock("#imports", () => ({
  useHead: vi.fn(),
  useI18n: () => ({
    locale: { value: "ja" },
    t: (key: string) => key,
  }),
  useLocalePath: () => (path: string) => path,
  useRoute: () => (global as any).useRoute(),
  useRouter: () => (global as any).useRouter(),
}));

const mockFerryStore = {
  departure: ref(""),
  arrival: ref(""),
  selectedDate: ref(new Date("2024-01-01")),
  timetableData: ref([]),
  timetableLastUpdate: ref(new Date("2024-01-01T00:00:00")),
  alerts: ref([]),
  setDeparture: vi.fn((value: string) => {
    mockFerryStore.departure.value = value;
  }),
  setArrival: vi.fn((value: string) => {
    mockFerryStore.arrival.value = value;
  }),
  setSelectedDate: vi.fn((value: Date) => {
    mockFerryStore.selectedDate.value = value;
  }),
  getLocationLabel: vi.fn(() => null),
  busStopLocations: {},
};

const mockHistoryStore = {
  addSearchHistory: vi.fn(),
};

const mockFareStore = {
  fareMaster: null as any,
  getFareByRoute: vi.fn(),
  loadFareMaster: vi.fn().mockResolvedValue(undefined),
};

const mockSettingsStore = {
  mapEnabled: ref(false),
  setMapEnabled: vi.fn((value: boolean) => {
    mockSettingsStore.mapEnabled.value = value;
  }),
};

const mockUseFerryData = {
  timetableData: ref([]),
  filteredTimetable: ref([]),
  getTripStatus: vi.fn((trip: any) => trip.status ?? 0),
  selectedDate: ref(new Date("2024-01-01")),
  departure: ref(""),
  arrival: ref(""),
  isLoading: ref(false),
  error: ref(null),
  hondoPorts: ref([]),
  dozenPorts: ref([]),
  dogoPorts: ref([]),
  initializeData: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/stores/ferry", () => ({
  useFerryStore: () => mockFerryStore,
}));

vi.mock("@/stores/history", () => ({
  useHistoryStore: () => mockHistoryStore,
}));

vi.mock("@/stores/fare", () => ({
  useFareStore: () => mockFareStore,
}));

vi.mock("@/stores/settings", () => ({
  useSettingsStore: () => mockSettingsStore,
}));

vi.mock("@/composables/useFerryData", () => ({
  useFerryData: () => mockUseFerryData,
}));

const mockRouter = {
  push: vi.fn(),
};

// useRouterとuseRouteはグローバルにモックされているので、それを上書き
beforeEach(() => {
  // @ts-expect-error global useRouter
  global.useRouter = vi.fn(() => mockRouter);
  // @ts-expect-error global useRoute
  global.useRoute = vi.fn(() => ({
    path: "/",
    params: {},
    query: {},
  }));
});

const mountIndexPage = () =>
  mount(IndexPage, {
    global: {
      stubs: {
        ClientOnly: {
          template: "<div><slot /></div>",
        },
        TimetableForm: {
          name: "TimetableForm",
          template: '<div data-test="timetable-form">TimetableForm</div>',
          props: [
            "departure",
            "arrival",
            "hondoPorts",
            "dozenPorts",
            "dogoPorts",
            "allowedLocationType",
          ],
          emits: ["update:departure", "update:arrival", "reverse"],
        },
        FavoriteButton: {
          name: "FavoriteButton",
          template: '<button data-test="favorite-button">Favorite</button>',
          props: ["type", "route", "port"],
        },
        FerryMap: {
          template: '<div data-test="ferry-map" :data-transport-mode="transportMode" :data-bus-stop-count="busStops.length">FerryMap</div>',
          props: ["selectedPort", "selectedRoute", "transportMode", "busStops"],
        },
        StatusAlerts: {
          template: '<div data-test="status-alerts">StatusAlerts</div>',
        },
        Icon: {
          template: '<span data-test="mode-filter-icon" :data-name="name" aria-hidden="true" />',
          props: ["name"],
        },
        CommonShipModal: {
          name: "CommonShipModal",
          template: '<div v-if="visible" data-test="ship-modal" :data-ship-id="shipId">Modal</div>',
          props: ["visible", "title", "type", "shipId", "portId", "portZoom", "content"],
          emits: ["update:visible"],
        },
        NuxtLink: {
          template: "<a><slot /></a>",
        },
      },
      config: {
        globalProperties: {
          $t: (key: string) => key,
        } as any,
      },
    },
  });

describe("IndexPage (時刻表ページ)", () => {
  const originalProcessClient = Object.getOwnPropertyDescriptor(
    process,
    "client"
  );

  beforeEach(() => {
    setActivePinia(createPinia());
    mockFerryStore.departure.value = "";
    mockFerryStore.arrival.value = "";
    mockFerryStore.selectedDate.value = new Date("2024-01-01");
    mockUseFerryData.departure.value = "";
    mockUseFerryData.arrival.value = "";
    mockUseFerryData.selectedDate.value = new Date("2024-01-01");
    mockUseFerryData.timetableData.value = [];
    mockUseFerryData.filteredTimetable.value = [];
    mockUseFerryData.isLoading.value = false;
    mockUseFerryData.error.value = null;
    mockFerryStore.busStopLocations = {};
    mockFareStore.fareMaster = null;
    mockFareStore.getFareByRoute.mockReset();
    mockFareStore.loadFareMaster.mockResolvedValue(undefined);
    mockRouter.push.mockReset();
    vi.clearAllMocks();
    mockGtfsBusTimetable.getLocationTypeForCode.mockImplementation((value?: string) =>
      typeof value === "string" && value.startsWith("BUS_") ? "STOP" : "PORT"
    );
    mockGtfsBusTimetable.loadBusTripsForRoute.mockResolvedValue([]);
    vi.unstubAllGlobals();
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("useNuxtApp", () => ({
      $i18n: {
        t: (key: string) => key,
        locale: {
          value: "ja",
        },
      },
    }));
    // @ts-expect-error global useRouter
    global.useRouter = vi.fn(() => mockRouter);
    // @ts-expect-error global useRoute
    global.useRoute = vi.fn(() => ({
      path: "/",
      params: {},
      query: {},
    }));
    Object.defineProperty(process, "client", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    if (originalProcessClient) {
      Object.defineProperty(process, "client", originalProcessClient);
    } else {
      // @ts-expect-error delete helper prop
      delete process.client;
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("乗換を含むルートを検索ボタン", () => {
    it("出発地と到着地が選択されていない場合は表示しない", async () => {
      mockUseFerryData.departure.value = "";
      mockUseFerryData.arrival.value = "";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("出発地のみ選択されている場合は表示しない", async () => {
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("到着地のみ選択されている場合は表示しない", async () => {
      mockUseFerryData.departure.value = "";
      mockUseFerryData.arrival.value = "SAIGO";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("出発地と到着地が両方選択されている場合は表示する（島前3島以外）", async () => {
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(true);
      expect(button.text()).toContain("SEARCH_WITH_TRANSFER");
    });

    it("島前3島間（別府→菱浦）のルートでは表示しない", async () => {
      mockUseFerryData.departure.value = "BEPPU";
      mockUseFerryData.arrival.value = "HISHIURA";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("島前3島間（菱浦→別府）のルートでは表示しない", async () => {
      mockUseFerryData.departure.value = "HISHIURA";
      mockUseFerryData.arrival.value = "BEPPU";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("島前3島間（別府→来居）のルートでは表示しない", async () => {
      mockUseFerryData.departure.value = "BEPPU";
      mockUseFerryData.arrival.value = "KURI";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("島前3島間（来居→別府）のルートでは表示しない", async () => {
      mockUseFerryData.departure.value = "KURI";
      mockUseFerryData.arrival.value = "BEPPU";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("島前3島間（菱浦→来居）のルートでは表示しない", async () => {
      mockUseFerryData.departure.value = "HISHIURA";
      mockUseFerryData.arrival.value = "KURI";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("島前3島間（来居→菱浦）のルートでは表示しない", async () => {
      mockUseFerryData.departure.value = "KURI";
      mockUseFerryData.arrival.value = "HISHIURA";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(false);
    });

    it("島前から島後へのルートでは表示する", async () => {
      mockUseFerryData.departure.value = "BEPPU";
      mockUseFerryData.arrival.value = "SAIGO";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(true);
    });

    it("本土から島前へのルートでは表示する", async () => {
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "BEPPU";

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      expect(button.exists()).toBe(true);
    });

    it("ボタンをクリックすると乗換案内画面に遷移する", async () => {
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.selectedDate.value = new Date("2024-01-15");

      const wrapper = mountIndexPage();
      await flushPromises();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      await button.trigger("click");

      expect(mockRouter.push).toHaveBeenCalledWith({
        path: "/transit",
        query: {
          departure: "HONDO_SHICHIRUI",
          arrival: "SAIGO",
          date: "2024-01-15",
          time: "00:00",
        },
      });
    });

    it("車で乗船する条件を乗換案内画面に引き継ぐ", async () => {
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.selectedDate.value = new Date("2024-01-15");

      const wrapper = mountIndexPage();
      await flushPromises();
      const vm = wrapper.vm as typeof wrapper.vm & {
        withCar: boolean
        vehicleLengthMeters: number
      }
      vm.withCar = true;
      vm.vehicleLengthMeters = 7;
      await wrapper.vm.$nextTick();

      const button = wrapper.find('[data-test="transfer-search-button"]');
      await button.trigger("click");

      expect(mockRouter.push).toHaveBeenCalledWith({
        path: "/transit",
        query: {
          departure: "HONDO_SHICHIRUI",
          arrival: "SAIGO",
          date: "2024-01-15",
          time: "00:00",
          withCar: "1",
          vehicleLengthMeters: "7",
        },
      });
    });
  });

  describe("自動車乗船オプション", () => {
    it("トグルをONにすると車長セレクトを表示する", async () => {
      const wrapper = mountIndexPage();
      await flushPromises();

      expect(wrapper.find('[data-test="vehicle-length-select"]').exists()).toBe(false);

      const checkbox = wrapper.find('[data-test="with-car-toggle"] input[type="checkbox"]');
      expect(checkbox.exists()).toBe(true);
      await checkbox.setValue(true);

      expect(wrapper.find('[data-test="vehicle-length-select"]').exists()).toBe(true);
      expect((wrapper.find('[data-test="vehicle-length-select"]').element as HTMLSelectElement).value).toBe("5");
    });

    it("車条件の変更を時刻表履歴に保存する", async () => {
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.selectedDate.value = new Date("2024-01-15");

      const wrapper = mountIndexPage();
      await flushPromises();
      mockHistoryStore.addSearchHistory.mockClear();

      const checkbox = wrapper.find('[data-test="with-car-toggle"] input[type="checkbox"]');
      await checkbox.setValue(true);

      expect(mockHistoryStore.addSearchHistory).toHaveBeenLastCalledWith(expect.objectContaining({
        type: "timetable",
        departure: "HONDO_SHICHIRUI",
        arrival: "SAIGO",
        withCar: true,
        vehicleLengthMeters: 5,
      }));

      const select = wrapper.find('[data-test="vehicle-length-select"]');
      await select.setValue("7");

      expect(mockHistoryStore.addSearchHistory).toHaveBeenLastCalledWith(expect.objectContaining({
        type: "timetable",
        departure: "HONDO_SHICHIRUI",
        arrival: "SAIGO",
        withCar: true,
        vehicleLengthMeters: 7,
      }));
    });

    it("選択日の航路運賃から車長別の車両運賃を表示する", async () => {
      const selectedDate = new Date("2026-07-16T00:00:00+09:00");
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.selectedDate.value = selectedDate;
      mockUseFerryData.filteredTimetable.value = [{
        tripId: 1001,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        name: "FERRY_OKI",
        mode: "FERRY",
        departure: "HONDO_SHICHIRUI",
        departureTime: "09:00",
        arrival: "SAIGO",
        arrivalTime: "11:25",
        status: 0,
        price: 3870,
      }] as any;
      mockFareStore.fareMaster = { versions: [] };
      mockFareStore.getFareByRoute.mockReturnValue({
        id: "hondo_shichirui-saigo",
        departure: "HONDO_SHICHIRUI",
        arrival: "SAIGO",
        fares: {
          adult: 3870,
          child: 1940,
          vehicle: { under7m: 35530 },
        },
        vesselType: "ferry",
      });

      const wrapper = mountIndexPage();
      await flushPromises();
      const vm = wrapper.vm as typeof wrapper.vm & {
        withCar: boolean
        vehicleLengthMeters: number
      };
      vm.withCar = true;
      vm.vehicleLengthMeters = 7;
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("VEHICLE_FARE_WITH_DRIVER: ¥35,530");
      expect(mockFareStore.getFareByRoute).toHaveBeenCalledWith(
        "HONDO_SHICHIRUI",
        "SAIGO",
        { date: selectedDate, vesselType: "ferry" }
      );
      expect(wrapper.findComponent({ name: "FavoriteButton" }).props("route")).toEqual({
        departure: "HONDO_SHICHIRUI",
        arrival: "SAIGO",
        withCar: true,
        vehicleLengthMeters: 7,
      });
    });
  });

  describe("時刻表ヘッダーのサマリー表示", () => {
    it("出発日・出発地・目的地を表示する（未選択は '-'）", async () => {
      mockUseFerryData.selectedDate.value = new Date("2024-01-01");
      mockUseFerryData.departure.value = "";
      mockUseFerryData.arrival.value = "";

      const wrapper = mountIndexPage();
      await flushPromises();

      // タイトルは「日付+曜日」に置き換え
      const title = wrapper.find('[data-test="timetable-date-title"]');
      expect(title.exists()).toBe(true);
      expect(title.text()).toContain("2024-01-01(月)");

      const summary = wrapper.find('[data-test="timetable-summary"]');
      expect(summary.exists()).toBe(true);
      // 下段は「出発→目的地」のみ
      expect(summary.text()).toContain("-→-");
    });

    it("出発地・目的地が選択されている場合は港名（キー）を表示する", async () => {
      mockUseFerryData.selectedDate.value = new Date("2024-01-01");
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";

      const wrapper = mountIndexPage();
      await flushPromises();

      const title = wrapper.find('[data-test="timetable-date-title"]');
      expect(title.text()).toContain("2024-01-01(月)");

      const summary = wrapper.find('[data-test="timetable-summary"]');
      expect(summary.text()).toContain("HONDO_SHICHIRUI→SAIGO");
    });
  });

  describe("交通手段タブ", () => {
    it("時刻表データ取得前でも船・バス・飛行機のタブを表示する", async () => {
      mockUseFerryData.timetableData.value = [];
      mockUseFerryData.filteredTimetable.value = [];

      const wrapper = mountIndexPage();
      await flushPromises();

      const tablist = wrapper.find('[role="tablist"]');
      const tabs = wrapper.findAll('[role="tab"]');

      expect(wrapper.text()).not.toContain("UI.TRANSPORT_FILTER");
      expect(tablist.attributes("aria-label")).toBe("UI.TRANSPORT_FILTER");
      expect(tablist.classes()).toContain("w-full");
      expect(tabs.every(tab => tab.classes().includes("flex-1"))).toBe(true);
      expect(wrapper.findAll('[data-test="mode-filter-icon"]').map(icon => icon.attributes("data-name"))).toEqual([
        "mdi:ferry",
        "mdi:bus",
        "mdi:airplane",
      ]);
      expect(tabs.map(tab => tab.text())).toEqual([
        "FERRY",
        "BUS",
        "AIR",
      ]);
    });

    it("船・バス・飛行機を「すべて」なしの別タブで切り替える", async () => {
      mockUseFerryData.timetableData.value = [
        {
          tripId: 1,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_OKI",
          mode: "FERRY",
          departure: "HONDO_SHICHIRUI",
          departureTime: "09:00",
          arrival: "SAIGO",
          arrivalTime: "11:25",
          status: 0,
        },
        {
          tripId: 3000000,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "AMA_TOWN_BUS",
          mode: "BUS",
          departure: "BUS_AMA_100_01",
          departureTime: "08:00",
          arrival: "BUS_AMA_100_02",
          arrivalTime: "08:10",
          via: "豊田線",
          status: 0,
        },
        {
          tripId: 4000000,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "NISHINOSHIMA_TOWN_BUS",
          mode: "BUS",
          departure: "BUS_NISHINOSHIMA_nishinoshima_007",
          departureTime: "07:07",
          arrival: "BUS_NISHINOSHIMA_nishinoshima_001",
          arrivalTime: "07:17",
          via: "宇賀線",
          status: 0,
        },
        {
          tripId: 5000000,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "CHIBU_VILLAGE_BUS",
          mode: "BUS",
          departure: "BUS_CHIBU_kuri_naikosen",
          departureTime: "07:15",
          arrival: "BUS_CHIBU_nibu_bus",
          arrivalTime: "07:24",
          status: 0,
        },
        {
          tripId: 6000000,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "OKI_ICHIBATA_BUS",
          mode: "BUS",
          departure: "BUS_OKINOSHIMA_port_mae",
          departureTime: "08:29",
          arrival: "BUS_OKINOSHIMA_goka_branch",
          arrivalTime: "09:14",
          via: "五箇線",
          status: 0,
        },
        {
          tripId: 8000002,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "JAL_OKI_ITAMI",
          mode: "AIR",
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
      mockUseFerryData.filteredTimetable.value = mockUseFerryData.timetableData.value as any;

      const wrapper = mountIndexPage();
      await flushPromises();

      const tabs = wrapper.findAll('[role="tab"]');
      expect(tabs.map(tab => tab.text())).toEqual([
        "FERRY",
        "BUS",
        "AIR",
      ]);
      expect(wrapper.text()).toContain("FERRY_OKI");
      expect(wrapper.text()).not.toContain("海士町路線バス（豊田線）");

      expect(tabs[1]).toBeTruthy();
      await tabs[1]!.trigger("click");

      expect(wrapper.text()).toContain("海士町路線バス（豊田線）");
      expect(wrapper.text()).toContain("西ノ島町営バス（宇賀線）");
      expect(wrapper.text()).toContain("知夫村営バス");
      expect(wrapper.text()).toContain("隠岐一畑交通（五箇線）");
      expect(wrapper.text()).not.toContain("FERRY_OKI");
      expect(wrapper.text()).not.toContain("AMA_TOWN_BUS");
      expect(wrapper.text()).not.toContain("NISHINOSHIMA_TOWN_BUS");
      expect(wrapper.text()).not.toContain("CHIBU_VILLAGE_BUS");
      expect(wrapper.text()).not.toContain("OKI_ICHIBATA_BUS");
      expect(wrapper.find('[data-test="with-car-toggle"]').exists()).toBe(false);

      await tabs[2]!.trigger("click");
      expect(wrapper.text()).toContain("JAL_OKI_ITAMI");
      expect(wrapper.text()).toContain("SEGMENT.FLIGHT: JAL2332");
      expect(wrapper.text()).not.toContain("FERRY_OKI");
    });

    it("バスと航空の交通機関名から公式情報モーダルを開ける", async () => {
      mockUseFerryData.timetableData.value = [
        {
          tripId: 7000001,
          startDate: "2026-03-29",
          endDate: "2026-10-24",
          name: "OKI_AIRPORT_BUS",
          mode: "BUS",
          departure: "AIRPORT_OKI",
          departureTime: "14:50",
          arrival: "SAIGO",
          arrivalTime: "15:00",
          status: 0,
        },
        {
          tripId: 8000001,
          startDate: "2026-03-29",
          endDate: "2026-10-24",
          name: "JAL_OKI_ITAMI",
          mode: "AIR",
          vehicleId: "JAL2331",
          departure: "AIRPORT_ITAMI",
          departureTime: "13:45",
          arrival: "AIRPORT_OKI",
          arrivalTime: "14:35",
          status: 0,
        },
      ] as any;
      mockUseFerryData.filteredTimetable.value = mockUseFerryData.timetableData.value as any;

      const wrapper = mountIndexPage();
      await flushPromises();
      const tabs = wrapper.findAll('[role="tab"]');

      await tabs[1]!.trigger("click");
      await wrapper.find('[data-test="transport-details-link"]').trigger("click");
      expect(wrapper.find('[data-test="ship-modal"]').attributes("data-ship-id")).toBe("OKI_AIRPORT_BUS");

      await wrapper.findComponent({ name: "CommonShipModal" }).vm.$emit("update:visible", false);
      await tabs[2]!.trigger("click");
      await wrapper.find('[data-test="transport-details-link"]').trigger("click");
      expect(wrapper.find('[data-test="ship-modal"]').attributes("data-ship-id")).toBe("JAL_OKI_ITAMI");
    });

    it("停留所間の時刻表ではbus-searchの直行バス便を表示する", async () => {
      mockUseFerryData.selectedDate.value = new Date("2026-05-26T00:00:00+09:00");
      mockUseFerryData.departure.value = "BUS_AMA_115_01";
      mockUseFerryData.arrival.value = "BUS_AMA_102_01";
      mockUseFerryData.filteredTimetable.value = [];
      mockGtfsBusTimetable.loadBusTripsForRoute.mockResolvedValue([
        {
          tripId: 3016920,
          startDate: "2026-03-09",
          endDate: "2026-05-31",
          activeDays: [1, 2, 3, 4, 5],
          name: "AMA_TOWN_BUS",
          mode: "BUS",
          departure: "BUS_AMA_115_01",
          departureTime: "08:20",
          arrival: "BUS_AMA_102_01",
          arrivalTime: "08:30",
          status: 0,
          price: 200,
          via: "豊田線",
        },
      ]);

      const wrapper = mountIndexPage();
      await flushPromises();
      await flushPromises();

      expect(mockGtfsBusTimetable.loadBusTripsForRoute).toHaveBeenCalledWith(
        "BUS_AMA_115_01",
        "BUS_AMA_102_01",
        "2026-05-26"
      );
      expect(wrapper.text()).toContain("海士町路線バス（豊田線）");
      expect(wrapper.text()).toContain("08:20");
      expect(wrapper.text()).not.toContain("NO_MATCHING_TRIPS");
    });

    it("バス選択時は地図へバス停座標を渡す", async () => {
      mockFerryStore.busStopLocations = {
        BUS_AMA_100_01: {
          id: "BUS_AMA_100_01",
          name: "豊田",
          lat: 36.105471,
          lng: 133.125968,
          operatorId: "AMA_TOWN",
          townLabelKey: "AMA_CHO",
        },
      };

      const wrapper = mountIndexPage();
      await flushPromises();

      const tabs = wrapper.findAll('[role="tab"]');
      await tabs[1]!.trigger("click");
      await flushPromises();

      const map = wrapper.find('[data-test="ferry-map"]');
      expect(map.attributes("data-transport-mode")).toBe("BUS");
      expect(map.attributes("data-bus-stop-count")).toBe("1");
    });

    it("選択中のタブに応じて出発地・目的地の種別を切り替える", async () => {
      mockUseFerryData.timetableData.value = [];
      mockUseFerryData.filteredTimetable.value = [];

      const wrapper = mountIndexPage();
      await flushPromises();

      const form = () => wrapper.findComponent({ name: "TimetableForm" });
      expect(form().props("allowedLocationType")).toBe("PORT");

      const tabs = wrapper.findAll('[role="tab"]');
      expect(tabs[1]).toBeTruthy();
      await tabs[1]!.trigger("click");

      expect(form().props("allowedLocationType")).toBe("ALL");

      expect(tabs[2]).toBeTruthy();
      await tabs[2]!.trigger("click");

      expect(form().props("allowedLocationType")).toBe("AIRPORT");
    });

    it("既存の航空経路からバスへ切り替えて経路がクリアされてもバス選択を維持する", async () => {
      mockGtfsBusTimetable.getLocationTypeForCode.mockImplementation((value?: string) => {
        if (typeof value === "string" && value.startsWith("AIRPORT_")) return "AIRPORT";
        if (typeof value === "string" && value.startsWith("BUS_")) return "STOP";
        return "PORT";
      });
      mockFerryStore.departure.value = "AIRPORT_OKI";
      mockFerryStore.arrival.value = "AIRPORT_ITAMI";
      mockUseFerryData.departure.value = "AIRPORT_OKI";
      mockUseFerryData.arrival.value = "AIRPORT_ITAMI";

      const wrapper = mountIndexPage();
      await flushPromises();

      const tabs = wrapper.findAll('[role="tab"]');
      expect(tabs[2]!.attributes("aria-selected")).toBe("true");

      await tabs[1]!.trigger("click");
      await flushPromises();

      expect(mockFerryStore.setDeparture).toHaveBeenCalledWith("");
      expect(mockFerryStore.setArrival).toHaveBeenCalledWith("");
      expect(tabs[1]!.attributes("aria-selected")).toBe("true");
    });

    it("空港と港を結ぶ空港連絡バスの発着地とバスタブを保持する", async () => {
      mockGtfsBusTimetable.getLocationTypeForCode.mockImplementation((value?: string) => {
        if (typeof value === "string" && value.startsWith("AIRPORT_")) return "AIRPORT";
        if (typeof value === "string" && value.startsWith("BUS_")) return "STOP";
        return "PORT";
      });
      mockFerryStore.departure.value = "AIRPORT_OKI";
      mockFerryStore.arrival.value = "SAIGO";
      mockUseFerryData.departure.value = "AIRPORT_OKI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.filteredTimetable.value = [{
        tripId: 8100001,
        startDate: "2026-03-29",
        endDate: "2026-10-24",
        name: "OKI_AIRPORT_BUS",
        mode: "BUS",
        departure: "AIRPORT_OKI",
        departureTime: "14:50",
        arrival: "SAIGO",
        arrivalTime: "15:00",
        status: 0,
      }] as any;

      const wrapper = mountIndexPage();
      await flushPromises();

      const tabs = wrapper.findAll('[role="tab"]');
      expect(tabs[1]!.attributes("aria-selected")).toBe("true");
      expect(wrapper.findComponent({ name: "TimetableForm" }).props("allowedLocationType")).toBe("ALL");
      expect(mockFerryStore.setDeparture).not.toHaveBeenCalledWith("");
      expect(mockFerryStore.setArrival).not.toHaveBeenCalledWith("");
      expect(wrapper.text()).toContain("隠岐空港連絡バス");
      expect(wrapper.text()).toContain("14:50");
    });
  });

  describe("運航状態（欠航表示）の当日ガード", () => {
    it("当日以外の日付では欠航アイコンを表示しない（ライブ運航状況は反映しない）", async () => {
      vi.useFakeTimers();
      // 2024-01-01 12:00 JST
      vi.setSystemTime(new Date("2024-01-01T03:00:00.000Z"));

      // 検索日は翌日（非当日）
      const nonToday = new Date("2024-01-02T00:00:00+09:00");
      mockFerryStore.selectedDate.value = nonToday;
      mockUseFerryData.selectedDate.value = nonToday;

      // 出発地・到着地と時刻表データをセット（1件）
      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.filteredTimetable.value = [
        {
          tripId: 999,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_OKI",
          departure: "HONDO_SHICHIRUI",
          departureTime: "09:00:00" as any,
          arrival: "SAIGO",
          arrivalTime: "11:25:00" as any,
          status: 0,
          price: 3360,
        },
      ] as any;

      // 仮に getTripStatus が欠航(2)を返しても、非当日なので UI に反映されないこと
      mockUseFerryData.getTripStatus.mockReturnValue(2);

      const wrapper = mountIndexPage();
      await flushPromises();

      expect(wrapper.find('[data-test="cancel-status-icon"]').exists()).toBe(
        false
      );

      vi.useRealTimers();
    });

    it("当日では欠航アイコンを表示できる（ライブ運航状況を反映）", async () => {
      vi.useFakeTimers();
      // 2024-01-01 12:00 JST
      vi.setSystemTime(new Date("2024-01-01T03:00:00.000Z"));

      const today = new Date("2024-01-01T00:00:00+09:00");
      mockFerryStore.selectedDate.value = today;
      mockUseFerryData.selectedDate.value = today;

      mockUseFerryData.departure.value = "HONDO_SHICHIRUI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.filteredTimetable.value = [
        {
          tripId: 1000,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_OKI",
          departure: "HONDO_SHICHIRUI",
          departureTime: "09:00:00" as any,
          arrival: "SAIGO",
          arrivalTime: "11:25:00" as any,
          status: 0,
          price: 3360,
        },
      ] as any;

      mockUseFerryData.getTripStatus.mockReturnValue(2);

      const wrapper = mountIndexPage();
      await flushPromises();

      expect(wrapper.find('[data-test="cancel-status-icon"]').exists()).toBe(
        true
      );

      vi.useRealTimers();
    });
  });

  describe("欠航アイコン", () => {
    it("欠航アイコンをクリックすると運航状況モーダルが表示される", async () => {
      mockUseFerryData.departure.value = "KURI";
      mockUseFerryData.arrival.value = "SAIGO";
      mockUseFerryData.filteredTimetable.value = [
        {
          tripId: 1,
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          name: "FERRY_SHIRASHIMA",
          departure: "KURI",
          departureTime: "16:40:00",
          arrival: "SAIGO",
          arrivalTime: "18:35:00",
          status: 2,
        } as any,
      ] as any;

      const wrapper = mountIndexPage();
      await flushPromises();

      const icon = wrapper.find('[data-test="cancel-status-icon"]');
      expect(icon.exists()).toBe(true);

      // アイコンをクリックして運航状況モーダルが表示されることを確認
      await icon.trigger("click");
      // router.push は呼ばれない（モーダルで表示するため）
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });
});
