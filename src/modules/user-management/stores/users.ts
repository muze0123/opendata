import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUserProfileStore } from '../../../app/stores/userProfile';
import {
  seedUsers,
  generateUserId,
  type NewUser,
  type UserRecord,
} from '../data/users';

/**
 * 用户管理数据层（Pinia）。
 *
 * 仅承载用户列表与增删改查；筛选 / 分页 / 选择态由页面层持有（与审计列表保持一致）。
 * 主管理员（owner）不可被禁用或删除，setEnabled / removeUsers 会跳过 owner。
 */
export const useUserStore = defineStore('user-management', () => {
  const userProfile = useUserProfileStore();
  const creationMetadata = () => ({
    createdBy: userProfile.profile.displayName,
    createdAt: new Date().toLocaleString('sv-SE', { hour12: false }).slice(0, 16),
  });
  const users = ref<UserRecord[]>(
    seedUsers.map((user) => ({ ...user, roleIds: [...user.roleIds] })),
  );

  function addUser(input: NewUser): UserRecord {
    const record: UserRecord = { id: generateUserId(users.value), ...input, ...creationMetadata() };
    users.value = [record, ...users.value];
    return record;
  }

  function updateUser(id: string, patch: Partial<UserRecord>): void {
    const index = users.value.findIndex((user) => user.id === id);
    if (index === -1) return;
    const current = users.value[index];
    users.value[index] = {
      ...current,
      ...patch,
      roleIds: patch.roleIds ? [...patch.roleIds] : current.roleIds,
    };
  }

  function removeUsers(ids: string[]): void {
    const blocked = new Set(users.value.filter((u) => u.owner).map((u) => u.id));
    const target = new Set(ids.filter((id) => !blocked.has(id)));
    if (target.size === 0) return;
    users.value = users.value.filter((user) => !target.has(user.id));
  }

  function setEnabled(ids: string[], enabled: boolean): void {
    const target = new Set(ids);
    users.value = users.value.map((user) =>
      target.has(user.id) && !user.owner ? { ...user, enabled } : user,
    );
  }

  function importUsers(list: NewUser[]): number {
    const created: UserRecord[] = list.map((input) => ({
      id: generateUserId(users.value),
      ...input,
      ...creationMetadata(),
    }));
    users.value = [...created, ...users.value];
    return created.length;
  }

  function findByAccount(account: string): UserRecord | undefined {
    const normalized = account.trim();
    return users.value.find((user) => user.account === normalized);
  }

  return { users, addUser, updateUser, removeUsers, setEnabled, importUsers, findByAccount };
});
