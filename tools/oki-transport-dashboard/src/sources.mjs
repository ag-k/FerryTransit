export const SOURCES = [
  {
    id: 'oki-kisen',
    name: '隠岐汽船',
    group: '船舶',
    operator: '隠岐汽船株式会社',
    officialUrl: 'https://www.oki-kisen.co.jp/',
    area: '本土・島後・島前',
    pages: [
      { role: 'timetable', label: 'フェリー・高速船時刻表', url: 'https://www.oki-kisen.co.jp/download/dl-timetable/29' },
      { role: 'fare', label: '運賃', url: 'https://www.oki-kisen.co.jp/fare/' },
      { role: 'notices', label: 'ニュース', url: 'https://www.oki-kisen.co.jp/news/' },
      { role: 'status', label: '運航状況', url: 'https://www.oki-kisen.co.jp/situation/' }
    ],
    expectedKeywords: ['時刻表', '運賃', '運航状況']
  },
  {
    id: 'oki-kanko',
    name: '隠岐観光・島前内航船',
    group: '船舶',
    operator: '隠岐観光株式会社',
    officialUrl: 'https://www.okikankou.com/',
    area: '西ノ島・海士・知夫',
    pages: [
      { role: 'notices', label: 'お知らせ', url: 'https://www.okikankou.com/' },
      { role: 'timetable', label: '島前内航船', url: 'https://www.okikankou.com/inter-island-ferry/' },
      { role: 'fare', label: '運賃詳細', url: 'https://www.okikankou.com/fee_detail' }
    ],
    expectedKeywords: ['島前内航船', 'いそかぜ', 'フェリーどうぜん']
  },
  {
    id: 'oki-ichibata',
    name: '隠岐一畑交通',
    group: '島後バス',
    operator: '隠岐一畑交通株式会社',
    officialUrl: 'https://oki.ichibata.co.jp/',
    area: '隠岐の島町',
    pages: [
      { role: 'timetable', label: '路線バスのご案内', url: 'https://oki.ichibata.co.jp/route.html' },
      { role: 'timetable', label: '路線バス時刻表', url: 'https://oki.ichibata.co.jp/route-time.html' },
      { role: 'timetable', label: '空港連絡バス', url: 'https://oki.ichibata.co.jp/airport.html' },
      { role: 'notices', label: '新着情報', url: 'https://oki.ichibata.co.jp/news/' }
    ],
    expectedKeywords: ['路線バス', '時刻表', '運賃表']
  },
  {
    id: 'okinoshima-town',
    name: '隠岐の島町内バス',
    group: '島後バス',
    operator: '隠岐の島町 / 隠岐一畑交通',
    officialUrl: 'https://www.town.okinoshima.shimane.jp/',
    area: '隠岐の島町',
    pages: [
      {
        role: 'timetable',
        label: '町内バス・デマンドタクシー時刻表',
        url: 'https://www.town.okinoshima.shimane.jp/kanko/tounaikoutuujouhou/7990.html'
      }
    ],
    expectedKeywords: ['町内バス', 'デマンドタクシー', '料金']
  },
  {
    id: 'ama-town',
    name: '海士町バス',
    group: '島前バス',
    operator: '海士町',
    officialUrl: 'https://www.town.ama.shimane.jp/',
    area: '海士町',
    pages: [
      { role: 'timetable', label: 'アクセス・交通', url: 'https://www.town.ama.shimane.jp/about/access' },
      { role: 'notices', label: 'お知らせ', url: 'https://www.town.ama.shimane.jp/information/' }
    ],
    expectedKeywords: ['島内巡回バス', '海士島線', '豊田線']
  },
  {
    id: 'nishinoshima-town',
    name: '西ノ島町営バス',
    group: '島前バス',
    operator: '西ノ島町',
    officialUrl: 'https://www.town.nishinoshima.shimane.jp/',
    area: '西ノ島町',
    pages: [
      {
        role: 'timetable',
        label: '町営バス・時刻表',
        url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47'
      }
    ],
    expectedKeywords: ['町営バス', '時刻表', '料金']
  },
  {
    id: 'chibu-village',
    name: '知夫村・島内交通',
    group: '島前バス',
    operator: '知夫村 / 知夫里島観光協会',
    officialUrl: 'http://www.chibu.jp/',
    area: '知夫村',
    pages: [
      { role: 'timetable', label: 'アクセス・島内交通', url: 'http://www.chibu.jp/access.html' },
      { role: 'notices', label: 'お知らせ', url: 'http://www.chibu.jp/news/' }
    ],
    expectedKeywords: ['アクセス', '島内交通', '時刻表'],
    includeImageDocuments: true
  },
  {
    id: 'oki-kouiki-bus',
    name: '隠岐汽船連絡バス',
    group: '連絡バス',
    operator: 'はつみ交通株式会社 / 隠岐広域連合',
    officialUrl: 'https://okikouiki.jp/',
    area: '七類・境港',
    pages: [
      { role: 'timetable', label: '七類・境港線', url: 'https://okikouiki.jp/oki-route/bus/' },
      { role: 'timetable', label: 'ポケット時刻表', url: 'https://okikouiki.jp/oki-route/pocket-timetable/' }
    ],
    expectedKeywords: ['時刻表', '運賃', '連絡バス']
  },
  {
    id: 'jal-oki-flights',
    name: 'JAL・隠岐空港発着便',
    group: '航空',
    operator: '日本航空株式会社 / ジェイエア / 日本エアコミューター',
    officialUrl: 'https://www.jal.co.jp/jp/ja/dom/route/time/',
    area: '隠岐・大阪（伊丹）・出雲',
    pages: [
      { role: 'timetable', label: '隠岐空港フライト情報', url: 'https://www.oki-airport.jp/flight' },
      {
        role: 'timetable',
        label: 'JAL令和8年度上期運航計画',
        url: 'https://www.oki-airport.jp/news/archives/14',
        fetchStrategy: 'curl'
      },
      { role: 'timetable', label: '出雲空港 就航路線・時刻表', url: 'https://www.izumo-airport.co.jp/flight/flight-time' }
    ],
    expectedKeywords: ['JAL', '隠岐', '大阪', '伊丹', '出雲', 'フライト', '時刻表', '8月1日', '8月28日', 'B738']
  },
  {
    id: 'ichibata-bus-connection',
    name: '一畑バス・隠岐汽船接続バス',
    group: '連絡バス',
    operator: '一畑バス株式会社',
    officialUrl: 'https://bus.ichibata.co.jp/oki-kisen/oki-kisen-sichirui/',
    area: '松江・七類・境港',
    pages: [
      {
        role: 'timetable',
        label: '松江・七類・境港間時刻表',
        url: 'https://bus.ichibata.co.jp/oki-kisen/oki-kisen-sichirui/'
      }
    ],
    expectedKeywords: ['隠岐汽船接続バス', '時刻表', '松江', '七類', '境港']
  }
]
