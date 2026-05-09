import { FastifyInstance } from 'fastify';
import { hasPermission } from '../services/permissionService';
import { getAuditLogs } from '../services/auditService';

export default async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/api/audit-logs', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['审计日志'],
      description: '获取审计日志（需要 audit 权限）'
    }
  }, async (request, reply) => {
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'audit');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限访问' });
    }

    const result = await getAuditLogs(request.query);

    return {
      success: true,
      data: result.data,
      total: result.total,
      nextCursor: result.nextCursor
    };
  });
}
