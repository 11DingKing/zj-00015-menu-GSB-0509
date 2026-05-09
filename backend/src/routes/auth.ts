import { FastifyInstance } from 'fastify';
import { login, resetPassword } from '../services/authService';
import { logAudit } from '../services/auditService';
import { hasPermission } from '../services/permissionService';
import { invalidateUserPermissionCache } from '../redis';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/login', {
    schema: {
      tags: ['认证'],
      description: '用户登录',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as any;
    try {
      const result = await login(
        body.username,
        body.password,
        request.ip,
        request.headers['user-agent']
      );

      const token = fastify.jwt.sign({
        userId: result.user.id,
        username: result.user.username
      });

      return {
        success: true,
        data: {
          token,
          user: result.user,
          permissions: result.permissions
        }
      };
    } catch (err: any) {
      reply.code(401);
      return {
        success: false,
        message: err.message
      };
    }
  });

  fastify.post('/api/auth/refresh', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as any;
    
    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: user.userId },
      include: { roles: true, departments: true }
    });

    if (!dbUser) {
      return reply.code(404).send({ success: false, message: '用户不存在' });
    }

    const permissions = await (await import('../services/permissionService')).getUserPermissions(user.userId);

    const { password: _, ...userWithoutPassword } = dbUser;

    return {
      success: true,
      data: {
        user: userWithoutPassword,
        permissions
      }
    };
  });

  fastify.post('/api/auth/reset-password', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['认证'],
      description: '重置用户密码（需要 system:user:edit 权限）'
    }
  }, async (request, reply) => {
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:user:edit');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    if (!body.userId || !body.newPassword) {
      return reply.code(400).send({ success: false, message: '缺少必要参数' });
    }

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    if (!operator) return reply.code(500).send({ success: false, message: '操作员不存在' });

    await resetPassword(body.userId, body.newPassword, operator, request.ip);
    await invalidateUserPermissionCache(body.userId);

    return { success: true, message: '密码重置成功' };
  });
}
