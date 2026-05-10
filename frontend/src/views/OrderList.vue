<template>
  <div>
    <div class="page-toolbar">
      <input
        v-model="searchForm.orderNo"
        type="text"
        class="input"
        placeholder="搜索订单号"
        style="width: 200px"
        @keyup.enter="loadData"
      />
      <input
        v-model="searchForm.customerName"
        type="text"
        class="input"
        placeholder="搜索客户名"
        style="width: 150px"
        @keyup.enter="loadData"
      />
      <select v-model="searchForm.status" class="select" @change="loadData">
        <option value="">全部状态</option>
        <option value="pending">待支付</option>
        <option value="paid">已支付</option>
        <option value="shipped">已发货</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <button class="btn btn-default" @click="loadData">搜索</button>
      <button
        v-permission="'order:add'"
        class="btn btn-primary"
        @click="openCreateModal"
      >
        新增订单
      </button>
      <button v-permission="'order:export'" class="btn btn-default">
        导出订单
      </button>
    </div>

    <div v-if="meta" class="meta-info" style="margin: 16px 0">
      <span class="tag tag-info"
        >数据范围: {{ getDataScopeLabel(meta.dataScope) }}</span
      >
      <span v-if="meta.fieldMaskingApplied" class="tag tag-warning"
        >字段脱敏已启用</span
      >
    </div>

    <div class="card" style="margin-top: 16px; padding: 0">
      <table class="table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>客户名</th>
            <th>手机号 (字段脱敏)</th>
            <th>金额</th>
            <th>状态</th>
            <th>创建人</th>
            <th>所属部门</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.orderNo }}</td>
            <td>{{ order.customerName }}</td>
            <td>{{ order.customerPhone }}</td>
            <td>¥{{ order.amount.toFixed(2) }}</td>
            <td>
              <span :class="getStatusTagClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
            </td>
            <td>{{ order.creator?.nickname || order.creator?.username }}</td>
            <td>{{ order.department?.name }}</td>
            <td>{{ formatDate(order.createdAt) }}</td>
            <td>
              <button
                v-permission="'order:edit'"
                class="btn btn-default btn-sm"
                style="margin-right: 4px"
              >
                编辑
              </button>
              <button
                v-permission="'order:delete'"
                class="btn btn-danger btn-sm"
                @click="handleDelete(order)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" style="padding: 16px">
        <span>共 {{ total }} 条记录 (数据权限过滤后)</span>
        <button
          v-if="nextCursor"
          class="btn btn-default btn-sm"
          @click="loadMore"
        >
          加载更多
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useUserStore } from "../stores/user";
import http from "../utils/http";
import type { Order } from "../types";

const userStore = useUserStore();

const orders = ref<Order[]>([]);
const total = ref(0);
const nextCursor = ref<string | undefined>();
const meta = ref<any>(null);
const searchForm = reactive({ orderNo: "", customerName: "", status: "" });

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "待支付",
    paid: "已支付",
    shipped: "已发货",
    completed: "已完成",
    cancelled: "已取消",
  };
  return map[status] || status;
}

function getStatusTagClass(status: string) {
  const map: Record<string, string> = {
    pending: "tag tag-warning",
    paid: "tag tag-info",
    shipped: "tag tag-info",
    completed: "tag tag-success",
    cancelled: "tag tag-error",
  };
  return map[status] || "tag";
}

function getDataScopeLabel(scope: string | null) {
  const map: Record<string, string> = {
    ALL: "全部数据",
    DEPARTMENT: "本部门",
    DEPARTMENT_AND_CHILDREN: "本部门及下级",
    SELF: "仅本人",
    CUSTOM: "自定义",
  };
  return scope ? map[scope] || scope : "未配置";
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN");
}

async function loadData(cursor?: string) {
  const params: any = { ...searchForm };
  if (cursor) params.cursor = cursor;
  if (!cursor) params.limit = 20;

  const result = await http.get<any, any>("/api/orders", { params });
  if (result.success) {
    if (cursor) {
      orders.value = [...orders.value, ...result.data];
    } else {
      orders.value = result.data;
    }
    total.value = result.total;
    nextCursor.value = result.nextCursor;
    meta.value = result.meta;
  }
}

function loadMore() {
  if (nextCursor.value) {
    loadData(nextCursor.value);
  }
}

function openCreateModal() {
  alert("新增订单功能");
}

async function handleDelete(order: Order) {
  if (!confirm(`确定要删除订单 ${order.orderNo}？`)) return;
  try {
    await http.delete<any, any>(`/api/orders/${order.id}`);
    loadData();
  } catch (err: any) {
    alert(err.message || "删除失败");
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

.meta-info {
  display: flex;
  gap: 8px;
}
</style>
