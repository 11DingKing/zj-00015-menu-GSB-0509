import redis, {
  getPermissionCacheKey,
  cacheUserPermissions as _cacheUserPermissions,
  getCachedUserPermissions as _getCachedUserPermissions,
  invalidateUserPermissionCache as _invalidateUserPermissionCache,
  invalidateAllPermissionCache as _invalidateAllPermissionCache,
} from "../redis";

export { getPermissionCacheKey };

export async function cacheUserPermissions(
  userId: string,
  permissions: any,
): Promise<void> {
  await _cacheUserPermissions(userId, permissions);
}

export async function getCachedUserPermissions(
  userId: string,
): Promise<any | null> {
  return _getCachedUserPermissions(userId);
}

export async function invalidateUserPermissionCache(
  userId: string,
): Promise<void> {
  await _invalidateUserPermissionCache(userId);
}

export async function invalidateAllPermissionCache(): Promise<void> {
  await _invalidateAllPermissionCache();
}
