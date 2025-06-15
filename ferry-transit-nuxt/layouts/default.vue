<template>
  <div class="app-layout">
    <header class="app-header">
      <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container">
          <NuxtLink class="navbar-brand" to="/">
            {{ $t('TITLE') }}
          </NuxtLink>
          <div class="ms-auto">
            <select 
              class="form-select form-select-sm"
              :value="$i18n.locale"
              @change="$i18n.setLocale($event.target.value)"
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </nav>
    </header>
    
    <main class="app-main">
      <slot />
    </main>
    
    <footer class="app-footer mt-auto py-3 bg-light">
      <div class="container">
        <p class="text-muted text-center mb-0">
          Powered by <a href="https://oki-digilab.com/" target="_blank">隠岐デジタルラボ</a>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Default layout component
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
}

.app-footer {
  margin-top: auto;
}
</style>