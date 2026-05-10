import { DataScope } from "@prisma/client";
import { getAllUserPermissions, categorizePermissions } from "./roleService";
import { resolveDataScope } from "./abacEvaluator";
import { buildDataScopeCondition } from "./dataScope";
import {
  cacheUserPermissions,
  getCachedUserPermissions,
} from "./permissionCache";

interface UserPermissions {
  menus: any[];
  buttons: string[];
  dataScope: DataScope | null;
  dataRule: string | null;
  fields: any[];
}

export async function getUserPermissions(
  userId: string,
): Promise<UserPermissions> {
  const cached = await getCachedUserPermissions(userId);
  if (cached) {
    return cached;
  }

  const permissions = await getAllUserPermissions(userId);
  const { menus, buttons, dataPerms, fields } =
    categorizePermissions(permissions);
  const { dataScope, dataRule } = resolveDataScope(dataPerms);

  const result: UserPermissions = {
    menus,
    buttons,
    dataScope,
    dataRule,
    fields,
  };

  await cacheUserPermissions(userId, result);

  return result;
}

export async function hasPermission(
  userId: string,
  permissionCode: string,
): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return (
    perms.buttons.includes(permissionCode) ||
    perms.menus.some((m) => m.code === permissionCode)
  );
}

export async function buildDataScopeConditionFacade(
  userId: string,
  resource: string,
): Promise<any> {
  const perms = await getUserPermissions(userId);
  return buildDataScopeCondition(userId, perms.dataScope, perms.dataRule);
}

export { buildDataScopeConditionFacade as buildDataScopeCondition };

export async function canAccess(
  userId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  return hasPermission(userId, `${resource}:${action}`);
}

export function maskValue(
  value: string | null | undefined,
  maskPattern: string,
): string {
  if (!value) return "";

  const match = maskPattern.match(/\$\{(\d+)\}.*\$\{(\d+)\}/);
  if (!match) {
    const keepStart = 3;
    const keepEnd = 4;
    if (value.length <= keepStart + keepEnd) {
      return "*".repeat(value.length);
    }
    return (
      value.substring(0, keepStart) +
      "****" +
      value.substring(value.length - keepEnd)
    );
  }

  const startChars = parseInt(match[1]);
  const endChars = parseInt(match[2]);

  if (value.length <= startChars + endChars) {
    return "*".repeat(value.length);
  }

  return (
    value.substring(0, startChars) +
    "****" +
    value.substring(value.length - endChars)
  );
}

export function applyFieldMasking(data: any[], fieldPermissions: any[]): any[] {
  if (fieldPermissions.length === 0 || !Array.isArray(data)) return data;

  const maskMap = new Map<string, string>();
  fieldPermissions.forEach((fp) => {
    if (fp.fieldName && fp.fieldMask) {
      maskMap.set(fp.fieldName, fp.fieldMask);
    }
  });

  if (maskMap.size === 0) return data;

  return data.map((item) => {
    const masked = { ...item };
    maskMap.forEach((maskPattern, fieldName) => {
      if (masked[fieldName] !== undefined) {
        masked[fieldName] = maskValue(masked[fieldName], maskPattern);
      }
    });
    return masked;
  });
}
