# リリース停止・ロールバック手順

v2.4以降のWeb / iOS / Android公開で重大問題が発生した場合は、影響拡大を止め、直前の正常版へ戻すか修正版を再配布する。実行前後の時刻、担当者、対象バージョン、コミットSHA、判断理由、確認結果をリリースTODOまたはインシデント記録へ残す。

## 事前に記録する情報

- Firebase Hostingの対象プロジェクト、現行リリース、直前の正常なリリースとコミットSHA
- App Store Connectのバージョン、ビルド番号、段階的リリース状況
- Google Play Consoleのトラック、リリース名、`versionCode`、段階的公開率
- Firestore、Storage、外部APIの互換性。データ移行はHostingのロールバックだけでは戻らないため、別途復旧判断する
- 実行責任者と承認者。秘密値、署名鍵、サービスアカウントは記録へ貼らない

## Web: Firebase Hosting

1. Firebase Consoleで対象プロジェクトを開き、**Hosting**のリリース履歴へ移動する。
2. 直前の正常なリリースについて、対象サイト、公開日時、コミットSHA、主要アセットを照合する。
3. 対象リリースのメニューから **Roll back** を選び、確認ダイアログで実行する。ロールバックは同じHostingバージョンを指す新しいリリースとして記録される。
4. 公開URLでトップ、時刻表、乗換案内、料金、運航状況、ニュース、直リンク再読み込み、Firebase/API通信を確認する。
5. 重大問題が解消しない場合は、Functions、Firestore、Storage、外部データの変更を切り分ける。Hostingだけを繰り返し切り替えない。

公式手順: [Firebase Hostingのリリース管理](https://firebase.google.com/docs/hosting/manage-hosting-resources?hl=ja)

## iOS: App Store Connect

### 段階的リリース中

1. App Store Connectで対象アプリの段階的リリース画面を開く。
2. **Pause Phased Release** を実行し、自動配信の拡大を止める。
3. すでに更新した利用者は旧バイナリへ自動で戻らない。また、段階的リリース中でも利用者はApp Storeから手動更新できるため、サポート告知と修正版の準備を並行する。
4. 修正版は未使用の新しいビルド番号でArchive、Validate、Upload、TestFlight QAを行い、審査提出する。

段階的リリースは7日間で1%、2%、5%、10%、20%、50%、100%へ進み、停止できる期間には上限がある。詳細は[Appleの段階的リリース手順](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases)を確認する。

## Android: Google Play Console

### 段階的公開中

1. Google Play Consoleで対象トラックのリリースを開き、**Manage rollout** から **Halt rollout** を実行する。
2. 新規配信は止まるが、すでに対象版を受け取った利用者はその版を使い続ける。
3. 修正版は未使用のより大きい`versionCode`で署名済みAABを生成し、内部テストを通してから段階的公開する。

公式手順: [段階的公開の更新と停止](https://support.google.com/googleplay/android-developer/answer/6346149?hl=ja)

### 100%公開後

Google Play Consoleで利用可能な場合は、対象リリースの **Manage rollout** から **Halt rollout** を実行し、直前版を新規・対象ユーザーへ再提供する。ただし、すでに問題版をインストールした端末は自動でダウングレードされない。利用条件と制限は[完全公開済みリリースの停止](https://support.google.com/googleplay/android-developer/answer/16285429?hl=ja)を確認する。

## 実行後の確認

- Webは主要導線、HTTP 4xx/5xx、ブラウザコンソール、Functionsログ、公開データのハッシュを確認する
- iOS/Androidは配信状態、クラッシュ/ANR、サポート問い合わせ、ストアレビューを監視する
- 問題版を受け取った利用者への影響、回避策、修正版の予定を記録する
- 原因修正後は新しいコミットSHAとビルド番号で必須QAをやり直し、通常のGo承認を得る
