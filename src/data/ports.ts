import type { Port } from "~/types";

export const PORTS_DATA: Record<string, Port> = {
  HONDO_SHICHIRUI: {
    id: "HONDO_SHICHIRUI",
    name: "七類港",
    nameEn: "Shichirui Port",
    location: {
      lat: 35.5714,
      lng: 133.2298,
    },
    type: "mainland",
    facilities: {
      parking: true,
      restaurant: false,
      shop: true,
      waitingRoom: true,
      toilet: true,
      busStop: true,
      taxiStand: true,
    },
    access: {
      byBus: "JR松江駅から約40分",
      byBusEn: "About 40 minutes from JR Matsue Station",
      byCar: "松江市内から約30分",
      byCarEn: "About 30 minutes from Matsue City",
      walking: "最寄りのバス停から徒歩3分",
      walkingEn: "3 minutes walk from the nearest bus stop",
    },
    boarding: [
      {
        shipIds: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
        labelJa: "隠岐汽船フェリー（フェリーおき等）",
        placeJa: "七類港フェリーターミナル（メテオプラザ）",
        noteJa: "乗船手続きはターミナル窓口・案内表示をご確認ください。",
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      },
      {
        shipIds: ["RAINBOWJET"],
        labelJa: "高速船レインボージェット",
        placeJa: "七類港フェリーターミナル（高速船のりば）",
        noteJa: "フェリーと乗り場が異なる場合があります。案内表示に従ってください。",
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      }
    ]
  },
  HONDO_SAKAIMINATO: {
    id: "HONDO_SAKAIMINATO",
    name: "境港",
    nameEn: "Sakaiminato Port",
    location: {
      lat: 35.5454,
      lng: 133.2226,
    },
    type: "mainland",
    facilities: {
      parking: true,
      restaurant: true,
      shop: true,
      waitingRoom: true,
      toilet: true,
      busStop: true,
      taxiStand: true,
    },
    access: {
      byBus: "JR境港駅から約15分",
      byBusEn: "About 15 minutes from JR Sakaiminato Station",
      byCar: "米子市内から約40分",
      byCarEn: "About 40 minutes from Yonago City",
      walking: "最寄りのバス停から徒歩5分",
      walkingEn: "5 minutes walk from the nearest bus stop",
    },
    boarding: [
      {
        shipIds: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
        labelJa: "隠岐汽船フェリー（フェリーおき等）",
        placeJa: "境港旅客ターミナル周辺（みなとさかい交流館付近）",
        noteJa: "乗船手続きは窓口・案内表示をご確認ください。",
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      },
      {
        shipIds: ["RAINBOWJET"],
        labelJa: "高速船レインボージェット",
        placeJa: "境港旅客ターミナル（高速船のりば）",
        noteJa: "フェリーと乗り場が異なる場合があります。案内表示に従ってください。",
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      }
    ]
  },
  SAIGO: {
    id: "SAIGO",
    name: "西郷港",
    nameEn: "Saigo Port",
    location: {
      lat: 36.2035,
      lng: 133.3351,
    },
    type: "dogo",
    facilities: {
      parking: true,
      restaurant: true,
      shop: true,
      waitingRoom: true,
      toilet: true,
      busStop: true,
      taxiStand: true,
    },
    access: {
      byBus: "隠岐の島町内各地へバス運行",
      byBusEn: "Bus service to various locations in Okinoshima Town",
      byCar: "隠岐空港から約10分",
      byCarEn: "About 10 minutes from Oki Airport",
      walking: "西郷中心部から徒歩10分",
      walkingEn: "10 minutes walk from Saigo center",
    },
    boarding: [
      {
        shipIds: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
        labelJa: "隠岐汽船フェリー（フェリーおき等）",
        placeJa: "西郷港フェリーターミナル",
        noteJa: "本土便と島内便で乗り場が異なる場合があります。案内表示に従ってください。",
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      },
      {
        shipIds: ["RAINBOWJET"],
        labelJa: "高速船レインボージェット",
        placeJa: "西郷港（高速船のりば）",
        noteJa: "フェリーと乗り場が異なる場合があります。案内表示に従ってください。",
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      }
    ]
  },
  HISHIURA: {
    id: "HISHIURA",
    name: "菱浦港",
    nameEn: "Hishiura Port",
    location: {
      lat: 36.1049,
      lng: 133.0769,
    },
    type: "dozen",
    facilities: {
      parking: true,
      restaurant: false,
      shop: true,
      waitingRoom: true,
      toilet: true,
      busStop: true,
      taxiStand: false,
    },
    access: {
      byBus: "海士町内各地へバス運行",
      byBusEn: "Bus service to various locations in Ama Town",
      byCar: "海士町役場から約5分",
      byCarEn: "About 5 minutes from Ama Town Office",
      walking: "菱浦集落内",
      walkingEn: "Within Hishiura village",
    },
    boarding: [
      {
        shipIds: ["ISOKAZE", "ISOKAZE_EX"],
        labelJa: "内航船いそかぜ",
        placeJa: "菱浦港内（いそかぜ乗り場）",
        noteJa: "フェリーどうぜんとは乗り場が異なる場合があります。",
        sourceUrl: "https://www.okikankou.com/inter-island-ferry/"
      },
      {
        shipIds: ["FERRY_DOZEN"],
        labelJa: "フェリーどうぜん（内航船）",
        placeJa: "菱浦港内（どうぜん乗り場）",
        noteJa: "いそかぜとは乗り場が異なる場合があります。",
        sourceUrl: "https://www.okikankou.com/inter-island-ferry/"
      }
    ]
  },
  BEPPU: {
    id: "BEPPU",
    name: "別府港",
    nameEn: "Beppu Port",
    location: {
      lat: 36.1077,
      lng: 133.0416,
    },
    type: "dozen",
    facilities: {
      parking: true,
      restaurant: false,
      shop: false,
      waitingRoom: true,
      toilet: true,
      busStop: true,
      taxiStand: false,
    },
    access: {
      byBus: "西ノ島町内各地へバス運行",
      byBusEn: "Bus service to various locations in Nishinoshima Town",
      byCar: "浦郷から約15分",
      byCarEn: "About 15 minutes from Urago",
      walking: "別府集落内",
      walkingEn: "Within Beppu village",
    },
    boarding: [
      {
        shipIds: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
        labelJa: "隠岐汽船フェリー（フェリーおき等）",
        placeJa: "別府港内（隠岐汽船フェリー乗り場）",
        noteJa: "高速船/内航船とは乗り場が異なる場合があります。港内の案内表示をご確認ください。",
        location: { lat: 36.1078165, lng: 133.0417934 },
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      },
      {
        shipIds: ["ISOKAZE", "ISOKAZE_EX"],
        labelJa: "内航船いそかぜ",
        placeJa: "別府港 ターミナルビルから徒歩約2分（いそかぜ乗り場）",
        noteJa: "フェリーどうぜんとは乗り場が異なります。",
        location: { lat: 36.1073082, lng: 133.0421124 },
        sourceUrl: "https://bewave.jp/oki/access/beppu.html"
      },
      {
        shipIds: ["FERRY_DOZEN"],
        labelJa: "フェリーどうぜん（内航船）",
        placeJa: "別府港内（どうぜん乗り場）",
        noteJa: "いそかぜとは乗り場が異なります。港内の案内表示をご確認ください。",
        location: { lat: 36.1088267, lng: 133.0411866 },
        sourceUrl: "https://bewave.jp/oki/access/beppu.html"
      },
      {
        shipIds: ["RAINBOWJET"],
        labelJa: "高速船レインボージェット",
        placeJa: "別府港内（レインボージェット乗り場）",
        noteJa: "フェリー/内航船と乗り場が異なる場合があります。港内の案内表示をご確認ください。",
        location: { lat: 36.1072822, lng: 133.0432690 },
        sourceUrl: "https://www.oki-kisen.co.jp/terminal/"
      }
    ]
  },
  KURI: {
    id: "KURI",
    name: "来居港",
    nameEn: "Kuri Port",
    location: {
      lat: 36.025,
      lng: 133.0393,
    },
    type: "dozen",
    facilities: {
      parking: true,
      restaurant: false,
      shop: false,
      waitingRoom: true,
      toilet: true,
      busStop: true,
      taxiStand: false,
    },
    access: {
      byBus: "知夫村内各地へバス運行",
      byBusEn: "Bus service to various locations in Chibu Village",
      byCar: "知夫村役場から約5分",
      byCarEn: "About 5 minutes from Chibu Village Office",
      walking: "来居集落内",
      walkingEn: "Within Kuri village",
    },
    boarding: [
      {
        shipIds: ["ISOKAZE", "ISOKAZE_EX"],
        labelJa: "内航船いそかぜ",
        placeJa: "来居港内（いそかぜ乗り場）",
        noteJa: "来居港には営業所が無い場合があります（支払い/手続きは船内案内に従ってください）。",
        sourceUrl: "https://www.okikankou.com/inter-island-ferry/"
      },
      {
        shipIds: ["FERRY_DOZEN"],
        labelJa: "フェリーどうぜん（内航船）",
        placeJa: "来居港内（どうぜん乗り場）",
        noteJa: "いそかぜとは乗り場が異なる場合があります。港内の案内表示をご確認ください。",
        sourceUrl: "https://www.okikankou.com/inter-island-ferry/"
      }
    ]
  },
};

// 航路データ（港間の接続）
export const ROUTES_DATA = [
  // 七類 → 西郷
  {
    from: "HONDO_SHICHIRUI",
    to: "SAIGO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 七類 → 来居
  {
    from: "HONDO_SHICHIRUI",
    to: "KURI",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 七類 → 菱浦
  {
    from: "HONDO_SHICHIRUI",
    to: "HISHIURA",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 七類 → 別府
  {
    from: "HONDO_SHICHIRUI",
    to: "BEPPU",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 境港 → 西郷
  {
    from: "HONDO_SAKAIMINATO",
    to: "SAIGO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 境港 → 別府
  {
    from: "HONDO_SAKAIMINATO",
    to: "BEPPU",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 境港 → 菱浦
  {
    from: "HONDO_SAKAIMINATO",
    to: "HISHIURA",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 境港 → 来居
  {
    from: "HONDO_SAKAIMINATO",
    to: "KURI",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 西郷 → 七類
  {
    from: "SAIGO",
    to: "HONDO_SHICHIRUI",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 西郷 → 境港
  {
    from: "SAIGO",
    to: "HONDO_SAKAIMINATO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 西郷 → 菱浦
  {
    from: "SAIGO",
    to: "HISHIURA",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 西郷 → 別府
  {
    from: "SAIGO",
    to: "BEPPU",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 西郷 → 来居
  {
    from: "SAIGO",
    to: "KURI",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 菱浦 → 七類
  {
    from: "HISHIURA",
    to: "HONDO_SHICHIRUI",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 菱浦 → 境港
  {
    from: "HISHIURA",
    to: "HONDO_SAKAIMINATO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 菱浦 → 西郷
  {
    from: "HISHIURA",
    to: "SAIGO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 菱浦 → 別府
  {
    from: "HISHIURA",
    to: "BEPPU",
    ships: [
      "ISOKAZE",
      "FERRY_DOZEN",
      "FERRY_OKI",
      "FERRY_SHIRASHIMA",
      "FERRY_KUNIGA",
    ],
  },
  // 菱浦 → 来居
  {
    from: "HISHIURA",
    to: "KURI",
    ships: [
      "ISOKAZE",
      "FERRY_DOZEN",
      "FERRY_OKI",
      "FERRY_SHIRASHIMA",
      "FERRY_KUNIGA",
    ],
  },
  // 別府 → 七類
  {
    from: "BEPPU",
    to: "HONDO_SHICHIRUI",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 別府 → 境港
  {
    from: "BEPPU",
    to: "HONDO_SAKAIMINATO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 別府 → 西郷
  {
    from: "BEPPU",
    to: "SAIGO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 別府 → 菱浦
  {
    from: "BEPPU",
    to: "HISHIURA",
    ships: [
      "ISOKAZE",
      "FERRY_DOZEN",
      "FERRY_OKI",
      "FERRY_SHIRASHIMA",
      "FERRY_KUNIGA",
    ],
  },
  // 別府 → 来居
  {
    from: "BEPPU",
    to: "KURI",
    ships: [
      "ISOKAZE",
      "FERRY_DOZEN",
      "FERRY_OKI",
      "FERRY_SHIRASHIMA",
      "FERRY_KUNIGA",
    ],
  },
  // 来居 → 境港
  {
    from: "KURI",
    to: "HONDO_SAKAIMINATO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 来居 → 七類
  {
    from: "KURI",
    to: "HONDO_SHICHIRUI",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 来居 → 西郷
  {
    from: "KURI",
    to: "SAIGO",
    ships: ["FERRY_OKI", "FERRY_SHIRASHIMA", "FERRY_KUNIGA"],
  },
  // 来居 → 別府
  {
    from: "KURI",
    to: "BEPPU",
    ships: [
      "ISOKAZE",
      "FERRY_DOZEN",
      "FERRY_OKI",
      "FERRY_SHIRASHIMA",
      "FERRY_KUNIGA",
    ],
  },
  // 来居 → 菱浦
  {
    from: "KURI",
    to: "HISHIURA",
    ships: [
      "ISOKAZE",
      "FERRY_DOZEN",
      "FERRY_OKI",
      "FERRY_SHIRASHIMA",
      "FERRY_KUNIGA",
    ],
  },
];
