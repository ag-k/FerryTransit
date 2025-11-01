export default defineEventHandler(async (event) => {
  return {
    title: "FerryTransit 乗換案内 API",
    version: "1.0.0",
    description: "島根県隠岐諸島のフェリー乗換案内を検索するAPI",
    endpoints: {
      search: {
        method: ["GET", "POST"],
        url: "/api/transit/search",
        description: "乗換案内を検索します",
        parameters: {
          departure: {
            type: "string",
            required: true,
            description: "出発港コード（例: BEPPU）"
          },
          arrival: {
            type: "string", 
            required: true,
            description: "到着港コード（例: HISHIURA）"
          },
          date: {
            type: "string",
            required: true,
            description: "検索日（YYYY-MM-DD形式）"
          },
          time: {
            type: "string",
            required: false,
            default: "00:00",
            description: "検索時刻（HH:MM形式）"
          },
          isArrivalMode: {
            type: "boolean",
            required: false,
            default: false,
            description: "到着時刻指定モード"
          }
        },
        examples: {
          getRequest: "GET /api/transit/search?departure=BEPPU&arrival=HISHIURA&date=2025-11-02&time=08:00",
          postRequest: {
            method: "POST",
            url: "/api/transit/search",
            body: {
              departure: "BEPPU",
              arrival: "HISHIURA", 
              date: "2025-11-02",
              time: "08:00",
              isArrivalMode: false
            }
          }
        },
        response: {
          success: true,
          data: {
            searchParams: {
              departure: "BEPPU",
              arrival: "HISHIURA",
              date: "2025-11-02",
              time: "08:00",
              isArrivalMode: false
            },
            results: [
              {
                id: "route_123",
                departureTime: "2025-11-02T08:00:00.000Z",
                arrivalTime: "2025-11-02T08:10:00.000Z", 
                totalFare: 410,
                duration: 10,
                segments: [
                  {
                    tripId: "123",
                    ship: "RAINBOWJET",
                    departure: "BEPPU",
                    arrival: "HISHIURA",
                    departureTime: "2025-11-02T08:00:00.000Z",
                    arrivalTime: "2025-11-02T08:10:00.000Z",
                    fare: 410,
                    status: 0
                  }
                ]
              }
            ],
            count: 1
          }
        }
      }
    },
    ports: [
      "BEPPU", "HISHIURA", "KURI", "SAIGO", "HONDO", "SHICHIRUI",
      "DOZEN", "DOGO", "NISHINOSHIMA", "CHIBU", "AMA", "OKI"
    ],
    notes: [
      "港コードは大文字で指定してください",
      "料金が0円の場合は「料金不明」を意味します",
      "status: 0=正常, 1=運休, 2=欠航",
      "複数のセグメントがある場合は乗換が必要です",
      "時刻はISO8601形式で返されます"
    ],
    testResults: {
      beppuToHishiura: {
        date: "2025-11-02",
        results: 19,
        sampleFare: 410,
        ships: ["RAINBOWJET", "FERRY_DOZEN", "ISOKAZE", "FERRY_KUNIGA"]
      }
    }
  }
})
