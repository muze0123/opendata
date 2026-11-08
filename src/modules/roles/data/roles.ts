import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { roles } from '../../user-management/data/users';
import { useUserStore } from '../../user-management/stores/users';

export const ACTION_CODES = ['view', 'create', 'edit', 'delete', 'import', 'export'] as const;
export const MODULE_CODES = ['home', 'tasks', 'data', 'settings', 'users', 'roles', 'audit', 'workspace', 'projects'] as const;
export interface PermissionRow { id: string; group: typeof MODULE_CODES[number]; page: typeof MODULE_CODES[number]; actions: readonly typeof ACTION_CODES[number][] }
export interface PermissionApp { id: string; name: string; enabled: boolean; rows: PermissionRow[] }
// Local deployment fixture; replace with the customer's approved entitlement/permission contract.
export const apps: PermissionApp[] = [
  { id: 'tianshu', name: '天枢', enabled: true, rows: [
    { id: 'home', group: 'home', page: 'home', actions: ['view'] },
    { id: 'tasks', group: 'tasks', page: 'tasks', actions: ['view', 'create', 'export'] },
    { id: 'data', group: 'data', page: 'data', actions: ACTION_CODES },
    ...(['users', 'roles', 'audit'] as const).map(page => ({ id: page, group: 'settings' as const, page, actions: page === 'audit' ? ['view', 'export'] as const : ACTION_CODES })),
  ] },
  ...['TARA', 'CSMS'].map(id => ({ id, name: id, enabled: true, rows: [{ id: `${id}-projects`, group: 'workspace' as const, page: 'projects' as const, actions: ACTION_CODES }] })),
  { id: 'LIMS', name: 'LIMS', enabled: false, rows: [] },
];
export const enabledApps = apps.filter(app => app.enabled);
export const permissionIds = enabledApps.flatMap(app => app.rows.flatMap(row => row.actions.map(action => `${app.id}.${row.id}.${action}`)));
export interface RoleConfig { id: string; description: string; permissions: string[] }
export const useRoleStore = defineStore('roles', () => {
  const users = useUserStore();
  const configs = reactive<RoleConfig[]>(roles.map((role, i) => ({ id: role.id, description: i === 0 ? '系统内置管理员，拥有全部模拟操作权限。' : '', permissions: i === 0 ? [...permissionIds] : [permissionIds[i % permissionIds.length]] })));
  function linked(id: string) { return users.users.some(user => user.roleIds.includes(id)); }
  function save(id: string | undefined, name: string, description: string, permissions: string[]) {
    if (id === 'r0') throw new Error('protected');
    if (Array.from(description).length > 500) throw new Error('description');
    if (!permissions.length || permissions.some(key => !permissionIds.includes(key))) throw new Error('permissions');
    if (!id) {
      if (!name.trim() || Array.from(name.trim()).length > 20 || roles.some(role => role.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) throw new Error('name');
      id = crypto.randomUUID(); roles.push({ id, name: name.trim() });
      configs.push({ id, description, permissions: [...permissions] });
    } else {
      const config = configs.find(item => item.id === id);
      if (!config) throw new Error('missing');
      Object.assign(config, { description, permissions: [...permissions] });
    }
  }
  function remove(id: string) {
    if (id === 'r0' || linked(id)) return false;
    const index = roles.findIndex(role => role.id === id);
    if (index < 0) return false;
    roles.splice(index, 1); configs.splice(configs.findIndex(item => item.id === id), 1); return true;
  }
  return { configs, linked, save, remove };
});
