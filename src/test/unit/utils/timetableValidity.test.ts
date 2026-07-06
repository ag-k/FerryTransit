import { describe, expect, it } from 'vitest'
import {
  buildTransportTimetableValidityRows,
  normalizeTimetableValidityDate
} from '@/utils/timetableValidity'

describe('timetableValidity', () => {
  it('路線違いの同じ交通機関を1行に集計する', () => {
    const result = buildTransportTimetableValidityRows([
      {
        mode: 'BUS',
        operatorKey: 'AMA_TOWN',
        operatorLabel: 'A Operator',
        transportKey: 'AMA_TOWN|AMA_TOWN_BUS',
        transportLabel: '海士町路線バス',
        startDate: '2026/04/01',
        endDate: '2026/09/30'
      },
      {
        mode: 'BUS',
        operatorKey: 'AMA_TOWN',
        operatorLabel: 'A Operator',
        transportKey: 'AMA_TOWN|AMA_TOWN_BUS',
        transportLabel: '海士町路線バス',
        startDate: '2026-05-01',
        endDate: '2027-03-31'
      },
      {
        mode: 'BUS',
        operatorKey: 'NISHINOSHIMA_TOWN',
        operatorLabel: 'B Operator',
        transportKey: 'NISHINOSHIMA_TOWN|NISHINOSHIMA_TOWN_BUS',
        transportLabel: '西ノ島町営バス',
        startDate: '2026-04-01',
        endDate: '2026-12-31'
      },
      {
        mode: 'FERRY',
        operatorKey: 'OKI_KISEN',
        operatorLabel: 'C Operator',
        transportKey: 'FERRY_OKI',
        transportLabel: 'フェリーおき',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }
    ])

    expect(result).toEqual([
      {
        key: 'AMA_TOWN|BUS|AMA_TOWN|AMA_TOWN_BUS',
        mode: 'BUS',
        operatorKey: 'AMA_TOWN',
        operatorLabel: 'A Operator',
        transportLabel: '海士町路線バス',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        startsOperatorGroup: true
      },
      {
        key: 'NISHINOSHIMA_TOWN|BUS|NISHINOSHIMA_TOWN|NISHINOSHIMA_TOWN_BUS',
        mode: 'BUS',
        operatorKey: 'NISHINOSHIMA_TOWN',
        operatorLabel: 'B Operator',
        transportLabel: '西ノ島町営バス',
        startDate: '2026-04-01',
        endDate: '2026-12-31',
        startsOperatorGroup: true
      },
      {
        key: 'OKI_KISEN|FERRY|FERRY_OKI',
        mode: 'FERRY',
        operatorKey: 'OKI_KISEN',
        operatorLabel: 'C Operator',
        transportLabel: 'フェリーおき',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        startsOperatorGroup: true
      }
    ])
  })

  it('同じ運営主体内では2行目以降のグループ開始フラグを下げる', () => {
    const result = buildTransportTimetableValidityRows([
      {
        mode: 'FERRY',
        operatorKey: 'OKI_KISEN',
        operatorLabel: '隠岐汽船',
        transportKey: 'FERRY_OKI',
        transportLabel: 'フェリーおき',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      },
      {
        mode: 'FERRY',
        operatorKey: 'OKI_KISEN',
        operatorLabel: '隠岐汽船',
        transportKey: 'RAINBOWJET',
        transportLabel: 'レインボージェット',
        startDate: '2026-03-01',
        endDate: '2026-11-30'
      }
    ])

    expect(result.map(row => row.startsOperatorGroup)).toEqual([true, false])
  })

  it('同じ交通機関キーの複数船舶を1行に集計する', () => {
    const result = buildTransportTimetableValidityRows([
      {
        mode: 'FERRY',
        operatorKey: 'OKI_KISEN',
        operatorLabel: '隠岐汽船',
        transportKey: 'OKI_KISEN_FERRY_GROUP',
        transportLabel: 'フェリー(おき/くにが/しらしま)',
        startDate: '2026-01-01',
        endDate: '2027-02-28'
      },
      {
        mode: 'FERRY',
        operatorKey: 'OKI_KISEN',
        operatorLabel: '隠岐汽船',
        transportKey: 'OKI_KISEN_FERRY_GROUP',
        transportLabel: 'フェリー(おき/くにが/しらしま)',
        startDate: '2026-03-09',
        endDate: '2026-08-16'
      }
    ])

    expect(result).toEqual([
      {
        key: 'OKI_KISEN|FERRY|OKI_KISEN_FERRY_GROUP',
        mode: 'FERRY',
        operatorKey: 'OKI_KISEN',
        operatorLabel: '隠岐汽船',
        transportLabel: 'フェリー(おき/くにが/しらしま)',
        startDate: '2026-01-01',
        endDate: '2027-02-28',
        startsOperatorGroup: true
      }
    ])
  })

  it('不正な日付と空のキーを除外する', () => {
    const result = buildTransportTimetableValidityRows([
      {
        mode: 'AIR',
        operatorKey: 'JAL',
        operatorLabel: '日本航空',
        transportKey: 'JAL_OKI_ITAMI',
        transportLabel: 'JAL 大阪（伊丹）線',
        startDate: '2026-01-01',
        endDate: 'not-a-date'
      },
      {
        mode: 'AIR',
        operatorKey: 'JAL',
        operatorLabel: '日本航空',
        transportKey: '',
        transportLabel: 'JAL 出雲線',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      },
      {
        mode: 'AIR',
        operatorKey: '',
        operatorLabel: '',
        transportKey: 'JAL_OKI_IZUMO',
        transportLabel: 'JAL 出雲線',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }
    ])

    expect(result).toEqual([])
  })

  it('スラッシュ区切りの日付をYYYY-MM-DDへ正規化する', () => {
    expect(normalizeTimetableValidityDate('2026/07/07')).toBe('2026-07-07')
  })
})
