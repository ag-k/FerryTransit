---
inclusion: fileMatch
fileMatchPattern: "**/data/**"
---

# データ管理ガイドライン

## データ構造概要

FerryTransit アプリケーションは、隠岐諸島のフェリー運航に関する複数のデータソースを統合管理しています。

### 主要データファイル

- **timetable.json**: フェリー時刻表データ
- **fare-master.json**: 料金マスターデータ
- **holidays.json**: 祝日・特別運航日データ

## 時刻表データ（timetable.json）

### データ構造

```json
{
  "lastUpdated": "2024-01-15T10:00:00Z",
  "version": "2024.1",
  "routes": [
    {
      "id": "saigo-hishiura-001",
      "departure": "西郷",
      "arrival": "菱浦",
      "ship": "フェリーおき",
      "departureTime": "08:00",
      "arrivalTime": "09:30",
      "operationDays": ["月", "火", "水", "木", "金", "土", "日"],
      "validFrom": "2024-01-01",
      "validTo": "2024-03-31",
      "notes": "冬期ダイヤ",
      "fare": {
        "adult": 1500,
        "child": 750,
        "car": 8000
      }
    }
  ],
  "ports": [
    {
      "id": "saigo",
      "name": "西郷",
      "nameEn": "Saigo",
      "prefecture": "島根県",
      "island": "隠岐の島町"
    }
  ],
  "ships": [
    {
      "id": "ferry-oki",
      "name": "フェリーおき",
      "nameEn": "Ferry Oki",
      "capacity": 500,
      "carCapacity": 50
    }
  ]
}
```

### フィールド定義

#### routes 配列

- **id**: 一意識別子（港名-連番形式）
- **departure/arrival**: 出発港・到着港名
- **ship**: 運航船舶名
- **departureTime/arrivalTime**: 出発・到着時刻（HH:MM 形式）
- **operationDays**: 運航曜日配列
- **validFrom/validTo**: 有効期間（YYYY-MM-DD 形式）
- **notes**: 備考・注意事項
- **fare**: 料金情報オブジェクト

#### ports 配列

- **id**: 港の一意識別子
- **name**: 日本語港名
- **nameEn**: 英語港名
- **prefecture**: 都道府県
- **island**: 所属島名

#### ships 配列

- **id**: 船舶の一意識別子
- **name**: 日本語船名
- **nameEn**: 英語船名
- **capacity**: 乗客定員
- **carCapacity**: 車両積載台数

## 料金マスターデータ（fare-master.json）

### データ構造

```json
{
  "lastUpdated": "2024-01-15T10:00:00Z",
  "version": "2024.1",
  "baseRates": {
    "saigo-hishiura": {
      "adult": 1500,
      "child": 750,
      "car": 8000,
      "motorcycle": 3000
    }
  },
  "peakPeriods": [
    {
      "name": "夏期繁忙期",
      "startDate": "2024-07-20",
      "endDate": "2024-08-31",
      "multiplier": 1.2
    }
  ],
  "discounts": [
    {
      "id": "island-resident",
      "name": "島民割引",
      "nameEn": "Island Resident Discount",
      "rate": 0.3,
      "conditions": "住民票の提示が必要"
    }
  ]
}
```

### 料金計算ロジック

```typescript
// composables/useFareCalculation.ts
export const useFareCalculation = () => {
  const calculateFare = (
    route: string,
    passengerType: "adult" | "child",
    date: Date,
    discounts: string[] = []
  ) => {
    // 基本料金の取得
    const baseFare = fareData.baseRates[route][passengerType];

    // 繁忙期チェック
    const peakMultiplier = getPeakMultiplier(date);

    // 割引適用
    const discountRate = calculateDiscountRate(discounts);

    // 最終料金計算
    const finalFare = baseFare * peakMultiplier * (1 - discountRate);

    return Math.round(finalFare);
  };

  return { calculateFare };
};
```

## 祝日データ（holidays.json）

### データ構造

```json
{
  "lastUpdated": "2024-01-15T10:00:00Z",
  "version": "2024.1",
  "holidays": [
    {
      "date": "2024-01-01",
      "name": "元日",
      "nameEn": "New Year's Day",
      "type": "national",
      "ferryOperation": "special"
    }
  ],
  "specialOperations": [
    {
      "date": "2024-12-31",
      "name": "年末特別運航",
      "nameEn": "Year-end Special Operation",
      "description": "通常より増便して運航",
      "scheduleChanges": [
        {
          "route": "saigo-hishiura",
          "additionalDepartures": ["22:00", "23:30"]
        }
      ]
    }
  ]
}
```

### 祝日判定ロジック

```typescript
// composables/useHolidayCalendar.ts
export const useHolidayCalendar = () => {
  const isHoliday = (date: Date): boolean => {
    const dateString = format(date, "yyyy-MM-dd");
    return holidayData.holidays.some((holiday) => holiday.date === dateString);
  };

  const getHolidayInfo = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return holidayData.holidays.find((holiday) => holiday.date === dateString);
  };

  const hasSpecialOperation = (date: Date): boolean => {
    const dateString = format(date, "yyyy-MM-dd");
    return holidayData.specialOperations.some((op) => op.date === dateString);
  };

  return { isHoliday, getHolidayInfo, hasSpecialOperation };
};
```

## データ更新フロー

### 1. 管理画面での編集

```typescript
// composables/useAdminDataManagement.ts
export const useAdminDataManagement = () => {
  const updateTimetable = async (routeData: RouteData) => {
    // 1. バリデーション
    const validation = validateRouteData(routeData);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    // 2. Firestoreに保存
    await updateDoc(doc(db, "timetables", routeData.id), {
      ...routeData,
      updatedAt: serverTimestamp(),
    });

    // 3. 操作ログの記録
    await logAdminAction("timetable_update", {
      routeId: routeData.id,
      changes: routeData,
    });
  };

  return { updateTimetable };
};
```

### 2. データ公開プロセス

```typescript
// composables/useDataPublish.ts
export const useDataPublish = () => {
  const publishData = async () => {
    try {
      // 1. Firestoreからデータ取得
      const timetableData = await getTimetableData();
      const fareData = await getFareData();
      const holidayData = await getHolidayData();

      // 2. JSON形式に変換
      const publicData = {
        timetable: formatTimetableForPublic(timetableData),
        fare: formatFareForPublic(fareData),
        holidays: formatHolidayForPublic(holidayData),
      };

      // 3. Firebase Storageに公開
      await uploadToStorage("data/timetable.json", publicData.timetable);
      await uploadToStorage("data/fare-master.json", publicData.fare);
      await uploadToStorage("data/holidays.json", publicData.holidays);

      // 4. 公開履歴の記録
      await recordPublishHistory({
        publishedAt: new Date(),
        dataVersion: generateVersion(),
        publishedBy: auth.currentUser?.uid,
      });
    } catch (error) {
      console.error("データ公開エラー:", error);
      throw error;
    }
  };

  return { publishData };
};
```

## データバリデーション

### 時刻表データの検証

```typescript
// utils/dataValidation.ts
export const validateTimetableData = (data: TimetableData) => {
  const errors: string[] = [];

  // 必須フィールドチェック
  if (!data.departure) errors.push("出発港は必須です");
  if (!data.arrival) errors.push("到着港は必須です");
  if (!data.departureTime) errors.push("出発時刻は必須です");

  // 時刻フォーマットチェック
  if (data.departureTime && !isValidTimeFormat(data.departureTime)) {
    errors.push("出発時刻の形式が正しくありません（HH:MM）");
  }

  // 論理チェック
  if (data.departure === data.arrival) {
    errors.push("出発港と到着港は異なる必要があります");
  }

  // 日付範囲チェック
  if (data.validFrom && data.validTo && data.validFrom > data.validTo) {
    errors.push("有効期間の開始日は終了日より前である必要があります");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const isValidTimeFormat = (time: string): boolean => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};
```

### 料金データの検証

```typescript
export const validateFareData = (data: FareData) => {
  const errors: string[] = [];

  // 料金の妥当性チェック
  if (data.adult <= 0) errors.push("大人料金は0より大きい必要があります");
  if (data.child < 0) errors.push("子供料金は0以上である必要があります");
  if (data.child > data.adult)
    errors.push("子供料金は大人料金以下である必要があります");

  // 車両料金チェック
  if (data.car && data.car <= data.adult) {
    errors.push("車両料金は大人料金より高い必要があります");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

## データキャッシュ戦略

### ブラウザキャッシュ

```typescript
// composables/useDataCache.ts
export const useDataCache = () => {
  const CACHE_DURATION = 1000 * 60 * 30; // 30分

  const getCachedData = <T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);

      // キャッシュの有効期限チェック
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  };

  const setCachedData = <T>(key: string, data: T): void => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("キャッシュ保存エラー:", error);
    }
  };

  return { getCachedData, setCachedData };
};
```

### サーバーサイドキャッシュ

```typescript
// server/api/timetable.get.ts
export default defineEventHandler(async (event) => {
  // キャッシュヘッダーの設定
  setHeader(event, "Cache-Control", "public, max-age=1800"); // 30分
  setHeader(event, "ETag", generateETag(timetableData));

  // 条件付きリクエストの処理
  const ifNoneMatch = getHeader(event, "if-none-match");
  if (ifNoneMatch === currentETag) {
    setResponseStatus(event, 304);
    return;
  }

  return timetableData;
});
```

## データ移行・バックアップ

### バックアップ戦略

```typescript
// scripts/backup-data.ts
export const backupData = async () => {
  const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
  const backupPath = `backups/${timestamp}`;

  try {
    // Firestoreデータのバックアップ
    const collections = ["timetables", "fares", "holidays", "news"];

    for (const collection of collections) {
      const snapshot = await getDocs(collection(db, collection));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      await uploadToStorage(`${backupPath}/${collection}.json`, data);
    }

    console.log(`バックアップ完了: ${backupPath}`);
  } catch (error) {
    console.error("バックアップエラー:", error);
    throw error;
  }
};
```

### データ復元

```typescript
export const restoreData = async (backupPath: string) => {
  try {
    const collections = ["timetables", "fares", "holidays", "news"];

    for (const collectionName of collections) {
      const backupData = await downloadFromStorage(
        `${backupPath}/${collectionName}.json`
      );

      // 既存データの削除
      const existingDocs = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);

      existingDocs.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // バックアップデータの復元
      backupData.forEach((item) => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
      });

      await batch.commit();
    }

    console.log("データ復元完了");
  } catch (error) {
    console.error("復元エラー:", error);
    throw error;
  }
};
```

## パフォーマンス最適化

### データ圧縮

```typescript
// utils/dataCompression.ts
export const compressData = (data: any): string => {
  const jsonString = JSON.stringify(data);
  // gzip圧縮（ブラウザ環境では代替手法を使用）
  return btoa(jsonString); // Base64エンコード（簡易版）
};

export const decompressData = (compressed: string): any => {
  const jsonString = atob(compressed); // Base64デコード
  return JSON.parse(jsonString);
};
```

### 差分更新

```typescript
// utils/dataDiff.ts
export const calculateDataDiff = (oldData: any, newData: any) => {
  const diff = {
    added: [],
    modified: [],
    deleted: [],
  };

  // 追加・変更されたアイテムの検出
  for (const [key, value] of Object.entries(newData)) {
    if (!(key in oldData)) {
      diff.added.push({ key, value });
    } else if (JSON.stringify(oldData[key]) !== JSON.stringify(value)) {
      diff.modified.push({ key, oldValue: oldData[key], newValue: value });
    }
  }

  // 削除されたアイテムの検出
  for (const key of Object.keys(oldData)) {
    if (!(key in newData)) {
      diff.deleted.push({ key, value: oldData[key] });
    }
  }

  return diff;
};
```
