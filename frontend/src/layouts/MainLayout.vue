<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">RBAC+ABAC</div>
        <span class="subtitle">权限系统</span>
      </div>
      <nav class="sidebar-menu">
        <template v-for="menu in menuTree" :key="menu.id">
          <div 
            v-if="menu.children && menu.children.length > 0" 
            class="menu-group"
          >
            <div 
              class="menu-item menu-group-title"
              :class="{ 'menu-active': isGroupActive(menu) }"
              @click="toggleGroup(menu.id)"
            >
              <span class="menu-icon">{{ menu.icon || '📁' }}</span>
              <span class="menu-text">{{ menu.name }}</span>
              <span class="menu-arrow" :class="{ 'menu-expanded': expandedGroups.has(menu.id) }">▸</span>
            </div>
            <div 
              v-show="expandedGroups.has(menu.id) || isGroupActive(menu)" 
              class="menu-children"
            >
              <router-link
                v-for="child in menu.children.filter(c => c.component)"
                :key="child.id"
                :to="child.path"
                class="menu-item"
                :class="{ 'menu-active': isRouteActive(child.path) }"
              >
                <span class="menu-icon">{{ child.icon || '•' }}</span>
                <span class="menu-text">{{ child.name }}</span>
              </router-link>
            </div>
          </div>
          <router-link
            v-else-if="menu.component"
            :to="menu.path"
            class="menu-item"
            :class="{ 'menu-active': isRouteActive(menu.path) }"
          >
            <span class="menu-icon">{{ menu.icon || '📄' }}</span>
            <span class="menu-text">{{ menu.name }}</span>
          </router-link>
        </template>
      </nav>
    </aside>
    
    <div class="main">
      <header class="header">
        <div class="header-title">
          <h2>{{ currentPageTitle }}</h2>
        </div>
        <div class="header-user">
          <div class="user-info">
            <div class="user-name">{{ userStore.user?.nickname || userStore.user?.username }}</div>
            <div class="user-roles">
              {{ userStore.user?.roles?.map(r => r.name).join(', ') || '无角色' }}
            </div>
          </div>
          <div class="user-dropdown">
            <button class="btn btn-default btn-sm" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </header>
      
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import type { Permission } from '../types';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const expandedGroups = ref(new Set<string>());

const menuTree = computed(() => {
  const menus = userStore.permissions?.menus || [];
  const map = new Map<string, Permission & { children?: Permission[] }>();
  const roots: Permission[] = [];
  
  menus.forEach(menu => {
    map.set(menu.id, { ...menu, children: [] });
  });
  
  menus.forEach(menu => {
    const node = map.get(menu.id)!;
    if (menu.parentId && map.has(menu.parentId)) {
      const parent = map.get(menu.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
});

const currentPageTitle = computed(() => {
  return route.meta?.title || '首页';
});

function isRouteActive(path: string | undefined): boolean {
  if (!path) return false;
  return route.path === path || route.path.startsWith(path + '/');
}

function isGroupActive(group: any): boolean {
  if (!group.children) return false;
  return group.children.some((child: any) => isRouteActive(child.path));
}

function toggleGroup(id: string) {
  if (expandedGroups.value.has(id)) {
    expandedGroups.value.delete(id);
  } else {
    expandedGroups.value.add(id);
  }
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

onMounted(() => {
  menuTree.value.forEach(menu => {
    if ((menu as any).children?.length) {
      expandedGroups.value.add(menu.id);
    }
  });
});
</script>

<style scoped>
.layout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background: #001529;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 4px;
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-item:hover {
  color: white;
  background: rgba(255, 255, 255, 0.08);
}

.menu-active {
  color: white;
  background: #1890ff;
}

.menu-group-title {
  color: rgba(255, 255, 255, 0.45);
}

.menu-icon {
  width: 20px;
  margin-right: 10px;
}

.menu-text {
  flex: 1;
}

.menu-arrow {
  transition: transform 0.2s;
}

.menu-expanded {
  transform: rotate(90deg);
}

.menu-children {
  background: rgba(0, 0, 0, 0.2);
}

.menu-children .menu-item {
  padding-left: 48px;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5;
}

.header {
  height: 60px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.header-title h2 {
  font-size: 18px;
  font-weight: 500;
  color: #262626;
  margin: 0;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  text-align: right;
}

.user-name {
  font-size: 14px;
  color: #262626;
  font-weight: 500;
}

.user-roles {
  font-size: 12px;
  color: #8c8c8c;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
