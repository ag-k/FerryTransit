# FerryTransit v2.5 リリースノート

## 日本語

### 主な変更点

- はつみ交通株式会社の「隠岐汽船連絡バス（七類港―境港駅）」を時刻表と乗換案内へ追加しました。
- バスの出発地・目的地選択で、バス停以外の場所が候補に表示される問題を修正しました。
- JAL便の航空運賃が未登録の場合に「航空運賃は別途（変動）」と表示し、空港連絡バスの運賃だけを全行程の確定総額に見せないよう改善しました。
- JAL便の運賃確認ページへの案内と、変動運賃を考慮した料金順の並び替えを追加しました。
- 西ノ島町営バスの●・◎・★の運行注記が、記号のない後続停留所まで誤って適用される問題を修正しました。
- いそかぜ・フェリーどうぜんの公式時刻表と臨時便を分離し、運航状況の更新時に公式便が消えることがある問題を修正しました。

### データ・品質改善

- はつみ交通の公式時刻表、運行期間、片道500円の運賃、事業者情報をGTFSと公開データへ追加しました。
- JAL運賃の未設定・登録済み・不正値を公開前に検査するデータ検証を追加しました。
- はつみ交通、バス停選択、航空運賃表示、乗換運賃、並び替えの回帰テストを拡充しました。
- 西ノ島町営バスの記号付き14便を年間の全運行日で検証する回帰テストを追加しました。

## English

### Highlights

- Added Hatsumi Kotsu's Oki Kisen connection bus between Shichirui Port and Sakaiminato Station to timetables and journey planning.
- Fixed the bus origin and destination picker so it only lists bus stops.
- Improved JAL fare display: flights without a registered fare now show “Airfare charged separately (variable),” and a connecting airport bus fare is no longer presented as the confirmed total for the whole journey.
- Added a link to check fares on JAL and fare sorting that accounts for variable airfare.
- Fixed Nishinoshima town bus service-day symbols so they apply only to the marked stop segments, not to subsequent unmarked stops.

### Data and Quality Improvements

- Added Hatsumi Kotsu's official timetable source, service period, JPY 500 one-way fare, and operator information to GTFS and published data.
- Added pre-publication validation for missing, registered, and invalid JAL fare values.
- Expanded regression coverage for Hatsumi Kotsu, bus-stop selection, airfare states, connecting fares, and sorting.
- Added full-year regression coverage for all 14 symbol-marked Nishinoshima town bus trips.
- Separated scheduled Isokaze and Ferry Dozen services from status-based extra trips so scheduled services are not removed during operation-status updates.
