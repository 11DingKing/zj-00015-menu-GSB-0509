<template>
  <div>
    <div class="page-toolbar">
      <select v-model="searchForm.type" class="select" @change="loadData">
        <option value="">全部类型</option>
        <option value="MENU">菜单</option>
        <option value="BUTTON">按钮</option>
        <option value="DATA">数据</option>
        <option value="FIELD">字段</option>
      </select>
      <button v-permission="'system:permission'" class="btn btn-primary">
        新增权限
      </button>
    </div>

    <div class="card" style="margin-top: 16px; padding: 0">
      <table class="table">
        <thead>
          <tr>
            <th>权限名</th>
            <th>权限编码</th>
            <th>类型</th>
            <th>路由/字段</th>
            <th>数据范围</th>
            <th>排序</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="perm in permissions" :key="perm.id">
            <td>{{ perm.name }}</td>
            <td>
              <code>{{ perm.code }}</code>
            </td>
            <td>
              <span :class="getTypeTagClass(perm.type)">
                {{ getTypeLabel(perm.type) }}
              </span>
            </td>
            <td>{{ perm.path || perm.fieldName || "-" }}</td>
            <td>{{ getDataScopeLabel(perm.dataScope) }}</td>
            <td>{{ perm.sort }}</td>
            <td>
              <span
                :class="perm.status === 1 ? 'tag tag-success' : 'tag tag-error'"
              >
                {{ perm.status === 1 ? "启用" : "禁用" }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useUserStore } from "../stores/user";
import http from "../utils/http";
import type { Permission } from "../types";

const userStore = useUserStore();
const permissions = ref<Permission[]>([]);
const searchForm = reactive({ type: "" });

function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    MENU: "菜单",
    BUTTON: "按钮",
    DATA: "数据",
    FIELD: "字段",
  };
  return map[type] || type;
}

function getTypeTagClass(type: string) {
  const map: Record<string, string> = {
    MENU: "tag tag-info",
    BUTTON: "tag tag-warning",
    DATA: "tag tag-success",
    FIELD: "tag tag-error",
  };
  return map[type] || "tag";
}

function getDataScopeLabel(scope: string | undefined) {
  const map: Record<string, string> = {
    ALL: "全部数据",
    DEPARTMENT: "本部门",
    DEPARTMENT_AND_CHILDREN: "本部门及下级",
    SELF: "仅本人",
    CUSTOM: "自定义",
  };
  return scope ? map[scope] || scope : "-";
}

async function loadData() {
  const result = await http.get<any, any>("/api/permissions", {
    params: searchForm,
  });
  if (result.success) {
    permissions.value = result.data;
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

code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
</style>
