<template>
  <div>
    <div class="page-toolbar">
      <input 
        v-model="searchForm.action" 
        type="text" 
        class="input" 
        placeholder="搜索操作类型"
        style="width: 200px;"
        @keyup.enter="loadData"
      />
      <input 
        v-model="searchForm.operatorName" 
        type="text" 
        class="input" 
        placeholder="搜索操作人"
        style="width: 150px;"
        @keyup.enter="loadData"
      />
      <select v-model="searchForm.targetType" class="select" @change="loadData">
        <option value="">全部目标类型</option>
        <option value="User">用户</option>
        <option value="Role">角色</option>
        <option value="Order">订单</option>
      </select>
      <button class="btn btn-default" @click="loadData">搜索</button>
    </div>

    <div class="card" style="margin-top: 16px; padding: 0;">
      <table class="table">
        <thead>
          <tr>
            <th>操作</th>
            <th>操作人</th>
            <th>目标类型</th>
            <th>目标ID</th>
            <th>详情</th>
            <th>IP</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>
              <span :class="getActionTagClass(log.action)">
                {{ log.action }}
              </span>
            </td>
            <td>{{ log.operatorName }}</td>
            <td>{{ log.targetType || '-' }}</td>
            <td>{{ log.targetId || '-' }}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="log.details">
              {{ log.details || '-' }}
            </td>
            <td>{{ log.ip || '-' }}</td>
            <td>{{ formatDate(log.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="pagination" style="padding: 16px;">
        <span>共 {{ total }} 条记录</span>
        <button 
          v-if="nextCursor" 
          class="btn btn-default btn-sm"
          @click="loadMore"
        >加载更多</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import http from '../utils/http';
import type { AuditLog } from '../types';

const logs = ref<AuditLog[]>([]);
const total = ref(0);
const nextCursor = ref<string | undefined>();
const searchForm = reactive({ action: '', operatorName: '', targetType: '' });

function getActionTagClass(action: string) {
  if (action.includes('LOGIN')) return 'tag tag-info';
  if (action.includes('GRANT')) return 'tag tag-warning';
  if (action.includes('DELETE') || action.includes('CANCEL')) return 'tag tag-error';
  if (action.includes('CREATE') || action.includes('ADD')) return 'tag tag-success';
  return 'tag tag-default';
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
}

async function loadData(cursor?: string) {
  const params: any = { ...searchForm };
  if (cursor) params.cursor = cursor;
  if (!cursor) params.limit = 20;
  
  const result = await http.get<any, any>('/api/audit-logs', { params });
  if (result.success) {
    if (cursor) {
      logs.value = [...logs.value, ...result.data];
    } else {
      logs.value = result.data;
    }
    total.value = result.total;
    nextCursor.value = result.nextCursor;
  }
}

function loadMore() {
  if (nextCursor.value) {
    loadData(nextCursor.value);
  }
}

onMounted(() => loadData());
</script>

<style scoped>
.page-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.tag-default {
  background: #f5f5f5;
  color: #8c8c8c;
  border: 1px solid #d9d9d9;
}
</style>
