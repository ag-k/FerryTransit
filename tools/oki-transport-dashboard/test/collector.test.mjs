import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyResourceType, extractJapaneseDate, extractLinksFromHtml, extractStandaloneFileUrls, getDocumentChangeStatus, normalizeDocumentLink, normalizeHtmlPageDocument, SOURCES } from '../src/collector.mjs'

test('時刻表・運賃・運航状況のリンク種別を分類できる', () => {
  assert.equal(classifyResourceType('R8_海士島線時刻表.pdf', 'https://example.test/r8.pdf'), 'timetable')
  assert.equal(classifyResourceType('「令和8年6月1日改定 運賃表」をダウンロード', 'https://example.test/fare.pdf'), 'fare')
  assert.equal(classifyResourceType('フェリーどうぜん定期ドックによる休航のお知らせ', 'https://example.test/news'), 'status')
})

test('日本語・西暦表記の日付を抽出できる', () => {
  assert.equal(extractJapaneseDate('更新日：2026年03月02日'), '2026-03-02')
  assert.equal(extractJapaneseDate('2026.04.01 第27回 小学生乗船無料キャンペーン'), '2026-04-01')
  assert.equal(extractJapaneseDate('令和8年1月1日から令和8年12月31日まで'), '2026-01-01')
})

test('アンカーと単独ファイル URL を抽出できる', () => {
  const html = `
    <a href="/files/timetable.pdf" title="PDF">「時刻表：２０２６年３月１日～１２月３１日」</a>
    <a href="https://example.test/fare.pdf"><img alt="運賃表"></a>
    <a href="[%link%]">[%title%]</a>
    <script>const pdf="/assets/isokaze2026.pdf"</script>
  `
  const links = extractLinksFromHtml(html, 'https://example.test/page/')
  assert.deepEqual(links.map((link) => link.url), [
    'https://example.test/files/timetable.pdf',
    'https://example.test/fare.pdf'
  ])
  assert.equal(links[1].text, '運賃表')
  const files = extractStandaloneFileUrls(html, 'https://example.test/page/')
  assert.equal(files.some((file) => file.url === 'https://example.test/assets/isokaze2026.pdf'), true)
})

test('監視対象のお知らせURLは現行の一覧ページを指す', () => {
  const ichibata = SOURCES.find((item) => item.id === 'oki-ichibata')
  assert.equal(ichibata?.pages.find((page) => page.label === '新着情報')?.url, 'https://oki.ichibata.co.jp/news/')

  const chibu = SOURCES.find((item) => item.id === 'chibu-village')
  assert.equal(chibu?.pages.find((page) => page.label === 'お知らせ')?.url, 'http://www.chibu.jp/news/')
})

test('知夫の時刻表画像と案内図をURLごとの役割で分類する', () => {
  const source = SOURCES.find((item) => item.id === 'chibu-village')
  const page = source.pages.find((item) => item.role === 'timetable')
  const timetable = normalizeDocumentLink({
    url: 'http://www.chibu.jp/_src/73262207/img20230316164406123313.jpg?v=1744091048959',
    text: '画像',
    context: '村営バス時刻表 運航状況を含むページ文脈',
    source: 'file'
  }, source, page)
  const map = normalizeDocumentLink({
    url: 'http://www.chibu.jp/_src/73255395/img20230316103536103491.png?v=1744091048959',
    text: '画像',
    context: '島内交通の停留所マップ',
    source: 'file'
  }, source, page)

  assert.equal(timetable?.type, 'timetable')
  assert.equal(map?.type, 'map')
  assert.equal(source.ignoredDocumentUrls.length, 2)
})

test('HTML 本文の時刻表ページを資料として扱える', () => {
  const html = `
    <title>隠岐一畑交通 – 路線バス時刻表</title>
    <h1>路線バス時刻表</h1>
    <h2>都万線</h2>
    <table>
      <tr><th>隠岐病院</th><td>8:52</td><td>12:30</td></tr>
      <tr><th>加茂</th><td>9:08</td><td>12:46</td></tr>
    </table>
    <h3>運賃表</h3>
    <table><tr><th>全区間</th><td>500</td></tr></table>
  `
  const document = normalizeHtmlPageDocument(
    html,
    { role: 'timetable', label: '路線バス時刻表', url: 'https://oki.ichibata.co.jp/route-time.html' },
    {
      url: 'https://oki.ichibata.co.jp/route-time.html',
      contentType: 'text/html; charset=utf-8',
      sizeBytes: html.length,
      hash: 'abc123'
    },
    '隠岐一畑交通 – 路線バス時刻表'
  )

  assert.equal(document.type, 'timetable')
  assert.equal(document.title, '隠岐一畑交通 – 路線バス時刻表')
  assert.equal(document.url, 'https://oki.ichibata.co.jp/route-time.html')
  assert.equal(document.extension, 'html')
  assert.equal(document.sourceHint, 'html')
  assert.equal(document.shortHash, 'abc123')
})

test('一畑バス・隠岐汽船接続バスは松江・七類・境港間の時刻表ページを監視する', () => {
  const source = SOURCES.find((item) => item.id === 'ichibata-bus-connection')
  assert.equal(source?.officialUrl, 'https://bus.ichibata.co.jp/oki-kisen/oki-kisen-sichirui/')
  assert.deepEqual(source?.pages, [
    {
      role: 'timetable',
      label: '松江・七類・境港間時刻表',
      url: 'https://bus.ichibata.co.jp/oki-kisen/oki-kisen-sichirui/'
    }
  ])
})

test('隠岐汽船は時刻表ダウンロードページを監視する', () => {
  const source = SOURCES.find((item) => item.id === 'oki-kisen')
  assert.equal(source?.pages.some((page) => (
    page.role === 'timetable' &&
    page.label === 'フェリー・高速船時刻表' &&
    page.url === 'https://www.oki-kisen.co.jp/download/dl-timetable/29'
  )), true)
})

test('JAL・隠岐空港発着便は空港公式のフライト時刻ページを監視する', () => {
  const source = SOURCES.find((item) => item.id === 'jal-oki-flights')
  assert.equal(source?.group, '航空')
  assert.equal(source?.officialUrl, 'https://www.jal.co.jp/jp/ja/dom/route/time/')
  assert.deepEqual(source?.pages, [
    { role: 'timetable', label: '隠岐空港フライト情報', url: 'https://www.oki-airport.jp/flight' },
    {
      role: 'timetable',
      label: 'JAL令和8年度上期運航計画',
      url: 'https://www.oki-airport.jp/news/archives/14',
      fetchStrategy: 'curl'
    },
    { role: 'timetable', label: '出雲空港 就航路線・時刻表', url: 'https://www.izumo-airport.co.jp/flight/flight-time' }
  ])
})

test('航空フライト情報のHTML本文を時刻表資料として扱える', () => {
  const html = `
    <title>フライト情報｜隠岐世界ジオパーク空港</title>
    <h1>フライト情報</h1>
    <h2>出発便</h2>
    <table>
      <tr><th>航空会社</th><th>便名</th><th>行き先</th><th>出発時刻</th></tr>
      <tr><td>JAL</td><td>2332</td><td>大阪（伊丹）</td><td>15:05</td></tr>
    </table>
    <h2>到着便</h2>
    <table>
      <tr><td>JAL</td><td>2331</td><td>大阪（伊丹）</td><td>14:35</td></tr>
    </table>
  `
  const document = normalizeHtmlPageDocument(
    html,
    { role: 'timetable', label: '隠岐空港フライト情報', url: 'https://www.oki-airport.jp/flight' },
    {
      url: 'https://www.oki-airport.jp/flight',
      contentType: 'text/html; charset=utf-8',
      sizeBytes: html.length,
      hash: 'flight123'
    },
    'フライト情報｜隠岐世界ジオパーク空港'
  )

  assert.equal(document.type, 'timetable')
  assert.equal(document.title, 'フライト情報｜隠岐世界ジオパーク空港')
  assert.equal(document.url, 'https://www.oki-airport.jp/flight')
  assert.equal(document.extension, 'html')
})

test('同じURLのPDF本体が差し替わった場合もハッシュで変更検知する', () => {
  const url = 'https://example.test/timetable.pdf'
  const previousIndex = {
    documents: new Map([[url, { url, title: '時刻表', type: 'timetable', hash: 'old-hash' }]])
  }
  assert.equal(getDocumentChangeStatus({ url, title: '時刻表', type: 'timetable', hash: 'new-hash' }, previousIndex), 'changed')
  assert.equal(getDocumentChangeStatus({ url, title: '時刻表', type: 'timetable', hash: 'old-hash' }, previousIndex), 'unchanged')
})
