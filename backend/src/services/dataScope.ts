import { DataScope } from "@prisma/client";
import prisma from "../prisma";
import { evaluateDataRule } from "./abacEvaluator";

export async function getUserDepartmentIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { departments: true },
  });

  if (!user) return [];

  const deptIds = new Set<string>();

  async function addWithChildren(deptId: string) {
    deptIds.add(deptId);
    const children = await prisma.department.findMany({
      where: { parentId: deptId },
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
  dataRule: string | null,
): Promise<any> {
  if (!dataScope) {
    return { creatorId: userId };
  }

  switch (dataScope) {
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
      const customCondition = evaluateDataRule(dataRule);
      return customCondition || { creatorId: userId };

    default:
      return { creatorId: userId };
  }
}
