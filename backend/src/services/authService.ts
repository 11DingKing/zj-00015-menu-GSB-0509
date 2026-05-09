import * as bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { getUserPermissions } from './permissionService';
import { logAudit } from './auditService';

export async function login(username: string, password: string, ip?: string, userAgent?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      roles: true,
      departments: true
    }
  });

  if (!user) {
    throw new Error('用户名或密码错误');
  }

  if (user.status !== 1) {
    throw new Error('账号已被禁用');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error('用户名或密码错误');
  }

  const permissions = await getUserPermissions(user.id);

  await logAudit({
    action: 'LOGIN',
    operatorId: user.id,
    operatorName: user.nickname || user.username,
    ip,
    userAgent,
    details: `用户 ${user.username} 登录成功`
  });

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    permissions
  };
}

export async function resetPassword(userId: string, newPassword: string, operator: any, ip?: string) {
  const hashed = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed }
  });

  await logAudit({
    action: 'RESET_PASSWORD',
    operatorId: operator.id,
    operatorName: operator.nickname || operator.username,
    targetType: 'User',
    targetId: userId,
    ip,
    details: `管理员重置用户密码`
  });
}
