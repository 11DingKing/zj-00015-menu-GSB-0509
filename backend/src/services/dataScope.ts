import prisma from '../prisma';

type DataScope = 'ALL' | 'CUSTOM' | 'DEPARTMENT_AND_CHILDREN' | 'DEPARTMENT' | 'SELF';

export async function getUserDepartmentIds(userId: string): Promise<string[]> {
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

export async function buildDataScopeCondition(
  userId: string,
  dataScope: DataScope | null,
  dataRule: string | null
): Promise<any> {
  if (!dataScope) {
    return { creatorId: userId };
  }

  switch (dataScope) {
    case 'ALL':
      return {};

    case 'SELF':
      return { creatorId: userId };

    case 'DEPARTMENT':
    case 'DEPARTMENT_AND_CHILDREN':
      const deptIds = await getUserDepartmentIds(userId);
      if (deptIds.length === 0) {
        return { creatorId: userId };
      }
      return { departmentId: { in: deptIds } };

    case 'CUSTOM':
      try {
        return dataRule ? JSON.parse(dataRule) : { creatorId: userId };
      } catch {
        return { creatorId: userId };
      }

    default:
      return { creatorId: userId };
  }
}
