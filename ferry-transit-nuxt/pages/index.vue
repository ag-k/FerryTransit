<template>
  <div class="container py-4">
    <div class="page-header mb-4">
      <h1>{{ $t('TITLE') }}</h1>
    </div>
    
    <div class="alert alert-info" role="alert">
      <strong>Nuxt3 移植版</strong> - 開発中
    </div>
    
    <div class="row">
      <div class="col-md-4 mb-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">{{ $t('TIMETABLE') }}</h5>
            <p class="card-text">フェリーの時刻表を確認</p>
            <NuxtLink to="/timetable" class="btn btn-primary">
              時刻表を見る
            </NuxtLink>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">{{ $t('TRANSIT') }}</h5>
            <p class="card-text">乗換案内を検索</p>
            <NuxtLink to="/transit" class="btn btn-primary">
              経路を検索
            </NuxtLink>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">{{ $t('SHIP_STATUS') }}</h5>
            <p class="card-text">運航状況を確認</p>
            <NuxtLink to="/status" class="btn btn-primary">
              運航状況
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Index page
</script>