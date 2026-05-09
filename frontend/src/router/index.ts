import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '../stores/user';
import type { Permission } from '../types';

const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('../views/403.vue'),
    meta: { title: '无权访问' }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('../views/404.vue'),
    meta: { title: '页面不存在' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes: constantRoutes
});

function buildMenuTree(menus: Permission[]): Permission[] {
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
}

function menuToRoute(menu: Permission & { children?: Permission[] }): RouteRecordRaw {
  const route: RouteRecordRaw = {
    path: menu.path!,
    name: menu.code,
    meta: {
      title: menu.name,
      icon: menu.icon,
      permissionCode: menu.code
    },
    children: []
  };

  if (menu.component && !menu.parentId) {
    route.component = () => import(`../views/${menu.component}.vue`).catch(() => import('../views/404.vue'));
  } else if (menu.component) {
    route.component = () => import(`../views/${menu.component}.vue`).catch(() => import('../views/404.vue'));
  }

  if (menu.children && menu.children.length > 0) {
    route.children = menu.children
      .filter(child => child.component)
      .map(child => ({
        path: child.path!.split('/').pop()!,
        name: child.code,
        component: () => import(`../views/${child.component}.vue`).catch(() => import('../views/404.vue')),
        meta: {
          title: child.name,
          icon: child.icon,
          permissionCode: child.code
        }
      }));
  }

  return route;
}

export async function generateRoutesFromPermissions() {
  const userStore = useUserStore();
  if (!userStore.permissions?.menus) return;

  const menuTree = buildMenuTree(userStore.permissions.menus);

  const layoutRoute: RouteRecordRaw = {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: []
  };

  menuTree.forEach(menu => {
    if (menu.path) {
      layoutRoute.children?.push(menuToRoute(menu as any));
    }
  });

  router.addRoute(layoutRoute);
  router.addRoute({ path: '/:pathMatch(.*)*', redirect: '/404' });
}

let routesGenerated = false;

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore();

  if (to.path === '/login') {
    if (userStore.isLoggedIn) {
      next('/');
    } else {
      next();
    }
    return;
  }

  if (!userStore.isLoggedIn) {
    next(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
    return;
  }

  if (!routesGenerated) {
    try {
      if (!userStore.user) {
        await userStore.refresh();
      }
      await generateRoutesFromPermissions();
      routesGenerated = true;
      next({ ...to, replace: true });
      return;
    } catch {
      userStore.logout();
      next('/login');
      return;
    }
  }

  if (to.meta?.permissionCode) {
    const hasMenuAccess = userStore.permissions?.menus?.some(
      m => m.code === to.meta?.permissionCode
    );
    if (!hasMenuAccess) {
      next('/403');
      return;
    }
  }

  next();
});

export default router;
