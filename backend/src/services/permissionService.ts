import {
  getUserAllRoleIds,
  getUserRolePermissions,
  getUserDirectPermissions
} from './roleService';
import { buildDataScopeCondition as buildDataScope } from './dataScope';
import { applyFieldMasking, maskValue } from './abacEvaluator';
import {
  cacheUserPermissions,
  getCachedUserPermissions
} from './permissionCache';

type PermissionType = 'MENU' | 'BUTTON' | 'DATA' | 'FIELD';
type DataScope = 'ALL' | 'CUSTOM' | 'DEPARTMENT_AND_CHILDREN' | 'DEPARTMENT' | 'SELF';

export interface UserPermissions {
  menus: any[];
  buttons: string[];
  dataScope: DataScope | null;
  dataRule: string | null;
  fields: any[];
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const cached = await getCachedUserPermissions(userId);
  if (cached) {
    return cached;
  }

  const roleIds = await getUserAllRoleIds(userId);
  const rolePermissions = await getUserRolePermissions(roleIds);
  const directPermissions = await getUserDirectPermissions(userId);

  const allPerms = new Map<string, any>();
  [...rolePermissions, ...directPermissions].forEach(p => {
    allPerms.set(p.id, p);
  });
  const permissions = Array.from(allPerms.values());

  const menus = permissions.filter(p => p.type === 'MENU').sort((a, b) => a.sort - b.sort);
  const buttons = permissions.filter(p => p.type === 'BUTTON').map(p => p.code);
  const dataPerms = permissions.filter(p => p.type === 'DATA');
  const fields = permissions.filter(p => p.type === 'FIELD');

  const scopePriority: Record<string, number> = {
    'ALL': 5,
    'CUSTOM': 4,
    'DEPARTMENT_AND_CHILDREN': 3,
    'DEPARTMENT': 2,
    'SELF': 1
  };

  let dataScope: DataScope | null = null;
  let dataRule: string | null = null;
  let maxPriority = 0;

  for (const dp of dataPerms) {
    if (dp.dataScope) {
      const priority = scopePriority[dp.dataScope] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        dataScope = dp.dataScope;
        dataRule = dp.dataRule;
      }
    }
  }

  const result: UserPermissions = {
    menus,
    buttons,
    dataScope,
    dataRule,
    fields
  };

  await cacheUserPermissions(userId, result);

  return result;
}

export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.buttons.includes(permissionCode) || 
         perms.menus.some(m => m.code === permissionCode);
}

export async function canAccess(userId: string, resource: string, action: string): Promise<boolean> {
  const permissionCode = `${resource}:${action}`;
  return await hasPermission(userId, permissionCode);
}

export async function buildDataScopeCondition(userId: string, resource: string): Promise<any> {
  const perms = await getUserPermissions(userId);
  return buildDataScope(userId, perms.dataScope, perms.dataRule);
}

export { applyFieldMasking, maskValue };
