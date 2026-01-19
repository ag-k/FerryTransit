---
name: firebase-hosting-deploy
description: Firebase Hosting へのデプロイ手順を確実に進めるための実務ガイド。ユーザーが「Firebase Hosting にデプロイ」「preview channel を作成」「hosting のビルド/公開を確認したい」などと依頼したときに使う。
---

# Firebase Hosting Deploy

## Overview

Firebase Hosting へ安全にデプロイするための判断ポイントと手順をまとめる。Nuxt などの静的出力/SSR を問わず、`firebase.json` の設定に合わせてビルドとデプロイを行う。

## Workflow Decision Tree

- **本番デプロイ**: `firebase deploy --only hosting` を使う
- **プレビュー**: `firebase hosting:channel:deploy <channel>` を使う
- **不明点がある**: プロジェクトID/サイト/ビルド出力先を先に確認する

## Step 1: 事前確認

- `firebase.json` の `hosting.public` を確認し、ビルド成果物の出力先と一致しているか確認する
- プロジェクトIDやサイト/ターゲットが不明な場合はユーザーに確認する
- `firebase login` 済みかを確認し、必要ならログインを促す

## Step 2: ビルド

- 静的ホスティングなら `npm run generate`、SSR の場合は `npm run build` など、プロジェクトの方針に合わせてビルドする
- ビルド後に `hosting.public` 配下へ成果物が出力されているかを確認する

## Step 3: デプロイ

- 本番デプロイ:
  - `firebase deploy --only hosting`（必要に応じて `--project <id>` や `--only hosting:<target>` を付ける）
- プレビュー:
  - `firebase hosting:channel:deploy <channel>` を使い、返される URL を共有する

## Step 4: 検証と後処理

- 返却された Hosting URL で表示確認する
- 404 やルーティング問題がある場合は `firebase.json` の `rewrites` を確認する

## トラブルシュートの指針

- デプロイ権限エラー: `firebase login` と `--project` 指定を見直す
- 生成物が空/古い: ビルドコマンドと `hosting.public` の一致を再確認する
