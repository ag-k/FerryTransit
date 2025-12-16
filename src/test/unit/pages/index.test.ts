import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { ref } from "vue";
import IndexPage from "@/pages/index.vue";

const mockFerryStore = {
  departure: ref(""),
  arrival: ref(""),
  selectedDate: ref(new Date("2024-01-01")),
  timetableData: ref([]),
  timetableLastUpdate: ref(new Date("2024-01-01T00:00:00")),
  alerts: ref([]),
  portMaps: {},
  setDeparture: vi.fn((value: string) => {
    mockFerryStore.departure.value = value;
  }),
  setArrival: vi.fn((value: string) => {
    mockFerryStore.arrival.value = value;
  }),
  setSelectedDate: vi.fn((value: Date) => {
    mockFerryStore.selectedDate.value = value;
  }),
};

const mockHistoryStore = {
  addSearchHistory: vi.fn(),
};

const mockSettingsStore = {
  mapEnabled: ref(false),
  setMapEnabled: vi.fn((value: boolean) => {
    mockSettingsStore.mapEnabled.value = value;
  }),
};

const mockUseFerryData = {
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
          template: '<div data-test="timetable-form">TimetableForm</div>',
          props: [
            "departure",
            "arrival",
            "hondoPorts",
            "dozenPorts",
            "dogoPorts",
          ],
          emits: ["update:departure", "update:arrival", "reverse"],
        },
        FavoriteButton: {
          template: '<button data-test="favorite-button">Favorite</button>',
        },
        FerryMap: {
          template: '<div data-test="ferry-map">FerryMap</div>',
        },
        StatusAlerts: {
          template: '<div data-test="status-alerts">StatusAlerts</div>',
        },
        CommonShipModal: {
          template: '<div v-if="visible" data-test="ship-modal">Modal</div>',
          props: ["visible", "title", "type", "shipId", "content"],
          emits: ["update:visible"],
        },
        NuxtLink: {
          template: "<a><slot /></a>",
        },
      },
      config: {
        globalProperties: {
          $t: (key: string) => key,
        },
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
    mockUseFerryData.filteredTimetable.value = [];
    mockUseFerryData.isLoading.value = false;
    mockUseFerryData.error.value = null;
    mockRouter.push.mockReset();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("useHead", vi.fn());
    vi.stubGlobal("useNuxtApp", () => ({
      $i18n: {
        t: (key: string) => key,
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
    it("欠航アイコンをクリックすると運航状況ページへ遷移する", async () => {
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
      ];

      const wrapper = mountIndexPage();
      await flushPromises();

      const icon = wrapper.find('[data-test="cancel-status-icon"]');
      expect(icon.exists()).toBe(true);

      await icon.trigger("click");
      expect(mockRouter.push).toHaveBeenCalledWith({ path: "/status" });
    });
  });
});
