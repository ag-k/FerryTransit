# ダークモード機能仕様書

## 概要

隠岐航路案内のダークモード機能は、ユーザーの好みやシステム設定に応じて、ライトテーマとダークテーマを切り替える機能です。Tailwind CSS のダークモード機能を使用して実装されています。

## テーマの種類

1. **ライトモード（light）**
   - 白を基調とした明るいテーマ
   - デフォルトテーマ

2. **ダークモード（dark）**
   - 黒を基調とした暗いテーマ
   - 目に優しい配色

3. **システム設定に従う（system）**
   - OS の設定に自動的に従う
   - デフォルト設定

## 実装方式

### Tailwind CSS のダークモード

**設定**: `tailwind.config.js`

```javascript
module.exports = {
  darkMode: 'class',  // class ベースのダークモード
  // ...
}
```

### クラス名による切り替え

```vue
<template>
  <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
    <!-- コンテンツ -->
  </div>
</template>
```

### システム設定の検出

```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
```

## 機能詳細

### 1. テーマの切り替え

**Store: `useSettingsStore`**

```typescript
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'system' as 'light' | 'dark' | 'system'
  }),
  
  actions: {
    setTheme(theme: 'light' | 'dark' | 'system') {
      this.theme = theme
      this.applyTheme()
      this.saveToLocalStorage()
    },
    
    applyTheme() {
      if (process.client) {
        const root = document.documentElement
        const isDark = this.getEffectiveTheme() === 'dark'
        
        if (isDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    },
    
    getEffectiveTheme(): 'light' | 'dark' {
      if (this.theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      }
      return this.theme
    }
  }
})
```

### 2. システム設定の監視

```typescript
const setupSystemThemeListener = () => {
  if (process.client && settingsStore.theme === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      settingsStore.applyTheme()
    }
    
    mediaQuery.addEventListener('change', handleChange)
  }
}
```

### 3. 初期化

```typescript
onMounted(() => {
  // ストレージから設定を読み込み
  settingsStore.loadFromLocalStorage()
  
  // テーマを適用
  settingsStore.applyTheme()
  
  // システム設定の監視を開始
  setupSystemThemeListener()
})
```

## ユーザーインターフェース

### 設定画面（`/settings`）

**テーマ選択**
- ラジオボタンまたはドロップダウンで選択
- 選択と同時にテーマが切り替わる
- プレビュー表示

**オプション：**
- ライトモード
- ダークモード
- システム設定に従う（デフォルト）

### テーマ切り替えボタン

ヘッダーやナビゲーションメニューにテーマ切り替えボタンを配置：

- アイコンで現在のテーマを表示
- クリックでテーマを切り替え
- アニメーション効果

## デザインガイドライン

### カラーパレット

**ライトモード**
- 背景: `bg-white`
- テキスト: `text-gray-900`
- ボーダー: `border-gray-200`
- アクセント: `bg-blue-600`

**ダークモード**
- 背景: `bg-gray-900`
- テキスト: `text-white`
- ボーダー: `border-gray-700`
- アクセント: `bg-blue-500`

### コンポーネントの実装例

```vue
<template>
  <div class="
    bg-white dark:bg-gray-900
    text-gray-900 dark:text-white
    border border-gray-200 dark:border-gray-700
    rounded-lg
    p-4
  ">
    <h2 class="text-xl font-bold mb-2">タイトル</h2>
    <p class="text-gray-600 dark:text-gray-400">本文</p>
  </div>
</template>
```

## パフォーマンス最適化

1. **クラス名の切り替え**
   - `document.documentElement.classList` の操作のみ
   - 再レンダリングを最小限に抑制

2. **CSS 変数の使用**
   - 将来的に CSS 変数を使用してテーマを管理
   - より柔軟なテーマカスタマイズが可能

## アクセシビリティ

1. **コントラスト比**
   - WCAG 2.1 AA 準拠のコントラスト比を維持
   - ライトモード・ダークモードの両方で確認

2. **フォーカス表示**
   - フォーカス時の表示を明確にする
   - ダークモードでも視認性を確保

## エラーハンドリング

- **ストレージエラー**: デフォルトテーマ（システム設定）を使用
- **クラス追加エラー**: エラーを無視して処理を継続

## 関連機能

- **設定機能**: テーマの選択と保存
- **UI コンポーネント**: すべてのコンポーネントでダークモード対応
- **アクセシビリティ**: コントラスト比の確保





