export interface User {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  roles?: Role[];
  departments?: Department[];
  directPermissions?: Permission[];
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  sort: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  type: 'MENU' | 'BUTTON' | 'DATA' | 'FIELD';
  path?: string;
  icon?: string;
  component?: string;
  dataScope?: string;
  dataRule?: string;
  fieldName?: string;
  fieldMask?: string;
  parentId?: string;
  sort: number;
  status: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  sort: number;
  status: number;
  users?: User[];
}

export interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  status: string;
  creatorId: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
  creator?: User;
  department?: Department;
}

export interface AuditLog {
  id: string;
  action: string;
  operatorId: string;
  operatorName: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface UserPermissions {
  menus: Permission[];
  buttons: string[];
  dataScope: string | null;
  dataRule: string | null;
  fields: Permission[];
}

export interface PageResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}
