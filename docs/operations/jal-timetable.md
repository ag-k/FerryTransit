# JAL時刻表の自動更新

JAL公式の国内線時刻表ページから隠岐―大阪（伊丹）線、隠岐―出雲線を取得し、アプリ形式へ変換して dev の Firebase Storage に公開する。

GTFSデータ管理、公開時刻表、交通情報ダッシュボードとの責務分担と、Phase 1で適用した単一ビルド・単一公開経路は [交通データ管理・合成・配信パイプライン](transport-data-pipeline.md) を参照する。

## ローカル実行

JAL公式サイトはヘッドレスブラウザからの取得を拒否するため、通常のChromiumを一時的に起動する。実行中はブラウザウィンドウが表示される。

```bash
npm run timetable:fetch:jal:dry-run
npm run timetable:refresh:jal
```

取得に成功した場合だけ `gtfs/raw/air/jal_oki_timetable.json` を更新する。公式ページの備考が未対応の形式へ変わった場合や、対象期間に欠損日がある場合はエラーで停止し、既存ファイルを維持する。

## 定期実行

`.github/workflows/update-jal-timetable.yml` が毎日 03:17 JST に次を実行する。

1. `transport:acquire` でJAL公式時刻表を取得する
2. `transport:check` でJAL入力を検証する
3. `transport:build` で隠岐空港連絡バスと公開時刻表を1回だけ生成する
4. 入力・生成JSONに変更がなければ、コミット・バックアップ・公開を省略する
5. 変更された入力・生成JSONを `dev` ブランチへコミット・pushする
6. `transport:publish` で同じ生成JSONとGit SHA付きmanifestをdevへ公開する
7. `transport:smoke` でmanifest、Git SHA、公開物のSHA-256・サイズを照合する

GitHub ActionsのRepository secretに、dev用サービスアカウントJSONを `FIREBASE_SERVICE_ACCOUNT_DEV` という名前で登録する。Storageオブジェクトの読み書き権限が必要。

workflowのスケジュール実行はGitHubのdefault branchにある定義が使われる。default branchが `master` のため、このworkflow自体は `master` にも反映する必要がある。処理対象と自動コミット先は常に `dev` ブランチ。

push後の公開だけを再実行する場合は、workflow_dispatchの `publish_existing` を有効にする。入力・生成物に差分がなくても、現在のdevコミットに対するpublish-onlyとsmokeを実行する。

公開コマンドはpublish-onlyであり、単独実行する場合も公開先を明示する。

```bash
npm run transport:update -- --source jal-oki-flights --target dev --dry-run
npm run transport:check -- --source jal-oki-flights
npm run transport:build -- --source jal-oki-flights
npm run transport:publish -- --source jal-oki-flights --target dev --git-sha <commit-sha>
npm run transport:smoke -- --source jal-oki-flights --target dev --git-sha <commit-sha>
```

prodへは直接publishせず、リリースQAとGo承認後にdevの `data/manifests/public-timetable.json` とリリースコミットSHAを指定して `transport:promote` を実行する。

管理画面とCloud Functionsからは本番 `data/timetable.json` を更新できない。管理画面の時刻表操作はFirestore編集と `preview/timetable.json` の生成までとする。
