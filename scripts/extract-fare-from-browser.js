/**
 * ブラウザのコンソールで実行するスクリプト
 * ページから「旅客運賃 2等客室以外予約可」と「フェリー自動車航送運賃（片道・要予約）」の表を抽出
 * 
 * 使用方法:
 * 1. 隠岐汽船フェリーの運賃ページをブラウザで開く
 * 2. 開発者ツールのコンソールを開く
 * 3. このスクリプトをコピー＆ペーストして実行
 * 4. 出力されたJSONをコピーしてファイルに保存（例: extracted-fare-data.json）
 */

(function () {
  'use strict';

  // テーブルを探す関数（th要素に特定のテキストが含まれているかで検索）
  function findTableByThContent(searchText) {
    // まず、すべてのth要素を検索
    const allThs = document.querySelectorAll('th');
    for (const th of allThs) {
      const thText = th.textContent || '';
      if (thText.includes(searchText)) {
        // th要素が見つかったら、その親のテーブルを返す
        let parent = th.parentElement;
        while (parent) {
          if (parent.tagName === 'TABLE') {
            return parent;
          }
          parent = parent.parentElement;
        }
        // テーブルが見つからない場合、th要素を含む最も近いテーブル風の要素を返す
        const tableLike = th.closest('table, [role="table"], div[class*="table"]');
        if (tableLike) {
          return tableLike;
        }
      }
    }

    // th要素で見つからない場合、td要素やcaption要素も検索
    const allElements = document.querySelectorAll('td, caption, [role="columnheader"]');
    for (const el of allElements) {
      const elText = el.textContent || '';
      if (elText.includes(searchText)) {
        let parent = el.parentElement;
        while (parent) {
          if (parent.tagName === 'TABLE') {
            return parent;
          }
          parent = parent.parentElement;
        }
        const tableLike = el.closest('table, [role="table"], div[class*="table"]');
        if (tableLike) {
          return tableLike;
        }
      }
    }

    return null;
  }

  // デバッグ用: ページ内のすべてのテーブルを表示
  function debugTables() {
    console.log('🔍 ページ内のテーブルを検索中...');
    const tables = document.querySelectorAll('table');
    console.log(`   見つかったテーブル数: ${tables.length}`);

    tables.forEach((table, index) => {
      const caption = table.querySelector('caption');
      const firstRow = table.querySelector('tr');
      const preview = firstRow ? firstRow.textContent.substring(0, 100) : '（空）';
      console.log(`   テーブル ${index + 1}:`, {
        caption: caption ? caption.textContent.trim() : 'なし',
        preview,
        element: table
      })
    });

    // テキストで「旅客運賃」を含む要素を検索
    const allElements = document.querySelectorAll('*');
    const passengerElements = [];
    const vehicleElements = [];

    allElements.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('旅客運賃') || text.includes('旅客')) {
        passengerElements.push({
          tagName: el.tagName,
          text: text.substring(0, 100),
          element: el
        })
      }
      if (text.includes('自動車航送') || text.includes('自動車')) {
        vehicleElements.push({
          tagName: el.tagName,
          text: text.substring(0, 100),
          element: el
        })
      }
    });

    console.log(`\n   旅客運賃を含む要素: ${passengerElements.length}件`);
    if (passengerElements.length > 0) {
      console.log('   最初の5件:', passengerElements.slice(0, 5));
    }

    console.log(`\n   自動車航送を含む要素: ${vehicleElements.length}件`);
    if (vehicleElements.length > 0) {
      console.log('   最初の5件:', vehicleElements.slice(0, 5));
    }
  }

  // テーブルからデータを抽出（より柔軟な方法）
  function extractTableData(table) {
    if (!table) return null;

    const data = [];

    // まず、通常のテーブル構造（tr要素）を試す
    const rows = table.querySelectorAll('tr');
    if (rows.length > 0) {
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length === 0) continue;

        const rowData = [];
        for (const cell of cells) {
          const text = cell.textContent.trim();
          // 数値に変換可能な場合は数値に変換
          const numText = text.replace(/[^\d,]/g, '').replace(/,/g, '');
          const num = numText ? parseInt(numText, 10) : null;
          rowData.push({
            text,
            number: num
          })
        }
        if (rowData.length > 0) {
          data.push(rowData);
        }
      }

      if (data.length > 0) {
        return data;
      }
    }

    // tr要素がない場合、div要素などでテーブル風の構造を探す
    const rowElements = table.querySelectorAll('[role="row"], .row, div[class*="row"]');
    if (rowElements.length > 0) {
      for (const row of rowElements) {
        const cells = row.querySelectorAll('[role="cell"], [role="columnheader"], .cell, div[class*="cell"], td, th');
        if (cells.length === 0) continue;

        const rowData = [];
        for (const cell of cells) {
          const text = cell.textContent.trim();
          const numText = text.replace(/[^\d,]/g, '').replace(/,/g, '');
          const num = numText ? parseInt(numText, 10) : null;
          rowData.push({
            text,
            number: num
          })
        }
        if (rowData.length > 0) {
          data.push(rowData);
        }
      }
    }

    // それでも見つからない場合、直接子要素を探す
    if (data.length === 0) {
      const directChildren = Array.from(table.children);
      for (const child of directChildren) {
        const text = child.textContent.trim();
        if (text) {
          // セルっぽい要素を探す
          const cells = child.querySelectorAll('td, th, div, span');
          if (cells.length > 0) {
            const rowData = [];
            for (const cell of cells) {
              const cellText = cell.textContent.trim();
              if (cellText) {
                const numText = cellText.replace(/[^\d,]/g, '').replace(/,/g, '');
                const num = numText ? parseInt(numText, 10) : null;
                rowData.push({
                  text: cellText,
                  number: num
                })
              }
            }
            if (rowData.length > 0) {
              data.push(rowData);
            }
          }
        }
      }
    }

    return data.length > 0 ? data : null;
  }

  // デバッグ情報を表示
  console.log('🔍 ページ構造を分析中...');
  debugTables();

  // 旅客運賃テーブルを探す（th要素に「2等」が含まれている表）
  let passengerTable = findTableByThContent('2等');
  if (!passengerTable) {
    // 「2等」で見つからない場合、「二等」や「２等」も試す
    passengerTable = findTableByThContent('二等') || findTableByThContent('２等');

    if (!passengerTable) {
      console.error('❌ th要素に「2等」が含まれている表が見つかりません');
      console.error('💡 ヒント:');
      console.error('   1. ページが完全に読み込まれているか確認してください');
      console.error('   2. テーブルが表示されているか確認してください');
      console.error('   3. 上記のデバッグ情報を確認して、テーブルの構造を確認してください');
      console.error('   4. 手動でテーブルを選択する場合は、以下のコードを実行してください:');
      console.error('      window.selectedTable = document.querySelector("table"); // または適切なセレクタ');
      console.error('   5. 手動選択後、以下を実行:');
      console.error('      extractTableData(window.selectedTable)');
      return;
    }

    console.log('✅ th要素に「2等」が含まれている表を発見しました（別表記）');
  } else {
    console.log('✅ th要素に「2等」が含まれている表を発見しました');
  }

  // 自動車運賃テーブルを探す（th要素に「3m未満」が含まれている表）
  let vehicleTable = findTableByThContent('3m未満');
  if (!vehicleTable) {
    // 「3m未満」で見つからない場合、他の表記も試す
    vehicleTable = findTableByThContent('3m') || findTableByThContent('3メートル');

    if (!vehicleTable) {
      console.warn('⚠️ th要素に「3m未満」が含まれている表が見つかりません');
      console.warn('   旅客運賃のみを抽出します');
    } else {
      console.log('✅ th要素に「3m未満」が含まれている表を発見しました（別表記）');
    }
  } else {
    console.log('✅ th要素に「3m未満」が含まれている表を発見しました');
  }

  if (!passengerTable) {
    return;
  }

  console.log('✅ テーブルを発見しました');
  console.log('   旅客運賃テーブル:', passengerTable.tagName, passengerTable.className);
  if (vehicleTable) {
    console.log('   自動車運賃テーブル:', vehicleTable.tagName, vehicleTable.className);
  }

  // データを抽出
  const passengerData = extractTableData(passengerTable);
  if (!passengerData || passengerData.length === 0) {
    console.error('❌ 旅客運賃テーブルからデータを抽出できませんでした');
    console.error('   テーブルのHTML構造:', passengerTable.outerHTML.substring(0, 500));
    return;
  }

  console.log(`   旅客運賃データ: ${passengerData.length}行を抽出`);

  const vehicleData = vehicleTable ? extractTableData(vehicleTable) : null;
  if (vehicleTable && (!vehicleData || vehicleData.length === 0)) {
    console.warn('⚠️ 自動車運賃テーブルからデータを抽出できませんでした');
  } else if (vehicleData) {
    console.log(`   自動車運賃データ: ${vehicleData.length}行を抽出`);
  }

  // 結果を出力
  const result = {
    extractedAt: new Date().toISOString(),
    passengerFare: passengerData,
    vehicleFare: vehicleData,
    rawHtml: {
      passengerTable: passengerTable.outerHTML.substring(0, 500) + '...',
      vehicleTable: vehicleTable.outerHTML.substring(0, 500) + '...'
    }
  };

  console.log('📊 抽出されたデータ:');
  console.log(JSON.stringify(result, null, 2));

  // クリップボードにコピー（可能な場合）
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {
      console.log('✅ JSONをクリップボードにコピーしました');
    }).catch(() => {
      console.log('⚠️ クリップボードへのコピーに失敗しました。上記のJSONを手動でコピーしてください。')
    })
  }

  // グローバル変数にも保存（デバッグ用）
  window.extractedFareData = result;
  console.log('💾 データは window.extractedFareData にも保存されました');

  return result;
})();

