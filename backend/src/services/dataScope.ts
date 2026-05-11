import prisma from '../prisma';

export type DataScope = 'ALL' | 'DEPARTMENT' | 'DEPARTMENT_AND_CHILDREN' | 'SELF' | 'CUSTOM';

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

export interface DataScopeResult {
  dataScope: DataScope | null;
  dataRule: string | null;
}

const scopePriority: Record<string, number> = {
  ALL: 5,
  CUSTOM: 4,
  DEPARTMENT_AND_CHILDREN: 3,
  DEPARTMENT: 2,
  SELF: 1
};

export function resolveHighestDataScope(
  dataPermissions: any[]
): DataScopeResult {
  let dataScope: DataScope | null = null;
  let dataRule: string | null = null;
  let maxPriority = 0;

  for (const dp of dataPermissions) {
    if (dp.dataScope) {
      const priority = scopePriority[dp.dataScope] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        dataScope = dp.dataScope;
        dataRule = dp.dataRule;
      }
    }
  }

  return { dataScope, dataRule };
}

export async function buildDataScopeCondition(
  userId: string,
  dataScopeInfo: DataScopeResult
): Promise<any> {
  if (!dataScopeInfo.dataScope) {
    return { creatorId: userId };
  }

  switch (dataScopeInfo.dataScope) {
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
        return dataScopeInfo.dataRule ? JSON.parse(dataScopeInfo.dataRule) : { creatorId: userId };
      } catch {
        return { creatorId: userId };
      }

    default:
      return { creatorId: userId };
  }
}

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
