# ブラウザから運賃データを抽出してFirestoreに登録する方法

このスクリプトは、隠岐汽船フェリーの運賃ページから「旅客運賃　　２等客室以外予約可」と「フェリー自動車航送運賃（片道・要予約）」の表を抽出し、Firestoreに登録するためのツールです。

## 手順

### 1. ブラウザでデータを抽出

1. 隠岐汽船フェリーの運賃ページをブラウザで開く
2. 開発者ツール（F12）を開き、コンソールタブを選択
3. `scripts/extract-fare-from-browser.js` の内容をコピー＆ペーストして実行
4. コンソールに出力されたJSONをコピー
5. `extracted-fare-data.json` というファイル名で保存

**注意**: テーブルが見つからない場合は、ページのHTML構造を確認してください。必要に応じて `extract-fare-from-browser.js` のテーブル検索ロジックを調整してください。

### 2. Firestoreに登録

#### エミュレータに登録する場合

```bash
# ドライラン（実際には書き込まない）
node scripts/import-fare-from-browser.mjs extracted-fare-data.json --emulator

# 実際に書き込む
node scripts/import-fare-from-browser.mjs extracted-fare-data.json --emulator --execute
```

#### 本番環境に登録する場合

```bash
# サービスアカウントキーを設定
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# ドライラン
node scripts/import-fare-from-browser.mjs extracted-fare-data.json

# 実際に書き込む
node scripts/import-fare-from-browser.mjs extracted-fare-data.json --execute
```

## オプション

- `--version-name <name>`: 版の名称（デフォルト: "ブラウザから抽出"）
- `--version-id <id>`: 版のID（デフォルト: extracted-YYYYMMDD-HHMMSS）
- `--effective-from <date>`: 適用開始日（YYYY-MM-DD形式、デフォルト: 今日）
- `--execute`: 実際にFirestoreに書き込む（指定しない場合はドライラン）
- `--emulator`: エミュレータに接続（デフォルト: 本番環境）

## 例

```bash
# エミュレータに、2024年4月1日から適用される版として登録
node scripts/import-fare-from-browser.mjs extracted-fare-data.json \
  --emulator \
  --execute \
  --version-name "2024年4月改定" \
  --version-id "2024-04-01" \
  --effective-from "2024-04-01"
```

## トラブルシューティング

### テーブルが見つからない

`extract-fare-from-browser.js` のテーブル検索ロジックを調整してください。ページのHTML構造に合わせて、`findTableByHeader` 関数を修正する必要がある場合があります。

### 港名が正しく認識されない

`import-fare-from-browser.mjs` の `normalizePortName` 関数に、実際のページで使用されている港名の表記を追加してください。

### 路線IDが正しく生成されない

`generateRouteId` 関数を確認し、必要に応じて `ROUTE_METADATA` に新しい路線を追加してください。

## データ構造

抽出されたJSONファイルは以下の構造を持ちます:

```json
{
  "extractedAt": "2024-01-01T00:00:00.000Z",
  "passengerFare": [
    [
      { "text": "出発", "number": null },
      { "text": "到着", "number": null },
      { "text": "大人", "number": null },
      { "text": "小人", "number": null }
    ],
    [
      { "text": "七類", "number": null },
      { "text": "西郷", "number": null },
      { "text": "5,200", "number": 5200 },
      { "text": "2,600", "number": 2600 }
    ]
  ],
  "vehicleFare": [
    // 同様の構造
  ]
}
```

Firestoreに登録されるデータは、`/admin/fare` ページで使用される形式に変換されます。

