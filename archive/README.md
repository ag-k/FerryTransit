# 旧AngularJS版アーカイブ

このディレクトリは移行前の実装を参照するためだけに保存しています。現在のWeb、iOS、Android、Firebase Hosting / Functionsのビルド・配布対象ではありません。

## セキュリティ上の扱い

- AngularJSはEOLで、既知の脆弱性に対する修正版が提供されないため、このディレクトリ内で依存関係をインストールしたりアプリを起動したりしないでください。
- `angularjs-package.json`、`angularjs-package-lock.json`、`bower.json`は履歴資料です。パッケージマネージャーの入力として使用しません。
- 旧依存関係を固定していた`yarn.lock`は、Dependabotの監視対象に実行可能な依存関係として誤認されることを防ぐため削除しました。
- 旧実装を再利用する必要がある場合は、現行Nuxtアプリへ必要なロジックだけを移植し、現行の依存関係とテストを使用してください。
