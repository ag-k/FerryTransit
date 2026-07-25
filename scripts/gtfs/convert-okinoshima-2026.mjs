#!/usr/bin/env node
/* eslint-disable no-console */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import Papa from 'papaparse'
import { getTransportSourceOperation } from '../../config/transport-sources.mjs'

// eslint-disable-next-line import/no-named-as-default-member
const { unparse: unparseCsv } = Papa

const ROOT = process.cwd()
const SOURCE_DIR = join(ROOT, 'gtfs', 'pdf', 'bus', 'okinoshima')
const RAW_DIR = join(ROOT, 'gtfs', 'raw', 'bus', 'okinoshima', '2026-03-02')
const CURRENT_DIR = join(ROOT, 'gtfs', 'current', 'bus', 'okinoshima')
const REPORT_DIR = join(ROOT, 'gtfs', 'reports', 'bus', 'okinoshima')

const FEED_START = '20260101'
const FEED_END = '20261231'
const FEED_VERSION = '20260302_20260101-20261231'
const TOWN_SOURCE_URL = getTransportSourceOperation('okinoshima-town').sourceUrl
const ICHIBATA_SOURCE_URL = 'https://oki.ichibata.co.jp/route-time.html'

const REQUIRED_SOURCES = [
  'sougoujikoku_20260302.pdf',
  'rosen_20260401.pdf',
  'goka_20260302.pdf',
  'sinnryoujo_20260302.pdf',
  'seibu_20260302.pdf'
]

const NEW_YEAR_DATES = ['20260101', '20260102', '20260103']
const YEAR_END_NEW_YEAR_DATES = [
  '20260101',
  '20260102',
  '20260103',
  '20261229',
  '20261230',
  '20261231'
]
const JAPAN_HOLIDAYS_2026 = [
  '20260101',
  '20260112',
  '20260211',
  '20260223',
  '20260320',
  '20260429',
  '20260504',
  '20260505',
  '20260506',
  '20260720',
  '20260811',
  '20260921',
  '20260922',
  '20260923',
  '20261012',
  '20261103',
  '20261123'
]

const STOP_COORDS = {
  eigyosho: [36.208850406177, 133.33012564642],
  port_plaza: [36.202732445536, 133.33450992186],
  port_mae: [36.202800217781, 133.33456130321],
  nakamachi: [36.204911341977, 133.33457510334],
  gogin_mae: [36.203688682162, 133.33350275503],
  yaobashi: [36.20574447, 133.32860926],
  bunka_kaikan: [36.20758697, 133.32459656],
  shioguchi: [36.202686942766, 133.32808969073],
  ja_mae: [36.210786577118, 133.32280600434],
  hiyoshibashi: [36.208571812042, 133.3213873413],
  ai_no_hashi: [36.205063158411, 133.3315192753],
  oki_hospital: [36.21533582718, 133.31793884554],
  nata: [36.212902692045, 133.32307062232],
  heishinkaichi: [36.220301249451, 133.30622104727],
  yakuba_mae: [36.213461718652, 133.31063746179],
  shimonishi: [36.20876507, 133.31730439],
  minami_junior_high: [36.215961299593, 133.30701250014],
  tsukinashi_iriguchi: [36.216049139311, 133.32078740797],
  araki: [36.223330549212, 133.3185084887],
  oki_high_school: [36.223349893074, 133.31472638785],
  kokubunji_mae: [36.223137535087, 133.30767466716],
  kokubunji_iriguchi: [36.221944579304, 133.30387654297],
  nishinaka_iriguchi: [36.211606809057, 133.33272861612],
  kami_yone: [36.213440852175, 133.33654203678],
  suisan_high_school: [36.222076100402, 133.33957881369],
  sakaemachi: [36.21475880044, 133.33061285897],
  inaki: [36.220628655197, 133.36599436598],
  oku: [36.251582953865, 133.37270666349],
  fuse: [36.293616220089, 133.35456319675],
  iibi: [36.305543606547, 133.33607007235],
  kuramibashi: [36.232385419491, 133.29463848181],
  mizuwakasu_shrine: [36.2781606, 133.2486596],
  goka_clinic: [36.28403073, 133.24929064],
  goka_branch: [36.29004802, 133.22663651],
  fukuura: [36.279424270221, 133.19946669836],
  kamo: [36.188195435462, 133.28065310503],
  takugi: [36.163741813579, 133.25087047365],
  tsudo: [36.167799822932, 133.24154403898],
  tsuma_mukoyama: [36.201933916108, 133.23130543039],
  nakamura: [36.316761648069, 133.30549711888],
  nishimura: [36.326955498675, 133.29416954104],
  igo: [36.326374313372, 133.27585901766],
  goka_kitagata: [36.289076, 133.225547],
  goka_shiro: [36.299947, 133.224461],
  kumi: [36.317809, 133.233812],
  mukaigaoka: [36.306736, 133.265302],
  yamada_1: [36.289881, 133.261394],
  yamada_2: [36.28939, 133.258344],
  yamada_3: [36.286328, 133.258432],
  yamada_4: [36.283924, 133.257513],
  goka_gun_waiting: [36.278735, 133.251076],
  tsuma_clinic: [36.196193905312, 133.23438501325],
  kamaya: [36.191897548062, 133.23711125614],
  neko: [36.187108542483, 133.2469929058],
  island: [36.178483680767, 133.24481618277],
  tsudo_waiting: [36.167799822932, 133.24154403898],
  town_bus_waiting: [36.167863934763, 133.23863959658],
  takugi_1: [36.163735701778, 133.25079325927],
  takugi_2: [36.162067268375, 133.25045584391],
  utaki_iriguchi: [36.216961028251, 133.26924484936],
  utaki: [36.218895654639, 133.26607351759],
  kurada: [36.249242024098, 133.18899038276],
  yui: [36.244233790265, 133.19318363269],
  hamanaku: [36.215497006097, 133.19660266641],
  kaminaku: [36.218570169015, 133.20594343159],
  otsuku: [36.210289400652, 133.2074670106],
  kamizato_hall: [36.204656091323, 133.23391843525],
  ja_tsuma: [36.194509413411, 133.23488362521],
  tsuma_branch: [36.196258896122, 133.23435029251]
}

const STOPS = [
  stop('eigyosho', '営業所', 36.2017, 133.3351),
  stop('port_plaza', 'ポートプラザ', 36.2011, 133.3369),
  stop('port_mae', 'ポート前', 36.2012, 133.3364),
  stop('nakamachi', '中町', 36.2021, 133.3357),
  stop('gogin_mae', '合銀前', 36.2028, 133.3343),
  stop('yaobashi', '八尾橋', 36.2045, 133.3327),
  stop('bunka_kaikan', '文化会館', 36.2040, 133.3304),
  stop('shioguchi', '塩口', 36.2038, 133.3315),
  stop('ja_mae', 'JA前', 36.2045, 133.3260),
  stop('hiyoshibashi', '日吉橋', 36.2062, 133.3380),
  stop('ai_no_hashi', '愛の橋', 36.2040, 133.3396),
  stop('oki_hospital', '隠岐病院', 36.2070, 133.3190),
  stop('nata', '名田', 36.1986, 133.3280),
  stop('heishinkaichi', '平新開地', 36.2042, 133.3122),
  stop('yakuba_mae', '役場前', 36.2020, 133.3061),
  stop('shimonishi', '下西', 36.2028, 133.3042),
  stop('minami_junior_high', '南中学校', 36.2020, 133.2980),
  stop('tsukinashi_iriguchi', '月無入口', 36.2082, 133.3150),
  stop('araki', '有木', 36.2120, 133.3098),
  stop('oki_high_school', '隠岐高校', 36.2131, 133.3106),
  stop('kokubunji_mae', '国分寺前', 36.2225, 133.3130),
  stop('kokubunji_iriguchi', '国分寺入口', 36.2218, 133.3134),
  stop('nishinaka_iriguchi', '西中入口', 36.2075, 133.3450),
  stop('kami_yone', '神米', 36.2092, 133.3484),
  stop('suisan_high_school', '水産高校', 36.2110, 133.3516),
  stop('sakaemachi', '栄町', 36.2057, 133.3425),
  stop('inaki', '犬来', 36.2220, 133.3790),
  stop('oku', '大久', 36.2350, 133.3970),
  stop('fuse', '布施', 36.2910, 133.3860),
  stop('iibi', '飯美', 36.3080, 133.4040),
  stop('kuramibashi', '蔵見橋', 36.2490, 133.2620),
  stop('mizuwakasu_shrine', '水若酢神社', 36.2690, 133.2435),
  stop('goka_clinic', '五箇診療所前', 36.2676, 133.2396),
  stop('goka_branch', '五箇支所', 36.2669, 133.2387),
  stop('fukuura', '福浦', 36.3220, 133.1960),
  stop('kamo', '加茂', 36.1820, 133.2530),
  stop('takugi', '蛸木', 36.1840, 133.2220),
  stop('tsudo', '津戸', 36.1980, 133.2040),
  stop('tsuma_mukoyama', '向山', 36.2050, 133.1915),
  stop('nakamura', '中村', 36.2920, 133.3190),
  stop('nishimura', '西村', 36.3090, 133.3260),
  stop('igo', '伊後', 36.3390, 133.3370),
  stop('goka_kitagata', '北方', 36.2760, 133.2380),
  stop('goka_shiro', '代', 36.2910, 133.2320),
  stop('kumi', '久見', 36.3070, 133.2110),
  stop('mukaigaoka', '向ヶ丘', 36.2870, 133.2440),
  stop('yamada_1', '山田1', 36.2760, 133.2550),
  stop('yamada_2', '山田2', 36.2770, 133.2560),
  stop('yamada_3', '山田3', 36.2780, 133.2570),
  stop('yamada_4', '山田4', 36.2790, 133.2580),
  stop('goka_gun_waiting', '郡バス待合所', 36.2660, 133.2405),
  stop('tsuma_clinic', '都万診療所前', 36.2030, 133.1965),
  stop('kamaya', '釜屋', 36.1910, 133.2020),
  stop('neko', '猫尾', 36.1900, 133.2100),
  stop('island', 'あいらんど', 36.1930, 133.2160),
  stop('tsudo_waiting', '津戸バス待合所', 36.1981, 133.2043),
  stop('town_bus_waiting', '町営バス待合所', 36.2022, 133.1962),
  stop('takugi_1', '蛸木1', 36.1840, 133.2212),
  stop('takugi_2', '蛸木2', 36.1845, 133.2200),
  stop('utaki_iriguchi', '歌木入口', 36.1980, 133.1870),
  stop('utaki', '歌木', 36.1990, 133.1780),
  stop('kurada', '蔵田', 36.1940, 133.1700),
  stop('yui', '油井', 36.1900, 133.1650),
  stop('hamanaku', '浜那久', 36.1760, 133.1710),
  stop('kaminaku', '上那久', 36.1780, 133.1810),
  stop('otsuku', '大津久', 36.1880, 133.1950),
  stop('kamizato_hall', '上里集会所前', 36.1980, 133.2020),
  stop('ja_tsuma', 'JA都万支店前', 36.2032, 133.1970),
  stop('tsuma_branch', '役場都万支所', 36.2027, 133.1964)
]

const ROUTES = [
  route('OKI_ICHIBATA_TSUMA', 'OKI_ICHIBATA', '都万線', '隠岐一畑交通 都万線', '都万・向山方面の路線バス', '2563EB'),
  route('OKI_ICHIBATA_GOKA', 'OKI_ICHIBATA', '五箇線', '隠岐一畑交通 五箇線', '五箇・福浦方面の路線バス', '0F766E'),
  route('OKI_ICHIBATA_NAKAMURA', 'OKI_ICHIBATA', '中村線', '隠岐一畑交通 中村線', '中村・伊後方面の路線バス', '7C3AED'),
  route('OKI_ICHIBATA_FUSE', 'OKI_ICHIBATA', '布施線', '隠岐一畑交通 布施線', '布施・飯美方面の路線バス', 'DC2626'),
  route('OKI_ICHIBATA_LOOP_RIGHT', 'OKI_ICHIBATA', '循環線 右回り', '隠岐一畑交通 循環線 右回り', '西郷市街地の右回り循環線', '0891B2'),
  route('OKI_ICHIBATA_LOOP_LEFT', 'OKI_ICHIBATA', '循環線 左回り', '隠岐一畑交通 循環線 左回り', '西郷市街地の左回り循環線', '0EA5E9'),
  route('OKI_ICHIBATA_SUISAN', 'OKI_ICHIBATA', '水産高校線', '隠岐一畑交通 水産高校線', '水産高校方面の路線バス', 'D97706'),
  route('OKI_ICHIBATA_OKI_HIGH', 'OKI_ICHIBATA', '隠岐高校線', '隠岐一畑交通 隠岐高校線', '隠岐高校方面の路線バス', 'BE123C'),
  route('OKINOSHIMA_TOWN_GOKA', 'OKINOSHIMA_TOWN', '五箇循環線', '隠岐の島町営バス 五箇循環線', '五箇地域の町営バス', '16A34A'),
  route('OKINOSHIMA_TOWN_TSUDO', 'OKINOSHIMA_TOWN', '津戸線', '隠岐の島町営バス 津戸線', '都万診療所循環線 津戸線', '84CC16'),
  route('OKINOSHIMA_TOWN_TAKUGI', 'OKINOSHIMA_TOWN', '蛸木線', '隠岐の島町営バス 蛸木線', '都万診療所循環線 蛸木線', '65A30D'),
  route('OKINOSHIMA_TOWN_UTAKI', 'OKINOSHIMA_TOWN', '歌木線', '隠岐の島町営バス 歌木線', '都万診療所循環線 歌木線', 'CA8A04'),
  route('OKINOSHIMA_TOWN_SEIBU', 'OKINOSHIMA_TOWN', '都万西部線', '隠岐の島町営バス 都万西部線', '都万西部地域の町営バス', 'EA580C')
]

const TRIPS = [
  ...pairedTrips('OKI_ICHIBATA_GOKA', 'route_daily_except_new_year', '五箇線', ['eigyosho', 'oki_hospital', 'oki_high_school', 'kuramibashi', 'mizuwakasu_shrine', 'goka_clinic', 'goka_branch', 'fukuura'], [
    ['08:29', '08:45', null, '08:53', '09:06', '09:09', '09:14', '09:19'],
    ['12:28', '12:32', null, '12:40', '12:53', '12:56', '13:01', '13:06'],
    ['14:58', '15:02', null, '15:10', '15:23', '15:26', '15:31', '15:36'],
    ['17:46', '17:50', '17:56', '18:01', '18:14', '18:17', '18:22', '18:27']
  ], ['fukuura', 'goka_branch', 'goka_clinic', 'mizuwakasu_shrine', 'kuramibashi', 'oki_high_school', 'oki_hospital', 'eigyosho'], [
    ['07:18', '07:23', '07:28', '07:31', '07:44', '07:49', '07:55', '07:59'],
    ['09:56', '10:01', '10:06', '10:09', '10:22', null, '10:30', '10:46'],
    ['13:36', '13:41', '13:46', '13:49', '14:02', null, '14:10', '14:14'],
    ['15:56', '16:01', '16:06', '16:09', '16:22', null, '16:30', '16:34']
  ]),
  ...pairedTrips('OKI_ICHIBATA_TSUMA', 'route_daily_except_new_year', '都万線', ['eigyosho', 'oki_hospital', 'oki_high_school', 'yakuba_mae', 'kamo', 'takugi', 'tsudo', 'tsuma_mukoyama'], [
    ['08:48', '08:52', null, '08:58', '09:08', '09:17', '09:24', '09:32'],
    ['12:14', '12:30', null, '12:36', '12:46', '12:55', '13:02', '13:10'],
    ['14:34', '15:04', null, '15:10', '15:20', '15:29', '15:36', '15:44'],
    ['17:48', '17:52', '17:58', '18:02', '18:12', '18:21', '18:28', '18:36']
  ], ['tsuma_mukoyama', 'tsudo', 'takugi', 'kamo', 'yakuba_mae', 'oki_high_school', 'oki_hospital', 'eigyosho'], [
    ['07:11', '07:19', '07:26', '07:35', '07:45', '07:49', '07:55', '07:59'],
    ['09:45', '09:53', '10:00', '10:09', '10:19', null, '10:25', '10:29'],
    ['13:25', '13:33', '13:40', '13:49', '13:59', null, '14:05', '14:09'],
    ['15:50', '15:58', '16:05', '16:14', '16:24', null, '16:30', '16:34']
  ]),
  ...pairedTrips('OKI_ICHIBATA_NAKAMURA', 'route_daily_except_new_year', '中村線', ['eigyosho', 'oki_hospital', 'oki_high_school', 'kokubunji_iriguchi', 'kuramibashi', 'nakamura', 'nishimura', 'igo'], [
    ['08:50', '08:54', null, '08:59', '09:02', '09:19', '09:23', '09:27'],
    ['11:53', '12:25', null, '12:30', '12:33', '12:50', '12:54', '12:58'],
    ['14:51', '14:55', null, '15:00', '15:03', '15:20', '15:24', '15:28'],
    ['17:33', '17:45', '17:51', '17:53', '17:56', '18:13', '18:17', '18:21']
  ], ['igo', 'nishimura', 'nakamura', 'kuramibashi', 'kokubunji_iriguchi', 'oki_high_school', 'oki_hospital', 'eigyosho'], [
    ['07:24', '07:28', '07:32', '07:49', '07:52', '07:54', '08:00', '08:16'],
    ['09:52', '09:56', '10:00', '10:17', '10:20', null, '10:25', '10:29'],
    ['13:32', '13:36', '13:40', '13:57', '14:00', null, '14:05', '14:09'],
    ['16:02', '16:06', '16:10', '16:27', '16:30', null, '16:35', '16:51']
  ]),
  ...pairedTrips('OKI_ICHIBATA_FUSE', 'route_daily_except_new_year', '布施線', ['eigyosho', 'oki_hospital', 'sakaemachi', 'suisan_high_school', 'inaki', 'oku', 'fuse', 'iibi'], [
    ['08:46', '08:50', '08:54', '08:57', '09:03', '09:15', '09:34', '09:41'],
    ['11:52', '12:22', '12:26', '12:29', '12:35', '12:47', '13:06', '13:13'],
    ['14:56', '15:00', '15:04', '15:07', '15:13', '15:25', '15:44', '15:51'],
    ['17:12', '17:42', '17:46', '17:49', '17:55', '18:07', '18:26', '18:33']
  ], ['iibi', 'fuse', 'oku', 'inaki', 'suisan_high_school', 'sakaemachi', 'oki_hospital', 'eigyosho'], [
    ['07:04', '07:11', '07:30', '07:42', '07:48', '07:51', '07:55', '07:59'],
    ['09:54', '10:01', '10:20', '10:32', '10:38', '10:41', '10:45', '11:15'],
    ['13:34', '13:41', '14:00', '14:12', '14:18', '14:21', '14:25', '14:41'],
    ['16:04', '16:11', '16:30', '16:42', '16:48', '16:51', '16:55', '17:25']
  ]),
  ...singleDirectionTrips('OKI_ICHIBATA_LOOP_RIGHT', 'route_daily_except_new_year', '循環線 右回り', ['eigyosho', 'nata', 'oki_hospital', 'ja_mae', 'bunka_kaikan', 'shioguchi', 'port_mae', 'gogin_mae', 'yaobashi', 'bunka_kaikan', 'shimonishi', 'yakuba_mae', 'heishinkaichi', 'oki_hospital', 'nata', 'eigyosho'], [
    ['09:20', '09:22', '09:24', '09:26', '09:30', '09:31', '09:33', '09:36', '09:38', '09:39', '09:42', '09:44', '09:46', '09:50', '09:52', '09:54'],
    ['10:45', null, '10:45', '10:47', '10:51', '10:52', '10:54', '10:57', '10:59', '11:00', '11:03', '11:05', '11:07', '11:11', '11:13', '11:15'],
    ['11:39', '11:41', '11:43', '11:45', '11:49', '11:50', '11:52', '11:55', '11:57', '11:58', '12:01', '12:03', '12:05', '12:09', '12:11', '12:13'],
    ['14:13', '14:15', '14:17', '14:19', '14:23', '14:24', '14:26', '14:29', '14:31', '14:32', '14:35', '14:37', '14:39', '14:43', '14:45', '14:47'],
    ['16:55', null, '16:55', '16:57', '17:01', '17:02', '17:04', '17:07', '17:09', '17:10', '17:13', '17:15', '17:17', '17:21', '17:23', '17:25']
  ]),
  ...singleDirectionTrips('OKI_ICHIBATA_LOOP_LEFT', 'route_daily_except_new_year', '循環線 左回り', ['eigyosho', 'nata', 'oki_hospital', 'heishinkaichi', 'yakuba_mae', 'shimonishi', 'bunka_kaikan', 'shioguchi', 'port_mae', 'gogin_mae', 'yaobashi', 'bunka_kaikan', 'ja_mae', 'oki_hospital', 'nata', 'eigyosho'], [
    ['08:29', null, null, null, null, null, null, '08:31', '08:33', '08:36', '08:38', '08:39', '08:43', '08:45', null, null],
    ['11:52', '11:54', '11:56', '12:00', '12:02', '12:04', '12:07', '12:08', '12:10', '12:13', '12:15', '12:16', '12:20', '12:22', null, null],
    ['13:01', '13:03', '13:05', '13:09', '13:11', '13:13', '13:16', '13:17', '13:19', '13:22', '13:24', '13:25', '13:29', '13:31', '13:33', '13:35'],
    ['15:35', '15:37', '15:39', '15:43', '15:45', '15:47', '15:50', '15:51', '15:53', '15:56', '15:58', '15:59', '16:03', '16:05', '16:07', '16:09'],
    ['17:12', '17:14', '17:16', '17:20', '17:22', '17:24', '17:27', '17:28', '17:30', '17:33', '17:35', '17:36', '17:40', '17:42', null, null]
  ]),
  ...singleDirectionTrips('OKI_ICHIBATA_OKI_HIGH', 'route_daily_except_new_year', '隠岐高校線', ['eigyosho', 'port_mae', 'nakamachi', 'gogin_mae', 'ai_no_hashi', 'hiyoshibashi', 'ja_mae', 'oki_hospital', 'tsukinashi_iriguchi', 'araki', 'oki_high_school', 'kokubunji_mae', 'heishinkaichi', 'oki_hospital', 'eigyosho'], [
    ['07:44', '07:48', '07:50', '07:51', '07:52', '07:56', '07:58', '08:00', '08:03', '08:05', '08:06', '08:07', '08:08', '08:12', '08:16'],
    ['10:44', '10:48', '10:50', '10:51', '10:52', '10:56', '10:58', '11:00', '11:03', '11:05', '11:06', '11:07', '11:08', '11:12', '11:16']
  ]),
  ...singleDirectionTrips('OKI_ICHIBATA_SUISAN', 'route_daily_except_new_year', '水産高校線', ['eigyosho', 'oki_hospital', 'ja_mae', 'hiyoshibashi', 'port_mae', 'nakamachi', 'ai_no_hashi', 'eigyosho', 'nishinaka_iriguchi', 'kami_yone', 'suisan_high_school', 'sakaemachi', 'nata', 'oki_hospital', 'eigyosho'], [
    ['08:00', '08:00', '08:02', '08:04', '08:09', '08:11', '08:13', '08:16', '08:18', '08:19', '08:21', '08:24', '08:26', '08:28', '08:32'],
    ['11:53', '11:57', '11:59', '12:01', '12:06', '12:08', '12:10', '12:13', '12:15', '12:16', '12:18', '12:21', '12:23', '12:25', null],
    ['17:33', null, null, null, null, null, null, '17:33', '17:35', '17:36', '17:38', '17:41', '17:43', '17:45', null]
  ]),
  ...pairedTrips('OKINOSHIMA_TOWN_GOKA', 'town_daily_except_new_year', '五箇循環線', ['goka_branch', 'goka_kitagata', 'goka_shiro', 'kumi', 'mukaigaoka', 'yamada_2', 'yamada_1', 'yamada_2', 'yamada_3', 'yamada_4', 'goka_clinic', 'goka_gun_waiting', 'goka_branch'], [
    ['06:51', '06:52', '06:56', '07:02', '07:11', '07:17', '07:18', '07:19', '07:21', '07:22', '07:23', '07:24', '07:29'],
    ['09:26', '09:27', '09:31', '09:37', '09:46', '09:52', '09:53', '09:54', '09:56', '09:57', '09:58', '09:59', '10:04']
  ], ['goka_branch', 'goka_gun_waiting', 'goka_clinic', 'yamada_4', 'yamada_3', 'yamada_2', 'yamada_1', 'yamada_2', 'mukaigaoka', 'kumi', 'goka_shiro', 'goka_kitagata', 'goka_branch'], [
    ['12:51', '12:56', '12:57', '12:58', '12:59', '13:01', '13:02', '13:03', '13:09', '13:18', '13:24', '13:28', '13:29'],
    ['15:21', '15:26', '15:27', '15:28', '15:29', '15:31', '15:32', '15:33', '15:39', '15:48', '15:54', '15:58', '15:59'],
    ['18:16', '18:21', '18:22', '18:23', '18:24', '18:26', '18:27', '18:28', '18:34', '18:43', '18:49', '18:53', '18:54']
  ]),
  ...singleDirectionTrips('OKINOSHIMA_TOWN_TSUDO', 'town_tsudo_mon_thu', '津戸線', ['tsuma_clinic', 'kamaya', 'neko', 'island', 'tsudo_waiting', 'town_bus_waiting', 'tsudo_waiting', 'island', 'neko', 'kamaya', 'tsuma_clinic'], [
    ['08:25', '08:28', '08:31', '08:34', '08:38', '08:39', '08:51', '08:55', '08:58', '09:01', '09:04'],
    ['11:30', '11:33', '11:36', '11:39', '11:43', '11:44', '11:52', '11:56', '11:59', '12:02', '12:05']
  ]),
  ...singleDirectionTrips('OKINOSHIMA_TOWN_TAKUGI', 'town_takugi_tue_fri', '蛸木線', ['tsuma_clinic', 'kamaya', 'neko', 'island', 'takugi_1', 'takugi_2', 'island', 'neko', 'kamaya', 'tsuma_clinic'], [
    ['08:25', '08:28', '08:31', '08:34', '08:42', '08:46', '08:53', '08:56', '08:59', '09:02'],
    ['11:30', '11:33', '11:36', '11:39', '11:47', '11:51', '11:58', '12:01', '12:04', '12:07']
  ]),
  ...singleDirectionTrips('OKINOSHIMA_TOWN_UTAKI', 'town_utaki_wed', '歌木線', ['tsuma_clinic', 'kamaya', 'utaki_iriguchi', 'utaki', 'utaki_iriguchi', 'kamaya', 'tsuma_clinic'], [
    ['08:25', '08:28', '08:39', '08:42', '08:50', '09:01', '09:04'],
    ['11:30', '11:33', '11:44', '11:47', '11:51', '12:02', '12:05']
  ]),
  ...pairedTrips('OKINOSHIMA_TOWN_SEIBU', 'town_daily_except_new_year', '都万西部線', ['kurada', 'yui', 'hamanaku', 'kaminaku', 'otsuku', 'kamizato_hall', 'tsuma_mukoyama', 'tsuma_branch', 'ja_tsuma'], [
    ['08:55', '08:58', '09:06', '09:08', '09:17', '09:28', '09:30', '09:32', '09:34'],
    ['12:25', '12:28', '12:36', '12:38', '12:47', '12:58', '13:00', '13:02', '13:04'],
    ['15:05', '15:08', '15:16', '15:18', '15:27', '15:38', '15:40', '15:42', '15:44']
  ], ['ja_tsuma', 'tsuma_branch', 'tsuma_mukoyama', 'kamizato_hall', 'otsuku', 'kaminaku', 'hamanaku', 'yui', 'kurada'], [
    ['09:58', '10:00', '10:02', '10:04', '10:15', '10:24', '10:26', '10:34', '10:37'],
    ['13:28', '13:30', '13:32', '13:34', '13:45', '13:54', '13:56', '14:04', '14:07'],
    ['16:08', '16:10', '16:12', '16:14', '16:25', '16:34', '16:36', '16:44', '16:47']
  ])
]

function stop(id, name, lat, lon) {
  const [resolvedLat, resolvedLon] = STOP_COORDS[id] ?? [lat, lon]

  return {
    stop_id: id,
    stop_code: id,
    stop_name: name,
    stop_desc: '隠岐の島町内バス停',
    stop_lat: String(resolvedLat),
    stop_lon: String(resolvedLon),
    zone_id: '',
    stop_url: '',
    location_type: '0',
    parent_station: '',
    platform_code: ''
  }
}

function route(routeId, agencyId, shortName, longName, desc, color) {
  return {
    route_id: routeId,
    agency_id: agencyId,
    route_short_name: shortName,
    route_long_name: longName,
    route_desc: desc,
    route_type: '3',
    route_url: agencyId === 'OKI_ICHIBATA' ? ICHIBATA_SOURCE_URL : TOWN_SOURCE_URL,
    route_color: color,
    route_text_color: 'FFFFFF'
  }
}

function pairedTrips(routeId, serviceId, shortName, outboundStops, outboundTimes, inboundStops, inboundTimes) {
  return [
    ...singleDirectionTrips(routeId, serviceId, shortName, outboundStops, outboundTimes, 0),
    ...singleDirectionTrips(routeId, serviceId, shortName, inboundStops, inboundTimes, 1)
  ]
}

function singleDirectionTrips(routeId, serviceId, shortName, stopIds, timeRows, directionId = 0) {
  return timeRows.map((times, index) => ({
    routeId,
    serviceId,
    shortName,
    directionId,
    tripId: [
      routeId,
      directionId,
      String(index + 1).padStart(2, '0'),
      times.find(Boolean)?.replace(':', '') || '0000'
    ].join('_'),
    headsign: stopName(stopIds[stopIds.length - 1]),
    stops: stopIds
      .map((stopId, stopIndex) => ({ stopId, time: times[stopIndex] }))
      .filter(row => row.time)
  })).filter(trip => trip.stops.length >= 2)
}

function stopName(stopId) {
  return STOPS.find(stopRow => stopRow.stop_id === stopId)?.stop_name || stopId
}

function agencyRows() {
  return [
    {
      agency_id: 'OKI_ICHIBATA',
      agency_name: '隠岐一畑交通',
      agency_url: 'https://oki.ichibata.co.jp/',
      agency_timezone: 'Asia/Tokyo',
      agency_lang: 'ja',
      agency_phone: '08512-2-1281'
    },
    {
      agency_id: 'OKINOSHIMA_TOWN',
      agency_name: '隠岐の島町',
      agency_url: 'https://www.town.okinoshima.shimane.jp/',
      agency_timezone: 'Asia/Tokyo',
      agency_lang: 'ja',
      agency_phone: '08512-2-8570'
    }
  ]
}

function calendarRows() {
  return [
    calendar('route_daily_except_new_year', [1, 1, 1, 1, 1, 1, 1]),
    calendar('town_daily_except_new_year', [1, 1, 1, 1, 1, 1, 1]),
    calendar('town_tsudo_mon_thu', [1, 0, 0, 1, 0, 0, 0]),
    calendar('town_takugi_tue_fri', [0, 1, 0, 0, 1, 0, 0]),
    calendar('town_utaki_wed', [0, 0, 1, 0, 0, 0, 0])
  ]
}

function calendar(serviceId, [monday, tuesday, wednesday, thursday, friday, saturday, sunday]) {
  return {
    service_id: serviceId,
    monday: String(monday),
    tuesday: String(tuesday),
    wednesday: String(wednesday),
    thursday: String(thursday),
    friday: String(friday),
    saturday: String(saturday),
    sunday: String(sunday),
    start_date: FEED_START,
    end_date: FEED_END
  }
}

function calendarDateRows() {
  const rows = []
  for (const serviceId of ['route_daily_except_new_year', 'town_daily_except_new_year']) {
    for (const date of NEW_YEAR_DATES) {
      rows.push({ service_id: serviceId, date, exception_type: '2' })
    }
  }

  for (const serviceId of ['town_tsudo_mon_thu', 'town_takugi_tue_fri', 'town_utaki_wed']) {
    for (const date of Array.from(new Set([...YEAR_END_NEW_YEAR_DATES, ...JAPAN_HOLIDAYS_2026]))) {
      rows.push({ service_id: serviceId, date, exception_type: '2' })
    }
  }

  return rows
}

function tripRows() {
  return TRIPS.map(trip => ({
    route_id: trip.routeId,
    service_id: trip.serviceId,
    trip_id: trip.tripId,
    trip_headsign: trip.headsign,
    direction_id: String(trip.directionId),
    block_id: '',
    trip_short_name: trip.shortName,
    shape_id: '',
    jp_trip_desc: '',
    jp_pattern_id: trip.tripId
  }))
}

function stopTimeRows() {
  return TRIPS.flatMap(trip => trip.stops.map((entry, index) => ({
    trip_id: trip.tripId,
    arrival_time: `${entry.time}:00`,
    departure_time: `${entry.time}:00`,
    stop_id: entry.stopId,
    stop_sequence: String(index + 1),
    stop_headsign: '',
    pickup_type: '0',
    drop_off_type: '0',
    timepoint: '1'
  })))
}

function fareAttributesRows() {
  return [
    {
      fare_id: 'OKI_ICHIBATA_MAX_ADULT',
      price: '500',
      currency_type: 'JPY',
      payment_method: '0',
      transfers: '0',
      agency_id: 'OKI_ICHIBATA'
    },
    {
      fare_id: 'OKINOSHIMA_TOWN_FLAT_ADULT',
      price: '300',
      currency_type: 'JPY',
      payment_method: '0',
      transfers: '0',
      agency_id: 'OKINOSHIMA_TOWN'
    }
  ]
}

function fareRulesRows() {
  return [
    ...ROUTES.filter(routeRow => routeRow.agency_id === 'OKI_ICHIBATA').map(routeRow => ({
      fare_id: 'OKI_ICHIBATA_MAX_ADULT',
      route_id: routeRow.route_id,
      origin_id: '',
      destination_id: '',
      contains_id: ''
    })),
    ...ROUTES.filter(routeRow => routeRow.agency_id === 'OKINOSHIMA_TOWN').map(routeRow => ({
      fare_id: 'OKINOSHIMA_TOWN_FLAT_ADULT',
      route_id: routeRow.route_id,
      origin_id: '',
      destination_id: '',
      contains_id: ''
    }))
  ]
}

function feedInfoRows() {
  return [{
    feed_publisher_name: '隠岐の島町',
    feed_publisher_url: TOWN_SOURCE_URL,
    feed_lang: 'ja',
    feed_start_date: FEED_START,
    feed_end_date: FEED_END,
    feed_version: FEED_VERSION
  }]
}

function writeCsv(filePath, rows, columns) {
  mkdirSync(join(filePath, '..'), { recursive: true })
  const normalizedRows = rows.map(row => Object.fromEntries(
    columns.map(column => [column, row[column] ?? ''])
  ))
  writeFileSync(filePath, `${unparseCsv(normalizedRows, { columns, newline: '\n' })}\n`, 'utf-8')
}

function writeGtfs(outputDir) {
  writeCsv(join(outputDir, 'agency.txt'), agencyRows(), [
    'agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone'
  ])
  writeCsv(join(outputDir, 'stops.txt'), STOPS, [
    'stop_id', 'stop_code', 'stop_name', 'stop_desc', 'stop_lat', 'stop_lon',
    'zone_id', 'stop_url', 'location_type', 'parent_station', 'platform_code'
  ])
  writeCsv(join(outputDir, 'routes.txt'), ROUTES, [
    'route_id', 'agency_id', 'route_short_name', 'route_long_name',
    'route_desc', 'route_type', 'route_url', 'route_color', 'route_text_color'
  ])
  writeCsv(join(outputDir, 'calendar.txt'), calendarRows(), [
    'service_id', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday', 'start_date', 'end_date'
  ])
  writeCsv(join(outputDir, 'calendar_dates.txt'), calendarDateRows(), [
    'service_id', 'date', 'exception_type'
  ])
  writeCsv(join(outputDir, 'trips.txt'), tripRows(), [
    'route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id',
    'block_id', 'trip_short_name', 'shape_id', 'jp_trip_desc', 'jp_pattern_id'
  ])
  writeCsv(join(outputDir, 'stop_times.txt'), stopTimeRows(), [
    'trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence',
    'stop_headsign', 'pickup_type', 'drop_off_type', 'timepoint'
  ])
  writeCsv(join(outputDir, 'fare_attributes.txt'), fareAttributesRows(), [
    'fare_id', 'price', 'currency_type', 'payment_method', 'transfers', 'agency_id'
  ])
  writeCsv(join(outputDir, 'fare_rules.txt'), fareRulesRows(), [
    'fare_id', 'route_id', 'origin_id', 'destination_id', 'contains_id'
  ])
  writeCsv(join(outputDir, 'feed_info.txt'), feedInfoRows(), [
    'feed_publisher_name', 'feed_publisher_url', 'feed_lang',
    'feed_start_date', 'feed_end_date', 'feed_version'
  ])
  writeCsv(join(outputDir, 'transfers.txt'), [], [
    'from_stop_id', 'to_stop_id', 'transfer_type', 'min_transfer_time'
  ])
  writeCsv(join(outputDir, 'translations.txt'), [], [
    'table_name', 'field_name', 'language', 'translation', 'record_id', 'record_sub_id', 'field_value'
  ])
}

function parseArgs(argv) {
  return {
    outputDir: valueAfter(argv, '--output') || RAW_DIR,
    updateCurrent: argv.includes('--current')
  }
}

function valueAfter(argv, key) {
  const index = argv.indexOf(key)
  if (index === -1) return null
  return argv[index + 1] || null
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  for (const sourceName of REQUIRED_SOURCES) {
    const sourcePath = join(SOURCE_DIR, sourceName)
    if (!existsSync(sourcePath)) {
      throw new Error(`PDF 原本が見つかりません: ${sourcePath}`)
    }
  }

  writeGtfs(args.outputDir)
  if (args.updateCurrent && resolve(args.outputDir) !== resolve(CURRENT_DIR)) {
    cpSync(args.outputDir, CURRENT_DIR, { recursive: true })
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  const report = {
    convertedAt: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    sourceUrls: {
      town: TOWN_SOURCE_URL,
      ichibata: ICHIBATA_SOURCE_URL
    },
    outputDir: args.outputDir,
    currentUpdated: args.updateCurrent,
    feedStartDate: FEED_START,
    feedEndDate: FEED_END,
    feedVersion: FEED_VERSION,
    counts: {
      agencies: agencyRows().length,
      routes: ROUTES.length,
      stops: STOPS.length,
      services: calendarRows().length,
      calendarDates: calendarDateRows().length,
      trips: tripRows().length,
      stopTimes: stopTimeRows().length
    },
    notes: [
      '隠岐一畑交通の固定時刻表と隠岐の島町営バス3資料を GTFS に転記',
      '隠岐空港線は航空便連動の相対時刻のため固定時刻GTFSから除外',
      '町営バス都万診療所循環線は曜日別運行と祝祭日・年末年始運休を calendar/calendar_dates に反映',
      '隠岐一畑交通の運賃は区間制のため、アプリ表示用には最大運賃500円を fare_attributes に保持'
    ]
  }
  writeFileSync(join(REPORT_DIR, '2026-03-02.conversion.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf-8')

  console.log(`隠岐の島町バス GTFS を生成しました: ${args.outputDir}`)
  if (args.updateCurrent) {
    console.log(`current も更新しました: ${CURRENT_DIR}`)
  }
  console.log(`routes=${ROUTES.length}, stops=${STOPS.length}, trips=${TRIPS.length}, stop_times=${stopTimeRows().length}`)
}

main()
