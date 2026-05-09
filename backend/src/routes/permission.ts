import { FastifyInstance } from 'fastify';
import { hasPermission } from '../services/permissionService';
import { invalidateAllPermissionCache } from '../redis';

export default async function permissionRoutes(fastify: FastifyInstance) {
  fastify.get('/api/permissions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['权限管理'],
      description: '获取权限列表'
    }
  }, async (request, reply) => {
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:permission');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限访问' });
    }

    const query = request.query as any;
    const where: any = {};
    if (query.type) where.type = query.type;

    const data = await fastify.prisma.permission.findMany({
      where,
      orderBy: { sort: 'asc' }
    });

    return { success: true, data };
  });

  fastify.post('/api/permissions', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['权限管理'],
      description: '新增权限'
    }
  }, async (request, reply) => {
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:permission');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const created = await fastify.prisma.permission.create({
      data: {
        name: body.name,
        code: body.code,
        type: body.type,
        path: body.path,
        icon: body.icon,
        component: body.component,
        dataScope: body.dataScope,
        dataRule: body.dataRule,
        fieldName: body.fieldName,
        fieldMask: body.fieldMask,
        parentId: body.parentId,
        sort: body.sort || 0
      }
    });

    await invalidateAllPermissionCache();

    return { success: true, data: created };
  });

  fastify.put('/api/permissions/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:permission');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const updated = await fastify.prisma.permission.update({
      where: { id: params.id },
      data: body
    });

    await invalidateAllPermissionCache();

    return { success: true, data: updated };
  });

  fastify.delete('/api/permissions/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const params = request.params as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:permission');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const children = await fastify.prisma.permission.findMany({ where: { parentId: params.id } });
    if (children.length > 0) {
      return reply.code(400).send({ success: false, message: '请先删除子权限' });
    }

    await fastify.prisma.permission.delete({ where: { id: params.id } });
    await invalidateAllPermissionCache();

    return { success: true, message: '删除成功' };
  });
}
