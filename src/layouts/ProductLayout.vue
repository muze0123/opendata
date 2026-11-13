<script setup lang="ts">
import { messageTypeLabel, messageDetailLabel } from "../modules/messages/labels";
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  IconUser, IconHistory, IconPoweroff, IconRight, IconCheck, IconClose, IconDown, IconLanguage, IconList,
  IconMenuFold, IconMenuUnfold, IconMoon, IconNotification, IconSun,
} from '@arco-design/web-vue/es/icon';
import { useMessagesStore } from '../modules/messages/store';
import { useLocaleStore } from '../app/stores/locale';
import { useUserProfileStore } from '../app/stores/userProfile';
import { useAuthStore } from '../modules/auth/stores/auth';
import { topNavigationItems, activeTopItem, isTopItemActive, type NavigationChild } from '../app/navigation';
import { useTaskCenterStore } from '../modules/task-center/stores/taskCenter';
import { setThemeMode, themeMode } from '../design/theme';
import TaskCenterDrawer from '../modules/task-center/components/TaskCenterDrawer.vue';
import avatarPlaceholder from '../assets/user-avatar-placeholder.svg';
import AccountSummary from '../modules/account/components/AccountSummary.vue';
import opendataLogo from '../assets/opendata-logo.svg';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const localeStore = useLocaleStore();
const userProfileStore = useUserProfileStore();
const authStore = useAuthStore();
const taskCenterStore = useTaskCenterStore();
const sidebarStorageKey = 'app-sidebar-collapsed:product';
const avatarLoadFailed = ref(false);
const avatarSrc = computed(() =>
  userProfileStore.profile.avatarUrl && !avatarLoadFailed.value
    ? userProfileStore.profile.avatarUrl
    : avatarPlaceholder,
);
const messages = useMessagesStore();
const accountOpen = ref(false);
const themeOpen = ref(false);
const languageOpen = ref(false);
const taskTooltipVisible = ref(false);
const noticeTooltipVisible = ref(false);
function selectTheme(value: unknown) {
  if (value === 'light' || value === 'dark') setThemeMode(value);
  themeOpen.value = false;
}

function selectLocale(value: unknown) {
  localeStore.setLocale(value);
  languageOpen.value = false;
}

async function handleLogout() {
  authStore.logout();
  await router.replace('/login');
}

/* 左侧栏内容：当前激活顶部项的 children；无 children（首页/任务中心/基础数据库）时隐藏左侧栏。 */
const sidebarChildren = computed<NavigationChild[]>(() => activeTopItem(route.path)?.children ?? []);
const sidebarVisible = computed(() => sidebarChildren.value.length > 0);
function isChildActive(child: NavigationChild) {
  return route.path === child.path || route.path.startsWith(`${child.path}/`);
}

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(sidebarStorageKey) === 'true';
  } catch {
    return false;
  }
}

const sidebarCollapsed = ref(readSidebarCollapsed());
const sidebarNav = ref<HTMLElement | null>(null);

function persistSidebar() {
  try {
    localStorage.setItem(sidebarStorageKey, String(sidebarCollapsed.value));
  } catch {
    // Keep the choice for this session when browser storage is unavailable.
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  persistSidebar();
}

onMounted(() => {
  window.addEventListener('resize', updateViewport);
});
onBeforeUnmount(() => window.removeEventListener('resize', updateViewport));
function updateViewport() {}
</script>

<template>
  <div class="product-shell" :class="{ 'has-sidebar': sidebarVisible }">
    <header class="product-header">
      <router-link class="product-brand" to="/home" :aria-label="t('shell.appName')">
        <span class="product-mark" aria-hidden="true"><img :src="opendataLogo" alt="" /></span>
        <strong>{{ t('shell.appName') }}</strong>
      </router-link>
      <!-- 顶部导航：首页 / 任务中心 / 基础数据库 / 系统设置（DESIGN.md · Top navigation） -->
      <nav class="product-topnav" aria-label="t('shell.navigation')">
        <router-link
          v-for="item in topNavigationItems"
          :key="item.name"
          :to="item.path"
          class="product-topnav-link"
          :class="{ 'is-active': isTopItemActive(item, route.path) }"
          :aria-current="isTopItemActive(item, route.path) ? 'page' : undefined"
        >
          <span>{{ t(item.labelKey) }}</span>
        </router-link>
      </nav>
      <div class="product-tools">
        <a-dropdown v-model:popup-visible="themeOpen" trigger="hover" position="br" @select="selectTheme">
          <button class="shell-icon-button" type="button" :aria-label="t('shell.theme')" @click="themeOpen = true">
            <IconMoon v-if="themeMode === 'dark'" :size="19" /><IconSun v-else :size="19" />
          </button>
          <template #content>
            <a-doption value="light" :class="{ 'shell-option-selected': themeMode === 'light' }">
              <template #icon><IconSun aria-hidden="true" /></template>
              {{ t('shell.light') }}<IconCheck v-if="themeMode === 'light'" class="shell-option-check" />
            </a-doption>
            <a-doption value="dark" :class="{ 'shell-option-selected': themeMode === 'dark' }">
              <template #icon><IconMoon aria-hidden="true" /></template>
              {{ t('shell.dark') }}<IconCheck v-if="themeMode === 'dark'" class="shell-option-check" />
            </a-doption>
          </template>
        </a-dropdown>

        <a-dropdown v-model:popup-visible="languageOpen" trigger="hover" position="br" @select="selectLocale">
          <button class="shell-icon-button" type="button" :aria-label="t('shell.language')" @click="languageOpen = true">
            <IconLanguage :size="19" />
          </button>
          <template #content>
            <a-doption
              v-for="option in localeStore.options"
              :key="option.code"
              :value="option.code"
              :class="{ 'shell-option-selected': localeStore.locale === option.code }"
            >
              {{ t(option.labelKey) }}<IconCheck v-if="localeStore.locale === option.code" class="shell-option-check" />
            </a-doption>
          </template>
        </a-dropdown>

        <a-tooltip v-model:popup-visible="taskTooltipVisible" :content="t('taskCenter.title')" position="bottom" content-class="app-tooltip-light" arrow-class="app-tooltip-light-arrow">
          <button
            class="shell-icon-button shell-task-trigger"
            type="button"
            :aria-label="t('taskCenter.title')"
            @focus="taskTooltipVisible = true"
            @blur="taskTooltipVisible = false"
            @click="taskTooltipVisible = false; taskCenterStore.open()"
          >
            <IconList :size="19" />
            <span
              v-if="taskCenterStore.processingCount > 0"
              class="shell-count-badge"
              aria-hidden="true"
            >{{ taskCenterStore.processingCount > 99 ? '99+' : taskCenterStore.processingCount }}</span>
          </button>
        </a-tooltip>

        <a-tooltip v-model:popup-visible="noticeTooltipVisible" :content="t('mc.title')" position="bottom" content-class="app-tooltip-light" arrow-class="app-tooltip-light-arrow">
          <button
            class="shell-icon-button shell-notice-trigger"
            type="button"
            :aria-label="`${t('mc.title')} (${messages.unread})`"
            @focus="noticeTooltipVisible = true"
            @blur="noticeTooltipVisible = false"
            @click="noticeTooltipVisible = false; router.push('/messages')"
          >
            <IconNotification :size="19" />
            <span v-if="messages.unread > 0" class="shell-count-badge" aria-hidden="true">{{ messages.unread > 99 ? '99+' : messages.unread }}</span>
          </button>
        </a-tooltip>
        <a-popover v-model:popup-visible="accountOpen" trigger="hover" position="br">
          <button class="product-account account-trigger" type="button" :aria-label="t('account.center')" :aria-expanded="accountOpen" @click="accountOpen = !accountOpen" @focus="accountOpen = true" @keydown.esc="accountOpen = false">
            <a-avatar :size="28"><img :src="avatarSrc" alt="" @error="avatarLoadFailed = true" /></a-avatar>
          </button>
          <template #content>
            <div class="account-popup" @keydown.esc="accountOpen = false">
              <AccountSummary compact />
              <router-link class="account-menu-item" to="/settings/account" @click="accountOpen = false"><IconUser :size="18" /><span>{{ t('account.title') }}</span><IconRight class="account-menu-arrow" /></router-link>
              <router-link class="account-menu-item" to="/settings/audit" @click="accountOpen = false"><IconHistory :size="18" /><span>{{ t('nav.settings.audit') }}</span><IconRight class="account-menu-arrow" /></router-link>
              <div class="account-menu-divider" />
              <button class="account-menu-item" type="button" @click="handleLogout"><IconPoweroff :size="18" /><span>{{ t('shell.logout') }}</span></button>
            </div>
          </template>
        </a-popover>
      </div>
    </header>
    <div class="product-body">
      <aside v-if="sidebarVisible" class="product-sidebar" :class="{ 'is-collapsed': sidebarCollapsed }" :aria-label="t('shell.navigation')">
        <nav ref="sidebarNav">
          <router-link
            v-for="child in sidebarChildren"
            :key="child.name"
            :to="child.path"
            class="product-menu-link product-menu-child"
            :class="{ 'is-active': isChildActive(child) }"
            active-class="is-active"
            :aria-current="isChildActive(child) ? 'page' : undefined"
            :title="t(child.labelKey)"
          >
            <component :is="child.icon" :size="16" /><span class="product-menu-label">{{ t(child.labelKey) }}</span>
          </router-link>
        </nav>
        <button
          class="product-sidebar-toggle"
          type="button"
          :aria-expanded="!sidebarCollapsed"
          :aria-label="t(sidebarCollapsed ? 'shell.expandSidebar' : 'shell.collapseSidebar')"
          :title="t(sidebarCollapsed ? 'shell.expandSidebar' : 'shell.collapseSidebar')"
          @click="toggleSidebar"
        >
          <IconMenuUnfold v-if="sidebarCollapsed" :size="18" />
          <IconMenuFold v-else :size="18" />
          <span class="product-toggle-label">{{ t(sidebarCollapsed ? 'shell.expandSidebar' : 'shell.collapseSidebar') }}</span>
        </button>
      </aside>
      <main class="product-main"><slot /></main>
    </div>
    <aside v-if="messages.arrival" class="message-arrival" role="status">
      <div class="arrival-heading"><span>{{ t('mc.arrival') }}</span><a-button type="text" :aria-label="t('shell.dismiss')" @click="messages.arrival = null"><IconClose /></a-button></div>
      <p>{{ messageTypeLabel(t, messages.arrival.type) }} · {{ messages.arrival.resource }}</p>
      <p>{{ messageDetailLabel(t, messages.arrival.type) }}</p>
      <a-button type="primary" @click="messages.arrival = null; router.push('/messages')">{{ t('mc.view') }}</a-button>
    </aside>
    <TaskCenterDrawer />
  </div>
</template>

<style scoped>
.message-arrival { position:fixed; z-index:100; top:72px; right:24px; width:min(360px, calc(100vw - 32px)); padding:16px; background:var(--app-surface); border:1px solid var(--app-divider); border-radius:4px; box-shadow:var(--app-shadow-4); }
.arrival-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.message-arrival p { color:var(--color-text-2); line-height:1.6; }
/* 应用布局（顶部导航 + 左侧菜单 + 右侧内容区）：header 以下整体为 Fill-1 灰画布
   （--app-page），侧栏为贴左满高的白色 div，内容区与侧栏/导航栏/右缘/底部各留 16px。
   页面根节点即白色业务面板，直接铺满内容区。 */
.product-shell { min-height: 100vh; padding-top: 56px; background: var(--app-page); color: var(--color-text-1); }
.product-header { position: fixed; inset: 0 0 auto; z-index: 20; display: flex; align-items: center; gap: 16px; height: 56px; padding: 0 16px; background: var(--app-surface); box-shadow: var(--app-shadow-4); }
/* 2026-11-09 用户裁决：顶部导航菜单起点距页面左侧 220px。
   16px header 内边距 + 188px 品牌区 + 16px header gap = 220px；<=900px 窄屏品牌改为 flex:none，不受此值影响。 */
.product-brand { display: inline-flex; align-items: center; flex: 0 0 188px; gap: 10px; color: var(--color-text-1); text-decoration: none; white-space: nowrap; }
.product-brand strong { overflow: hidden; font-size: 16px; font-weight: 600; text-overflow: ellipsis; }
.product-mark { display: grid; flex: 0 0 32px; width: 32px; height: 32px; place-items: center; border-radius: 4px; border: 1px solid var(--app-divider); background: var(--app-surface); }
.product-mark img { display: block; width: 32px; height: 32px; object-fit: contain; }

/* 顶部导航（DESIGN.md · Top navigation）：logo 左、导航项中、辅助菜单右；
   一级菜单 normal/hover/select 三态，选中项以主色文字 + 底部 3px 指示条表达。 */
.product-topnav { display: flex; align-items: stretch; flex: 1; min-width: 0; height: 100%; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.product-topnav::-webkit-scrollbar { display: none; }
.product-topnav-link { display: inline-flex; align-items: center; gap: 7px; flex: none; height: 100%; padding: 3px 12px 0; border-bottom: 3px solid transparent; color: var(--color-text-2); font-size: 14px; white-space: nowrap; text-decoration: none; }
.product-topnav-link:hover { color: rgb(var(--primary-6)); background: var(--color-fill-2); }
.product-topnav-link.is-active { color: rgb(var(--primary-6)); border-bottom-color: rgb(var(--primary-6)); }

.product-account { display: inline-flex; align-items: center; flex: none; gap: 8px; font-size: 14px; }
.product-tools { display: inline-flex; align-items: center; flex: none; gap: 10px; }
.product-account :deep(.arco-avatar) { flex: none; background: var(--color-fill-2); }
.product-account :deep(.arco-avatar img) { display: block; width: 100%; height: 100%; object-fit: cover; }
/* 固定侧栏不参与文档流，内容区自行保留 16px 画布间距。 */
.product-body { display: flex; align-items: flex-start; min-height: calc(100vh - 56px); padding: 16px; }
.product-sidebar { position: fixed; top: 56px; bottom: 0; left: 0; z-index: 10; display: flex; flex-direction: column; width: 205px; height: calc(100dvh - 56px); padding: 16px 8px 0; background: var(--app-surface); transition: width 200ms ease; }
.product-sidebar.is-collapsed { width: 64px; }
.product-sidebar > nav { flex: 1; min-height: 0; overflow-y: auto; }
.product-menu-link { display: flex; align-items: center; width: 100%; min-height: 40px; gap: 10px; padding: 8px 12px; border: 0; border-radius: 4px; color: var(--color-text-2); background: transparent; text-decoration: none; text-align: left; cursor: pointer; font: inherit; font-size: 14px; line-height: 20px; }
.product-menu-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.product-menu-link :deep(svg) { flex: none; }
.product-menu-link:hover, .product-sidebar-toggle:hover { background: var(--color-fill-2); }
.product-menu-link:focus-visible, .product-sidebar-toggle:focus-visible { outline: 2px solid var(--app-accent); outline-offset: -2px; }
.product-menu-link.is-active { color: var(--app-accent); background: var(--color-primary-light-1); font-weight: 600; }
.product-sidebar.is-collapsed .product-menu-link { justify-content: center; padding: 0; }
.product-sidebar.is-collapsed .product-menu-label { display: none; }
.product-sidebar-toggle { display: flex; flex: none; align-items: center; width: 100%; height: 44px; gap: 10px; padding: 0 12px; border: 0; border-top: 1px solid var(--app-divider); background: transparent; color: var(--color-text-2); font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
.product-sidebar.is-collapsed .product-sidebar-toggle { justify-content: center; padding: 0; }
.product-sidebar.is-collapsed .product-toggle-label { display: none; }
/* 内容区：仅在存在左侧栏时预留 205/64px 侧栏宽度 + 16px 画布间距；无左侧栏（首页等）则占满。 */
.product-main { flex: 1; min-width: 0; margin-left: 0; padding-top: 0; margin-bottom: 0; }
.product-shell.has-sidebar .product-main { margin-left: 205px; }
.product-shell.has-sidebar .product-sidebar.is-collapsed + .product-main { margin-left: 64px; }
@media (max-width: 900px) {
  /* 窄屏改为文档流中的横向菜单，正文不再预留左侧宽度。 */
  .product-body { flex-direction: column; align-items: stretch; gap: 0; padding: 16px; }
  .product-brand { flex: none; }
  .product-topnav { height: 44px; }
  .product-main, .product-shell.has-sidebar .product-main, .product-shell.has-sidebar .product-sidebar.is-collapsed + .product-main { margin-left: 0; margin-bottom: 0; padding-top: 0; }
  .product-sidebar, .product-sidebar.is-collapsed { position: static; z-index: auto; flex: none; width: 100%; height: auto; margin-bottom: 16px; padding: 8px 16px; border-bottom: 1px solid var(--app-divider); }
  .product-sidebar > nav { display: flex; gap: 8px; overflow-x: auto; }
  .product-sidebar > nav > .product-menu-link { flex: 0 0 auto; width: auto; white-space: nowrap; }
  .product-menu-link { width: auto; }
  .product-sidebar.is-collapsed .product-menu-link { justify-content: flex-start; padding: 0 12px; }
  .product-sidebar.is-collapsed .product-menu-label { display: inline; }
  .product-sidebar-toggle { display: none; }
}
@media (max-width: 760px) {
  .product-brand strong { max-width: 48vw; }
}
@media (prefers-reduced-motion: reduce) {
  .product-sidebar { transition: none; }
}
</style>

<style scoped>
.account-trigger { border: 0; background: transparent; cursor: pointer; color: var(--color-text-1); padding: 6px; border-radius: var(--border-radius-small); }
.account-trigger:hover { background: var(--color-fill-2); }
.account-trigger:focus-visible, .account-menu-item:focus-visible { outline: 2px solid rgb(var(--primary-6)); outline-offset: 2px; }
/* 2026-11-08 用户裁决：hover 头像/名称的账户下拉框收窄，菜单文案与信息卡保持不变。
   内容是 240px，Arco 弹层自带 16px 左右内边距 + 1px 边框，实测外框 274px。 */
.account-popup { width: min(240px, calc(100vw - 48px)); }
.account-menu-item { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 14px 12px; color: var(--color-text-1); text-decoration: none; background: transparent; border: 0; font: inherit; cursor: pointer; }
.account-menu-item:hover { background: var(--color-fill-2); color: rgb(var(--primary-6)); }
.account-menu-arrow { margin-left: auto; color: var(--color-text-3); }
.account-menu-divider { border-top: 1px solid var(--color-border-2); margin: 6px 0; }
</style>
