import {
  getUserAllRoleIds,
  getRolePermissions,
  getUserDirectPermissions
} from './roleService';
import {
  resolveHighestDataScope,
  buildDataScopeCondition as buildScopeCondition,
  applyFieldMasking,
  maskValue,
  type DataScopeResult
} from './dataScope';
import {
  cacheUserPermissions,
  getCachedUserPermissions
} from './permissionCache';

export type DataScope = 'ALL' | 'DEPARTMENT' | 'DEPARTMENT_AND_CHILDREN' | 'SELF' | 'CUSTOM';

export interface UserPermissions {
  menus: any[];
  buttons: string[];
  dataScope: DataScope | null;
  dataRule: string | null;
  fields: any[];
}

export { applyFieldMasking, maskValue };

async function fetchUserPermissions(userId: string): Promise<UserPermissions> {
  const roleIds = await getUserAllRoleIds(userId);

  const rolePermissions = await getRolePermissions(roleIds);
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

  const { dataScope, dataRule } = resolveHighestDataScope(dataPerms);

  return {
    menus,
    buttons,
    dataScope,
    dataRule,
    fields
  };
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const cached = await getCachedUserPermissions(userId);
  if (cached) {
    return cached;
  }

  const result = await fetchUserPermissions(userId);
  await cacheUserPermissions(userId, result);

  return result;
}

export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.buttons.includes(permissionCode) || 
         perms.menus.some(m => m.code === permissionCode);
}

export async function canAccess(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const permissionCode = `${resource}:${action}`;
  return hasPermission(userId, permissionCode);
}

export async function buildDataScopeCondition(userId: string, resource: string): Promise<any> {
  const perms = await getUserPermissions(userId);
  return buildScopeCondition(userId, perms as DataScopeResult);
}
