export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  permissions?: string[];
  permissionDetails?: Record<string, string>;
}

export const WHITELIST_ACCOUNTS: UserAccount[] = [
  { id: '1', name: '朱荣雪', phone: '17715279336', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '2', name: '李美子', phone: '18260092084', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '3', name: '张皓', phone: '15190488476', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '4', name: '李柯', phone: '19913200964', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '5', name: '臧硕', phone: '15161847272', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '6', name: '郑梦灵', phone: '13914719951', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '7', name: '刘青宇', phone: '13814063980', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '8', name: '张润君', phone: '18962089827', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '9', name: '谢文静', phone: '15190492046', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '10', name: '袁瑞雯', phone: '13605143981', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '11', name: '解明玉', phone: '15156403510', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '12', name: '何阳', phone: '18936042638', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] },
  { id: '13', name: '蒲金鹏', phone: '17798547783', permissions: ["范围检索权限", "项目评审权限", "排程权限", "审核策划权限", "AI引擎配置权限"] }
];

export const DEFAULT_PASSWORD = '123456';

