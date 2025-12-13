import { defineStore } from "pinia";
import { useFirebaseStorage } from "@/composables/useFirebaseStorage";
import type { Trip, ShipStatus, FerryStatus, SightseeingStatus } from "@/types";

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

// ローカル時間で日付をYYYY-MM-DD形式の文字列に変換（UTC変換によるずれを防ぐ）
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const useFerryStore = defineStore("ferry", () => {
  // State
  const timetableData = ref<Trip[]>([]);
  const shipStatus = ref({
    isokaze: null as ShipStatus | null,
    dozen: null as ShipStatus | null,
    ferry: null as FerryStatus | null,
    kunigaKankou: null as SightseeingStatus | null,
  });
  // 固定の初期日付を使用（ハイドレーションエラー対策）
  const getInitialDate = () => {
    // JSTで本日の日付を取得
    const now = new Date();
    const jstOffset = 9 * 60; // JST is UTC+9
    const jstTime = new Date(
      now.getTime() + (jstOffset - now.getTimezoneOffset()) * 60 * 1000
    );
    jstTime.setHours(0, 0, 0, 0);
    return jstTime;
  };
  const selectedDate = ref(getInitialDate());
  // SSR/CSRで同じ初期値を保証
  const departure = ref<string>("");
  const arrival = ref<string>("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetchTime = ref<Date | null>(null);
  const timetableLastUpdate = ref<Date | null>(null);

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

  // Port map data
  const portMaps: Record<string, string> = {
    HONDO:
      '<iframe src="https://www.google.com/maps/d/embed?mid=10LYdFfHjM-C6lq36egqxMuDIiMg" width="100%" allowfullscreen loading="lazy"></iframe>',
    HONDO_SAKAIMINATO:
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2292.317150965745!2d133.22227226073633!3d35.54509842041033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x355655ad5deb0d71%3A0x177b9c28785fc8a3!2z6Zqg5bKQ5rG96Ii5IOWig-a4ryDjg5Xjgqfjg6rjg7zjgr_jg7zjg5_jg4rjg6s!5e0!3m2!1sja!2sjp!4v1508490999479" width="100%" allowfullscreen loading="lazy"></iframe>',
    HONDO_SHICHIRUI:
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3245.2782127375426!2d133.22755195027142!3d35.57152434349223!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3556547244a8948d%3A0xd6870c7a99239d6c!2z5LiD6aGe5riv!5e0!3m2!1sja!2sjp!4v1508490937348" width="100%" allowfullscreen loading="lazy"></iframe>',
    KURI: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3226.807196887792!2d133.03717155028508!3d36.0250013185523!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d02204625465%3A0x79e1cdd47cbe20cd!2z5p2l5bGF5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491503665" width="100%" allowfullscreen loading="lazy"></iframe>',
    BEPPU:
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.417639692854!2d133.03936811472514!3d36.107681714074126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d73e33b20b8f%3A0xaf30d22cfc266131!2z6KW_44OO5bO25Yil5bqc5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508490887500" width="100%" allowfullscreen loading="lazy"></iframe>',
    HISHIURA:
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3223.532279545968!2d133.07474405028748!3d36.10488801413124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3557d6f346eb8e25%3A0x99246dba291fb735!2z6I-x5rWm5riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491452795" width="100%" allowfullscreen loading="lazy"></iframe>',
    SAIGO:
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3219.4725184532863!2d133.33284095029055!3d36.20370830865085!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5ffd77b679a1e833%3A0x3375700953b9cf6e!2z6KW_6YO95riv44OV44Kn44Oq44O844K_44O844Of44OK44Or!5e0!3m2!1sja!2sjp!4v1508491478099" width="100%" allowfullscreen loading="lazy"></iframe>',
  };

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
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);
      endDate.setDate(endDate.getDate() + 1); // 終了日の翌日まで含める
      const currentDate = new Date(dateStr);

      return currentDate >= startDate && currentDate <= endDate;
    });

    // 出発地でフィルタリング
    const departureTimetable = validTimetable.filter((trip) => {
      return departure.value === "HONDO"
        ? trip.departure === "HONDO_SHICHIRUI" ||
            trip.departure === "HONDO_SAKAIMINATO"
        : trip.departure === departure.value;
    });

    // 直行便を抽出
    const directTrips = departureTimetable.filter((trip) => {
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
    if (!force && !isDataStale.value && timetableData.value.length > 0) {
      return; // キャッシュが有効な場合はスキップ
    }

    isLoading.value = true;
    error.value = null;

    try {
      let data: any[];

      // Firebase Functions を使用する場合
      const useFirebaseFunctions = true; // 設定で切り替え可能

      if (useFirebaseFunctions && process.client) {
        // Firebase Storage から直接取得
        const { getCachedJsonFile } = useFirebaseStorage();
        data = await getCachedJsonFile<any[]>(
          "data/timetable.json",
          "rawTimetable",
          15
        );
      } else {
        // Firebase Functions 経由で取得（サーバーサイドまたはフォールバック）
        const config = useRuntimeConfig();
        const functionsUrl = `https://asia-northeast1-${config.public.firebase.projectId}.cloudfunctions.net/getTimetableStorage`;
        data = await $fetch<any[]>(functionsUrl);
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

      // LocalStorageにキャッシュ（Firebase Storage の getCachedJsonFile が既に処理）
      if (process.client && !useFirebaseFunctions) {
        try {
          localStorage.setItem("rawTimetable", JSON.stringify(data));
          localStorage.setItem(
            "lastFetchTime",
            lastFetchTime.value.toISOString()
          );
        } catch (e) {
          // ローカルキャッシュの書き込みが失敗しても処理を継続
        }
      }
    } catch (e) {
      error.value = "LOAD_TIMETABLE_ERROR";

      // オフラインの場合はキャッシュから読み込み
      if (process.client) {
        try {
          const cached = localStorage.getItem("rawTimetable");
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
    portMaps,

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
