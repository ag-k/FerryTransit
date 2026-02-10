# 英語翻訳欠落レポート

## 概要
- コード内で使用されている翻訳キー: 157個
- ja.jsonのキー数: 227個
- en.jsonのキー数: 189個

## 英語訳が欠けている翻訳キー

### 1. ページで使用されているが英語訳がないキー

#### ホームページ (pages/index.vue)
- `ABOUT_SERVICE` - "このサービスについて"
- `ABOUT_SERVICE_DESC` - "隠岐航路案内は、隠岐諸島への船舶交通情報を提供するサービスです。"
- `CHECK_DETAILS` - "詳細を確認してください"
- `CHECK_STATUS` - "運航状況を確認"
- `CONTACT_INFO` - "お問い合わせ・関連サイト"
- `FEATURE_1` - "最新の時刻表情報"
- `FEATURE_2` - "リアルタイムの運航状況"
- `FEATURE_3` - "便利な乗換案内"
- `FEATURE_4` - "オフライン対応"
- `FERRY` - "フェリー"
- `OKI_DOUZEN` - "隠岐観光株式会社"
- `OKI_DOUZEN_DESC` - "島前内航船の運航会社"
- `OKI_KISEN_CORP` - "隠岐汽船株式会社"
- `OKI_KISEN_DESC` - "隠岐と本土を結ぶフェリー・高速船の運航会社"
- `OPERATION_ALERTS` - "運航に関するお知らせ"
- `SEARCH_ROUTES` - "経路を検索"
- `STATUS_DESC` - "最新の運航状況を確認できます"
- `TIMETABLE_DESC` - "フェリーの時刻表を確認できます"
- `TRANSIT_DESC` - "最適な乗換ルートを検索できます"
- `VIEW_DETAILS` - "詳細を見る"
- `VIEW_TIMETABLE` - "時刻表を見る"

#### 乗換案内ページ (pages/transit.vue)
- `ARRIVE_BY` - "到着時刻"
- `DEPARTURE_AFTER` - "出発時刻"
- `LEG` - "区間"
- `NO_ROUTES_FOUND` - "該当する経路が見つかりませんでした"
- `ROUTE_DETAILS` - "経路詳細"
- `SEARCH` - "検索"
- `SEARCH_CONDITIONS` - "検索条件"
- `TOTAL` - "合計"（※両言語ファイルに欠落）
- `TOTAL_DURATION` - "総所要時間"
- `TOTAL_FARE` - "合計運賃"

#### 運航状況ページ (pages/status.vue)
- `FERRY` - "フェリー"
- `LAST_UPDATE` - "最終更新"
- `NO_STATUS_INFO` - "運航状況情報がありません"
- `REFRESH` - "更新"
- `SUMMARY` - "概要"
- `TODAY_WAVE` - "本日の波高"
- `TOMORROW_WAVE` - "明日の波高"

### 2. コンポーネントで使用されているが英語訳がないキー

#### お気に入り機能（components/favorites/）
※ 注意: これらのキーは`favorites`オブジェクト内にネストされていますが、両言語ファイルに存在しません
- `favorites.title` - "お気に入り"
- `favorites.route` - "ルート"
- `favorites.port` - "港"
- `favorites.favoriteRoutes` - "お気に入りルート"
- `favorites.favoritePorts` - "お気に入り港"
- `favorites.addToFavorites` - "お気に入りに追加"
- `favorites.removeFromFavorites` - "お気に入りから削除"
- `favorites.lastSearched` - "最後に検索"
- `favorites.nextDepartures` - "次の出発"
- `favorites.viewTimetable` - "時刻表を見る"
- `favorites.noFavorites` - "お気に入りがありません"
- `favorites.addFavoritesHint` - "ルートや港をお気に入りに追加すると、ここに表示されます"
- `favorites.hint` - "ヒント：編集モードでドラッグして並び替え"
- `favorites.edit` - "編集"
- `favorites.done` - "完了"
- `favorites.remove` - "削除"
- `favorites.delete` - "削除"
- `favorites.deleteConfirmTitle` - "お気に入りから削除"
- `favorites.deleteRouteConfirmMessage` - "このルートをお気に入りから削除しますか？"
- `favorites.deletePortConfirmMessage` - "この港をお気に入りから削除しますか？"

#### 検索履歴機能（components/history/）
※ 注意: これらのキーは`history`オブジェクト内にネストされていますが、両言語ファイルに存在しません
- `history.title` - "検索履歴"
- `history.noHistory` - "検索履歴がありません"
- `history.noHistoryHint` - "経路を検索すると、履歴がここに表示されます"
- `history.searchAgain` - "再検索"
- `history.delete` - "削除"
- `history.clearAll` - "すべて削除"
- `history.clearConfirmTitle` - "すべての履歴を削除"
- `history.clearConfirmMessage` - "すべての検索履歴を削除しますか？この操作は取り消せません。"
- `history.clearConfirm` - "削除"

#### 設定機能（components/settings/）
※ 注意: これらのキーは`settings`オブジェクト内にネストされていますが、両言語ファイルに存在しません
- `settings.theme` - "テーマ"
- `settings.dataManagement` - "データ管理"
- `settings.clearCache` - "キャッシュをクリア"
- `settings.clearCacheDesc` - "保存されたオフラインデータを削除"
- `settings.exportFavorites` - "お気に入りをエクスポート"
- `settings.exportFavoritesDesc` - "お気に入りデータをJSONファイルとして保存"
- `settings.clearAllData` - "すべてのデータを削除"
- `settings.clearAllDataDesc` - "お気に入り、履歴、キャッシュをすべて削除"
- `settings.clearDataConfirmTitle` - "すべてのデータを削除"
- `settings.clearDataConfirmMessage` - "お気に入り、検索履歴、キャッシュを含むすべてのデータが削除されます。この操作は取り消せません。"
- `settings.clearConfirm` - "削除"

#### エラーページ（error.vue）
※ 注意: これらのキーは`error`オブジェクト内にネストされていますが、両言語ファイルに存在しません
- `error.pageNotFound` - "ページが見つかりません"
- `error.pageNotFoundDesc` - "お探しのページは移動または削除された可能性があります。"
- `error.somethingWentWrong` - "エラーが発生しました"
- `error.somethingWentWrongDesc` - "申し訳ございません。予期しないエラーが発生しました。"
- `error.backToHome` - "ホームに戻る"
- `error.tryAgain` - "もう一度試す"
- `error.technicalDetails` - "技術的な詳細"

## 推奨事項

1. **ネストされたキーの対応**: `favorites.*`、`history.*`、`settings.*`、`error.*` のキーは、en.jsonファイル内でネストされたオブジェクトとして定義されていますが、ja.jsonには存在しません。両言語ファイルで一貫性を保つため、ja.jsonにもこれらのネストされた構造を追加することを推奨します。

2. **優先度の高い翻訳**: 
   - ページレベルのキー（特にホームページとトランジットページ）
   - 基本的なUIキー（FERRY、SEARCH、TOTALなど）
   - エラーメッセージ

3. **一貫性の確保**: 一部のキーは英語版にのみ存在し、日本語版には存在しません。両方の言語ファイルに同じキーセットが存在することを確認してください。