import type { Component } from 'vue';
import {
  IconHome, IconSchedule, IconStorage, IconSettings, IconHistory,
  IconUser, IconBranch, IconUserGroup, IconShareAlt, IconOrderedList,
} from '@arco-design/web-vue/es/icon';
import IconPartsModule from '../shared/icons/IconPartsModule.vue';
import IconCertificateDoc from '../shared/icons/IconCertificateDoc.vue';
import IconRegulationBook from '../shared/icons/IconRegulationBook.vue';

export interface NavigationChild {
  name: string;
  path: string;
  labelKey: string;
  icon: Component;
}

export interface NavigationItem {
  name: string;
  path: string;
  labelKey: string;
  icon: Component;
  /** 二级菜单：点击顶部项后，左侧栏展示这些子页面；为空则该顶部项为单页（无左侧栏）。 */
  children?: NavigationChild[];
}

/**
 * 平台顶级导航：首页 / 任务中心 / 基础数据库 / 系统设置。
 * 顶部横向菜单展示这四项；点击某项后，左侧栏切换展示该项的 children（系统设置展开 6 项）。
 * 首页 / 任务中心 / 基础数据库 为单页（无 children），左侧栏在这些路由下隐藏。
 */
export const topNavigationItems: NavigationItem[] = [
  { name: 'home', path: '/home', labelKey: 'nav.home', icon: IconHome },
  { name: 'tasks', path: '/tasks', labelKey: 'nav.tasks', icon: IconSchedule },
  { name: 'vehicles', path: '/vehicles', labelKey: 'vehicles.title', icon: IconStorage },
  {
    name: 'data',
    path: '/data',
    labelKey: 'nav.data',
    icon: IconStorage,
    // 侧栏三枚为独立设计的线性图标，避免原先三项共用 IconStorage 无法区分。
    children: [
      { name: 'parts', path: '/data/parts', labelKey: 'parts.title', icon: IconPartsModule },
      { name: 'certificates', path: '/data/certificates', labelKey: 'certificates.title', icon: IconCertificateDoc },
      { name: 'regulations', path: '/data/regulations', labelKey: 'regulations.title', icon: IconRegulationBook },
    ],
  },
  {
    name: 'settings',
    path: '/settings',
    labelKey: 'nav.systemSettings',
    icon: IconSettings,
    children: [
      { name: 'users', path: '/settings/users', labelKey: 'nav.settings.users', icon: IconUser },
      { name: 'departments', path: '/settings/departments', labelKey: 'nav.settings.departments', icon: IconBranch },
      { name: 'roles', path: '/settings/roles', labelKey: 'nav.settings.roles', icon: IconUserGroup },
      { name: 'workflow', path: '/settings/workflow', labelKey: 'nav.settings.workflow', icon: IconShareAlt },
      { name: 'numbering', path: '/settings/numbering', labelKey: 'nav.settings.numbering', icon: IconOrderedList },
      { name: 'version-history', path: '/settings/version-history', labelKey: 'versionHistory.title', icon: IconHistory },
      { name: 'message-settings', path: '/settings/messages', labelKey: 'messageSettings.title', icon: IconSettings },
      { name: 'audit', path: '/settings/audit', labelKey: 'nav.settings.audit', icon: IconHistory },
      { name: 'account', path: '/settings/account', labelKey: 'account.title', icon: IconUser },
    ],
  },
];

/**
 * 左侧栏菜单：等于当前激活顶部项的 children；无 children 时返回空数组（隐藏左侧栏）。
 * 由 ProductLayout 依据当前路由调用 activeTopItem 后取用。
 */
export const sidebarNavigationItems: NavigationItem[] = topNavigationItems;

/** 所有带 children 的顶部项（用于侧栏分组展开判定）。 */
export const menuGroups = topNavigationItems.filter(
  (item): item is NavigationItem & { children: NonNullable<NavigationItem['children']> } =>
    Boolean(item.children?.length),
);

/** 按路径前缀判定某顶部项是否为当前激活项。 */
export function isTopItemActive(item: NavigationItem, path: string): boolean {
  if (item.children?.length) {
    return path === item.path || path.startsWith(`${item.path}/`);
  }
  return path === item.path || path.startsWith(`${item.path}/`);
}

/** 取当前路径激活的顶部项（用于驱动左侧栏）。 */
export function activeTopItem(path: string): NavigationItem | undefined {
  return topNavigationItems.find((item) => isTopItemActive(item, path));
}
