import prisma from '../prisma';

export type RoleWithPermissions = any;

export async function getAllParentRoleIds(roleId: string): Promise<string[]> {
  const result: string[] = [];
  let currentId: string | null = roleId;

  while (currentId) {
    const role: any = await prisma.role.findUnique({
      where: { id: currentId },
      select: { parentId: true }
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
    select: { roles: { select: { id: true } } }
  });

  if (!user) return [];

  const directRoleIds = user.roles.map((r: any) => r.id);
  const allRoleIds = new Set<string>(directRoleIds);

  for (const roleId of directRoleIds) {
    const parentIds = await getAllParentRoleIds(roleId);
    parentIds.forEach(id => allRoleIds.add(id));
  }

  return Array.from(allRoleIds);
}

export async function getRolePermissions(roleIds: string[]): Promise<any[]> {
  if (roleIds.length === 0) return [];

  return prisma.permission.findMany({
    where: {
      status: 1,
      roles: { some: { id: { in: roleIds } } }
    }
  });
}

export async function getUserDirectPermissions(userId: string): Promise<any[]> {
  return prisma.permission.findMany({
    where: {
      status: 1,
      directUsers: { some: { id: userId } }
    }
  });
}

export async function assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
  await prisma.role.update({
    where: { id: roleId },
    data: {
      permissions: {
        set: permissionIds.map((id: string) => ({ id }))
      }
    }
  });
}

export async function assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: {
        set: roleIds.map((id: string) => ({ id }))
      }
    }
  });
}

export async function assignDirectPermissionsToUser(userId: string, permissionIds: string[]): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      directPermissions: {
        set: permissionIds.map((id: string) => ({ id }))
      }
    }
  });
}

export async function createRole(data: any): Promise<any> {
  return prisma.role.create({ data });
}

export async function updateRole(id: string, data: any): Promise<any> {
  return prisma.role.update({ where: { id }, data });
}

export async function deleteRole(id: string): Promise<void> {
  await prisma.role.delete({ where: { id } });
}

export async function getRoleList(where: any = {}): Promise<RoleWithPermissions[]> {
  return prisma.role.findMany({
    where,
    orderBy: { sort: 'asc' },
    include: {
      permissions: { select: { id: true, name: true, code: true, type: true } }
    }
  });
}

export async function getRoleById(id: string): Promise<any> {
  return prisma.role.findUnique({ where: { id } });
}

export async function hasChildRoles(roleId: string): Promise<boolean> {
  const children = await prisma.role.findMany({ where: { parentId: roleId }, take: 1 });
  return children.length > 0;
}

export async function hasUsersInRole(roleId: string): Promise<boolean> {
  const users = await prisma.user.findMany({
    where: { roles: { some: { id: roleId } } },
    take: 1
  });
  return users.length > 0;
}
