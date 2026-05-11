import Redis from "ioredis";

const REDIS_URL =
  process.env.REDIS_URL || "redis://:redis123456@localhost:6379";

const redis = new Redis(REDIS_URL);

export const PERMISSION_CACHE_TTL = 10 * 60;

export function getPermissionCacheKey(userId: string): string {
  return `user:permissions:${userId}`;
}

export {
  cacheUserPermissions,
  getCachedUserPermissions,
  invalidateUserPermissionCache,
  invalidateAllPermissionCache,
} from "./services/permissionCache";

export default redis;
