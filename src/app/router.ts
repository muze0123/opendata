import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../modules/auth/stores/auth';
import { topNavigationItems } from './navigation';

const pendingRoutes = topNavigationItems
  .flatMap((item) => item.children ?? [])
  .filter(child => child.path !== '/data/parts' && child.path !== '/data/regulations' && child.path !== '/data/certificates')
  .filter(child => child.path !== '/settings/account')
  .filter(child => child.path !== '/settings/messages')
  .filter(child => child.path !== '/settings/version-history')
  .filter(child => child.path !== '/settings/workflow')
  .filter(child => child.path !== '/settings/numbering')
  .filter((child) => child.path !== '/settings/departments')
  .filter(child => child.path !== "/settings/roles")
  .map((child) => ({
    path: child.path,
    name: child.name,
    component: () => import('../modules/dashboard/pages/PendingModulePage.vue'),
    props: { labelKey: child.labelKey },
    meta: { layout: 'product', requiresAuth: true },
  }));

/**
 * 顶部菜单的默认落地页：始终取该菜单 children 的第一项，使「切换顶部菜单 →
 * 打开其下第一个功能模块」成为统一规则；菜单顺序调整后 redirect 自动跟随。
 */
const firstChildPath = (name: string, fallback: string): string =>
  topNavigationItems.find(item => item.name === name)?.children?.[0]?.path ?? fallback;

/**
 * 平台路由。
 * 顶部导航四项（首页 / 任务中心 / 基础数据库 / 系统设置）驱动主框架；
 * 系统设置的 7 个二级页面中，仅「用户管理」「审计管理」为实页面，其余挂占位页。
 * 审计管理旧路径 /audit 重定向到 /settings/audit；消息中心、登录为既有能力。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...(import.meta.env.DEV ? [{ path: "/__design-system", name: "design-system-patterns", component: () => import("../design/patterns/DesignPatternsPage.vue"), meta: { layout: "product" } }] : []),
    { path: '/vehicles/directories/new', name: 'vehicle-directory-new', component: () => import('../modules/vehicles/pages/VehiclesPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/vehicles/directories/:id/edit', name: 'vehicle-directory-edit', component: () => import('../modules/vehicles/pages/VehiclesPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/vehicles', name: 'vehicles', component: () => import('../modules/vehicles/pages/VehiclesPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../modules/auth/pages/LoginPage.vue'),
      meta: { requiresAuth: false, layout: false },
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../modules/dashboard/pages/DashboardPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('../modules/task-center/pages/TasksPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    // 任务中心子页：静态路由必须注册在 /tasks/:taskId 之前，避免参数路由吞掉枚举路径
    {
      path: '/tasks/orchestration',
      name: 'task-orchestration',
      component: () => import('../modules/task-center/pages/TaskOrchestrationPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    {
      path: '/tasks/:taskId/application',
      name: 'task-application-demo',
      component: () => import('../modules/dashboard/pages/AppDemoPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    {
      path: '/tasks/:taskId',
      name: 'task-detail',
      component: () => import('../modules/task-center/pages/TaskDetailPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    {
      path: '/apps/:appId',
      name: 'app-demo',
      component: () => import('../modules/dashboard/pages/AppDemoPage.vue'),
      meta: { requiresAuth: false, layout: false },
    },
    {
      path: '/data',
      name: 'data',
      redirect: firstChildPath('data', '/data/parts'),
      meta: { layout: 'product', requiresAuth: true },
    },
    {
      path: '/settings',
      redirect: firstChildPath('settings', '/settings/users'),
    },
    {
      path: '/settings/users',
      name: 'settings-users',
      component: () => import('../modules/user-management/pages/UserManagementPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    {
      path: '/settings/audit',
      name: 'settings-audit',
      component: () => import('../modules/audit/pages/AuditManagementPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    { path: '/settings/departments', name: 'settings-departments', component: () => import('../modules/departments/pages/DepartmentsPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    ...[
      { path: '/settings/roles', name: 'roles' },
      { path: '/settings/roles/new', name: 'role-new' },
      { path: '/settings/roles/:id/edit', name: 'role-edit' },
      { path: '/settings/roles/:id/detail', name: 'role-detail' },
    ].map(route => ({ ...route, component: () => import('../modules/roles/pages/RolesPage.vue'), meta: { layout: 'product', requiresAuth: true } })),
    { path: '/settings/workflow', name: 'workflow', component: () => import('../modules/workflow/pages/WorkflowPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/settings/workflow/:id/:mode(edit|detail)', name: 'workflow-editor', component: () => import('../modules/workflow/pages/WorkflowPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/settings/numbering', name: 'numbering', component: () => import('../modules/numbering/pages/NumberingRulesPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/certificates/:id', name: 'certificate-detail', component: () => import('../modules/certificates/pages/CertificateDetailPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/certificates', name: 'certificates', component: () => import('../modules/certificates/pages/CertificatesPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/regulations', name: 'regulations', component: () => import('../modules/regulations/pages/RegulationsPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/parts', name: 'parts', component: () => import('../modules/parts/pages/PartsPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/parts/:id/relations', name: 'part-relations', component: () => import('../modules/parts/pages/PartRelationsPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/parts/:id/relations/projects/:projectId', name: 'part-related-project', component: () => import('../modules/parts/pages/PartRelationsPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/parts/:id', name: 'part-detail', component: () => import('../modules/parts/pages/PartsPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/settings/version-history', name: 'version-history', component: () => import('../modules/version-history/pages/VersionHistoryPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/settings/messages', name: 'message-settings', component: () => import('../modules/message-settings/pages/MessageSettingsPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/settings/account', name: 'settings-account', component: () => import('../modules/account/pages/AccountPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    { path: '/data/regulations/:id', name: 'regulation-detail', component: () => import('../modules/regulations/pages/RegulationDetailPage.vue'), meta: { layout: 'product', requiresAuth: true } },
    ...pendingRoutes,
    {
      path: '/audit',
      redirect: '/settings/audit',
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('../modules/dashboard/pages/MessageCenterPage.vue'),
      meta: { layout: 'product', requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/home',
    },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.name === 'login' && to.query.logout === '1') {
    authStore.logout();
    const { logout, ...query } = to.query;
    return { name: 'login', query, replace: true };
  }

  // 需要登录但未登录：导向登录页，并带上来源地址以便登录后回跳
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 已登录用户访问登录页：直接进主页，避免重复登录
  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'home' };
  }

  return true;
});

export default router;
