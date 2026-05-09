import { PermissionType, DataScope } from '@prisma/client';
import prisma from '../prisma';
import { cacheUserPermissions, getCachedUserPermissions } from '../redis';

interface UserPermissions {
  menus: any[];
  buttons: string[];
  dataScope: DataScope | null;
  dataRule: string | null;
  fields: any[];
}

// 递归获取所有父角色ID（角色继承）
async function getAllParentRoleIds(roleId: string): Promise<string[]> {
  const result: string[] = [];
  let currentId: string | null = roleId;

  while (currentId) {
    const role = await prisma.role.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    });
    if (!role?.parentId) break;
    result.push(role.parentId);
    currentId = role.parentId;
  }

  return result;
}

// 获取用户的所有角色ID（包括父角色继承）
async function getUserAllRoleIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { id: true } } }
  });

  if (!user) return [];

  const directRoleIds = user.roles.map(r => r.id);
  const allRoleIds = new Set<string>(directRoleIds);

  for (const roleId of directRoleIds) {
    const parentIds = await getAllParentRoleIds(roleId);
    parentIds.forEach(id => allRoleIds.add(id));
  }

  return Array.from(allRoleIds);
}

// 获取用户所有部门ID（包括子部门，用于数据权限）
async function getUserDepartmentIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { departments: true }
  });

  if (!user) return [];

  const deptIds = new Set<string>();

  async function addWithChildren(deptId: string) {
    deptIds.add(deptId);
    const children = await prisma.department.findMany({
      where: { parentId: deptId }
    });
    for (const child of children) {
      await addWithChildren(child.id);
    }
  }

  for (const dept of user.departments) {
    await addWithChildren(dept.id);
  }

  return Array.from(deptIds);
}

// 获取用户完整权限集（从角色继承 + 直接授权）
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  // 1. 先查缓存
  const cached = await getCachedUserPermissions(userId);
  if (cached) {
    return cached;
  }

  // 2. 获取所有角色ID（含父角色继承）
  const roleIds = await getUserAllRoleIds(userId);

  // 3. 获取角色权限
  let rolePermissions: any[] = [];
  if (roleIds.length > 0) {
    rolePermissions = await prisma.permission.findMany({
      where: {
        status: 1,
        roles: { some: { id: { in: roleIds } } }
      }
    });
  }

  // 4. 获取用户直接授权的权限
  const directPermissions = await prisma.permission.findMany({
    where: {
      status: 1,
      directUsers: { some: { id: userId } }
    }
  });

  // 5. 合并去重
  const allPerms = new Map<string, any>();
  [...rolePermissions, ...directPermissions].forEach(p => {
    allPerms.set(p.id, p);
  });
  const permissions = Array.from(allPerms.values());

  // 6. 分类
  const menus = permissions.filter(p => p.type === PermissionType.MENU).sort((a, b) => a.sort - b.sort);
  const buttons = permissions.filter(p => p.type === PermissionType.BUTTON).map(p => p.code);
  const dataPerms = permissions.filter(p => p.type === PermissionType.DATA);
  const fields = permissions.filter(p => p.type === PermissionType.FIELD);

  // 取最高优先级的数据权限
  const scopePriority: Record<string, number> = {
    [DataScope.ALL]: 5,
    [DataScope.CUSTOM]: 4,
    [DataScope.DEPARTMENT_AND_CHILDREN]: 3,
    [DataScope.DEPARTMENT]: 2,
    [DataScope.SELF]: 1
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

  // 7. 缓存
  await cacheUserPermissions(userId, result);

  return result;
}

// 检查用户是否有某权限
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.buttons.includes(permissionCode) || 
         perms.menus.some(m => m.code === permissionCode);
}

// 构建数据权限的查询条件
export async function buildDataScopeCondition(userId: string, resource: string): Promise<any> {
  const perms = await getUserPermissions(userId);

  if (!perms.dataScope) {
    return { creatorId: userId };
  }

  switch (perms.dataScope) {
    case DataScope.ALL:
      return {};

    case DataScope.SELF:
      return { creatorId: userId };

    case DataScope.DEPARTMENT:
    case DataScope.DEPARTMENT_AND_CHILDREN:
      const deptIds = await getUserDepartmentIds(userId);
      if (deptIds.length === 0) {
        return { creatorId: userId };
      }
      return { departmentId: { in: deptIds } };

    case DataScope.CUSTOM:
      try {
        return perms.dataRule ? JSON.parse(perms.dataRule) : { creatorId: userId };
      } catch {
        return { creatorId: userId };
      }

    default:
      return { creatorId: userId };
  }
}

// 字段脱敏
export function maskValue(value: string | null | undefined, maskPattern: string): string {
  if (!value) return '';

  const match = maskPattern.match(/\$\{(\d+)\}.*\$\{(\d+)\}/);
  if (!match) {
    const keepStart = 3;
    const keepEnd = 4;
    if (value.length <= keepStart + keepEnd) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, keepStart) + '****' + value.substring(value.length - keepEnd);
  }

  const startChars = parseInt(match[1]);
  const endChars = parseInt(match[2]);
  
  if (value.length <= startChars + endChars) {
    return '*'.repeat(value.length);
  }

  return value.substring(0, startChars) + '****' + value.substring(value.length - endChars);
}

// 应用字段权限
export function applyFieldMasking(data: any[], fieldPermissions: any[]): any[] {
  if (fieldPermissions.length === 0 || !Array.isArray(data)) return data;

  const maskMap = new Map<string, string>();
  fieldPermissions.forEach(fp => {
    if (fp.fieldName && fp.fieldMask) {
      maskMap.set(fp.fieldName, fp.fieldMask);
    }
  });

  if (maskMap.size === 0) return data;

  return data.map(item => {
    const masked = { ...item };
    maskMap.forEach((maskPattern, fieldName) => {
      if (masked[fieldName] !== undefined) {
        masked[fieldName] = maskValue(masked[fieldName], maskPattern);
      }
    });
    return masked;
  });
}
