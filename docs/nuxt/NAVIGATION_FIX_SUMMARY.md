# Navigation Fix Summary

## Issue
Language settings were being lost during navigation because NuxtLink components were using hardcoded paths (e.g., `to="/"`) instead of using the `localePath` helper for internationalization.

## Files Fixed

### 1. `/error.vue`
- Changed `to="/"` to `:to="localePath('/')"`
- Added `const localePath = useLocalePath()` to script
- Fixed `clearError` redirect to use `localePath('/')`

### 2. `/pages/index.vue`
- Changed all hardcoded links:
  - `to="/timetable"` → `:to="localePath('/timetable')"`
  - `to="/transit"` → `:to="localePath('/transit')"`
  - `to="/status"` → `:to="localePath('/status')"`
- Added `const localePath = useLocalePath()` to script

### 3. `/components/favorites/FavoriteRouteCard.vue`
- Changed route paths in NuxtLink components:
  - `path: '/timetable'` → `path: localePath('/timetable')`
  - `path: '/transit'` → `path: localePath('/transit')`
- Added `const localePath = useLocalePath()` to script

### 4. `/components/history/HistoryList.vue`
- Changed `path: '/transit'` to `path: localePath('/transit')` in router.push
- Added `const localePath = useLocalePath()` to script

### 5. `/components/favorites/FavoritePortCard.vue`
- Changed `path: '/timetable'` to `path: localePath('/timetable')` in router.push
- Added `const localePath = useLocalePath()` to script

### 6. `/composables/useFavorites.ts`
- Changed `path: '/transit'` to `path: localePath('/transit')` in router.push
- Added `const localePath = useLocalePath()` to the composable

## Components Already Using localePath Correctly
- `/components/AppNavigation.vue` ✓
- `/components/AppBottomNavigation.vue` ✓
- `/components/settings/LanguageSelector.vue` ✓ (uses `switchLocalePath`)

## Result
All navigation links now properly use the `localePath` helper, ensuring that language settings are preserved during navigation. The build completed successfully after these changes.