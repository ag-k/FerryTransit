#!/bin/bash

# シンプルなテスト関数でデプロイをテスト

echo "=== Firebase Functions デプロイテスト ==="
echo ""

cd /Users/ag/works/FerryTransit/src/functions

echo "1. シンプルなテスト関数を作成..."
cat > src/test.ts << 'EOF'
import { onRequest } from 'firebase-functions/v2/https'

export const testFunction = onRequest(
  { 
    region: 'asia-northeast1',
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  (request, response) => {
    response.send('Hello from test function!')
  }
)
EOF

echo "2. index.tsに追加..."
echo "" >> src/index.ts
echo "// Test function" >> src/index.ts
echo "export { testFunction } from './test'" >> src/index.ts

echo "3. ビルド..."
npm run build

echo "4. テスト関数のみデプロイ..."
firebase deploy --only functions:testFunction

echo ""
echo "デプロイが成功したら、問題は関数のコードにある可能性があります。"
echo "失敗した場合は、プロジェクトレベルの設定に問題があります。"