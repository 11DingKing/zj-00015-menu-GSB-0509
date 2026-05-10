<template>
  <div>
    <div class="page-toolbar">
      <input
        v-model="searchForm.name"
        type="text"
        class="input"
        placeholder="搜索角色名"
        style="width: 200px"
        @keyup.enter="loadData"
      />
      <button class="btn btn-default" @click="loadData">搜索</button>
      <button
        v-permission="'system:role:add'"
        class="btn btn-primary"
        @click="openCreateModal"
      >
        新增角色
      </button>
    </div>

    <div class="card" style="margin-top: 16px; padding: 0">
      <table class="table">
        <thead>
          <tr>
            <th>角色名</th>
            <th>角色编码</th>
            <th>描述</th>
            <th>父角色</th>
            <th>排序</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in roles" :key="role.id">
            <td>{{ role.name }}</td>
            <td>{{ role.code }}</td>
            <td>{{ role.description || "-" }}</td>
            <td>{{ getRoleName(role.parentId) }}</td>
            <td>{{ role.sort }}</td>
            <td>
              <span
                :class="role.status === 1 ? 'tag tag-success' : 'tag tag-error'"
              >
                {{ role.status === 1 ? "启用" : "禁用" }}
              </span>
            </td>
            <td>
              <button
                v-permission="'system:role:edit'"
                class="btn btn-default btn-sm"
                style="margin-right: 4px"
              >
                编辑
              </button>
              <button
                v-permission="'system:role:grantPerm'"
                class="btn btn-default btn-sm"
                style="margin-right: 4px"
              >
                授权
              </button>
              <button
                v-permission="'system:role:delete'"
                class="btn btn-danger btn-sm"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import http from "../utils/http";
import type { Role } from "../types";

const roles = ref<Role[]>([]);
const searchForm = reactive({ name: "" });

function getRoleName(parentId: string | undefined) {
  if (!parentId) return "-";
  const role = roles.value.find((r) => r.id === parentId);
  return role ? role.name : "-";
}

async function loadData() {
  const result = await http.get<any, any>("/api/roles", { params: searchForm });
  if (result.success) {
    roles.value = result.data;
  }
}

function openCreateModal() {
  alert("新增角色功能");
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
