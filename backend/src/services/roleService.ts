import prisma from '../prisma';

export async function getAllParentRoleIds(roleId: string): Promise<string[]> {
  const result: string[] = [];
  let currentId: string | null = roleId;

  while (currentId) {
    const role: { parentId: string | null } | null = await prisma.role.findUnique({
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
  const user: { roles: { id: string }[] } | null = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { select: { id: true } } }
  });

  if (!user) return [];

  const directRoleIds = user.roles.map((r: { id: string }) => r.id);
  const allRoleIds = new Set<string>(directRoleIds);

  for (const roleId of directRoleIds) {
    const parentIds = await getAllParentRoleIds(roleId);
    parentIds.forEach(id => allRoleIds.add(id));
  }

  return Array.from(allRoleIds);
}

export async function getUserRolePermissions(roleIds: string[]): Promise<any[]> {
  if (roleIds.length === 0) return [];
  
  return await prisma.permission.findMany({
    where: {
      status: 1,
      roles: { some: { id: { in: roleIds } } }
    }
  });
}

export async function getUserDirectPermissions(userId: string): Promise<any[]> {
  return await prisma.permission.findMany({
    where: {
      status: 1,
      directUsers: { some: { id: userId } }
    }
  });
}
