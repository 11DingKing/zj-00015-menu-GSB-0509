import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://:redis123456@localhost:6379';

const redis = new Redis(REDIS_URL);

export const PERMISSION_CACHE_TTL = 10 * 60;

export function getPermissionCacheKey(userId: string): string {
  return `user:permissions:${userId}`;
}

export async function cacheUserPermissions(userId: string, permissions: any): Promise<void> {
  await redis.setex(
    getPermissionCacheKey(userId),
    PERMISSION_CACHE_TTL,
    JSON.stringify(permissions)
  );
}

export async function getCachedUserPermissions(userId: string): Promise<any | null> {
  const cached = await redis.get(getPermissionCacheKey(userId));
  return cached ? JSON.parse(cached) : null;
}

export async function invalidateUserPermissionCache(userId: string): Promise<void> {
  await redis.del(getPermissionCacheKey(userId));
}

export async function invalidateAllPermissionCache(): Promise<void> {
  const keys = await redis.keys('user:permissions:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export default redis;
