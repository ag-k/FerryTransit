# JAL時刻表の自動更新

JAL公式の国内線時刻表ページから隠岐―大阪（伊丹）線、隠岐―出雲線を取得し、アプリ形式へ変換して dev の Firebase Storage に公開する。

## ローカル実行

JAL公式サイトはヘッドレスブラウザからの取得を拒否するため、通常のChromiumを一時的に起動する。実行中はブラウザウィンドウが表示される。

```bash
npm run timetable:fetch:jal:dry-run
npm run timetable:refresh:jal
```

取得に成功した場合だけ `gtfs/raw/air/jal_oki_timetable.json` を更新する。公式ページの備考が未対応の形式へ変わった場合や、対象期間に欠損日がある場合はエラーで停止し、既存ファイルを維持する。

## 定期実行

`.github/workflows/update-jal-timetable.yml` が毎日 03:17 JST に次を実行する。

1. JAL公式時刻表を取得・検証する
2. 隠岐空港連絡バスと公開時刻表を再生成する
3. `oki-ferryguide-dev.firebasestorage.app/data/timetable.json` をバックアップ後に更新する
4. 変更された入力・生成JSONを `dev` ブランチへコミットする

GitHub ActionsのRepository secretに、dev用サービスアカウントJSONを `FIREBASE_SERVICE_ACCOUNT_DEV` という名前で登録する。Storageオブジェクトの読み書き権限が必要。

workflowのスケジュール実行はGitHubのdefault branchにある定義が使われる。default branchが `master` のため、このworkflow自体は `master` にも反映する必要がある。処理対象と自動コミット先は常に `dev` ブランチ。
