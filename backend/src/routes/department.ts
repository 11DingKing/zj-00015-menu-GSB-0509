import { FastifyInstance } from 'fastify';
import { hasPermission } from '../services/permissionService';

export default async function deptRoutes(fastify: FastifyInstance) {
  fastify.get('/api/departments', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['部门管理'],
      description: '获取部门列表（树形结构）'
    }
  }, async (request, reply) => {
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:dept');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限访问' });
    }

    const all = await fastify.prisma.department.findMany({
      orderBy: { sort: 'asc' },
      include: { users: { select: { id: true, username: true, nickname: true } } }
    });

    return { success: true, data: all };
  });

  fastify.post('/api/departments', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:dept');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const created = await fastify.prisma.department.create({
      data: {
        name: body.name,
        code: body.code,
        parentId: body.parentId,
        sort: body.sort || 0
      }
    });

    return { success: true, data: created };
  });

  fastify.put('/api/departments/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:dept');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const updated = await fastify.prisma.department.update({
      where: { id: params.id },
      data: body
    });

    return { success: true, data: updated };
  });

  fastify.delete('/api/departments/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const params = request.params as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'system:dept');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const children = await fastify.prisma.department.findMany({ where: { parentId: params.id } });
    if (children.length > 0) {
      return reply.code(400).send({ success: false, message: '请先删除子部门' });
    }

    const users = await fastify.prisma.user.findMany({
      where: { departments: { some: { id: params.id } } },
      take: 1
    });
    if (users.length > 0) {
      return reply.code(400).send({ success: false, message: '该部门下有用户，无法删除' });
    }

    await fastify.prisma.department.delete({ where: { id: params.id } });

    return { success: true, message: '删除成功' };
  });
}
