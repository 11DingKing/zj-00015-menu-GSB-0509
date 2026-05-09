import { FastifyInstance } from 'fastify';
import * as bcrypt from 'bcryptjs';
import { hasPermission } from '../services/permissionService';
import { logAudit } from '../services/auditService';
import { invalidateUserPermissionCache } from '../redis';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/api/users', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['用户管理'],
      description: '获取用户列表（cursor 分页）'
    }
  }, async (request, reply) => {
    const user = request.user as any;
    const query = request.query as any;

    const hasPerm = await hasPermission(user.userId, 'system:user');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限访问' });
    }

    const take = query.limit ? parseInt(query.limit) : 20;
    let cursor = query.cursor ? { id: query.cursor } : undefined;
    let skip = cursor ? 1 : 0;

    const where: any = {};
    if (query.username) where.username = { contains: query.username };
    if (query.nickname) where.nickname = { contains: query.nickname };
    if (query.status !== undefined) where.status = parseInt(query.status);

    const [data, total] = await Promise.all([
      fastify.prisma.user.findMany({
        where,
        take,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: { select: { id: true, name: true, code: true } },
          departments: { select: { id: true, name: true } },
          directPermissions: { select: { id: true, name: true, code: true, type: true } }
        }
      }),
      fastify.prisma.user.count({ where })
    ]);

    const sanitized = data.map(d => {
      const { password, ...rest } = d as any;
      return rest;
    });

    const nextCursor = data.length === take ? data[data.length - 1].id : undefined;

    return {
      success: true,
      data: sanitized,
      total,
      nextCursor
    };
  });

  fastify.post('/api/users', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['用户管理'],
      description: '新增用户（需要 system:user:add 权限）'
    }
  }, async (request, reply) => {
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:user:add');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const exists = await fastify.prisma.user.findUnique({ where: { username: body.username } });
    if (exists) {
      return reply.code(400).send({ success: false, message: '用户名已存在' });
    }

    const hashed = await bcrypt.hash(body.password || '123456', 10);

    const created = await fastify.prisma.user.create({
      data: {
        username: body.username,
        password: hashed,
        nickname: body.nickname,
        email: body.email,
        phone: body.phone,
        status: body.status !== undefined ? body.status : 1
      }
    });

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'USER_CREATE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'User',
      targetId: created.id,
      ip: request.ip,
      details: `创建用户: ${created.username}`
    });

    return { success: true, data: created };
  });

  fastify.put('/api/users/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['用户管理'],
      description: '更新用户（需要 system:user:edit 权限）'
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:user:edit');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const updateData: any = {
      nickname: body.nickname,
      email: body.email,
      phone: body.phone,
      status: body.status
    };

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const updated = await fastify.prisma.user.update({
      where: { id: params.id },
      data: updateData
    });

    await invalidateUserPermissionCache(params.id);

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'USER_UPDATE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'User',
      targetId: params.id,
      ip: request.ip,
      details: `更新用户: ${updated.username}`
    });

    return { success: true, data: updated };
  });

  fastify.delete('/api/users/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['用户管理'],
      description: '删除用户（需要 system:user:delete 权限）'
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:user:delete');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    if (params.id === user.userId) {
      return reply.code(400).send({ success: false, message: '不能删除自己' });
    }

    const target = await fastify.prisma.user.findUnique({ where: { id: params.id } });
    if (!target) {
      return reply.code(404).send({ success: false, message: '用户不存在' });
    }

    await fastify.prisma.user.delete({ where: { id: params.id } });
    await invalidateUserPermissionCache(params.id);

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'USER_DELETE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'User',
      targetId: params.id,
      ip: request.ip,
      details: `删除用户: ${target.username}`
    });

    return { success: true, message: '删除成功' };
  });

  fastify.post('/api/users/:id/roles', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['用户管理'],
      description: '分配角色（需要 system:user:grantRole 权限）'
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:user:grantRole');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    await fastify.prisma.user.update({
      where: { id: params.id },
      data: {
        roles: {
          set: (body.roleIds || []).map((id: string) => ({ id }))
        }
      }
    });

    await invalidateUserPermissionCache(params.id);

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    const target = await fastify.prisma.user.findUnique({ where: { id: params.id } });
    await logAudit({
      action: 'GRANT_ROLE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'User',
      targetId: params.id,
      ip: request.ip,
      details: `为用户 ${target?.username} 分配角色: ${body.roleIds?.join(',') || 'none'}`
    });

    return { success: true, message: '角色分配成功' };
  });

  fastify.post('/api/users/:id/permissions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['用户管理'],
      description: '用户直接授权（需要 system:user:grantPerm 权限，越过角色直接授权）'
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:user:grantPerm');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    await fastify.prisma.user.update({
      where: { id: params.id },
      data: {
        directPermissions: {
          set: (body.permissionIds || []).map((id: string) => ({ id }))
        }
      }
    });

    await invalidateUserPermissionCache(params.id);

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    const target = await fastify.prisma.user.findUnique({ where: { id: params.id } });
    await logAudit({
      action: 'GRANT_PERMISSION',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'User',
      targetId: params.id,
      ip: request.ip,
      details: `为用户 ${target?.username} 直接授权权限: ${body.permissionIds?.join(',') || 'none'}`
    });

    return { success: true, message: '权限授权成功' };
  });
}
