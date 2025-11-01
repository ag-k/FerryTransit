export default defineEventHandler(async (event) => {
  return {
    title: "FerryTransit 時刻表 API",
    version: "1.0.0",
    description: "島根県隠岐諸島のフェリー時刻表情報を提供するAPI",
    baseUrl: "/api/timetable",
    endpoints: {
      search: {
        method: ["GET", "POST"],
        url: "/api/timetable/search",
        description: "時刻表を検索します",
        parameters: {
          departure: {
            type: "string",
            required: false,
            description: "出発港コード（例: BEPPU）"
          },
          arrival: {
            type: "string", 
            required: false,
            description: "到着港コード（例: HISHIURA）"
          },
          date: {
            type: "string",
            required: false,
            description: "検索日（YYYY-MM-DD形式）"
          },
          ship: {
            type: "string",
            required: false,
            description: "船名（例: RAINBOWJET）"
          },
          startDate: {
            type: "string",
            required: false,
            description: "運行開始日（YYYY-MM-DD形式）"
          },
          endDate: {
            type: "string",
            required: false,
            description: "運行終了日（YYYY-MM-DD形式）"
          },
          limit: {
            type: "number",
            required: false,
            default: 100,
            description: "取得件数の上限"
          },
          offset: {
            type: "number",
            required: false,
            default: 0,
            description: "取得開始位置"
          },
          sortBy: {
            type: "string",
            required: false,
            default: "departure_time",
            description: "ソート項目（departure_time, arrival_time, name, start_date）"
          },
          sortOrder: {
            type: "string",
            required: false,
            default: "asc",
            description: "ソート順（asc, desc）"
          }
        },
        examples: {
          basicSearch: {
            description: "基本的な路線検索",
            method: "GET",
            url: "/api/timetable/search?departure=BEPPU&arrival=HISHIURA"
          },
          dateSearch: {
            description: "特定の日付で検索",
            method: "GET", 
            url: "/api/timetable/search?date=2025-11-02"
          },
          shipSearch: {
            description: "特定の船で検索",
            method: "GET",
            url: "/api/timetable/search?ship=RAINBOWJET"
          },
          advancedSearch: {
            description: "高度な検索（POST）",
            method: "POST",
            url: "/api/timetable/search",
            body: {
              departure: "BEPPU",
              arrival: "HISHIURA",
              date: "2025-11-02",
              limit: 10,
              sortBy: "departure_time",
              sortOrder: "asc"
            }
          }
        },
        response: {
          success: true,
          data: {
            searchParams: {
              departure: "BEPPU",
              arrival: "HISHIURA",
              limit: 100,
              offset: 0
            },
            results: [
              {
                tripId: "123",
                nextId: "124",
                startDate: "2025-01-04",
                endDate: "2025-12-30",
                name: "FERRY_DOZEN",
                departure: "BEPPU",
                departureTime: "07:50",
                arrival: "HISHIURA",
                arrivalTime: "08:02",
                duration: 12,
                type: "ferry",
                status: 0
              }
            ],
            pagination: {
              totalCount: 19,
              limit: 100,
              offset: 0,
              hasMore: false
            }
          }
        }
      },
      info: {
        method: "GET",
        url: "/api/timetable/info",
        description: "港、路線、船の一覧情報を取得します",
        response: {
          success: true,
          data: {
            ports: [
              {
                code: "BEPPU",
                name: "別府",
                routes: 4
              }
            ],
            routes: [
              {
                code: "BEPPU-HISHIURA",
                departure: {
                  code: "BEPPU",
                  name: "別府"
                },
                arrival: {
                  code: "HISHIURA", 
                  name: "菱浦"
                }
              }
            ],
            ships: [
              {
                name: "RAINBOWJET",
                type: "highspeed"
              }
            ],
            summary: {
              totalPorts: 12,
              totalRoutes: 25,
              totalShips: 8
            }
          }
        }
      },
      original: {
        method: "GET",
        url: "/api/timetable",
        description: "元の時刻表データを取得します（既存API互換）"
      }
    },
    shipTypes: {
      ferry: "フェリー",
      highspeed: "高速船",
      local: "ローカル船"
    },
    portCodes: [
      { code: "BEPPU", name: "別府" },
      { code: "HISHIURA", name: "菱浦" },
      { code: "KURI", name: "来居" },
      { code: "SAIGO", name: "西郷" },
      { code: "HONDO", name: "本土" },
      { code: "SHICHIRUI", name: "七類" },
      { code: "DOZEN", name: "西ノ島" },
      { code: "DOGO", name: "知夫" },
      { code: "NISHINOSHIMA", name: "西ノ島" },
      { code: "CHIBU", name: "知夫里" },
      { code: "AMA", name: "海士" },
      { code: "OKI", name: "隠岐" }
    ],
    notes: [
      "港コードは大文字で指定してください",
      "時刻はHH:MM形式で返されます",
      "durationは所要時間（分単位）です",
      "status: 0=正常, 1=運休, 2=欠航",
      "ページネーションにはlimitとoffsetを使用します",
      "ソートはPOSTリクエストでのみ利用可能です"
    ]
  }
})
