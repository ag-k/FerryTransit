#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, join, resolve } from 'path'
import { spawnSync } from 'child_process'
import Papa from 'papaparse'

const ROOT = process.cwd()
const SOURCE_PDF = join(ROOT, 'gtfs', 'pdf', 'bus', 'nishinoshima', '20260220140915710489010da.pdf')
const RAW_DIR = join(ROOT, 'gtfs', 'raw', 'bus', 'nishinoshima', '2026-01-01')
const CURRENT_DIR = join(ROOT, 'gtfs', 'current', 'bus', 'nishinoshima')
const REPORT_DIR = join(ROOT, 'gtfs', 'reports', 'bus', 'nishinoshima')

const FEED_START = '20260301'
const FEED_END = '20261231'
const FEED_VERSION = '20260220140915710489010da_20260301-20261231_rev20260731_symbols'

const HOLIDAYS_2026 = new Set([
  '20260320',
  '20260429',
  '20260503',
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
])

const ROUTES = [
  {
    route_id: 'NISHINOSHIMA_MAIN',
    agency_id: 'NISHINOSHIMA_TOWN',
    route_short_name: '町営バス',
    route_long_name: '西ノ島町営バス',
    route_desc: '西ノ島町営バスの主要系統',
    route_type: '3',
    route_url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    route_color: '0F766E',
    route_text_color: 'FFFFFF'
  },
  {
    route_id: 'NISHINOSHIMA_UGA',
    agency_id: 'NISHINOSHIMA_TOWN',
    route_short_name: '宇賀線',
    route_long_name: '西ノ島町営バス 宇賀線',
    route_desc: '宇賀・大山方面の系統',
    route_type: '3',
    route_url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    route_color: '2563EB',
    route_text_color: 'FFFFFF'
  },
  {
    route_id: 'NISHINOSHIMA_CHINZAKI_SANDO',
    agency_id: 'NISHINOSHIMA_TOWN',
    route_short_name: '珍崎線・三度線',
    route_long_name: '西ノ島町営バス 珍崎線・三度線',
    route_desc: '浦郷・赤ノ江・珍崎・三度方面の系統',
    route_type: '3',
    route_url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    route_color: 'DC2626',
    route_text_color: 'FFFFFF'
  },
  {
    route_id: 'NISHINOSHIMA_KUNIGA',
    agency_id: 'NISHINOSHIMA_TOWN',
    route_short_name: '国賀線',
    route_long_name: '西ノ島町営バス 国賀線',
    route_desc: '季節運行の国賀方面系統',
    route_type: '3',
    route_url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    route_color: '7C3AED',
    route_text_color: 'FFFFFF'
  },
  {
    route_id: 'NISHINOSHIMA_HATO',
    agency_id: 'NISHINOSHIMA_TOWN',
    route_short_name: '波止線',
    route_long_name: '西ノ島町営バス 波止線',
    route_desc: '波止方面の系統',
    route_type: '3',
    route_url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    route_color: 'D97706',
    route_text_color: 'FFFFFF'
  },
  {
    route_id: 'NISHINOSHIMA_DIRECT',
    agency_id: 'NISHINOSHIMA_TOWN',
    route_short_name: '直行便',
    route_long_name: '西ノ島町営バス 直行便',
    route_desc: '由良車庫・浦郷・別府方面の直行便',
    route_type: '3',
    route_url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    route_color: '0891B2',
    route_text_color: 'FFFFFF'
  }
]

const EXTRA_STOPS = [
  {
    stop_id: 'nishinoshima_026',
    stop_code: '26',
    stop_name: '波止',
    stop_desc: '西ノ島町営バス停留所マップ掲載停留所',
    stop_lat: '36.07446789',
    stop_lon: '133.01485121',
    zone_id: '',
    stop_url: '',
    location_type: '0',
    parent_station: '',
    platform_code: ''
  },
  {
    stop_id: 'nishinoshima_027',
    stop_code: '27',
    stop_name: '浦郷観光船のりば',
    stop_desc: '西ノ島町営バス停留所マップ掲載停留所',
    stop_lat: '36.09271694',
    stop_lon: '132.99378312',
    zone_id: '',
    stop_url: '',
    location_type: '0',
    parent_station: '',
    platform_code: ''
  }
]

const STOP_COLUMNS = [
  'stop_id',
  'stop_code',
  'stop_name',
  'stop_desc',
  'stop_lat',
  'stop_lon',
  'zone_id',
  'stop_url',
  'location_type',
  'parent_station',
  'platform_code'
]

const TRIPS = [
  {
    code: 'T01_UGA_0707',
    routeId: 'NISHINOSHIMA_UGA',
    serviceId: 'star_weekday_plus_summer',
    directionId: '0',
    shortName: '宇賀線',
    desc: '三度・珍崎・国賀・浦郷から別府・島前病院・大山・宇賀方面行き',
    stops: [[7, '07:07'], [3, '07:11'], [2, '07:14'], [1, '07:17']]
  },
  {
    code: 'T02_MAIN_0653',
    routeId: 'NISHINOSHIMA_MAIN',
    directionId: '0',
    shortName: '1便',
    desc: '三度・珍崎・国賀・浦郷から別府・島前病院・大山・宇賀方面行き',
    stops: [[23, '06:53'], [21, '06:57'], [20, '07:01'], [19, '07:03'], [18, '07:08'], [17, '07:09'], [16, '07:10'], [15, '07:11'], [14, '07:12'], [13, '07:13'], [12, '07:13'], [11, '07:15'], [9, '07:17'], [8, '07:21'], [7, '07:22'], [6, '07:23'], [5, '07:25'], [4, '07:30']],
    serviceVariants: [
      { serviceId: 'star_weekday_plus_summer' },
      {
        suffix: '_STAR_BASE', serviceId: 'star_base_only', dropLast: 2,
        desc: '赤ノ江から隠岐汽船（別府港）方面行き（★区間運休日）'
      }
    ]
  },
  {
    code: 'T03_CHINZAKI_SANDO_0725',
    routeId: 'NISHINOSHIMA_CHINZAKI_SANDO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '0',
    shortName: '珍崎線・三度線',
    desc: '三度・珍崎から浦郷方面行き',
    stops: [[25, '07:25'], [24, '07:25'], [23, '07:35'], [21, '07:39'], [20, '07:43']]
  },
  {
    code: 'T04_MAIN_0741',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'daily',
    directionId: '0',
    shortName: '2便',
    desc: '浦郷から別府・島前病院方面行き',
    stops: [[21, '07:41'], [20, '07:45'], [19, '07:47'], [18, '07:52'], [17, '07:53'], [16, '07:54'], [15, '07:55'], [14, '07:56'], [13, '07:57'], [12, '07:57'], [11, '07:59'], [9, '08:01'], [8, '08:05'], [7, '08:06'], [6, '08:07'], [5, '08:09']]
  },
  {
    code: 'T05_MAIN_0930',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'daily',
    directionId: '0',
    shortName: '3便',
    desc: '赤ノ江から別府・島前病院方面行き',
    stops: [[23, '09:30'], [21, '09:34'], [20, '09:38'], [19, '09:40'], [18, '09:45'], [17, '09:46'], [16, '09:47'], [15, '09:48'], [14, '09:49'], [13, '09:50'], [12, '09:50'], [11, '09:52'], [9, '09:55'], [8, '09:59'], [7, '10:00'], [6, '10:01'], [5, '10:03']]
  },
  {
    code: 'T06_UGA_1010',
    routeId: 'NISHINOSHIMA_UGA',
    directionId: '0',
    shortName: '4便',
    desc: '浦郷から宇賀方面行き',
    stops: [[21, '10:10'], [20, '10:14'], [19, '10:16'], [18, '10:21'], [17, '10:22'], [16, '10:23'], [15, '10:24'], [14, '10:25'], [13, '10:26'], [12, '10:26'], [11, '10:28'], [9, '10:31'], [8, '10:35'], [7, '10:36'], [6, '10:37'], [5, '10:39'], [3, '10:46'], [2, '10:49'], [1, '10:52']],
    serviceVariants: [
      { serviceId: 'star_weekday_plus_summer' },
      {
        suffix: '_STAR_BASE', serviceId: 'star_base_only', dropLast: 4,
        desc: '浦郷から隠岐汽船（別府港）方面行き（★区間運休日）'
      }
    ]
  },
  {
    code: 'T07_KUNIGA_1127',
    routeId: 'NISHINOSHIMA_KUNIGA',
    directionId: '0',
    shortName: '5便',
    desc: '国賀から大山方面行き',
    stops: [[22, '11:27'], [21, '11:34'], [20, '11:38'], [19, '11:40'], [18, '11:45'], [17, '11:46'], [16, '11:47'], [15, '11:48'], [14, '11:49'], [13, '11:50'], [12, '11:50'], [11, '11:52'], [9, '11:55'], [8, '11:59'], [7, '12:00'], [6, '12:01'], [5, '12:03'], [4, '12:08']],
    serviceVariants: [
      { serviceId: 'kuniga_spring_fall_star_on' },
      {
        suffix: '_STAR_BASE', serviceId: 'kuniga_spring_fall_star_off', dropLast: 2,
        desc: '国賀から隠岐汽船（別府港）方面行き（★区間運休日）'
      },
      {
        suffix: '_KUNIGA_BASE', serviceId: 'kuniga_spring_fall_base_star_on', dropFirst: 1,
        desc: '由良車庫から大山方面行き（◎区間運休期間）'
      },
      {
        suffix: '_BASE', serviceId: 'kuniga_spring_fall_base_star_off', dropFirst: 1, dropLast: 2,
        desc: '由良車庫から隠岐汽船（別府港）方面行き（◎・★区間運休日）'
      }
    ]
  },
  {
    code: 'T08_CHINZAKI_SANDO_1245',
    routeId: 'NISHINOSHIMA_CHINZAKI_SANDO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '0',
    shortName: '珍崎線・三度線',
    desc: '三度・珍崎から浦郷方面行き',
    stops: [[25, '12:45'], [24, '12:45'], [23, '12:55'], [21, '12:59'], [20, '13:03']]
  },
  {
    code: 'T09_KUNIGA_1258',
    routeId: 'NISHINOSHIMA_KUNIGA',
    serviceId: 'kuniga_summer',
    directionId: '0',
    shortName: '6便',
    desc: '国賀から島前病院方面行き',
    stops: [[22, '12:58'], [21, '13:05'], [20, '13:09'], [19, '13:11'], [18, '13:16'], [17, '13:17'], [16, '13:18'], [15, '13:19'], [14, '13:20'], [13, '13:21'], [12, '13:21'], [11, '13:23'], [10, '13:24'], [9, '13:28'], [8, '13:32'], [7, '13:33'], [6, '13:34'], [5, '13:36']],
    serviceVariants: [
      { serviceId: 'kuniga_summer' },
      {
        suffix: '_BASE', serviceId: 'kuniga_summer_base', dropFirst: 1,
        desc: '由良車庫から島前病院方面行き'
      }
    ]
  },
  {
    code: 'T10_KUNIGA_1441',
    routeId: 'NISHINOSHIMA_KUNIGA',
    directionId: '0',
    shortName: '7便',
    desc: '国賀から大山方面行き',
    stops: [[22, '14:41'], [21, '14:48'], [20, '14:52'], [19, '14:54'], [18, '14:59'], [17, '15:00'], [16, '15:01'], [15, '15:02'], [14, '15:03'], [13, '15:04'], [12, '15:04'], [11, '15:06'], [9, '15:09'], [8, '15:13'], [7, '15:14'], [6, '15:15'], [5, '15:17'], [4, '15:22']],
    serviceVariants: [
      { serviceId: 'kuniga_spring_fall_star_on' },
      {
        suffix: '_STAR_BASE', serviceId: 'kuniga_spring_fall_star_off', dropLast: 2,
        desc: '国賀から隠岐汽船（別府港）方面行き（★区間運休日）'
      },
      {
        suffix: '_KUNIGA_BASE', serviceId: 'kuniga_spring_fall_base_star_on', dropFirst: 1,
        desc: '由良車庫から大山方面行き（◎区間運休期間）'
      },
      {
        suffix: '_BASE', serviceId: 'kuniga_spring_fall_base_star_off', dropFirst: 1, dropLast: 2,
        desc: '由良車庫から隠岐汽船（別府港）方面行き（◎・★区間運休日）'
      }
    ]
  },
  {
    code: 'T11_CHINZAKI_SANDO_1621',
    routeId: 'NISHINOSHIMA_CHINZAKI_SANDO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '0',
    shortName: '珍崎線・三度線',
    desc: '三度・珍崎から浦郷方面行き',
    stops: [[25, '16:21'], [24, '16:21'], [23, '16:31'], [21, '16:35'], [20, '16:38']]
  },
  {
    code: 'T12_KUNIGA_1627',
    routeId: 'NISHINOSHIMA_KUNIGA',
    serviceId: 'kuniga_summer',
    directionId: '0',
    shortName: '8便',
    desc: '国賀から別府方面行き',
    stops: [[22, '16:27'], [21, '16:34'], [20, '16:38'], [19, '16:40'], [18, '16:45'], [17, '16:46'], [16, '16:47'], [15, '16:48'], [14, '16:49'], [13, '16:50'], [12, '16:50'], [11, '16:52'], [10, '16:53'], [9, '16:57'], [8, '17:01'], [7, '17:02'], [6, '17:03']],
    serviceVariants: [
      { serviceId: 'kuniga_summer' },
      {
        suffix: '_BASE', serviceId: 'kuniga_summer_base', dropFirst: 1,
        desc: '由良車庫から別府方面行き'
      }
    ]
  },
  {
    code: 'T13_UGA_1709',
    routeId: 'NISHINOSHIMA_UGA',
    directionId: '0',
    shortName: '9便',
    desc: '浦郷から宇賀方面行き',
    stops: [[21, '17:09'], [20, '17:13'], [19, '17:15'], [18, '17:20'], [17, '17:21'], [16, '17:22'], [15, '17:23'], [14, '17:24'], [13, '17:25'], [12, '17:25'], [11, '17:27'], [9, '17:29'], [8, '17:33'], [7, '17:34'], [6, '17:35'], [5, '17:37'], [3, '17:45'], [2, '17:48'], [1, '17:51']],
    serviceVariants: [
      { serviceId: 'star_weekday_plus_summer' },
      {
        suffix: '_STAR_BASE', serviceId: 'star_base_only', dropLast: 4,
        desc: '浦郷から隠岐汽船（別府港）方面行き（★区間運休日）'
      }
    ]
  },
  {
    code: 'T14_MAIN_1829',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'daily',
    directionId: '0',
    shortName: '10便',
    desc: '浦郷から別府方面行き',
    stops: [[21, '18:29'], [20, '18:33'], [19, '18:35'], [18, '18:40'], [17, '18:41'], [16, '18:42'], [15, '18:43'], [14, '18:44'], [13, '18:45'], [12, '18:45'], [11, '18:47'], [9, '18:49'], [8, '18:53'], [7, '18:54'], [6, '18:55']]
  },
  {
    code: 'T15_SPECIAL_1531',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'range_0808_0816',
    directionId: '0',
    shortName: '8/8-8/16',
    desc: '8/8-8/16運行の浦郷から別府方面行き',
    stops: [[21, '15:31'], [20, '15:35'], [19, '15:37'], [18, '15:42'], [17, '15:43'], [16, '15:44'], [15, '15:45'], [14, '15:46'], [13, '15:47'], [12, '15:47'], [11, '15:49'], [9, '15:51'], [8, '15:55'], [7, '15:56'], [6, '15:57']]
  },
  {
    code: 'B01_UGA_0717',
    routeId: 'NISHINOSHIMA_UGA',
    serviceId: 'star_weekday_plus_summer',
    directionId: '1',
    shortName: '宇賀線',
    desc: '宇賀・大山・島前病院・別府から浦郷・国賀・珍崎・三度方面行き',
    stops: [[1, '07:17'], [2, '07:20'], [3, '07:23'], [7, '07:27']]
  },
  {
    code: 'B02_MAIN_0736',
    routeId: 'NISHINOSHIMA_MAIN',
    directionId: '1',
    shortName: '1便',
    desc: '大山・島前病院・別府から浦郷方面行き',
    stops: [[4, '07:36'], [5, '07:41'], [7, '07:50'], [6, '07:51'], [8, '07:52'], [9, '07:56'], [11, '07:58'], [12, '08:00'], [13, '08:00'], [14, '08:01'], [15, '08:02'], [16, '08:03'], [17, '08:04'], [18, '08:05'], [19, '08:10'], [20, '08:12'], [21, '08:16']],
    serviceVariants: [
      { serviceId: 'star_weekday_plus_summer' },
      {
        suffix: '_STAR_BASE', serviceId: 'star_base_only', dropFirst: 2,
        desc: '別府交通センターから浦郷方面行き（★区間運休日）'
      }
    ]
  },
  {
    code: 'B03_CHINZAKI_SANDO_0707',
    routeId: 'NISHINOSHIMA_CHINZAKI_SANDO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '1',
    shortName: '珍崎線・三度線',
    desc: '浦郷から三度方面行き',
    stops: [[20, '07:07'], [21, '07:11'], [23, '07:15'], [24, '07:25'], [25, '07:25']]
  },
  {
    code: 'B04_MAIN_0837',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'daily',
    directionId: '1',
    shortName: '2便',
    desc: '島前病院・別府から赤ノ江方面行き',
    stops: [[5, '08:37'], [6, '08:39'], [7, '08:40'], [8, '08:41'], [9, '08:45'], [11, '08:47'], [12, '08:49'], [13, '08:49'], [14, '08:50'], [15, '08:51'], [16, '08:52'], [17, '08:53'], [18, '08:54'], [19, '08:59'], [20, '09:01'], [21, '09:05'], [23, '09:09']]
  },
  {
    code: 'B05_KUNIGA_1017',
    routeId: 'NISHINOSHIMA_KUNIGA',
    directionId: '1',
    shortName: '3便',
    desc: '島前病院・別府から国賀方面行き',
    stops: [[5, '10:17'], [6, '10:19'], [7, '10:20'], [8, '10:21'], [9, '10:25'], [11, '10:27'], [12, '10:30'], [13, '10:30'], [14, '10:31'], [15, '10:32'], [16, '10:33'], [17, '10:34'], [18, '10:35'], [19, '10:40'], [20, '10:42'], [21, '10:46'], [22, '10:53']],
    serviceVariants: [
      { serviceId: 'kuniga_spring_fall' },
      {
        suffix: '_BASE', serviceId: 'kuniga_spring_fall_base', dropLast: 1,
        desc: '島前病院・別府から由良車庫方面行き（◎区間運休期間）'
      }
    ]
  },
  {
    code: 'B06_UGA_1100',
    routeId: 'NISHINOSHIMA_UGA',
    directionId: '1',
    shortName: '4便',
    desc: '宇賀から浦郷方面行き',
    stops: [[1, '11:00'], [2, '11:03'], [3, '11:06'], [5, '11:14'], [6, '11:16'], [7, '11:17'], [8, '11:18'], [9, '11:22'], [11, '11:24'], [12, '11:27'], [13, '11:27'], [14, '11:28'], [15, '11:29'], [16, '11:30'], [17, '11:31'], [18, '11:32'], [19, '11:37'], [20, '11:39'], [21, '11:43']],
    serviceVariants: [
      { serviceId: 'star_weekday_plus_summer' },
      {
        suffix: '_STAR_BASE', serviceId: 'star_base_only', dropFirst: 4,
        desc: '隠岐汽船（別府港）から浦郷方面行き（★区間運休日）'
      }
    ]
  },
  {
    code: 'B07_KUNIGA_1212',
    routeId: 'NISHINOSHIMA_KUNIGA',
    directionId: '1',
    shortName: '5便',
    desc: '大山・島前病院・別府から国賀方面行き',
    stops: [[4, '12:12'], [5, '12:17'], [6, '12:19'], [7, '12:20'], [8, '12:21'], [9, '12:25'], [11, '12:27'], [12, '12:30'], [13, '12:30'], [14, '12:31'], [15, '12:32'], [16, '12:33'], [17, '12:34'], [18, '12:35'], [19, '12:40'], [20, '12:42'], [21, '12:46'], [22, '12:53']],
    serviceVariants: [
      { serviceId: 'kuniga_summer_star_on' },
      {
        suffix: '_STAR_BASE', serviceId: 'kuniga_summer_star_off', dropFirst: 2,
        desc: '隠岐汽船（別府港）から国賀方面行き（★区間運休日）'
      },
      {
        suffix: '_KUNIGA_BASE', serviceId: 'kuniga_summer_base_star_on', dropLast: 1,
        desc: '大山・島前病院・別府から由良車庫方面行き（●区間運休期間）'
      },
      {
        suffix: '_BASE', serviceId: 'kuniga_summer_base_star_off', dropFirst: 2, dropLast: 1,
        desc: '隠岐汽船（別府港）から由良車庫方面行き（●・★区間運休日）'
      }
    ]
  },
  {
    code: 'B08_CHINZAKI_SANDO_1227',
    routeId: 'NISHINOSHIMA_CHINZAKI_SANDO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '1',
    shortName: '珍崎線・三度線',
    desc: '浦郷から三度方面行き',
    stops: [[20, '12:27'], [21, '12:31'], [23, '12:35'], [24, '12:45'], [25, '12:45']]
  },
  {
    code: 'B09_KUNIGA_1358',
    routeId: 'NISHINOSHIMA_KUNIGA',
    directionId: '1',
    shortName: '6便',
    desc: '島前病院・別府から国賀方面行き',
    stops: [[5, '13:58'], [6, '14:00'], [7, '14:01'], [8, '14:02'], [9, '14:06'], [10, '14:09'], [11, '14:10'], [12, '14:13'], [13, '14:13'], [14, '14:14'], [15, '14:15'], [16, '14:16'], [17, '14:17'], [18, '14:18'], [19, '14:23'], [20, '14:25'], [21, '14:29'], [22, '14:36']],
    serviceVariants: [
      { serviceId: 'kuniga_spring_fall' },
      {
        suffix: '_BASE', serviceId: 'kuniga_spring_fall_base', dropLast: 1,
        desc: '島前病院・別府から由良車庫方面行き（◎区間運休期間）'
      }
    ]
  },
  {
    code: 'B10_KUNIGA_1528',
    routeId: 'NISHINOSHIMA_KUNIGA',
    directionId: '1',
    shortName: '7便',
    desc: '大山・島前病院・別府から国賀方面行き',
    stops: [[4, '15:28'], [5, '15:33'], [6, '15:35'], [7, '15:36'], [8, '15:37'], [9, '15:41'], [11, '15:43'], [12, '15:46'], [13, '15:46'], [14, '15:47'], [15, '15:48'], [16, '15:49'], [17, '15:50'], [18, '15:51'], [19, '15:56'], [20, '15:58'], [21, '16:02'], [22, '16:09']],
    serviceVariants: [
      { serviceId: 'kuniga_summer_star_on' },
      {
        suffix: '_STAR_BASE', serviceId: 'kuniga_summer_star_off', dropFirst: 2,
        desc: '隠岐汽船（別府港）から国賀方面行き（★区間運休日）'
      },
      {
        suffix: '_KUNIGA_BASE', serviceId: 'kuniga_summer_base_star_on', dropLast: 1,
        desc: '大山・島前病院・別府から由良車庫方面行き（●区間運休期間）'
      },
      {
        suffix: '_BASE', serviceId: 'kuniga_summer_base_star_off', dropFirst: 2, dropLast: 1,
        desc: '隠岐汽船（別府港）から由良車庫方面行き（●・★区間運休日）'
      }
    ]
  },
  {
    code: 'B11_CHINZAKI_SANDO_1603',
    routeId: 'NISHINOSHIMA_CHINZAKI_SANDO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '1',
    shortName: '珍崎線・三度線',
    desc: '浦郷から三度方面行き',
    stops: [[20, '16:03'], [21, '16:07'], [23, '16:11'], [24, '16:21'], [25, '16:21']]
  },
  {
    code: 'B12_MAIN_1725',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'daily',
    directionId: '1',
    shortName: '8便',
    desc: '隠岐汽船・別府から浦郷方面行き',
    stops: [[6, '17:25'], [7, '17:26'], [8, '17:27'], [9, '17:31'], [10, '17:34'], [11, '17:35'], [12, '17:38'], [13, '17:38'], [14, '17:39'], [15, '17:40'], [16, '17:41'], [17, '17:42'], [18, '17:43'], [19, '17:48'], [20, '17:50'], [21, '17:54']]
  },
  {
    code: 'B13_UGA_1815',
    routeId: 'NISHINOSHIMA_UGA',
    directionId: '1',
    shortName: '9便',
    desc: '宇賀から浦郷方面行き',
    stops: [[1, '18:15'], [2, '18:18'], [3, '18:21'], [5, '18:29'], [6, '18:31'], [7, '18:32'], [8, '18:33'], [9, '18:37'], [11, '18:39'], [12, '18:41'], [13, '18:41'], [14, '18:42'], [15, '18:43'], [16, '18:44'], [17, '18:45'], [18, '18:46'], [19, '18:51'], [20, '18:53'], [21, '18:57']],
    serviceVariants: [
      { serviceId: 'star_weekday_plus_summer' },
      {
        suffix: '_STAR_BASE', serviceId: 'star_base_only', dropFirst: 4,
        desc: '隠岐汽船（別府港）から浦郷方面行き（★区間運休日）'
      }
    ]
  },
  {
    code: 'B14_MAIN_1908',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'daily',
    directionId: '1',
    shortName: '10便',
    desc: '別府から浦郷方面行き',
    stops: [[7, '19:08'], [6, '19:09'], [8, '19:10'], [9, '19:14'], [11, '19:16'], [12, '19:18'], [13, '19:18'], [14, '19:19'], [15, '19:20'], [16, '19:21'], [17, '19:22'], [18, '19:23'], [19, '19:28'], [20, '19:30'], [21, '19:34']]
  },
  {
    code: 'B15_SPECIAL_KUNIGA_1420',
    routeId: 'NISHINOSHIMA_KUNIGA',
    serviceId: 'range_0501_0506_0808_0816',
    directionId: '1',
    shortName: '5/1-5/6・8/8-8/16',
    desc: '期間運行の別府から国賀方面行き',
    stops: [[6, '14:20'], [7, '14:21'], [8, '14:22'], [9, '14:26'], [11, '14:29'], [12, '14:32'], [13, '14:32'], [14, '14:33'], [15, '14:34'], [16, '14:35'], [17, '14:36'], [18, '14:37'], [19, '14:42'], [20, '14:44'], [21, '14:48'], [22, '14:55']]
  },
  {
    code: 'B16_SPECIAL_1615',
    routeId: 'NISHINOSHIMA_MAIN',
    serviceId: 'range_0808_0816',
    directionId: '1',
    shortName: '8/8-8/16',
    desc: '期間運行の別府から浦郷方面行き',
    stops: [[6, '16:15'], [7, '16:16'], [8, '16:17'], [9, '16:21'], [11, '16:23'], [12, '16:25'], [13, '16:25'], [14, '16:26'], [15, '16:27'], [16, '16:28'], [17, '16:29'], [18, '16:30'], [19, '16:35'], [20, '16:37'], [21, '16:41']]
  },
  {
    code: 'H01_HATO_0735',
    routeId: 'NISHINOSHIMA_HATO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '0',
    shortName: '波止線 1便',
    desc: '波止線 1便',
    stops: [[14, '07:35'], [26, '07:41'], [26, '07:41'], [14, '07:47'], [18, '07:51'], [20, '07:58'], [21, '08:02']]
  },
  {
    code: 'H02_HATO_1130',
    routeId: 'NISHINOSHIMA_HATO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '0',
    shortName: '波止線 2便',
    desc: '波止線 2便（直行平日混乗）',
    stops: [[21, '11:30'], [20, '11:34'], [14, '11:40'], [26, '11:46'], [26, '11:46'], [14, '11:52'], [7, '12:02'], [6, '12:03'], [5, '12:05']]
  },
  {
    code: 'H03_HATO_1533',
    routeId: 'NISHINOSHIMA_HATO',
    serviceId: 'star_weekday_plus_summer',
    directionId: '0',
    shortName: '波止線 3便',
    desc: '波止線 3便',
    stops: [[21, '15:33'], [20, '15:37'], [18, '15:44'], [14, '15:48'], [26, '15:54'], [26, '15:54'], [14, '16:00'], [20, '16:06'], [21, '16:10']]
  },
  {
    code: 'D01_DIRECT_HOLIDAY_1130',
    routeId: 'NISHINOSHIMA_DIRECT',
    serviceId: 'holiday_direct_except_summer',
    directionId: '0',
    shortName: '直行便 土日祝ダイヤ',
    desc: '直行便 土日祝ダイヤ（7/18-8/17運休）',
    stops: [[21, '11:30'], [20, '11:34'], [7, '11:45'], [6, '11:46']]
  },
  {
    code: 'D02_DIRECT_WEEKDAY_1210',
    routeId: 'NISHINOSHIMA_DIRECT',
    serviceId: 'star_weekday_plus_summer',
    directionId: '1',
    shortName: '直行便 平日ダイヤ',
    desc: '直行便 平日ダイヤ',
    stops: [[5, '12:10'], [6, '12:15'], [7, '12:16'], [20, '12:27'], [21, '12:31']]
  },
  {
    code: 'D03_DIRECT_HOLIDAY_1215',
    routeId: 'NISHINOSHIMA_DIRECT',
    serviceId: 'holiday_direct_except_summer',
    directionId: '1',
    shortName: '直行便 土日祝ダイヤ',
    desc: '直行便 土日祝ダイヤ（7/18-8/17運休）',
    stops: [[6, '12:15'], [7, '12:16'], [20, '12:27'], [21, '12:31']]
  }
]

function readCsv(filePath) {
  const text = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data
}

function writeCsv(filePath, rows, columns) {
  mkdirSync(join(filePath, '..'), { recursive: true })
  writeFileSync(filePath, `${Papa.unparse(rows, { columns })}\n`, 'utf-8')
}

function stopId(number) {
  return `nishinoshima_${String(number).padStart(3, '0')}`
}

function normalizeTime(time) {
  return `${time}:00`
}

function normalizeCsvCell(value) {
  return String(value ?? '').replace(/[\r\n]/g, '').replace(/^"+|"+$/g, '')
}

function normalizeStopSpecs(stops) {
  return stops.filter(([number, time], index) => {
    const previous = stops[index - 1]
    if (!previous) return true
    return previous[0] !== number || previous[1] !== time
  })
}

function tripSpecs() {
  return TRIPS.flatMap((spec) => {
    if (!spec.serviceVariants) return [spec]

    const { serviceVariants, ...baseSpec } = spec
    return serviceVariants.map((variant) => {
      const { suffix = '', dropFirst = 0, dropLast = 0, ...overrides } = variant
      const end = dropLast > 0 ? spec.stops.length - dropLast : spec.stops.length
      return {
        ...baseSpec,
        ...overrides,
        code: `${spec.code}${suffix}`,
        stops: spec.stops.slice(dropFirst, end)
      }
    })
  })
}

function addTrip(context, spec) {
  const tripId = spec.code
  const stopRows = normalizeStopSpecs(spec.stops).map(([number, time], index) => ({
    trip_id: tripId,
    arrival_time: normalizeTime(time),
    departure_time: normalizeTime(time),
    stop_id: stopId(number),
    stop_sequence: String(index + 1),
    stop_headsign: '',
    pickup_type: '',
    drop_off_type: '',
    timepoint: '1'
  }))
  const lastStopId = stopRows.at(-1)?.stop_id
  const headsign = lastStopId ? context.stopNames.get(lastStopId) || '' : ''

  context.trips.push({
    route_id: spec.routeId,
    service_id: spec.serviceId,
    trip_id: tripId,
    trip_headsign: headsign,
    direction_id: spec.directionId,
    block_id: '',
    trip_short_name: spec.shortName,
    shape_id: '',
    jp_trip_desc: spec.desc,
    jp_pattern_id: spec.code
  })
  context.stopTimes.push(...stopRows)
}

function ymdToDate(value) {
  return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8))))
}

function dateToYmd(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('')
}

function dateRange(start, end) {
  const dates = []
  for (let date = ymdToDate(start); date <= ymdToDate(end); date.setUTCDate(date.getUTCDate() + 1)) {
    dates.push(dateToYmd(date))
  }
  return dates
}

function isWeekend(ymd) {
  const day = ymdToDate(ymd).getUTCDay()
  return day === 0 || day === 6
}

function isWeekdayHoliday(ymd) {
  return HOLIDAYS_2026.has(ymd) && !isWeekend(ymd)
}

function inRange(ymd, start, end) {
  return ymd >= start && ymd <= end
}

function isStarServiceDate(ymd) {
  return inRange(ymd, '20260718', '20260817') || (!isWeekend(ymd) && !HOLIDAYS_2026.has(ymd))
}

function addDateOnlyServiceRows(rows, serviceId, predicate) {
  for (const date of dateRange(FEED_START, FEED_END)) {
    if (predicate(date)) rows.push({ service_id: serviceId, date, exception_type: '1' })
  }
}

function calendarRows() {
  return [
    row('daily', [1, 1, 1, 1, 1, 1, 1], FEED_START, FEED_END),
    row('star_weekday_plus_summer', [1, 1, 1, 1, 1, 0, 0], FEED_START, FEED_END),
    row('holiday_direct_except_summer', [0, 0, 0, 0, 0, 1, 1], FEED_START, FEED_END),
    row('kuniga_spring_fall', [1, 1, 1, 1, 1, 1, 1], '20260415', '20261021'),
    row('kuniga_summer', [1, 1, 1, 1, 1, 1, 1], '20260701', '20260831'),
    row('kuniga_summer_base', [1, 1, 1, 1, 1, 1, 1], FEED_START, FEED_END),
    row('range_0808_0816', [1, 1, 1, 1, 1, 1, 1], '20260808', '20260816')
  ]
}

function row(serviceId, days, startDate, endDate) {
  return {
    service_id: serviceId,
    monday: String(days[0]),
    tuesday: String(days[1]),
    wednesday: String(days[2]),
    thursday: String(days[3]),
    friday: String(days[4]),
    saturday: String(days[5]),
    sunday: String(days[6]),
    start_date: startDate,
    end_date: endDate
  }
}

function calendarDateRows() {
  const rows = []
  const summerAllRunDates = dateRange('20260718', '20260817')

  for (const date of dateRange(FEED_START, FEED_END)) {
    if (isWeekdayHoliday(date) && !inRange(date, '20260718', '20260817')) {
      rows.push({ service_id: 'star_weekday_plus_summer', date, exception_type: '2' })
    }
  }
  for (const date of summerAllRunDates) {
    if (isWeekend(date)) {
      rows.push({ service_id: 'star_weekday_plus_summer', date, exception_type: '1' })
    }
  }

  for (const date of dateRange(FEED_START, FEED_END)) {
    if (isWeekdayHoliday(date) && !inRange(date, '20260718', '20260817')) {
      rows.push({ service_id: 'holiday_direct_except_summer', date, exception_type: '1' })
    }
  }
  for (const date of summerAllRunDates) {
    if (isWeekend(date)) {
      rows.push({ service_id: 'holiday_direct_except_summer', date, exception_type: '2' })
    }
  }

  for (const date of [
    ...dateRange('20260501', '20260506'),
    ...dateRange('20260808', '20260816')
  ]) {
    rows.push({ service_id: 'range_0501_0506_0808_0816', date, exception_type: '1' })
  }

  for (const date of dateRange('20260701', '20260831')) {
    rows.push({ service_id: 'kuniga_summer_base', date, exception_type: '2' })
  }

  addDateOnlyServiceRows(rows, 'star_base_only', date => !isStarServiceDate(date))
  addDateOnlyServiceRows(rows, 'kuniga_spring_fall_base', date => (
    !inRange(date, '20260415', '20261021')
  ))

  addDateOnlyServiceRows(rows, 'kuniga_spring_fall_star_on', date => (
    inRange(date, '20260415', '20261021') && isStarServiceDate(date)
  ))
  addDateOnlyServiceRows(rows, 'kuniga_spring_fall_star_off', date => (
    inRange(date, '20260415', '20261021') && !isStarServiceDate(date)
  ))
  addDateOnlyServiceRows(rows, 'kuniga_spring_fall_base_star_on', date => (
    !inRange(date, '20260415', '20261021') && isStarServiceDate(date)
  ))
  addDateOnlyServiceRows(rows, 'kuniga_spring_fall_base_star_off', date => (
    !inRange(date, '20260415', '20261021') && !isStarServiceDate(date)
  ))

  addDateOnlyServiceRows(rows, 'kuniga_summer_star_on', date => (
    inRange(date, '20260701', '20260831') && isStarServiceDate(date)
  ))
  addDateOnlyServiceRows(rows, 'kuniga_summer_star_off', date => (
    inRange(date, '20260701', '20260831') && !isStarServiceDate(date)
  ))
  addDateOnlyServiceRows(rows, 'kuniga_summer_base_star_on', date => (
    !inRange(date, '20260701', '20260831') && isStarServiceDate(date)
  ))
  addDateOnlyServiceRows(rows, 'kuniga_summer_base_star_off', date => (
    !inRange(date, '20260701', '20260831') && !isStarServiceDate(date)
  ))

  return rows
}

function agencyRows() {
  return [{
    agency_id: 'NISHINOSHIMA_TOWN',
    agency_name: '西ノ島町',
    agency_url: 'https://www.town.nishinoshima.shimane.jp/',
    agency_timezone: 'Asia/Tokyo',
    agency_lang: 'ja',
    agency_phone: '08514-6-1220'
  }]
}

function fareAttributesRows() {
  return [{
    fare_id: 'NISHINOSHIMA_FLAT_ADULT',
    price: '200',
    currency_type: 'JPY',
    payment_method: '0',
    transfers: '0',
    agency_id: 'NISHINOSHIMA_TOWN'
  }]
}

function fareRulesRows() {
  return ROUTES.map(route => ({
    fare_id: 'NISHINOSHIMA_FLAT_ADULT',
    route_id: route.route_id,
    origin_id: '',
    destination_id: '',
    contains_id: ''
  }))
}

function feedInfoRows() {
  return [{
    feed_publisher_name: '西ノ島町',
    feed_publisher_url: 'https://www.town.nishinoshima.shimane.jp/bunya/b_kurashi/b_kotsu/47',
    feed_lang: 'ja',
    feed_start_date: FEED_START,
    feed_end_date: FEED_END,
    feed_version: FEED_VERSION
  }]
}

function transferRows() {
  return []
}

function translationRows() {
  return []
}

function readStops() {
  const stopsPath = join(RAW_DIR, 'stops.txt')
  if (!existsSync(stopsPath)) {
    throw new Error(`停留所ファイルが見つかりません: ${stopsPath}`)
  }
  const stops = readCsv(stopsPath)
    .filter(stop => stop.stop_id)
    .map(stop => Object.fromEntries(
      STOP_COLUMNS.map(column => [column, normalizeCsvCell(stop[column])])
    ))
  const seen = new Set(stops.map(stop => stop.stop_id))
  for (const stop of EXTRA_STOPS) {
    if (!seen.has(stop.stop_id)) {
      stops.push(stop)
    }
  }
  return stops
}

function extractPdfText(pdfPath) {
  const python = process.env.GTFS_PYTHON || 'python3'
  const code = `
import sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
print("\\n".join(page.extract_text() or "" for page in reader.pages))
`
  const result = spawnSync(python, ['-c', code, pdfPath], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 20
  })
  if (result.status !== 0) {
    throw new Error([
      `PDF テキスト抽出に失敗しました: ${basename(pdfPath)}`,
      result.stderr.trim(),
      'python3 と pypdf が必要です。別の Python を使う場合は GTFS_PYTHON を指定してください。'
    ].filter(Boolean).join('\n'))
  }
  return result.stdout
}

function assertSourcePdf() {
  if (!existsSync(SOURCE_PDF)) {
    throw new Error(`PDF 原本が見つかりません: ${SOURCE_PDF}`)
  }
  const text = extractPdfText(SOURCE_PDF).replace(/\s+/g, '')
  for (const expected of ['２０２６年', '西ノ島町営バス時刻表', '２０２６年３月１日', '２０２６年１２月３１日']) {
    if (!text.includes(expected)) {
      throw new Error(`PDF 原本の確認に失敗しました。期待する文字列が見つかりません: ${expected}`)
    }
  }
}

function writeGtfs(outputDir, context) {
  const stops = readStops()

  writeCsv(join(outputDir, 'agency.txt'), agencyRows(), [
    'agency_id', 'agency_name', 'agency_url', 'agency_timezone', 'agency_lang', 'agency_phone'
  ])
  writeCsv(join(outputDir, 'stops.txt'), stops, [
    ...STOP_COLUMNS
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
  writeCsv(join(outputDir, 'trips.txt'), context.trips, [
    'route_id', 'service_id', 'trip_id', 'trip_headsign', 'direction_id',
    'block_id', 'trip_short_name', 'shape_id', 'jp_trip_desc', 'jp_pattern_id'
  ])
  writeCsv(join(outputDir, 'stop_times.txt'), context.stopTimes, [
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
  writeCsv(join(outputDir, 'transfers.txt'), transferRows(), [
    'from_stop_id', 'to_stop_id', 'transfer_type', 'min_transfer_time'
  ])
  writeCsv(join(outputDir, 'translations.txt'), translationRows(), [
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
  assertSourcePdf()

  const stopNames = new Map(readStops().map(stop => [stop.stop_id, stop.stop_name]))
  const context = {
    stopNames,
    trips: [],
    stopTimes: []
  }
  const trips = tripSpecs()
  for (const trip of trips) {
    addTrip(context, trip)
  }

  writeGtfs(args.outputDir, context)
  if (args.updateCurrent) {
    if (resolve(args.outputDir) !== resolve(CURRENT_DIR)) {
      cpSync(args.outputDir, CURRENT_DIR, { recursive: true })
    }
  }

  mkdirSync(REPORT_DIR, { recursive: true })
  const report = {
    convertedAt: new Date().toISOString(),
    sourcePdf: SOURCE_PDF,
    outputDir: args.outputDir,
    currentUpdated: args.updateCurrent,
    feedStartDate: FEED_START,
    feedEndDate: FEED_END,
    feedVersion: FEED_VERSION,
    counts: {
      routes: ROUTES.length,
      stops: stopNames.size,
      services: new Set([
        ...calendarRows().map(row => row.service_id),
        ...calendarDateRows().map(row => row.service_id)
      ]).size,
      trips: trips.length,
      stopTimes: context.stopTimes.length
    },
    notes: [
      'PDF の主要時刻表欄を GTFS trip/stop_times に転記',
      '同一停留所・同一時刻が連続する折り返し点は stop_times 出力時に1件へ正規化',
      '★印は平日運行を基本とし、PDF 注記に従って 2026-07-18〜2026-08-17 は全日運行として calendar_dates に反映',
      '★印が一部停留所だけに付く10便は、★区間運休日も記号のない通常区間を運行するよう trip を分割',
      '※印の直行便土日祝ダイヤは 2026-07-18〜2026-08-17 を運休として calendar_dates に反映',
      '◎印は国賀の時刻だけに適用し、2026-04-15〜2026-10-21 以外も国賀を除く通常区間を運行',
      '●印は国賀の時刻だけに適用し、2026-07-01〜2026-08-31 以外も国賀を除く通常区間を運行',
      '◎または●と★が同じ便にある場合は、各記号の運行条件を独立して組み合わせた相互排他的な trip に分割',
      '波止と浦郷観光船のりばは停留所マップ掲載停留所として stops.txt に追加'
    ]
  }
  writeFileSync(join(REPORT_DIR, '2026-01-01.pdf-conversion.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf-8')

  console.log(`西ノ島町営バス PDF から GTFS を生成しました: ${args.outputDir}`)
  if (args.updateCurrent) {
    console.log(`current も更新しました: ${CURRENT_DIR}`)
  }
  console.log(`routes=${ROUTES.length}, stops=${stopNames.size}, trips=${trips.length}, stop_times=${context.stopTimes.length}`)
}

main()
