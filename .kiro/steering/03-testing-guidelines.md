---
inclusion: always
---

# テストガイドライン

## テスト戦略

### テストピラミッド

1. **ユニットテスト** (70%): 個別の関数・コンポーネント
2. **統合テスト** (20%): コンポーネント間の連携
3. **E2E テスト** (10%): ユーザーシナリオ全体

### テスト環境

- **フレームワーク**: Vitest + Vue Test Utils
- **モック**: vi.mock() を使用
- **カバレッジ**: c8 でカバレッジ測定

## ユニットテスト規約

### ファイル構成

```
src/
├── components/
│   ├── ComponentName.vue
│   └── __tests__/
│       └── ComponentName.test.ts
├── composables/
│   ├── useFeature.ts
│   └── useFeature.test.ts
└── stores/
    ├── feature.ts
    └── feature.test.ts
```

### 命名規則

- **ファイル名**: `*.test.ts` または `__tests__/*.ts`
- **describe**: 機能やコンポーネント名（日本語可）
- **it/test**: 具体的な動作（日本語可）

### テスト例（コンポーネント）

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import TimetableForm from "../TimetableForm.vue";

describe("TimetableForm", () => {
  it("初期状態で正しいデフォルト値が設定される", () => {
    const wrapper = mount(TimetableForm);
    expect(wrapper.find('[data-testid="departure-port"]').text()).toBe("西郷");
  });

  it("港を選択すると適切なイベントが発火される", async () => {
    const wrapper = mount(TimetableForm);
    await wrapper.find('[data-testid="port-select"]').setValue("菱浦");
    expect(wrapper.emitted("port-changed")).toBeTruthy();
  });
});
```

### テスト例（Composable）

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useFerryData } from "../useFerryData";

describe("useFerryData", () => {
  beforeEach(() => {
    // 各テスト前のセットアップ
  });

  it("フェリーデータを正しく取得する", async () => {
    const { ferryRoutes, fetchRoutes } = useFerryData();
    await fetchRoutes();
    expect(ferryRoutes.value).toHaveLength(4);
  });

  it("エラー時に適切なエラー状態になる", async () => {
    // エラーケースのテスト
  });
});
```

### テスト例（Pinia Store）

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFerryStore } from "../ferry";

describe("Ferry Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("初期状態が正しく設定される", () => {
    const store = useFerryStore();
    expect(store.routes).toEqual([]);
    expect(store.loading).toBe(false);
  });

  it("ルート検索が正しく動作する", async () => {
    const store = useFerryStore();
    await store.searchRoutes("西郷", "菱浦");
    expect(store.routes.length).toBeGreaterThan(0);
  });
});
```

## モック戦略

### Firebase モック

```typescript
// test/mocks/firebase.ts
export const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(() =>
        Promise.resolve({
          exists: true,
          data: () => ({
            /* テストデータ */
          }),
        })
      ),
    })),
  })),
};
```

### API モック

```typescript
// test/mocks/api.ts
export const mockTimetableApi = {
  getTimetable: vi.fn(() =>
    Promise.resolve({
      routes: [
        /* テストデータ */
      ],
    })
  ),
};
```

### Nuxt モック

```typescript
// test/mocks/nuxt.ts
export const mockNuxtApp = {
  $t: (key: string) => key, // i18n モック
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
};
```

## テストデータ管理

### テストデータファイル

```typescript
// test/fixtures/ferryData.ts
export const mockFerryRoutes = [
  {
    id: "route-1",
    departure: "西郷",
    arrival: "菱浦",
    departureTime: "08:00",
    arrivalTime: "09:30",
    fare: 1500,
  },
  // ... 他のテストデータ
];
```

### ファクトリー関数

```typescript
// test/factories/ferry.ts
export const createMockRoute = (overrides = {}) => ({
  id: "test-route",
  departure: "西郷",
  arrival: "菱浦",
  ...overrides,
});
```

## 非同期テスト

### Promise のテスト

```typescript
it("非同期データ取得が正しく動作する", async () => {
  const { data, loading } = useAsyncData();
  expect(loading.value).toBe(true);

  await nextTick(); // Vue の更新を待つ
  expect(loading.value).toBe(false);
  expect(data.value).toBeDefined();
});
```

### タイマーのテスト

```typescript
import { vi } from "vitest";

it("タイマー機能が正しく動作する", async () => {
  vi.useFakeTimers();

  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();

  vi.useRealTimers();
});
```

## エラーテスト

### エラーハンドリングのテスト

```typescript
it("APIエラー時に適切なエラーメッセージが表示される", async () => {
  // APIをエラーを返すようにモック
  vi.mocked(api.getTimetable).mockRejectedValue(new Error("Network Error"));

  const { error } = await useAsyncData();
  expect(error.value).toBe("ネットワークエラーが発生しました");
});
```

### バリデーションテスト

```typescript
it("無効な入力値でバリデーションエラーが発生する", () => {
  const { validate } = useFormValidation();
  const result = validate({ departure: "", arrival: "" });
  expect(result.isValid).toBe(false);
  expect(result.errors).toContain("出発港を選択してください");
});
```

## パフォーマンステスト

### レンダリング性能

```typescript
it("大量データでも適切な時間でレンダリングされる", async () => {
  const startTime = performance.now();

  const wrapper = mount(TimetableList, {
    props: { routes: largeMockData },
  });

  await nextTick();
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(100); // 100ms以内
});
```

## アクセシビリティテスト

### ARIA 属性のテスト

```typescript
it("適切なARIA属性が設定される", () => {
  const wrapper = mount(NavigationMenu);
  const menuButton = wrapper.find('[role="button"]');
  expect(menuButton.attributes("aria-expanded")).toBe("false");
});
```

### キーボードナビゲーション

```typescript
it("Enterキーでボタンが動作する", async () => {
  const wrapper = mount(SearchButton);
  await wrapper.trigger("keydown.enter");
  expect(wrapper.emitted("click")).toBeTruthy();
});
```

## テスト実行

### 基本コマンド

```bash
# 全テスト実行
npm run test:unit

# ウォッチモード
npm run test:unit -- --watch

# カバレッジ付き実行
npm run test:unit -- --coverage

# 特定ファイルのテスト
npm run test:unit -- TimetableForm.test.ts
```

### CI/CD での実行

```bash
# CI環境での実行（ヘッドレス）
npm run test:unit -- --run --reporter=verbose
```

## テスト品質の指標

### カバレッジ目標

- **ライン**: 80%以上
- **ブランチ**: 75%以上
- **関数**: 85%以上
- **ステートメント**: 80%以上

### 重要なテストケース

1. **ハッピーパス**: 正常な動作フロー
2. **エラーケース**: 異常系の処理
3. **境界値**: 最大・最小値での動作
4. **エッジケース**: 特殊な条件での動作

## テストのメンテナンス

### 定期的な見直し

- **不要なテスト**: 削除または統合
- **重複テスト**: 統合して効率化
- **古いモック**: 実装に合わせて更新

### テストの可読性

- **明確な命名**: テストの意図が分かる名前
- **適切なコメント**: 複雑なテストロジックの説明
- **DRY 原則**: 共通処理の関数化
