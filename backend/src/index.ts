import 'reflect-metadata';
import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';

import prisma from './prisma';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import roleRoutes from './routes/role';
import permissionRoutes from './routes/permission';
import deptRoutes from './routes/department';
import orderRoutes from './routes/order';
import auditRoutes from './routes/audit';

const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: any;
  }
}

async function main() {
  const app = fastify({
    logger: true,
    disableRequestLogging: true
  });

  app.decorate('prisma', prisma);

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(jwt, {
    secret: JWT_SECRET
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ success: false, message: '未授权' });
    }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'RBAC+ABAC 权限系统 API',
        description: '基于 RBAC+ABAC 的通用权限后台 API 文档',
        version: '1.0.0'
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  });

  app.get('/', async () => {
    return {
      name: 'RBAC+ABAC Permission API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/health'
    };
  });

  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(roleRoutes);
  await app.register(permissionRoutes);
  await app.register(deptRoutes);
  await app.register(orderRoutes);
  await app.register(auditRoutes);

  app.addHook('onRoute', (routeOptions: any) => {
    if (routeOptions?.schema?.tags) {
      if (!routeOptions.schema.security) {
        routeOptions.schema.security = [{ bearerAuth: [] }];
      }
    }
  });

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
