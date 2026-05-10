<template>
  <div>
    <div class="page-toolbar">
      <button v-permission="'system:dept'" class="btn btn-primary">
        新增部门
      </button>
    </div>

    <div class="card" style="margin-top: 16px; padding: 0">
      <table class="table">
        <thead>
          <tr>
            <th>部门名</th>
            <th>部门编码</th>
            <th>上级部门</th>
            <th>人数</th>
            <th>排序</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dept in departments" :key="dept.id">
            <td>{{ dept.name }}</td>
            <td>{{ dept.code }}</td>
            <td>{{ getDeptName(dept.parentId) }}</td>
            <td>{{ dept.users?.length || 0 }}</td>
            <td>{{ dept.sort }}</td>
            <td>
              <span
                :class="dept.status === 1 ? 'tag tag-success' : 'tag tag-error'"
              >
                {{ dept.status === 1 ? "启用" : "禁用" }}
              </span>
            </td>
            <td>
              <button class="btn btn-default btn-sm" style="margin-right: 4px">
                编辑
              </button>
              <button class="btn btn-danger btn-sm">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import http from "../utils/http";
import type { Department } from "../types";

const departments = ref<Department[]>([]);

function getDeptName(parentId: string | undefined) {
  if (!parentId) return "-";
  const dept = departments.value.find((d) => d.id === parentId);
  return dept ? dept.name : "-";
}

async function loadData() {
  const result = await http.get<any, any>("/api/departments");
  if (result.success) {
    departments.value = result.data;
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
