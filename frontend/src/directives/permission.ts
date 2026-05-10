import type { Directive, DirectiveBinding } from 'vue';
import { useUserStore } from '../stores/user';

const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const userStore = useUserStore();
    const permission = binding.value;
    const hasPermission = checkPermission(permission, userStore.buttonPermissions);
    
    if (!hasPermission) {
      el.parentNode?.removeChild(el);
    }
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const userStore = useUserStore();
    const permission = binding.value;
    const hasPermission = checkPermission(permission, userStore.buttonPermissions);
    
    if (!hasPermission) {
      el.parentNode?.removeChild(el);
    }
  }
};

function checkPermission(permission: string | string[], buttonPermissions: Set<string>): boolean {
  if (!permission) return true;
  
  if (Array.isArray(permission)) {
    return permission.some(p => buttonPermissions.has(p));
  }
  
  return buttonPermissions.has(permission);
}

export default permissionDirective;
