<template>
  <div>
    <div class="page-toolbar">
      <input 
        v-model="searchForm.username" 
        type="text" 
        class="input" 
        placeholder="搜索用户名"
        style="width: 200px;"
        @keyup.enter="loadData"
      />
      <button class="btn btn-default" @click="loadData">搜索</button>
      <button 
        v-if="userStore.hasButtonPermission('system:user:add')" 
        class="btn btn-primary" 
        @click="openCreateModal"
      >新增用户</button>
    </div>

    <div class="card" style="margin-top: 16px; padding: 0;">
      <table class="table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>昵称</th>
            <th>邮箱</th>
            <th>手机号</th>
            <th>角色</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.nickname || '-' }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>{{ user.phone || '-' }}</td>
            <td>
              <span v-for="role in user.roles" :key="role.id" class="tag tag-info" style="margin-right: 4px;">
                {{ role.name }}
              </span>
            </td>
            <td>
              <span :class="user.status === 1 ? 'tag tag-success' : 'tag tag-error'">
                {{ user.status === 1 ? '启用' : '禁用' }}
              </span>
            </td>
            <td>
              <button 
                v-if="userStore.hasButtonPermission('system:user:edit')"
                class="btn btn-default btn-sm" 
                style="margin-right: 4px;"
                @click="openEditModal(user)"
              >编辑</button>
              <button 
                v-if="userStore.hasButtonPermission('system:user:grantRole')"
                class="btn btn-default btn-sm" 
                style="margin-right: 4px;"
                @click="openRoleModal(user)"
              >分配角色</button>
              <button 
                v-if="userStore.hasButtonPermission('system:user:grantPerm')"
                class="btn btn-default btn-sm" 
                style="margin-right: 4px;"
                @click="openPermModal(user)"
              >直接授权</button>
              <button 
                v-if="userStore.hasButtonPermission('system:user:delete')"
                class="btn btn-danger btn-sm"
                @click="handleDelete(user)"
              >删除</button>
            </td>
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

    <div v-if="modalVisible" class="modal-overlay" @click.self="modalVisible = false">
      <div class="modal">
        <div class="modal-header">{{ isEdit ? '编辑用户' : '新增用户' }}</div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label required">用户名</label>
            <input v-model="form.username" type="text" class="input form-input" />
          </div>
          <div class="form-item">
            <label class="form-label" :class="{ required: !isEdit }">密码</label>
            <input v-model="form.password" type="password" class="input form-input" :placeholder="isEdit ? '留空不修改' : '请输入密码'" />
          </div>
          <div class="form-item">
            <label class="form-label">昵称</label>
            <input v-model="form.nickname" type="text" class="input form-input" />
          </div>
          <div class="form-item">
            <label class="form-label">邮箱</label>
            <input v-model="form.email" type="email" class="input form-input" />
          </div>
          <div class="form-item">
            <label class="form-label">手机号</label>
            <input v-model="form.phone" type="text" class="input form-input" />
          </div>
          <div class="form-item">
            <label class="form-label">状态</label>
            <select v-model="form.status" class="select form-input">
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="modalVisible = false">取消</button>
          <button class="btn btn-primary" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import http from '../utils/http';
import type { User, Role, Permission } from '../types';

const userStore = useUserStore();

const users = ref<User[]>([]);
const total = ref(0);
const nextCursor = ref<string | undefined>();
const searchForm = reactive({ username: '' });

const modalVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const editingId = ref('');
const form = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  status: 1
});

async function loadData(cursor?: string) {
  const params: any = { ...searchForm };
  if (cursor) params.cursor = cursor;
  if (!cursor) params.limit = 20;
  
  const result = await http.get<any, any>('/api/users', { params });
  if (result.success) {
    if (cursor) {
      users.value = [...users.value, ...result.data];
    } else {
      users.value = result.data;
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

function openCreateModal() {
  isEdit.value = false;
  editingId.value = '';
  Object.assign(form, {
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    status: 1
  });
  modalVisible.value = true;
}

function openEditModal(user: User) {
  isEdit.value = true;
  editingId.value = user.id;
  Object.assign(form, {
    username: user.username,
    password: '',
    nickname: user.nickname || '',
    email: user.email || '',
    phone: user.phone || '',
    status: user.status
  });
  modalVisible.value = true;
}

function openRoleModal(user: User) {
  alert('角色分配功能 - 实际项目中应有模态框实现');
}

function openPermModal(user: User) {
  alert('直接授权功能 - 实际项目中应有模态框实现');
}

async function handleSubmit() {
  if (!form.username) return;
  submitting.value = true;
  
  try {
    if (isEdit.value) {
      await http.put<any, any>(`/api/users/${editingId.value}`, form);
    } else {
      if (!form.password) {
        alert('请输入密码');
        return;
      }
      await http.post<any, any>('/api/users', form);
    }
    modalVisible.value = false;
    loadData();
  } catch (err: any) {
    alert(err.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(user: User) {
  if (!confirm(`确定要删除用户 ${user.username}？`)) return;
  try {
    await http.delete<any, any>(`/api/users/${user.id}`);
    loadData();
  } catch (err: any) {
    alert(err.message || '删除失败');
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
</style>
