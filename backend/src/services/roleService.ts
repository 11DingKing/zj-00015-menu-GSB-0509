import { PermissionType } from "@prisma/client";
import prisma from "../prisma";

async function getAllParentRoleIds(roleId: string): Promise<string[]> {
  const result: string[] = [];
  let currentId: string | null = roleId;

  while (currentId) {
    const role = await prisma.role.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!role?.parentId) break;
    result.push(role.parentId);
    currentId = role.parentId;
  }

  return result;
}

export async function getUserAllRoleIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { id: true } } },
  });

  if (!user) return [];

  const directRoleIds = user.roles.map((r) => r.id);
  const allRoleIds = new Set<string>(directRoleIds);

  for (const roleId of directRoleIds) {
    const parentIds = await getAllParentRoleIds(roleId);
    parentIds.forEach((id) => allRoleIds.add(id));
  }

  return Array.from(allRoleIds);
}

export async function getRolePermissions(roleIds: string[]): Promise<any[]> {
  if (roleIds.length === 0) return [];
  return prisma.permission.findMany({
    where: {
      status: 1,
      roles: { some: { id: { in: roleIds } } },
    },
  });
}

export async function getDirectUserPermissions(userId: string): Promise<any[]> {
  return prisma.permission.findMany({
    where: {
      status: 1,
      directUsers: { some: { id: userId } },
    },
  });
}

export async function getAllUserPermissions(userId: string): Promise<any[]> {
  const roleIds = await getUserAllRoleIds(userId);
  const [rolePerms, directPerms] = await Promise.all([
    getRolePermissions(roleIds),
    getDirectUserPermissions(userId),
  ]);

  const allPerms = new Map<string, any>();
  [...rolePerms, ...directPerms].forEach((p) => {
    allPerms.set(p.id, p);
  });

  return Array.from(allPerms.values());
}

export function categorizePermissions(permissions: any[]) {
  const menus = permissions
    .filter((p) => p.type === PermissionType.MENU)
    .sort((a, b) => a.sort - b.sort);
  const buttons = permissions
    .filter((p) => p.type === PermissionType.BUTTON)
    .map((p) => p.code);
  const dataPerms = permissions.filter((p) => p.type === PermissionType.DATA);
  const fields = permissions.filter((p) => p.type === PermissionType.FIELD);
  return { menus, buttons, dataPerms, fields };
}
