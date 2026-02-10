/**
 * 乗換案内検索テストスクリプト
 * 別府→菱浦、出発日2025/11/01、出発時刻0:00
 */

import axios from 'axios';

async function testTransitSearch() {
  try {
    console.log('乗換案内検索テスト開始...');
    console.log('条件: 別府→菱浦、出発日2025/11/01、出発時刻0:00');
    
    // 開発サーバーのURL
    const baseUrl = 'http://localhost:3003';
    
    // まず乗換案内ページにアクセス
    console.log('1. 乗換案内ページにアクセス...');
    const pageResponse = await axios.get(`${baseUrl}/transit`);
    console.log(`ページステータス: ${pageResponse.status}`);
    
    // API経由で検索を実行（もしAPIエンドポイントがあれば）
    // または、直接useRouteSearch composableをテスト
    
    console.log('2. 検索条件:');
    console.log('   出発地: BEPPU (別府)');
    console.log('   到着地: HISHIURA (菱浦)');
    console.log('   出発日: 2025-11-01');
    console.log('   出発時刻: 00:00');
    console.log('   到着時刻指定モード: false (出発時刻指定)');
    
    // 実際のアプリケーションでは、これらの条件で検索が実行される
    // 結果を確認するために、ブラウザで手動検索が必要
    
    console.log('');
    console.log('検索結果を確認するには:');
    console.log('1. ブラウザで http://localhost:3003/transit を開く');
    console.log('2. 以下の条件で検索:');
    console.log('   - 出発地: 別府');
    console.log('   - 到着地: 菱浦');
    console.log('   - 日付: 2025/11/01');
    console.log('   - 時刻: 00:00');
    console.log('   - 出発後を指定');
    console.log('');
    console.log('予想される結果:');
    console.log('- ISOKAZE: 08:00発 → 08:20着 (料金: ¥410)');
    console.log('- FERRY_DOZEN: 14:00発 → 14:25着 (料金: ¥410)');
    console.log('- FERRY_OKI: 10:30発 → 11:15着 (料金: ¥410)');
    
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
  }
}

testTransitSearch();
