import prisma from '../prisma';

export async function logAudit(options: {
  action: string;
  operatorId: string;
  operatorName: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: options
  });
}

export async function getAuditLogs(filters: any): Promise<{ data: any[]; total: number; nextCursor?: string }> {
  const where: any = {};
  
  if (filters.action) where.action = { contains: filters.action };
  if (filters.operatorName) where.operatorName = { contains: filters.operatorName };
  if (filters.targetType) where.targetType = filters.targetType;

  const take = filters.limit ? parseInt(filters.limit) : 20;
  let cursor = filters.cursor ? { id: filters.cursor } : undefined;
  let skip = cursor ? 1 : 0;

  const data = await prisma.auditLog.findMany({
    where,
    take,
    skip,
    cursor,
    orderBy: { createdAt: 'desc' }
  });

  const total = await prisma.auditLog.count({ where });
  const nextCursor = data.length === take ? data[data.length - 1].id : undefined;

  return { data, total, nextCursor };
}
