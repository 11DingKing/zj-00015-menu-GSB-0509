import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, UserPermissions } from '../types';
import http from '../utils/http';

interface LoginResult {
  token: string;
  user: User;
  permissions: UserPermissions;
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '');
  const user = ref<User | null>(null);
  const permissions = ref<UserPermissions | null>(null);

  const isLoggedIn = computed(() => !!token.value);
  const buttonPermissions = computed(() => new Set(permissions.value?.buttons || []));

  async function login(username: string, password: string): Promise<LoginResult> {
    const result = await http.post<any, any>('/api/auth/login', { username, password });
    if (result.success) {
      const data: LoginResult = result.data;
      token.value = data.token;
      user.value = data.user;
      permissions.value = data.permissions;
      localStorage.setItem('token', data.token);
      return data;
    }
    throw new Error(result.message || '登录失败');
  }

  async function refresh() {
    const result = await http.post<any, any>('/api/auth/refresh');
    if (result.success) {
      user.value = result.data.user;
      permissions.value = result.data.permissions;
    }
  }

  function logout() {
    token.value = '';
    user.value = null;
    permissions.value = null;
    localStorage.removeItem('token');
  }

  function hasButtonPermission(code: string): boolean {
    return buttonPermissions.value.has(code);
  }

  function hasAnyButtonPermission(codes: string[]): boolean {
    return codes.some(code => buttonPermissions.value.has(code));
  }

  return {
    token,
    user,
    permissions,
    isLoggedIn,
    buttonPermissions,
    login,
    refresh,
    logout,
    hasButtonPermission,
    hasAnyButtonPermission
  };
});
