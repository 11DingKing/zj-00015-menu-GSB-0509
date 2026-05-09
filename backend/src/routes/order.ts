import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { 
  hasPermission, 
  buildDataScopeCondition, 
  getUserPermissions,
  applyFieldMasking 
} from '../services/permissionService';
import { logAudit } from '../services/auditService';

export default async function orderRoutes(fastify: FastifyInstance) {
  fastify.get('/api/orders', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['订单管理'],
      description: '获取订单列表（带数据权限过滤 + 字段脱敏 + cursor 分页）'
    }
  }, async (request, reply) => {
    const user = request.user as any;
    const query = request.query as any;

    const hasPerm = await hasPermission(user.userId, 'order');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限访问' });
    }

    const dataScopeCondition = await buildDataScopeCondition(user.userId, 'order');

    const where: any = { ...dataScopeCondition };
    if (query.orderNo) where.orderNo = { contains: query.orderNo };
    if (query.customerName) where.customerName = { contains: query.customerName };
    if (query.status) where.status = query.status;

    const take = query.limit ? parseInt(query.limit) : 20;
    let cursor = query.cursor ? { id: query.cursor } : undefined;
    let skip = cursor ? 1 : 0;

    const [data, total] = await Promise.all([
      fastify.prisma.order.findMany({
        where,
        take,
        skip,
        cursor,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true, nickname: true } },
          department: { select: { id: true, name: true } }
        }
      }),
      fastify.prisma.order.count({ where })
    ]);

    const perms = await getUserPermissions(user.userId);
    const maskedData = applyFieldMasking(data, perms.fields);

    const nextCursor = data.length === take ? data[data.length - 1].id : undefined;

    return {
      success: true,
      data: maskedData,
      total,
      nextCursor,
      meta: {
        dataScope: perms.dataScope,
        fieldMaskingApplied: perms.fields.length > 0
      }
    };
  });

  fastify.post('/api/orders', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'order:add');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const dbUser = await fastify.prisma.user.findUnique({
      where: { id: user.userId },
      include: { departments: true }
    });

    if (!dbUser) {
      return reply.code(400).send({ success: false, message: '用户不存在' });
    }

    const departmentId = body.departmentId || dbUser.departments[0]?.id;
    if (!departmentId) {
      return reply.code(400).send({ success: false, message: '请先配置用户部门' });
    }

    const created = await fastify.prisma.order.create({
      data: {
        orderNo: body.orderNo || `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        amount: body.amount,
        status: body.status || 'pending',
        creatorId: user.userId,
        departmentId
      }
    });

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'ORDER_CREATE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'Order',
      targetId: created.id,
      ip: request.ip,
      details: `创建订单: ${created.orderNo}`
    });

    return { success: true, data: created };
  });

  fastify.get('/api/orders/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const params = request.params as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'order');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限访问' });
    }

    const dataScopeCondition = await buildDataScopeCondition(user.userId, 'order');

    const order = await fastify.prisma.order.findFirst({
      where: {
        id: params.id,
        ...dataScopeCondition
      },
      include: {
        creator: { select: { id: true, username: true, nickname: true } },
        department: { select: { id: true, name: true } }
      }
    });

    if (!order) {
      return reply.code(404).send({ success: false, message: '订单不存在或无权限查看' });
    }

    const perms = await getUserPermissions(user.userId);
    const [masked] = applyFieldMasking([order], perms.fields);

    return { success: true, data: masked };
  });

  fastify.put('/api/orders/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const params = request.params as any;
    const body = request.body as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'order:edit');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const dataScopeCondition = await buildDataScopeCondition(user.userId, 'order');
    const existing = await fastify.prisma.order.findFirst({
      where: { id: params.id, ...dataScopeCondition }
    });

    if (!existing) {
      return reply.code(404).send({ success: false, message: '订单不存在或无权限操作' });
    }

    const updated = await fastify.prisma.order.update({
      where: { id: params.id },
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        amount: body.amount,
        status: body.status
      }
    });

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'ORDER_UPDATE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'Order',
      targetId: params.id,
      ip: request.ip,
      details: `更新订单: ${existing.orderNo}`
    });

    return { success: true, data: updated };
  });

  fastify.delete('/api/orders/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const params = request.params as any;
    const user = request.user as any;

    const hasPerm = await hasPermission(user.userId, 'order:delete');
    if (!hasPerm) {
      return reply.code(403).send({ success: false, message: '无权限操作' });
    }

    const dataScopeCondition = await buildDataScopeCondition(user.userId, 'order');
    const existing = await fastify.prisma.order.findFirst({
      where: { id: params.id, ...dataScopeCondition }
    });

    if (!existing) {
      return reply.code(404).send({ success: false, message: '订单不存在或无权限操作' });
    }

    await fastify.prisma.order.delete({ where: { id: params.id } });

    const operator = await fastify.prisma.user.findUnique({ where: { id: user.userId } });
    await logAudit({
      action: 'ORDER_DELETE',
      operatorId: user.userId,
      operatorName: operator?.nickname || operator?.username || '',
      targetType: 'Order',
      targetId: params.id,
      ip: request.ip,
      details: `删除订单: ${existing.orderNo}`
    });

    return { success: true, message: '删除成功' };
  });
}
