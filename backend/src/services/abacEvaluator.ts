import { DataScope } from "@prisma/client";

export const SCOPE_PRIORITY: Record<string, number> = {
  [DataScope.ALL]: 5,
  [DataScope.CUSTOM]: 4,
  [DataScope.DEPARTMENT_AND_CHILDREN]: 3,
  [DataScope.DEPARTMENT]: 2,
  [DataScope.SELF]: 1,
};

export interface DataScopeResult {
  dataScope: DataScope | null;
  dataRule: string | null;
}

export function resolveDataScope(dataPerms: any[]): DataScopeResult {
  let dataScope: DataScope | null = null;
  let dataRule: string | null = null;
  let maxPriority = 0;

  for (const dp of dataPerms) {
    if (dp.dataScope) {
      const priority = SCOPE_PRIORITY[dp.dataScope] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        dataScope = dp.dataScope;
        dataRule = dp.dataRule;
      }
    }
  }

  return { dataScope, dataRule };
}

export function evaluateDataRule(dataRule: string | null): any {
  if (!dataRule) return null;
  try {
    return JSON.parse(dataRule);
  } catch {
    return null;
  }
}
