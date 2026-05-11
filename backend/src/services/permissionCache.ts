import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://:redis123456@localhost:6379';
const redis = new Redis(REDIS_URL);

export const PERMISSION_CACHE_TTL = 10 * 60;

export interface CacheConfig {
  keyPrefix: string;
  ttl: number;
}

const defaultCacheConfig: CacheConfig = {
  keyPrefix: 'user:permissions:',
  ttl: PERMISSION_CACHE_TTL
};

export function getPermissionCacheKey(userId: string): string {
  return `user:permissions:${userId}`;
}

export function buildCacheKey(userId: string, config: CacheConfig = defaultCacheConfig): string {
  return `${config.keyPrefix}${userId}`;
}

export async function cacheUserPermissions(
  userId: string,
  permissions: any,
  config: CacheConfig = defaultCacheConfig
): Promise<void> {
  await redis.setex(
    buildCacheKey(userId, config),
    config.ttl,
    JSON.stringify(permissions)
  );
}

export async function getCachedUserPermissions(
  userId: string,
  config: CacheConfig = defaultCacheConfig
): Promise<any | null> {
  const cached = await redis.get(buildCacheKey(userId, config));
  return cached ? JSON.parse(cached) : null;
}

export async function invalidateUserPermissionCache(
  userId: string,
  config: CacheConfig = defaultCacheConfig
): Promise<void> {
  await redis.del(buildCacheKey(userId, config));
}

export async function invalidateAllPermissionCache(
  config: CacheConfig = defaultCacheConfig
): Promise<void> {
  const keys = await redis.keys(`${config.keyPrefix}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export async function refreshUserPermissionCache(
  userId: string,
  fetchPermissions: () => Promise<any>,
  config: CacheConfig = defaultCacheConfig
): Promise<any> {
  const permissions = await fetchPermissions();
  await cacheUserPermissions(userId, permissions, config);
  return permissions;
}
