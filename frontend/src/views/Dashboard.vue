<template>
  <div>
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-value">{{ permissions?.menus?.length || 0 }}</div>
        <div class="stat-label">可用菜单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ permissions?.buttons?.length || 0 }}</div>
        <div class="stat-label">按钮权限</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ dataScopeLabel }}</div>
        <div class="stat-label">数据权限范围</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ permissions?.fields?.length || 0 }}</div>
        <div class="stat-label">字段脱敏规则</div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin: 0 0 16px;">当前用户信息</h3>
      <table class="table">
        <tbody>
          <tr>
            <td style="width: 120px;"><strong>用户名</strong></td>
            <td>{{ user?.username }}</td>
          </tr>
          <tr>
            <td><strong>昵称</strong></td>
            <td>{{ user?.nickname || '-' }}</td>
          </tr>
          <tr>
            <td><strong>角色</strong></td>
            <td>{{ user?.roles?.map(r => r.name).join(', ') || '-' }}</td>
          </tr>
          <tr>
            <td><strong>部门</strong></td>
            <td>{{ user?.departments?.map(d => d.name).join(', ') || '-' }}</td>
          </tr>
          <tr>
            <td><strong>数据权限</strong></td>
            <td>
              <span class="tag tag-info">{{ dataScopeLabel }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();

const user = computed(() => userStore.user);
const permissions = computed(() => userStore.permissions);

const dataScopeLabel = computed(() => {
  const scope = permissions.value?.dataScope;
  const map: Record<string, string> = {
    'ALL': '全部数据',
    'DEPARTMENT': '本部门',
    'DEPARTMENT_AND_CHILDREN': '本部门及下级',
    'SELF': '仅本人',
    'CUSTOM': '自定义'
  };
  return map[scope || ''] || '未配置';
});
</script>

<style scoped>
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
}
</style>
