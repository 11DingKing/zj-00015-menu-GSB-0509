import type { App, Directive, DirectiveBinding } from 'vue';
import { useUserStore } from '../stores/user';

const checkPermission = (value: string | string[]): boolean => {
  const userStore = useUserStore();
  
  if (!userStore.permissions) {
    return false;
  }

  const buttonPermissions = new Set(userStore.permissions.buttons || []);
  
  if (Array.isArray(value)) {
    return value.some(code => buttonPermissions.has(code));
  }
  
  return buttonPermissions.has(value);
};

const vPermission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding;
    
    if (!value) {
      return;
    }

    const hasAccess = checkPermission(value);
    
    if (!hasAccess) {
      el.parentNode?.removeChild(el);
    }
  },
  
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const { value, oldValue } = binding;
    
    if (value === oldValue) {
      return;
    }

    const hasAccess = checkPermission(value);
    
    if (!hasAccess && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }
};

export function hasPermission(code: string): boolean {
  return checkPermission(code);
}

export function hasAnyPermission(codes: string[]): boolean {
  return checkPermission(codes);
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', vPermission);
}

export default vPermission;
