# Androidリリース署名

AndroidのRelease AABは、Git管理外のアップロード鍵を環境変数から読み込んで署名する。鍵、パスワード、サービスアカウントをリポジトリ、`.env*`、QA記録、コマンド履歴へ保存しない。

## 必要な環境変数

| 変数 | 内容 |
| --- | --- |
| `FERRYTRANSIT_ANDROID_KEYSTORE_PATH` | ローテーション後のアップロードkeystoreの絶対パス |
| `FERRYTRANSIT_ANDROID_KEYSTORE_PASSWORD` | keystoreパスワード |
| `FERRYTRANSIT_ANDROID_KEY_ALIAS` | アップロード鍵のalias |
| `FERRYTRANSIT_ANDROID_KEY_PASSWORD` | 鍵パスワード |

4項目の一部だけが設定されている場合、またはkeystoreが存在しない場合はGradle設定時に失敗する。`bundleRelease`と`assembleRelease`は4項目が揃わない限り実行を拒否し、未署名成果物を誤って提出しない。

## macOSキーチェーンから読み込む

パスワードを次のサービス名でmacOSキーチェーンへ保存済みの場合、補助スクリプトを現在のzshへ`source`して4環境変数を設定できる。

- `FerryTransit Android Keystore Password`
- `FerryTransit Android Key Password`

```zsh
cd /Users/ag/works/FerryTransit
source scripts/load-android-release-signing-env.zsh
```

スクリプトには、ローテーション後のアップロード鍵のパス`$HOME/Library/Application Support/FerryTransit/keys/ferrytransit-upload-2026.jks`とalias`ferrytransit-upload-2026`を固定している。証明書SHA-256がPlay Console登録値`8C:21:56:FE:E6:89:B3:59:0A:06:CB:44:4F:D6:4B:D2:1E:FD:02:67:F3:E9:1D:3F:D6:DE:4B:11:B3:31:C5:90`と一致することを確認済み。スクリプトを通常実行すると、子プロセス内で環境変数が消えてしまうため拒否される。現在のシェルへ設定するため、必ず`source`を使用する。

設定結果は秘密値を表示せずに確認する。

```zsh
for name in \
  FERRYTRANSIT_ANDROID_KEYSTORE_PATH \
  FERRYTRANSIT_ANDROID_KEYSTORE_PASSWORD \
  FERRYTRANSIT_ANDROID_KEY_ALIAS \
  FERRYTRANSIT_ANDROID_KEY_PASSWORD
do
  [[ -n "${(P)name}" ]] && echo "$name: 設定済み" || echo "$name: 未設定"
done
```

読み込みは現在のシェルだけに有効で、ターミナルを閉じると消える。パスワードを`.zshrc`、`.env*`、コマンドライン引数、リポジトリ内ファイルへ保存しない。

## 生成と検証

秘密値を安全なシークレット管理から現在のシェルへ設定した後、次を実行する。

```bash
npm run cap:android:build
./android/gradlew -p android --no-daemon --max-workers=1 \
  -Dorg.gradle.jvmargs=-Xmx512m bundleRelease
jarsigner -verify -verbose -certs \
  android/app/build/outputs/bundle/release/app-release.aab
```

`jarsigner`の検証成功、AABのSHA-256、`versionName`、`versionCode`、Application IDをリリースTODOへ記録する。鍵の証明書本文、alias、パス、パスワードは記録しない。

## Google Playへ進む条件

- 過去にGit追跡された鍵を再利用しない。
- Play Consoleでアップロード鍵のローテーションが完了している。
- `versionCode`が未使用である。
- 署名済みAABを内部テストへアップロードし、同じ成果物を実機QAに使用する。

## アップロード鍵リセットの有効化待ち

Google Playから通知された有効化日時より前は、新しいアップロード鍵で署名したAABをアップロードしない。有効化後は、事前検証したものと同一SHA-256のAABを内部テストへアップロードし、Playが新しいアップロード証明書を受理することを確認する。受理前に旧keystoreのGit履歴を強制書換えず、新鍵でのアップロード経路を先に確立する。

履歴除去は未コミット作業のあるworkspaceでは実行しない。新規mirror cloneで`android/ferrytransit.keystore`を全refから除去し、影響するbranch、tag、PR、fork、他のcloneを調整してからforce pushする。履歴書換え後は古い履歴をmergeせず、既存workspaceを再cloneして新しいリリースSHAを固定する。

2026-07-20時点ではGitHubの`master` / `dev`にブランチ保護はなく、リポジトリルールセットも設定されていない。履歴除去の実行直前にも再確認し、設定が追加されていた場合は一時解除ではなく管理者と手順を調整する。
