import { FastifyInstance } from 'fastify';
import { hasPermission } from '../services/permissionService';
import { logAudit } from '../services/auditService';
import { invalidateAllPermissionCache } from '../redis';

export default async function roleRoutes(fastify: FastifyInstance) {
  fastify.get('/api/roles', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['角色管理'],
      description: '获取角色列表'
    }
  }, async (request, reply) => {
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:role');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限访问' });
    }

    const query = request.query as any;
    const where: any = {};
    if (query.name) where.name = { contains: query.name };
    if (query.code) where.code = { contains: query.code };

    const data = await fastify.prisma.role.findMany({
      where,
      orderBy: { sort: 'asc' },
      include: {
        permissions: { select: { id: true, name: true, code: true, type: true } }
      }
    });

    return { success: true, data };
  });

  fastify.post('/api/roles', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['角色管理'],
      description: '新增角色（需要 system:role:add 权限）'
    }
  }, async (request, reply) => {
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:role:add');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const created = await fastify.prisma.role.create({
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
        parentId: body.parentId,
        sort: body.sort || 0
      }
    });

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'ROLE_CREATE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'Role',
      targetId: created.id,
      ip: request.ip,
      details: `创建角色: ${created.name}`
    });

    return { success: true, data: created };
  });

  fastify.put('/api/roles/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['角色管理'],
      description: '更新角色（需要 system:role:edit 权限）'
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:role:edit');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const updated = await fastify.prisma.role.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        parentId: body.parentId,
        sort: body.sort,
        status: body.status
      }
    });

    await invalidateAllPermissionCache();

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'ROLE_UPDATE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'Role',
      targetId: params.id,
      ip: request.ip,
      details: `更新角色: ${updated.name}`
    });

    return { success: true, data: updated };
  });

  fastify.delete('/api/roles/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['角色管理'],
      description: '删除角色（需要 system:role:delete 权限）'
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:role:delete');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const children = await fastify.prisma.role.findMany({ where: { parentId: params.id } });
    if (children.length > 0) {
      return reply.code(400).send({ success: false, message: '请先删除子角色' });
    }

    const users = await fastify.prisma.user.findMany({
      where: { roles: { some: { id: params.id } } },
      take: 1
    });
    if (users.length > 0) {
      return reply.code(400).send({ success: false, message: '该角色下有用户，无法删除' });
    }

    const target = await fastify.prisma.role.findUnique({ where: { id: params.id } });
    if (!target) {
      return reply.code(404).send({ success: false, message: '角色不存在' });
    }

    await fastify.prisma.role.delete({ where: { id: params.id } });
    await invalidateAllPermissionCache();

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'ROLE_DELETE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'Role',
      targetId: params.id,
      ip: request.ip,
      details: `删除角色: ${target.name}`
    });

    return { success: true, message: '删除成功' };
  });

  fastify.post('/api/roles/:id/permissions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['角色管理'],
      description: '角色授权（需要 system:role:grantPerm 权限）'
    }
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:role:grantPerm');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    await fastify.prisma.role.update({
      where: { id: params.id },
      data: {
        permissions: {
          set: (body.permissionIds || []).map((id: string) => ({ id }))
        }
      }
    });

    await invalidateAllPermissionCache();

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    const target = await fastify.prisma.role.findUnique({ where: { id: params.id } });
    await logAudit({
      action: 'ROLE_GRANT_PERMISSION',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'Role',
      targetId: params.id,
      ip: request.ip,
      details: `为角色 ${target?.name} 分配权限: ${body.permissionIds?.join(',') || 'none'}`
    });

    return { success: true, message: '角色授权成功' };
  });
}
