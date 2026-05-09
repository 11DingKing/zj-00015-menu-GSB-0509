<template>
  <div class="error-page">
    <div class="error-content">
      <h1 class="error-code">404</h1>
      <p class="error-title">页面不存在</p>
      <p class="error-desc">抱歉，您访问的页面不存在</p>
      <button class="btn btn-primary" @click="goBack">返回首页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  router.push('/');
}
</script>

<style scoped>
.error-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.error-content {
  text-align: center;
}

.error-code {
  font-size: 120px;
  font-weight: 600;
  color: #8c8c8c;
  margin: 0 0 16px;
  line-height: 1;
}

.error-title {
  font-size: 28px;
  color: #262626;
  margin: 0 0 8px;
}

.error-desc {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0 0 24px;
}
</style>
