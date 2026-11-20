import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  departments as seedDepartments,
  type Department,
} from '../data/users';

/**
 * 部门管理数据层（Pinia）。
 *
 * 此前部门树仅作用户列表的只读筛选来源（来自 `data/users.ts` 的静态常量）。
 * 现按需求放开部门管理：本 store 持有可变的部门列表，提供新增 / 编辑 / 删除（含子树删除）。
 * 删除守卫（子树是否仍有成员）由页面层结合用户 store 判定，store 只负责结构变更。
 */
export const useDepartmentStore = defineStore('user-management-departments', () => {
  const departments = ref<Department[]>(
    seedDepartments.map((dept) => ({ ...dept, leaders: [...dept.leaders] })),
  );

  /** 根部门（parent === null），用于禁止编辑/删除企业节点。 */
  const rootId = ref<string>(
    departments.value.find((dept) => dept.parent === null)?.id ?? departments.value[0].id,
  );

  function getById(id: string): Department | undefined {
    return departments.value.find((dept) => dept.id === id);
  }

  /** 取某部门及其所有子孙部门 id（含自身），用于删除子树与用户筛选。 */
  function subtreeIds(rootIdValue: string): string[] {
    const result: string[] = [rootIdValue];
    const queue = [rootIdValue];
    while (queue.length) {
      const current = queue.shift() as string;
      for (const dept of departments.value) {
        if (dept.parent === current) {
          result.push(dept.id);
          queue.push(dept.id);
        }
      }
    }
    return result;
  }

  /** 校验某个 parent 是否合法：不能为空、不能是自身或自身的下级。 */
  function isParentValid(selfId: string, parentId: string): boolean {
    if (parentId === selfId) return false;
    return !subtreeIds(selfId).includes(parentId);
  }

  function generateDepartmentId(): string {
    let max = 0;
    for (const dept of departments.value) {
      const match = /^d(\d+)$/.exec(dept.id);
      if (match) max = Math.max(max, Number(match[1]));
    }
    return `d${max + 1}`;
  }

  function addDepartment(input: Omit<Department, 'id'>): Department {
    const record: Department = { id: generateDepartmentId(), ...input };
    departments.value = [...departments.value, record];
    return record;
  }

  function updateDepartment(id: string, patch: Partial<Omit<Department, 'id'>>): void {
    const index = departments.value.findIndex((dept) => dept.id === id);
    if (index === -1) return;
    const current = departments.value[index];
    departments.value[index] = {
      ...current,
      ...patch,
      leaders: patch.leaders ? [...patch.leaders] : current.leaders,
    };
  }

  /** 删除部门及其全部子孙（调用方需先做成员占位校验）。 */
  function removeDepartment(id: string): void {
    const blocked = new Set(subtreeIds(id));
    departments.value = departments.value.filter((dept) => !blocked.has(dept.id));
  }

  function nameOf(id: string): string {
    return getById(id)?.name ?? '—';
  }

  /** 部门层级路径（不含企业根节点），用于用户表单与详情里的「一级 / 二级」展示。 */
  function pathOf(id: string): string {
    const chain: string[] = [];
    let current = getById(id);
    while (current) {
      chain.unshift(current.name);
      current = current.parent ? getById(current.parent) : undefined;
    }
    if (!chain.length) return '—';
    return (chain.length > 1 ? chain.slice(1) : chain).join(' / ');
  }

  return {
    departments,
    rootId,
    getById,
    subtreeIds,
    isParentValid,
    addDepartment,
    updateDepartment,
    removeDepartment,
    nameOf,
    pathOf,
  };
});
