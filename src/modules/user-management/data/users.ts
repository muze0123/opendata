import { reactive } from 'vue';
/**
 * 用户管理 — 数据模型与演示数据。
 *
 * 设计约束（需求确认）：
 * - 移除全部「授权 / 认证」相关字段：登录密码、实名认证姓名、在线状态、授权环境/设备、
 *   权限集合等一律不进入本模块的数据层。
 * - 部门树仅作为用户列表的只读筛选条件（见用户管理页面左侧 rail），不在此提供部门编辑。
 * - 角色仅保留「名称」用于用户归属分配；角色的定义与权限属于「角色管理」模块。
 */

/** 部门：用于左侧树状筛选，只读。 */
export interface Department {
  id: string;
  name: string;
  /** 上级部门 id；根部门为 null */
  parent: string | null;
  /** 部门负责人（成员 id），仅用于展示 */
  leaders: string[];
}

/** 角色：仅承载名称，供用户分配使用。 */
export interface Role {
  id: string;
  name: string;
}

/** 用户启用状态。 */
export type UserStatus = 'enabled' | 'disabled';

/** 新建用户时的入参（尚无 id，由存储层分配）。 */
export type NewUser = Omit<UserRecord, 'id' | 'createdBy' | 'createdAt'>;

/** 用户记录（已去除授权 / 认证字段）。 */
export interface UserRecord {
  id: string;
  /** 姓名 / 昵称 */
  name: string;
  /** 登录账号（手机号或邮箱） */
  account: string;
  phone: string;
  email: string;
  /** 所属部门 id */
  deptId: string;
  /** 分配的角色 id 列表 */
  roleIds: string[];
  enabled: boolean;
  /** 加入时间 YYYY-MM-DD */
  joinedAt: string;
  /** 创建人姓名，按成员身份原文展示。 */
  createdBy: string;
  /** 创建时间 YYYY-MM-DD HH:mm。 */
  createdAt: string;
  /** 最近登录时间 YYYY-MM-DD HH:mm（空串表示从未登录） */
  lastLogin: string;
  /** 备注 */
  note: string;
  /** 是否主管理员（不可禁用 / 删除） */
  owner: boolean;
}

/**
 * 演示数据说明：
 * 本文件只承载「数据开放平台」自身的演示口径（组织架构 / 角色 / 成员），
 * 不沿用任何外部参考项目的示例公司、部门、角色、人名与邮箱域名。
 */

/** 部门演示数据：9 个部门，含两级层级。 */
export const departments: Department[] = [
  { id: 'd0', name: '杭州麦唐科技有限公司', parent: null, leaders: ['m1'] },
  { id: 'd2', name: '数据管理部', parent: 'd0', leaders: ['m2'] },
  { id: 'd3', name: '数据资源组', parent: 'd2', leaders: ['m3'] },
  { id: 'd4', name: '数据服务组', parent: 'd2', leaders: ['m4'] },
  { id: 'd5', name: '安全合规部', parent: 'd0', leaders: ['m5'] },
  { id: 'd6', name: '合规评估组', parent: 'd5', leaders: ['m6'] },
  { id: 'd7', name: '平台运营部', parent: 'd0', leaders: ['m7'] },
  { id: 'd8', name: '财务部', parent: 'd0', leaders: ['m8'] },
];

/** 角色演示数据：仅名称，供用户分配。 */
export const roles: Role[] = reactive([
  { id: 'r0', name: '管理员' },
  { id: 'r1', name: '部门管理员' },
  { id: 'r2', name: '数据管理员' },
  { id: 'r3', name: '合规专员' },
  { id: 'r4', name: '审计员' },
  { id: 'r5', name: '数据开发' },
  { id: 'r6', name: '数据分析师' },
  { id: 'r7', name: '只读访客' },
  ...['资源维护员', '报表专员', '测试角色', '应用运维'].map((name, i) => ({ id: `r${i + 8}`, name })),
]);

const memberContacts = [
  { phone: '19900001000', email: 'zhangming@metritag.com' },
  { phone: '19900001001' },
  { phone: '19900001002', email: 'wanglei@metritag.com' },
  { phone: '19900001003' },
  { email: 'zhouwen@metritag.com' },
  { phone: '19900001005' },
  { phone: '19900001006', email: 'zhengnan@metritag.com' },
  { phone: '19900001007' },
  { phone: '19900001008' },
  { email: 'wuchen@metritag.com' },
  { phone: '19900001010' },
  { phone: '19900001011', email: 'fengxin@metritag.com' },
  { phone: '19900001012' },
  { phone: '19900001013' },
  { phone: '19900001014', email: 'jiangyue@metritag.com' },
  { phone: '19900001015' },
];

const memberLogins = [
  '2026-10-08 09:12', '2026-10-08 08:47', '2026-10-07 21:05',
  '2026-10-08 10:02', '2026-10-06 18:30', '2026-10-08 09:55',
  '2026-10-05 14:21', '2026-10-08 08:05', '2026-10-07 16:48',
  '2026-09-30 11:37', '2026-10-08 09:31', '2026-10-04 20:16',
  '2026-10-02 13:09', '2026-10-08 07:58', '2026-10-07 19:44',
  '2026-09-28 15:03',
];

/** 用户演示数据：16 个成员（已去除密码 / 实名 / 在线 / 授权字段）。 */
export const seedUsers: UserRecord[] = [
  '张明', '李佳', '王磊', '陈凯', '周文', '孙悦', '郑楠', '林芳',
  '赵敏', '吴晨', '郑岩', '冯欣', '褚宁', '卫晴', '蒋越', '杨帆',
].map((name, i) => ({
  id: `m${i + 1}`,
  name,
  account: memberContacts[i].phone || memberContacts[i].email || '',
  phone: memberContacts[i].phone || '',
  email: memberContacts[i].email || '',
  deptId: i < 3 ? 'd0' : ['d0', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'][(i - 3) % 8],
  roleIds:
    i === 0
      ? ['r0']
      : i === 1
        ? ['r1', 'r4']
        : i === 7
          ? ['r2']
          : ['r' + (3 + (i % 4))],
  enabled: i !== 9 && i !== 13,
  joinedAt: `2026-08-${String(i + 1).padStart(2, '0')}`,
  // 演示数据按不同管理员创建，便于「创建人」筛选出现可观测的差异
  createdBy: i < 8 ? '张明' : i < 13 ? '李佳' : '王磊',
  createdAt: `2026-08-${String(i + 1).padStart(2, '0')} 09:00`,
  lastLogin: memberLogins[i],
  note: '',
  owner: i === 0,
}));

/* ----------------------------- 派生查询工具 ----------------------------- */

const departmentMap = new Map(departments.map((dept) => [dept.id, dept]));


export function getDepartment(id: string): Department | undefined {
  return departmentMap.get(id);
}

export function getDepartmentName(id: string): string {
  return departmentMap.get(id)?.name ?? '—';
}

export function getRoleName(id: string): string {
  return roles.find((role) => role.id === id)?.name ?? id;
}

export function getRoleNames(ids: string[]): string[] {
  return ids.map((id) => getRoleName(id));
}

/** 取某部门及其所有子孙部门的 id（含自身），用于树筛选时连带子部门。 */
export function collectDepartmentSubtree(rootId: string): string[] {
  const result: string[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const dept of departments) {
      if (dept.parent === current) {
        result.push(dept.id);
        queue.push(dept.id);
      }
    }
  }
  return result;
}

/** 构建部门树（顶层为 parent === null 的部门）。可传入列表以读取响应式部门数据。 */
export interface DepartmentNode extends Department {
  children: DepartmentNode[];
}

export function buildDepartmentTree(list: Department[] = departments): DepartmentNode[] {
  const nodes = new Map<string, DepartmentNode>();
  for (const dept of list) {
    nodes.set(dept.id, { ...dept, children: [] });
  }
  const roots: DepartmentNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent && nodes.has(node.parent)) {
      nodes.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** 生成新的用户 id（在现有 id 之后递增）。 */
export function generateUserId(existing: UserRecord[]): string {
  let max = 0;
  for (const user of existing) {
    const match = /^m(\d+)$/.exec(user.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `m${max + 1}`;
}
