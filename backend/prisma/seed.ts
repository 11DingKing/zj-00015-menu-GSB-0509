import { PrismaClient, PermissionType, DataScope } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. 创建部门
  const rootDept = await prisma.department.create({
    data: {
      name: '总公司',
      code: 'ROOT',
      sort: 1
    }
  });

  const techDept = await prisma.department.create({
    data: {
      name: '技术部',
      code: 'TECH',
      parentId: rootDept.id,
      sort: 1
    }
  });

  const salesDept = await prisma.department.create({
    data: {
      name: '销售部',
      code: 'SALES',
      parentId: rootDept.id,
      sort: 2
    }
  });

  const frontendDept = await prisma.department.create({
    data: {
      name: '前端组',
      code: 'FRONTEND',
      parentId: techDept.id,
      sort: 1
    }
  });

  // 2. 创建权限
  // 菜单权限
  const menuDashboard = await prisma.permission.create({
    data: {
      name: '仪表盘',
      code: 'dashboard',
      type: PermissionType.MENU,
      path: '/dashboard',
      icon: 'dashboard',
      component: 'Dashboard',
      sort: 1
    }
  });

  const menuSystem = await prisma.permission.create({
    data: {
      name: '系统管理',
      code: 'system',
      type: PermissionType.MENU,
      path: '/system',
      icon: 'setting',
      sort: 2
    }
  });

  const menuUser = await prisma.permission.create({
    data: {
      name: '用户管理',
      code: 'system:user',
      type: PermissionType.MENU,
      path: '/system/user',
      icon: 'user',
      component: 'UserList',
      parentId: menuSystem.id,
      sort: 1
    }
  });

  const menuRole = await prisma.permission.create({
    data: {
      name: '角色管理',
      code: 'system:role',
      type: PermissionType.MENU,
      path: '/system/role',
      icon: 'team',
      component: 'RoleList',
      parentId: menuSystem.id,
      sort: 2
    }
  });

  const menuPermission = await prisma.permission.create({
    data: {
      name: '权限管理',
      code: 'system:permission',
      type: PermissionType.MENU,
      path: '/system/permission',
      icon: 'safety',
      component: 'PermissionList',
      parentId: menuSystem.id,
      sort: 3
    }
  });

  const menuDept = await prisma.permission.create({
    data: {
      name: '部门管理',
      code: 'system:dept',
      type: PermissionType.MENU,
      path: '/system/dept',
      icon: 'apartment',
      component: 'DeptList',
      parentId: menuSystem.id,
      sort: 4
    }
  });

  const menuOrder = await prisma.permission.create({
    data: {
      name: '订单管理',
      code: 'order',
      type: PermissionType.MENU,
      path: '/order',
      icon: 'shopping',
      component: 'OrderList',
      sort: 3
    }
  });

  const menuAudit = await prisma.permission.create({
    data: {
      name: '审计日志',
      code: 'audit',
      type: PermissionType.MENU,
      path: '/audit',
      icon: 'file-text',
      component: 'AuditLog',
      sort: 4
    }
  });

  // 按钮权限
  const btnUserAdd = await prisma.permission.create({
    data: {
      name: '新增用户',
      code: 'system:user:add',
      type: PermissionType.BUTTON,
      parentId: menuUser.id,
      sort: 1
    }
  });

  const btnUserEdit = await prisma.permission.create({
    data: {
      name: '编辑用户',
      code: 'system:user:edit',
      type: PermissionType.BUTTON,
      parentId: menuUser.id,
      sort: 2
    }
  });

  const btnUserDelete = await prisma.permission.create({
    data: {
      name: '删除用户',
      code: 'system:user:delete',
      type: PermissionType.BUTTON,
      parentId: menuUser.id,
      sort: 3
    }
  });

  const btnUserGrantRole = await prisma.permission.create({
    data: {
      name: '分配角色',
      code: 'system:user:grantRole',
      type: PermissionType.BUTTON,
      parentId: menuUser.id,
      sort: 4
    }
  });

  const btnUserGrantPerm = await prisma.permission.create({
    data: {
      name: '授权权限',
      code: 'system:user:grantPerm',
      type: PermissionType.BUTTON,
      parentId: menuUser.id,
      sort: 5
    }
  });

  const btnRoleAdd = await prisma.permission.create({
    data: {
      name: '新增角色',
      code: 'system:role:add',
      type: PermissionType.BUTTON,
      parentId: menuRole.id,
      sort: 1
    }
  });

  const btnRoleEdit = await prisma.permission.create({
    data: {
      name: '编辑角色',
      code: 'system:role:edit',
      type: PermissionType.BUTTON,
      parentId: menuRole.id,
      sort: 2
    }
  });

  const btnRoleDelete = await prisma.permission.create({
    data: {
      name: '删除角色',
      code: 'system:role:delete',
      type: PermissionType.BUTTON,
      parentId: menuRole.id,
      sort: 3
    }
  });

  const btnRoleGrantPerm = await prisma.permission.create({
    data: {
      name: '角色授权',
      code: 'system:role:grantPerm',
      type: PermissionType.BUTTON,
      parentId: menuRole.id,
      sort: 4
    }
  });

  const btnOrderAdd = await prisma.permission.create({
    data: {
      name: '新增订单',
      code: 'order:add',
      type: PermissionType.BUTTON,
      parentId: menuOrder.id,
      sort: 1
    }
  });

  const btnOrderEdit = await prisma.permission.create({
    data: {
      name: '编辑订单',
      code: 'order:edit',
      type: PermissionType.BUTTON,
      parentId: menuOrder.id,
      sort: 2
    }
  });

  const btnOrderDelete = await prisma.permission.create({
    data: {
      name: '删除订单',
      code: 'order:delete',
      type: PermissionType.BUTTON,
      parentId: menuOrder.id,
      sort: 3
    }
  });

  const btnOrderExport = await prisma.permission.create({
    data: {
      name: '导出订单',
      code: 'order:export',
      type: PermissionType.BUTTON,
      parentId: menuOrder.id,
      sort: 4
    }
  });

  // 数据权限
  const dataOrderAll = await prisma.permission.create({
    data: {
      name: '全部订单',
      code: 'order:data:all',
      type: PermissionType.DATA,
      dataScope: DataScope.ALL,
      sort: 1
    }
  });

  const dataOrderDeptAndChild = await prisma.permission.create({
    data: {
      name: '本部门及下级订单',
      code: 'order:data:deptAndChildren',
      type: PermissionType.DATA,
      dataScope: DataScope.DEPARTMENT_AND_CHILDREN,
      sort: 2
    }
  });

  const dataOrderSelf = await prisma.permission.create({
    data: {
      name: '仅本人订单',
      code: 'order:data:self',
      type: PermissionType.DATA,
      dataScope: DataScope.SELF,
      sort: 3
    }
  });

  // 字段权限（脱敏）
  const fieldOrderPhoneMask = await prisma.permission.create({
    data: {
      name: '客户手机号脱敏',
      code: 'order:field:phoneMask',
      type: PermissionType.FIELD,
      fieldName: 'customerPhone',
      fieldMask: '${1}****${4}',
      sort: 1
    }
  });

  // 3. 创建角色
  const roleAdmin = await prisma.role.create({
    data: {
      name: '超级管理员',
      code: 'admin',
      description: '拥有所有权限',
      sort: 1
    }
  });

  const roleManager = await prisma.role.create({
    data: {
      name: '部门经理',
      code: 'manager',
      description: '技术部经理',
      sort: 2
    }
  });

  const roleDeveloper = await prisma.role.create({
    data: {
      name: '开发人员',
      code: 'developer',
      description: '技术部开发人员',
      parentId: roleManager.id,
      sort: 3
    }
  });

  const roleAuditor = await prisma.role.create({
    data: {
      name: '审计员',
      code: 'auditor',
      description: '只读审计日志',
      sort: 4
    }
  });

  // 4. 给角色分配权限
  await prisma.role.update({
    where: { id: roleAdmin.id },
    data: {
      permissions: {
        connect: [
          { id: menuDashboard.id },
          { id: menuSystem.id },
          { id: menuUser.id },
          { id: menuRole.id },
          { id: menuPermission.id },
          { id: menuDept.id },
          { id: menuOrder.id },
          { id: menuAudit.id },
          { id: btnUserAdd.id },
          { id: btnUserEdit.id },
          { id: btnUserDelete.id },
          { id: btnUserGrantRole.id },
          { id: btnUserGrantPerm.id },
          { id: btnRoleAdd.id },
          { id: btnRoleEdit.id },
          { id: btnRoleDelete.id },
          { id: btnRoleGrantPerm.id },
          { id: btnOrderAdd.id },
          { id: btnOrderEdit.id },
          { id: btnOrderDelete.id },
          { id: btnOrderExport.id },
          { id: dataOrderAll.id }
        ]
      }
    }
  });

  await prisma.role.update({
    where: { id: roleManager.id },
    data: {
      permissions: {
        connect: [
          { id: menuDashboard.id },
          { id: menuOrder.id },
          { id: btnOrderAdd.id },
          { id: btnOrderEdit.id },
          { id: btnOrderExport.id },
          { id: dataOrderDeptAndChild.id },
          { id: fieldOrderPhoneMask.id }
        ]
      }
    }
  });

  await prisma.role.update({
    where: { id: roleDeveloper.id },
    data: {
      permissions: {
        connect: [
          { id: menuDashboard.id },
          { id: menuOrder.id },
          { id: btnOrderAdd.id },
          { id: btnOrderEdit.id },
          { id: dataOrderSelf.id },
          { id: fieldOrderPhoneMask.id }
        ]
      }
    }
  });

  await prisma.role.update({
    where: { id: roleAuditor.id },
    data: {
      permissions: {
        connect: [
          { id: menuDashboard.id },
          { id: menuAudit.id }
        ]
      }
    }
  });

  // 5. 创建用户
  const hashedAdmin = await bcrypt.hash('admin123456', 10);
  const hashedManager = await bcrypt.hash('manager123456', 10);
  const hashedDev1 = await bcrypt.hash('dev123456', 10);
  const hashedAudit1 = await bcrypt.hash('audit123456', 10);

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedAdmin,
      nickname: '超级管理员',
      email: 'admin@example.com',
      phone: '13800138000',
      roles: { connect: [{ id: roleAdmin.id }] }
    }
  });

  const managerUser = await prisma.user.create({
    data: {
      username: 'manager1',
      password: hashedManager,
      nickname: '技术部经理',
      email: 'manager1@example.com',
      phone: '13900139000',
      roles: { connect: [{ id: roleManager.id }] },
      departments: { connect: [{ id: techDept.id }] }
    }
  });

  const devUser = await prisma.user.create({
    data: {
      username: 'dev1',
      password: hashedDev1,
      nickname: '前端开发',
      email: 'dev1@example.com',
      phone: '13700137000',
      roles: { connect: [{ id: roleDeveloper.id }] },
      departments: { connect: [{ id: frontendDept.id }] }
    }
  });

  const auditUser = await prisma.user.create({
    data: {
      username: 'audit1',
      password: hashedAudit1,
      nickname: '审计员',
      email: 'audit1@example.com',
      phone: '13600136000',
      roles: { connect: [{ id: roleAuditor.id }] }
    }
  });

  // 6. 创建样例订单数据
  const ordersData = [
    { orderNo: 'ORD202605010001', customerName: '张三', customerPhone: '13811112222', amount: 999.99, status: 'completed' },
    { orderNo: 'ORD202605020002', customerName: '李四', customerPhone: '13922223333', amount: 1599.00, status: 'shipped' },
    { orderNo: 'ORD202605030003', customerName: '王五', customerPhone: '13733334444', amount: 299.99, status: 'pending' },
    { orderNo: 'ORD202605040004', customerName: '赵六', customerPhone: '13644445555', amount: 5999.00, status: 'completed' },
    { orderNo: 'ORD202605050005', customerName: '孙七', customerPhone: '13555556666', amount: 399.50, status: 'cancelled' },
    { orderNo: 'ORD202605060006', customerName: '周八', customerPhone: '13466667777', amount: 899.00, status: 'paid' },
    { orderNo: 'ORD202605070007', customerName: '吴九', customerPhone: '13377778888', amount: 1299.99, status: 'completed' },
    { orderNo: 'ORD202605080008', customerName: '郑十', customerPhone: '13288889999', amount: 456.78, status: 'shipped' },
    { orderNo: 'ORD202605090009', customerName: '钱十一', customerPhone: '13199990000', amount: 7899.00, status: 'paid' },
    { orderNo: 'ORD202605100010', customerName: '冯十二', customerPhone: '13010101111', amount: 188.88, status: 'pending' }
  ];

  for (let i = 0; i < ordersData.length; i++) {
    const order = ordersData[i];
    const creator = i < 5 ? managerUser : devUser;
    const dept = i < 5 ? techDept : frontendDept;
    
    await prisma.order.create({
      data: {
        ...order,
        creatorId: creator.id,
        departmentId: dept.id
      }
    });
  }

  console.log('Seed completed successfully!');
  console.log('Users created:');
  console.log('  - admin / admin123456 (Super Admin)');
  console.log('  - manager1 / manager123456 (Tech Dept Manager)');
  console.log('  - dev1 / dev123456 (Frontend Dev)');
  console.log('  - audit1 / audit123456 (Auditor)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
