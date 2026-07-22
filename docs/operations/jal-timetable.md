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

GitHub ActionsからGoogle Cloudへは、長期鍵やRepository secretを保存せずWorkload Identity Federationで認証する。workflowは次の固定リソースだけを使用する。

- Workload Identity Pool: `projects/218069572477/locations/global/workloadIdentityPools/github-actions`
- Provider: `ferrytransit`
- Service Account: `jal-timetable-publisher@oki-ferryguide-dev.iam.gserviceaccount.com`
- Provider条件: `assertion.repository == "ag-k/FerryTransit"`、`assertion.ref == "refs/heads/master"`、`assertion.workflow_ref == "ag-k/FerryTransit/.github/workflows/update-jal-timetable.yml@refs/heads/master"`
- Storage権限: devバケット `oki-ferryguide-dev.firebasestorage.app` に対する `roles/storage.objectAdmin` のみ

サービスアカウント鍵JSONと`FIREBASE_SERVICE_ACCOUNT_DEV` secretは作成しない。GitHub OIDCの`id-token: write`は、公開が必要なjob内で`google-github-actions/auth@v3`が短期資格情報を取得するためだけに使う。本番プロジェクト・本番Storageへの権限は付与しない。

### 初回WIF構成

2026-07-22の読み取り専用監査では、上記Service Account、Pool、Providerはいずれも未作成だった。構成担当者の明示承認後に次を1回だけ実行する。ProviderはGitHubの共通issuerを使うため、リポジトリ、default branch、workflowファイルの3条件をすべて満たすOIDC tokenだけを受け付ける。

```bash
gcloud iam service-accounts create jal-timetable-publisher \
  --project=oki-ferryguide-dev \
  --display-name="JAL timetable dev publisher"

gcloud iam workload-identity-pools create github-actions \
  --project=oki-ferryguide-dev \
  --location=global \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc ferrytransit \
  --project=oki-ferryguide-dev \
  --location=global \
  --workload-identity-pool=github-actions \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == 'ag-k/FerryTransit' && assertion.ref == 'refs/heads/master' && assertion.workflow_ref == 'ag-k/FerryTransit/.github/workflows/update-jal-timetable.yml@refs/heads/master'"

gcloud iam service-accounts add-iam-policy-binding \
  jal-timetable-publisher@oki-ferryguide-dev.iam.gserviceaccount.com \
  --project=oki-ferryguide-dev \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/218069572477/locations/global/workloadIdentityPools/github-actions/attribute.repository/ag-k/FerryTransit"

gcloud storage buckets add-iam-policy-binding \
  gs://oki-ferryguide-dev.firebasestorage.app \
  --role=roles/storage.objectAdmin \
  --member="serviceAccount:jal-timetable-publisher@oki-ferryguide-dev.iam.gserviceaccount.com"
```

構成後は各リソースのIAMを読み返し、サービスアカウント鍵が0件であること、本番project/bucketに同サービスアカウントの権限がないことを確認してから、default branchの`publish_existing`を実行する。

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
