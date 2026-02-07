import { defineStore } from "pinia";
import { Capacitor } from "@capacitor/core";
import { useFirebaseStorage } from "@/composables/useFirebaseStorage";
import type { Trip, ShipStatus, FerryStatus, SightseeingStatus, ShipStatusStoreState } from "@/types";
import { createLogger } from "~/utils/logger";
import {
  formatDateYmdJst,
  getTodayJstMidnight,
  parseYmdAsJstMidnight,
  addDaysJst,
} from "@/utils/jstDate";

// Port and Ship interfaces
interface Port {
  PORT_ID: string;
  PLACE_NAME_JA: string;
  PLACE_NAME_EN: string;
  island_ja: string;
  island_en: string;
}

interface Ship {
  SHIP_ID: string;
  SHIP_NAME_JA: string;
  SHIP_NAME_EN: string;
}

// JST基準で日付をYYYY-MM-DD形式の文字列に変換（端末TZに依存しない）
const formatDateLocal = (date: Date): string => {
  return formatDateYmdJst(date);
};

const TIMETABLE_STORAGE_PATH = "data/timetable.json";
const TIMETABLE_CACHE_KEY = "rawTimetable";
const NATIVE_STORAGE_SDK_TIMEOUT_MS = 5000;

const toLoggableError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    const enriched = error as Error & {
      code?: string | number;
      status?: number;
      statusCode?: number;
      response?: {
        status?: number;
        statusText?: string;
      };
      cause?: unknown;
    };

    const summary: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    if (enriched.code !== undefined) summary.code = enriched.code;
    if (typeof enriched.status === "number") summary.status = enriched.status;
    if (typeof enriched.statusCode === "number") summary.statusCode = enriched.statusCode;
    if (typeof enriched.response?.status === "number") summary.responseStatus = enriched.response.status;
    if (typeof enriched.response?.statusText === "string") {
      summary.responseStatusText = enriched.response.statusText;
    }

    if (enriched.cause instanceof Error) {
      summary.cause = {
        name: enriched.cause.name,
        message: enriched.cause.message,
      };
    } else if (enriched.cause !== undefined) {
      summary.cause = String(enriched.cause);
    }

    return summary;
  }

  if (typeof error === "object" && error !== null) {
    return { error };
  }

  return {
    error: String(error),
  };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
};

const isNativeClientPlatform = (): boolean => {
  if (!process.client) {
    return false;
  }

  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const useFerryStore = defineStore("ferry", () => {
  const logger = createLogger("ferryStore");
  // State
  const timetableData = ref<Trip[]>([]);
  const shipStatus = ref<ShipStatusStoreState>({
    isokaze: null as ShipStatus | null,
    dozen: null as ShipStatus | null,
    ferry: null as FerryStatus | null,
    kunigaKankou: null as SightseeingStatus | null,
  });
  // 固定の初期日付を使用（ハイドレーションエラー対策）
  const getInitialDate = () => {
    // JSTで本日の日付（0:00）を取得（海外端末でも常にJST）
    return getTodayJstMidnight();
  };
  const selectedDate = ref(getInitialDate());
  // SSR/CSRで同じ初期値を保証
  const departure = ref<string>("");
  const arrival = ref<string>("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchTime = ref<Date | null>(null);

  // Port definitions
  const hondoPorts = ["HONDO", "HONDO_SHICHIRUI", "HONDO_SAKAIMINATO"];
  const dozenPorts = ["BEPPU", "HISHIURA", "KURI"];
  const dogoPorts = ["SAIGO"];

  const allPorts = computed(() => [...hondoPorts, ...dozenPorts, ...dogoPorts]);

  // Port data
  const ports = ref<Port[]>([
    {
      PORT_ID: "HONDO_SHICHIRUI",
      PLACE_NAME_JA: "七類港",
      PLACE_NAME_EN: "Shichirui Port",
      island_ja: "本土",
      island_en: "Mainland",
    },
    {
      PORT_ID: "HONDO_SAKAIMINATO",
      PLACE_NAME_JA: "境港",
      PLACE_NAME_EN: "Sakaiminato Port",
      island_ja: "本土",
      island_en: "Mainland",
    },
    {
      PORT_ID: "SAIGO",
      PLACE_NAME_JA: "西郷港",
      PLACE_NAME_EN: "Saigo Port",
      island_ja: "隠岐の島町",
      island_en: "Okinoshima Town",
    },
    {
      PORT_ID: "BEPPU",
      PLACE_NAME_JA: "別府港",
      PLACE_NAME_EN: "Beppu Port",
      island_ja: "西ノ島",
      island_en: "Nishinoshima",
    },
    {
      PORT_ID: "HISHIURA",
      PLACE_NAME_JA: "菱浦港",
      PLACE_NAME_EN: "Hishiura Port",
      island_ja: "中ノ島",
      island_en: "Nakanoshima",
    },
    {
      PORT_ID: "KURI",
      PLACE_NAME_JA: "来居港",
      PLACE_NAME_EN: "Kuri Port",
      island_ja: "知夫里島",
      island_en: "Chiburijima",
    },
  ]);

  // Ship data
  const ships = ref<Ship[]>([
    {
      SHIP_ID: "FERRY_OKI",
      SHIP_NAME_JA: "フェリーおき",
      SHIP_NAME_EN: "Ferry Oki",
    },
    {
      SHIP_ID: "FERRY_SHIRASHIMA",
      SHIP_NAME_JA: "フェリーしらしま",
      SHIP_NAME_EN: "Ferry Shirashima",
    },
    {
      SHIP_ID: "FERRY_KUNIGA",
      SHIP_NAME_JA: "フェリーくにが",
      SHIP_NAME_EN: "Ferry Kuniga",
    },
    {
      SHIP_ID: "FERRY_DOZEN",
      SHIP_NAME_JA: "フェリーどうぜん",
      SHIP_NAME_EN: "Ferry Dozen",
    },
    {
      SHIP_ID: "ISOKAZE",
      SHIP_NAME_JA: "いそかぜ",
      SHIP_NAME_EN: "Isokaze",
    },
    {
      SHIP_ID: "RAINBOWJET",
      SHIP_NAME_JA: "レインボージェット",
      SHIP_NAME_EN: "Rainbow Jet",
    },
  ]);

  // 港周辺地図は Leaflet + OpenStreetMap に移行済み（iframe 埋め込みは廃止）

  // Getters
  const isDataStale = computed(() => {
    if (!lastFetchTime.value) return true;
    const now = new Date();
    const diffMinutes =
      (now.getTime() - lastFetchTime.value.getTime()) / (1000 * 60);
    return diffMinutes > 15; // 15分以上経過したらstale
  });

  // Alerts computed from ship status
  const alerts = computed(() => {
    const alertList: Array<{
      date: string;
      shipName: string;
      departureTime: string;
      status: number;
    }> = [];

    // status値の意味:
    // 0: 通常運航
    // 1: 一部欠航
    // 2: 全便欠航
    // 3: 時間変更
    // 4: 臨時便

    // lastShipsから欠航情報を取得
    if (
      shipStatus.value.isokaze?.lastShips &&
      shipStatus.value.isokaze.status !== 0
    ) {
      shipStatus.value.isokaze.lastShips.forEach((trip: any) => {
        alertList.push({
          date: formatDateLocal(selectedDate.value),
          shipName: "ISOKAZE",
          departureTime: trip.departure_time || trip.departureTime,
          status: shipStatus.value.isokaze?.status || 2,
        });
      });
    }

    if (
      shipStatus.value.dozen?.lastShips &&
      shipStatus.value.dozen.status !== 0
    ) {
      shipStatus.value.dozen.lastShips.forEach((trip: any) => {
        alertList.push({
          date: formatDateLocal(selectedDate.value),
          shipName: "FERRY_DOZEN",
          departureTime: trip.departure_time || trip.departureTime,
          status: shipStatus.value.dozen?.status || 2,
        });
      });
    }

    return alertList;
  });

  const filteredTimetable = computed(() => {
    if (!departure.value || !arrival.value) {
      return [];
    }

    const dateStr = formatDateLocal(selectedDate.value);
    const MAX_NEXT_CHAIN = 5;

    // 期間でフィルタリング
    const validTimetable = timetableData.value.filter((trip) => {
      const normalizeYmd = (value: string): string => {
        // データ側は YYYY/MM/DD と YYYY-MM-DD が混在するため正規化
        return value.replace(/\//g, "-").slice(0, 10);
      };
      const startYmd = normalizeYmd(trip.startDate);
      const endYmd = normalizeYmd(trip.endDate);

      // すべてJSTの暦日として比較する
      const startDate = parseYmdAsJstMidnight(startYmd);
      const endExclusive = addDaysJst(parseYmdAsJstMidnight(endYmd), 1); // 終了日の翌日0:00(JST)
      const currentDate = parseYmdAsJstMidnight(dateStr);

      return currentDate >= startDate && currentDate < endExclusive;
    });

    // 出発地でフィルタリング
    const departureTimetable = validTimetable.filter((trip) => {
      return departure.value === "HONDO"
        ? trip.departure === "HONDO_SHICHIRUI" ||
            trip.departure === "HONDO_SAKAIMINATO"
        : trip.departure === departure.value;
    });

    // 本土の港を判定する関数
    const isMainlandPort = (port: string | undefined): boolean => {
      return port === "HONDO_SHICHIRUI" || port === "HONDO_SAKAIMINATO";
    };

    // 直行便を抽出（本土の港が途中経由地にある便は除外）
    const directTrips = departureTimetable.filter((trip) => {
      // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
      if (trip.via && isMainlandPort(trip.via)) {
        // 出発地または目的地が本土の港の場合は除外しない
        if (!isMainlandPort(trip.departure) && !isMainlandPort(trip.arrival)) {
          return false;
        }
      }

      return arrival.value === "HONDO"
        ? trip.arrival === "HONDO_SHICHIRUI" ||
            trip.arrival === "HONDO_SAKAIMINATO"
        : trip.arrival === arrival.value;
    });

    const resultTimetable: Trip[] = [];

    // 直行便を結果に追加
    if (departure.value === "HONDO" || arrival.value === "HONDO") {
      directTrips.forEach((trip) => {
        let departureLabel = "";
        let arrivalLabel = "";

        if (trip.departure === "HONDO_SHICHIRUI") {
          departureLabel = "TIMETABLE_SUP_SHICHIRUI";
        } else if (trip.departure === "HONDO_SAKAIMINATO") {
          departureLabel = "TIMETABLE_SUP_SAKAIMINATO";
        }

        if (trip.arrival === "HONDO_SHICHIRUI") {
          arrivalLabel = "TIMETABLE_SUP_SHICHIRUI";
        } else if (trip.arrival === "HONDO_SAKAIMINATO") {
          arrivalLabel = "TIMETABLE_SUP_SAKAIMINATO";
        }

        resultTimetable.push({
          ...trip,
          departure: trip.departure,
          arrival: trip.arrival,
          departureLabel,
          arrivalLabel,
        });
      });
    } else {
      resultTimetable.push(...directTrips);
    }

    // 既に抽出済みのトリップIDを記録
    const extractedTripIds = new Set(directTrips.map((t) => t.tripId));

    // 乗り継ぎルートを探索
    const remainingTrips = departureTimetable.filter(
      (trip) => !extractedTripIds.has(trip.tripId)
    );

    remainingTrips.forEach((trip) => {
      // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
      if (trip.via && isMainlandPort(trip.via)) {
        if (!isMainlandPort(trip.departure) && !isMainlandPort(trip.arrival)) {
          return;
        }
      }

      if (trip.nextId) {
        let nextId = trip.nextId;

        for (let i = 0; i < MAX_NEXT_CHAIN; i++) {
          const nextTrip = validTimetable.find((t) => t.tripId === nextId);
          if (!nextTrip) break;

          // 出発地を経由するパスは省く
          if (nextTrip.departure === trip.departure) break;

          // 本土経由ルートは省く
          if (
            (nextTrip.arrival === "HONDO_SHICHIRUI" ||
              nextTrip.arrival === "HONDO_SAKAIMINATO") &&
            (trip.departure === "HONDO_SHICHIRUI" ||
              trip.departure === "HONDO_SAKAIMINATO")
          ) {
            break;
          }

          // 本土の港が途中経由地（出発地/目的地以外）にある便を除外
          if (nextTrip.via && isMainlandPort(nextTrip.via)) {
            if (
              !isMainlandPort(nextTrip.departure) &&
              !isMainlandPort(nextTrip.arrival)
            ) {
              break;
            }
          }

          // 目的地に到達した場合
          const reachesDestination =
            arrival.value === "HONDO"
              ? nextTrip.arrival === "HONDO_SHICHIRUI" ||
                nextTrip.arrival === "HONDO_SAKAIMINATO"
              : nextTrip.arrival === arrival.value;

          if (reachesDestination) {
            let departureLabel = "";
            let arrivalLabel = "";

            if (departure.value === "HONDO") {
              if (trip.departure === "HONDO_SHICHIRUI") {
                departureLabel = "TIMETABLE_SUP_SHICHIRUI";
              } else if (trip.departure === "HONDO_SAKAIMINATO") {
                departureLabel = "TIMETABLE_SUP_SAKAIMINATO";
              }
            }

            if (arrival.value === "HONDO") {
              if (nextTrip.arrival === "HONDO_SHICHIRUI") {
                arrivalLabel = "TIMETABLE_SUP_SHICHIRUI";
              } else if (nextTrip.arrival === "HONDO_SAKAIMINATO") {
                arrivalLabel = "TIMETABLE_SUP_SAKAIMINATO";
              }
            }

            resultTimetable.push({
              ...trip,
              arrival: nextTrip.arrival,
              arrivalTime: nextTrip.arrivalTime,
              departureLabel,
              arrivalLabel,
            });
            break;
          }

          if (!nextTrip.nextId) break;
          nextId = nextTrip.nextId;
        }
      }
    });

    return resultTimetable;
  });

  // Actions
  const fetchTimetable = async (force = false) => {
    const nativeAtEntry = process.client && isNativeClientPlatform();
    if (!force && !isDataStale.value && timetableData.value.length > 0) {
      return; // キャッシュが有効な場合はスキップ
    }

    isLoading.value = true;
    error.value = null;

    try {
      let data: any[] | null = null;
      let dataSource: "functions" | "storage-sdk" | "storage-public" | null = null;
      const isNativeClient = nativeAtEntry;
      const useStorageDirect = process.client && !isNativeClient;
      const config = useRuntimeConfig();
      const functionsUrl = `https://asia-northeast1-${config.public.firebase.projectId}.cloudfunctions.net/getTimetableStorage`;

      const fetchFromStorageSdk = async () => {
        const { getCachedJsonFile } = useFirebaseStorage();
        return getCachedJsonFile<any[]>(TIMETABLE_STORAGE_PATH, TIMETABLE_CACHE_KEY, 15);
      };

      const fetchFromStoragePublicUrl = async () => {
        const bucket = config.public.firebase.storageBucket;
        const encodedPath = encodeURIComponent(TIMETABLE_STORAGE_PATH);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to fetch timetable from storage public URL (${response.status})`);
        }
        return (await response.json()) as any[];
      };

      const fetchFromFunctions = async () => {
        return $fetch<any[]>(functionsUrl);
      };

      if (isNativeClient) {
        // iOS/Android ネイティブアプリは最初から public URL 経由で取得
        try {
          data = await fetchFromStoragePublicUrl();
          dataSource = "storage-public";
        } catch (publicUrlError) {
          logger.warn("Native public storage URL timetable fetch failed", {
            error: toLoggableError(publicUrlError),
          });

          try {
            data = await withTimeout(
              fetchFromStorageSdk(),
              NATIVE_STORAGE_SDK_TIMEOUT_MS,
              "Storage SDK timetable fetch"
            );
            dataSource = "storage-sdk";
          } catch (storageError) {
            logger.warn("Native storage SDK fallback timetable fetch failed", {
              storagePath: TIMETABLE_STORAGE_PATH,
              error: toLoggableError(storageError),
            });
            throw storageError;
          }
        }
      } else if (useStorageDirect) {
        // Web は Firebase Storage から直接取得
        data = await fetchFromStorageSdk();
        dataSource = "storage-sdk";
      } else {
        // サーバーサイドは Firebase Functions 経由
        try {
          data = await fetchFromFunctions();
          dataSource = "functions";
        } catch (functionsError) {
          logger.warn("Functions timetable fetch failed", {
            functionsUrl,
            error: functionsError,
          });
          throw functionsError;
        }
      }

      if (!Array.isArray(data) || data.length === 0) {
        timetableData.value = [];
        error.value = "LOAD_TIMETABLE_ERROR";
        return;
      }

      // Map API response fields to expected format
      timetableData.value = data.map((trip) => ({
        tripId: parseInt(trip.trip_id), // Convert string IDs to numbers
        startDate: trip.start_date,
        endDate: trip.end_date,
        name: trip.name,
        departure: trip.departure,
        departureTime: trip.departure_time, // Keep as string
        arrival: trip.arrival,
        arrivalTime: trip.arrival_time, // Keep as string
        nextId: trip.next_id ? parseInt(trip.next_id) : undefined,
        status: parseInt(trip.status) || 0,
      }));

      lastFetchTime.value = new Date();

      // LocalStorageにキャッシュ（Webは getCachedJsonFile 側で保存済み）
      if (process.client && dataSource !== "storage-sdk") {
        try {
          localStorage.setItem(TIMETABLE_CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(
            "lastFetchTime",
            lastFetchTime.value.toISOString()
          );
        } catch (e) {
          // ローカルキャッシュの書き込みが失敗しても処理を継続
        }
      }
    } catch (e) {
      if (nativeAtEntry) {
        logger.error("Native timetable fetch failed", {
          error: toLoggableError(e),
        });
      }
      error.value = "LOAD_TIMETABLE_ERROR";

      // オフラインの場合はキャッシュから読み込み
      if (process.client) {
        try {
          const cached = localStorage.getItem(TIMETABLE_CACHE_KEY);
          if (cached) {
            const data = JSON.parse(cached);
            // Map cached data to expected format
            timetableData.value = data.map((trip) => ({
              tripId: parseInt(trip.trip_id), // Convert string IDs to numbers
              startDate: trip.start_date,
              endDate: trip.end_date,
              name: trip.name,
              departure: trip.departure,
              departureTime: trip.departure_time, // Keep as string
              arrival: trip.arrival,
              arrivalTime: trip.arrival_time, // Keep as string
              nextId: trip.next_id ? parseInt(trip.next_id) : undefined,
              status: parseInt(trip.status) || 0,
            }));
            error.value = "OFFLINE_TIMETABLE_ERROR";
          }
        } catch (e) {
          // ローカルキャッシュの読み込みが失敗した場合は既存データを保持
        }
      }
    } finally {
      isLoading.value = false;
    }
  };

  const fetchShipStatus = async () => {
    isLoading.value = true;

    try {
      const config = useRuntimeConfig();
      const [statusData, kankouData] = await Promise.all([
        $fetch(`${config.public.shipStatusApi}/status`),
        $fetch(`${config.public.shipStatusApi}/status-kankou`).catch(
          () => null
        ),
      ]);

      const toStatusNumber = (value: unknown): number => {
        if (typeof value === "number") {
          return value;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      if (Array.isArray(statusData)) {
        // APIレスポンスをマッピング
        const [isokazeData, dozenData, ferryData] = statusData;

        if (isokazeData) {
          const statusValue = toStatusNumber(isokazeData.status);
          shipStatus.value.isokaze = {
            ...isokazeData,
            status: statusValue,
            hasAlert: statusValue !== 0,
          };
        }

        if (dozenData) {
          const statusValue = toStatusNumber(dozenData.status);
          shipStatus.value.dozen = {
            ...dozenData,
            status: statusValue,
            hasAlert: statusValue !== 0,
          };
        }

        if (ferryData) {
          // フェリーデータはスネークケースからキャメルケースに変換
          shipStatus.value.ferry = {
            ...ferryData,
            hasAlert:
              ferryData.ferry_state !== "定期運航" ||
              ferryData.fast_ferry_state !== "( in Operation )",
            ferryState: ferryData.ferry_state || ferryData.ferryState,
            ferryComment: ferryData.ferry_comment || ferryData.ferryComment,
            fastFerryState:
              ferryData.fast_ferry_state || ferryData.fastFerryState,
            fastFerryComment:
              ferryData.fast_ferry_comment || ferryData.fastFerryComment,
            todayWave: ferryData.today_wave || ferryData.todayWave,
            tomorrowWave: ferryData.tomorrow_wave || ferryData.tomorrowWave,
          };
        }
      }

      if (kankouData && Array.isArray(kankouData)) {
        const [status, courseA, courseB] = kankouData;
        if (status) {
          shipStatus.value.kunigaKankou = {
            hasAlert: true,
            success: true,
            lastUpdate: status.updated_at,
            courseA: courseA || [],
            courseB: courseB || [],
          };
        }
      }

      // 臨時便を時刻表データに追加
      processExtraShips();
    } catch (e) {
      error.value = "LOAD_STATUS_ERROR";
    } finally {
      isLoading.value = false;
    }
  };

  const processExtraShips = () => {
    const dateStr = formatDateLocal(selectedDate.value);

    // 既存の臨時便を削除
    timetableData.value = timetableData.value.filter(
      (trip) => trip.tripId < 1000
    );

    // いそかぜの臨時便
    if (shipStatus.value.isokaze?.extraShips) {
      let tripId = 1000;
      shipStatus.value.isokaze.extraShips.forEach((trip) => {
        timetableData.value.push({
          tripId,
          startDate: dateStr,
          endDate: dateStr,
          name: "ISOKAZE",
          departure: trip.departure,
          departureTime: trip.departure_time, // Keep as string
          arrival: trip.arrival,
          arrivalTime: trip.arrival_time || "00:00", // Keep as string
          status: 4, // Extra
          nextId: tripId + 1,
        });
        tripId++;
      });
    }

    // フェリーどうぜんの臨時便
    if (shipStatus.value.dozen?.extraShips) {
      let tripId = 2000;
      shipStatus.value.dozen.extraShips.forEach((trip) => {
        timetableData.value.push({
          tripId,
          startDate: dateStr,
          endDate: dateStr,
          name: "FERRY_DOZEN",
          departure: trip.departure,
          departureTime: trip.departure_time, // Keep as string
          arrival: trip.arrival,
          arrivalTime: trip.arrival_time || "00:00", // Keep as string
          status: 4, // Extra
          nextId: tripId + 1,
        });
        tripId++;
      });
    }
  };

  const setDeparture = (port: string) => {
    departure.value = port;
    // LocalStorageに保存
    if (process.client) {
      try {
        localStorage.setItem("departure", port);
      } catch (e) {}
    }
  };

  const setArrival = (port: string) => {
    arrival.value = port;
    // LocalStorageに保存
    if (process.client) {
      try {
        localStorage.setItem("arrival", port);
      } catch (e) {}
    }
  };

  const reverseRoute = () => {
    const temp = departure.value;
    departure.value = arrival.value;
    arrival.value = temp;
  };

  const setSelectedDate = (date: Date) => {
    selectedDate.value = date;
  };

  // Initialize from localStorage
  const initializeFromStorage = async () => {
    // SSR時はスキップ
    if (!process.client) return;

    // ハイドレーション完了後に実行
    await new Promise((resolve) => {
      if (document.readyState === "complete") {
        resolve(true);
      } else {
        window.addEventListener("load", () => resolve(true));
      }
    });

    // さらにnextTickで遅延
    await nextTick();

    try {
      const savedDeparture = localStorage.getItem("departure");
      const savedArrival = localStorage.getItem("arrival");

      if (savedDeparture) departure.value = savedDeparture;
      if (savedArrival) arrival.value = savedArrival;

      const savedTime = localStorage.getItem("lastFetchTime");
      if (savedTime) {
        lastFetchTime.value = new Date(savedTime);
      }
    } catch (e) {
      // ローカルストレージ読み込みに失敗した場合は既存状態を維持
    }
  };

  return {
    // State
    timetableData,
    shipStatus,
    selectedDate,
    departure,
    arrival,
    isLoading,
    error,
    lastFetchTime,

    // Port data
    ports,
    ships,
    hondoPorts,
    dozenPorts,
    dogoPorts,
    allPorts,
    // portMaps: removed (was legacy Google Maps iframe embeds)

    // Getters
    isDataStale,
    filteredTimetable,
    alerts,

    // Actions
    fetchTimetable,
    fetchShipStatus,
    setDeparture,
    setArrival,
    reverseRoute,
    setSelectedDate,
    initializeFromStorage,
  };
});
