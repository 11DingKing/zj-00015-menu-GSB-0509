<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">RBAC+ABAC 权限系统</h1>
      <p class="login-subtitle">通用权限管理后台</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label class="form-label required">用户名</label>
          <input 
            v-model="form.username" 
            type="text" 
            class="input form-input" 
            placeholder="请输入用户名"
            required
          />
        </div>
        
        <div class="form-item">
          <label class="form-label required">密码</label>
          <input 
            v-model="form.password" 
            type="password" 
            class="input form-input" 
            placeholder="请输入密码"
            required
          />
        </div>
        
        <div v-if="error" class="login-error">{{ error }}</div>
        
        <button 
          type="submit" 
          class="btn btn-primary login-btn"
          :disabled="loading"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
      
      <div class="login-tips">
        <p>测试账号：</p>
        <p>admin / admin123456（超级管理员）</p>
        <p>manager1 / manager123456（技术部经理）</p>
        <p>dev1 / dev123456（前端开发）</p>
        <p>audit1 / audit123456（审计员）</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const form = reactive({
  username: '',
  password: ''
});

const loading = ref(false);
const error = ref('');

async function handleLogin() {
  error.value = '';
  loading.value = true;
  
  try {
    await userStore.login(form.username, form.password);
    const redirect = (route.query.redirect as string) || '/';
    router.replace(redirect);
  } catch (err: any) {
    error.value = err.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  border-radius: 12px;
  padding: 48px;
  width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 8px;
  text-align: center;
}

.login-subtitle {
  font-size: 14px;
  color: #8c8c8c;
  text-align: center;
  margin: 0 0 32px;
}

.login-form {
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.login-error {
  color: #ff4d4f;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #fff2f0;
  border-radius: 4px;
  border: 1px solid #ffa39e;
}

.login-tips {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.8;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.login-tips p {
  margin: 0;
}
</style>
