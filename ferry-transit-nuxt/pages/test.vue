<template>
  <div class="container py-4">
    <h1>動作確認ページ</h1>
    
    <div class="row mt-4">
      <div class="col-md-6">
        <h2>環境情報</h2>
        <ul class="list-group">
          <li class="list-group-item">
            <strong>現在の言語:</strong> {{ $i18n.locale }}
          </li>
          <li class="list-group-item">
            <strong>利用可能な言語:</strong> 
            <span v-for="locale in $i18n.locales" :key="locale.code" class="badge bg-secondary me-1">
              {{ locale.name }}
            </span>
          </li>
          <li class="list-group-item">
            <strong>ランタイム設定:</strong>
            <ul>
              <li>API Base: {{ config.public.apiBase }}</li>
              <li>Ship Status API: {{ config.public.shipStatusApi }}</li>
            </ul>
          </li>
        </ul>
      </div>
      
      <div class="col-md-6">
        <h2>翻訳テスト</h2>
        <div class="card">
          <div class="card-body">
            <p><strong>タイトル:</strong> {{ $t('TITLE') }}</p>
            <p><strong>時刻表:</strong> {{ $t('TIMETABLE') }}</p>
            <p><strong>乗換案内:</strong> {{ $t('TRANSIT') }}</p>
            <p><strong>運航状況:</strong> {{ $t('SHIP_STATUS') }}</p>
          </div>
        </div>
        
        <div class="mt-3">
          <button 
            class="btn btn-primary me-2"
            @click="$i18n.setLocale('ja')"
            :disabled="$i18n.locale === 'ja'"
          >
            日本語
          </button>
          <button 
            class="btn btn-primary"
            @click="$i18n.setLocale('en')"
            :disabled="$i18n.locale === 'en'"
          >
            English
          </button>
        </div>
      </div>
    </div>
    
    <div class="row mt-4">
      <div class="col-12">
        <h2>Bootstrap コンポーネントテスト</h2>
        <div class="alert alert-success" role="alert">
          Bootstrap 5が正常に動作しています！
        </div>
        
        <div class="progress mb-3">
          <div class="progress-bar" role="progressbar" style="width: 75%">75%</div>
        </div>
        
        <button type="button" class="btn btn-primary" @click="showToast = !showToast">
          トーストを表示
        </button>
        
        <div v-if="showToast" class="toast show position-fixed bottom-0 end-0 m-3" role="alert">
          <div class="toast-header">
            <strong class="me-auto">通知</strong>
            <button type="button" class="btn-close" @click="showToast = false"></button>
          </div>
          <div class="toast-body">
            Nuxt3が正常に動作しています！
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mt-4">
      <div class="col-12">
        <h2>画像アセットテスト</h2>
        <div class="d-flex gap-3">
          <img 
            src="/images/FERRY_OKI.jpg" 
            alt="フェリーおき" 
            class="img-thumbnail"
            style="max-width: 200px"
          >
          <img 
            src="/favicon.ico" 
            alt="Favicon" 
            class="img-thumbnail"
            style="max-width: 64px"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const showToast = ref(false)

// ページメタデータ
useHead({
  title: '動作確認 - 隠岐航路案内'
})
</script>