<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Message } from '@arco-design/web-vue';
import { useI18n } from 'vue-i18n';
import { IconApps, IconDown, IconFullscreen, IconFullscreenExit, IconInfoCircle } from '@arco-design/web-vue/es/icon';
import { overviewApps, reports, type AlertRecord, type OverviewApp, type OverviewMetric } from '../data/overview';
import AttackTrendChart from '../components/AttackTrendChart.vue';
import csmsIcon from '../../../assets/apps/csms.svg';
import vsocIcon from '../../../assets/apps/vsoc.svg';
import taraIcon from '../../../assets/apps/tara.svg';
import operationsIcon from '../../../assets/apps/operations.svg';

const appIconUrls: Partial<Record<OverviewApp['icon'], string>> = {
  csms: csmsIcon,
  vsoc: vsocIcon,
  tara: taraIcon,
  operations: operationsIcon,
};

const router = useRouter();
const { t } = useI18n({ useScope: 'global' });
const reportId = ref('default');
const report = computed(() => reports.find((item) => item.id === reportId.value) ?? reports[0]!);
const reportName = computed(() => t(`overview.reports.${report.value.id}`));
const metricLabel = (metric: OverviewMetric) => t(`overview.metrics.${metric.id}`);
const metricDescription = (metric: OverviewMetric) => t(`overview.descriptions.${report.value.id}.${metric.id}`);
const appName = (app: OverviewApp) => t(`overview.apps.${app.icon}.name`);
const maxEcu = computed(() => Math.max(...report.value.ecu.map((item) => item.count), 1));
const reportElement = ref<HTMLElement | null>(null);
const fullScreen = ref(false);
const overlayFullScreen = ref(false);
const selectedAlert = ref<AlertRecord | null>(null);
const groupsOpen = ref({ mine: true, more: true });
const appPanelCollapsed = ref(false);
const appStatuses = ref<Record<string, 'active' | 'inactive'>>(Object.fromEntries(overviewApps.map((app) => [app.id, app.initialStatus])));
/**
 * 初始加载态：数据层目前是模块内静态模拟，没有真实请求，这里用一个短暂延时占位，
 * 让骨架屏可被验证。接入接口后把 loading 的翻转交给请求即可，模板结构不需要改。
 * 报表切换不经过该状态（PRD 3.2：报表切换立即生效）。
 */
const loading = ref(true);
let loadingTimer: number | undefined;
/** 告警表骨架列宽：级别 / 时间 / 事件 / 操作，按真实列的内容宽度近似。 */
const skeletonAlertWidths = ['44px', '60px', '96px', '36px'];

onMounted(() => {
  loadingTimer = window.setTimeout(() => { loading.value = false; }, 700);
});

function sparklinePaths(metric: OverviewMetric) {
  const values = metric.points ?? [];
  if (values.length < 2) return { line: '', area: '' };

  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.map((value, index) => ({
    x: (index * 160) / (values.length - 1),
    y: 54 - ((value - min) / range) * 52,
  }));
  const round = (value: number) => Number(value.toFixed(2));
  const segments = points.slice(0, -1).map((current, index) => {
    const previous = points[Math.max(0, index - 1)]!;
    const next = points[index + 1]!;
    const following = points[Math.min(points.length - 1, index + 2)]!;
    const control1Y = Math.max(2, Math.min(54, current.y + (next.y - previous.y) / 6));
    const control2Y = Math.max(2, Math.min(54, next.y - (following.y - current.y) / 6));
    return `C ${round(current.x + (next.x - previous.x) / 6)} ${round(control1Y)} ${round(next.x - (following.x - current.x) / 6)} ${round(control2Y)} ${round(next.x)} ${round(next.y)}`;
  });
  const line = `M 0 ${round(points[0]!.y)} ${segments.join(' ')}`;
  return { line, area: `${line} L 160 56 L 0 56 Z` };
}
const metricSparklines = computed(() => report.value.metrics.map(sparklinePaths));
async function toggleFullScreen() {
  if (overlayFullScreen.value) { overlayFullScreen.value = false; fullScreen.value = false; return; }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await reportElement.value?.requestFullscreen();
      if (document.fullscreenElement !== reportElement.value) {
        overlayFullScreen.value = true;
        fullScreen.value = true;
      }
    }
  } catch { overlayFullScreen.value = true; fullScreen.value = true; }
}
function syncFullScreen() {
  if (document.fullscreenElement === reportElement.value) overlayFullScreen.value = false;
  fullScreen.value = overlayFullScreen.value || document.fullscreenElement === reportElement.value;
}
function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (overlayFullScreen.value) {
    overlayFullScreen.value = false;
    fullScreen.value = false;
  } else if (document.fullscreenElement === reportElement.value) {
    void document.exitFullscreen();
  }
}
document.addEventListener('fullscreenchange', syncFullScreen);
document.addEventListener('keydown', handleEscape);
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullScreen);
  document.removeEventListener('keydown', handleEscape);
  if (loadingTimer) window.clearTimeout(loadingTimer);
});

function activateApp(id: string) {
  appStatuses.value = { ...appStatuses.value, [id]: 'active' };
  Message.success(t('overview.activationSuccess'));
}
function launchApp(id: string) {
  const app = overviewApps.find((item) => item.id === id);
  const url = app?.url ?? router.resolve({ name: 'app-demo', params: { appId: id } }).href;
  const opened = window.open(url, '_blank');
  if (opened) opened.opener = null;
  else Message.error(t('overview.popupBlocked'));
}
</script>

<template>
  <main class="overview-page">
    <p class="visually-hidden" role="status">{{ loading ? t('overview.loading') : t('overview.loaded') }}</p>
    <div class="overview-layout" :class="{ 'apps-collapsed': appPanelCollapsed }">
      <section
        ref="reportElement"
        class="overview-report"
        :class="{ 'report-overlay': overlayFullScreen }"
        :aria-label="t('overview.reportRegion')"
        :aria-busy="loading"
      >
        <div class="report-toolbar">
          <label class="visually-hidden" for="overview-report-select"
            >{{ t('overview.selectReport') }}</label
          >
          <div class="report-select">
            <a-select id="overview-report-select" v-model="reportId" :aria-label="t('overview.selectReport')">
              <a-option v-for="item in reports" :key="item.id" :value="item.id">{{ t(`overview.reports.${item.id}`) }}</a-option>
            </a-select>
          </div>
          <span class="visually-hidden" aria-live="polite"
            >{{ t('overview.currentReport', { report: reportName }) }}</span
          >
          <div class="toolbar-actions">
            <a-button class="fullscreen-button" @click="toggleFullScreen"
              ><template #icon
                ><IconFullscreenExit v-if="fullScreen" /><IconFullscreen
                  v-else /></template
              >{{ t(fullScreen ? 'overview.exitFullscreen' : 'overview.fullscreen') }}</a-button
            >
            <button
              v-if="appPanelCollapsed"
              class="apps-toggle-btn"
              type="button"
              :aria-label="t('overview.expandApps')"
              @click="appPanelCollapsed = false"
            >
              <svg class="apps-toggle-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                <g transform="translate(16,0) scale(-1,1)">
                  <path fill="#666666" d="M2.9356 2.60229L1.9928 3.5451L4.11412 5.66642L1.9928 7.78775L2.9356 8.73055L5.99974 5.66642L2.9356 2.60229ZM13.9998 13.3331V11.9997H1.99974V13.3331H13.9998ZM13.9998 8.66641V7.33308H7.99976V8.66641H13.9998ZM13.9998 3.99975V2.66642H7.99976V3.99975H13.9998Z" />
                </g>
              </svg>
            </button>
          </div>
        </div>
        <div class="metrics-grid">
          <article
            v-for="(metric, metricIndex) in report.metrics"
            :key="metric.id"
            class="overview-panel metric-panel"
          >
            <template v-if="loading">
              <div class="panel-heading metric-heading" aria-hidden="true">
                <h2><span class="sk" style="width: 58%" /></h2>
              </div>
              <strong class="metric-value"><span class="sk sk-value" /></strong>
              <span class="metric-change sk-change-slot"><span class="sk sk-change" /></span>
            </template>
            <template v-else>
            <div class="panel-heading metric-heading">
                <h2>{{ metricLabel(metric) }}</h2>
                <a-tooltip :content="metricDescription(metric)">
                  <IconInfoCircle
                    class="info-icon"
                    :aria-label="metricDescription(metric)"
                    tabindex="0"
                  />
                </a-tooltip>
            </div>
            <strong class="metric-value">{{ metric.value }}</strong>
            <span v-if="metric.change" class="metric-change">
              {{ t('overview.change', { value: metric.change }) }}
              <span
                :class="metric.direction === 'up' ? 'trend-up' : 'trend-down'"
                aria-hidden="true"
              >{{ metric.direction === "up" ? "↑" : "↓" }}</span>
            </span>
            <svg
              v-if="metric.chart === 'line'"
              class="metric-trend sparkline"
              viewBox="0 0 160 56"
              role="img"
              :aria-label="t('overview.miniTrend', { metric: metricLabel(metric) })"
            >
              <defs>
                <linearGradient :id="`metric-area-${report.id}-${metricIndex}`" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style="stop-color: var(--mt-theme-6); stop-opacity: 0.18" />
                  <stop offset="100%" style="stop-color: var(--mt-theme-1); stop-opacity: 0.22" />
                </linearGradient>
              </defs>
              <path
                :d="metricSparklines[metricIndex]?.area"
                :fill="`url(#metric-area-${report.id}-${metricIndex})`"
              />
              <path
                :d="metricSparklines[metricIndex]?.line"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
              />
            </svg>
            <div
              v-else-if="metric.chart === 'bar'"
              class="metric-trend mini-bars"
              role="img"
              :aria-label="t('overview.miniTrend', { metric: metricLabel(metric) })"
            >
              <span
                v-for="(value, index) in metric.points"
                :key="index"
                :style="{ height: `${value}%` }"
              />
            </div>
            <div
              v-else
              class="metric-trend score-track"
              role="progressbar"
              :aria-valuenow="metric.progress"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="metricLabel(metric)"
            >
              <span :style="{ width: `${metric.progress}%` }" />
            </div>
            </template>
          </article>
        </div>
        <div class="report-detail-grid">
          <section
            class="overview-panel ecu-panel"
            aria-labelledby="ecu-heading"
          >
            <div class="panel-heading">
              <h2 id="ecu-heading">{{ t('overview.ecuTitle') }}</h2>
              <a-tooltip :content="t('overview.ecuHelp')"
                ><IconInfoCircle
                  class="info-icon"
                  :aria-label="t('overview.ecuHelpLabel')"
                  tabindex="0"
              /></a-tooltip>
            </div>
            <ol v-if="loading" class="ecu-list" aria-hidden="true">
              <li v-for="n in 5" :key="`sk-ecu-${n}`">
                <div class="ecu-label">
                  <span class="sk-slot" style="width: 46%"><span class="sk" /></span>
                  <span class="sk-slot" style="width: 32px"><span class="sk" /></span>
                </div>
                <div class="ecu-track" />
              </li>
            </ol>
            <ol v-else class="ecu-list">
              <li
                v-for="(ecu, index) in report.ecu"
                :key="`${ecu.type}-${index}`"
              >
                <div class="ecu-label">
                  <span>{{ t(`overview.ecu.${ecu.type}`) }}</span
                  ><strong>{{ ecu.count }}</strong>
                </div>
                <div class="ecu-track">
                  <span :style="{ width: `${(ecu.count / maxEcu) * 100}%` }" />
                </div>
              </li>
            </ol>
          </section>
          <section
            class="overview-panel alerts-panel"
            aria-labelledby="alerts-heading"
          >
            <div class="panel-heading">
              <h2 id="alerts-heading">{{ t('overview.alertsTitle') }}</h2>
              <a-tooltip :content="t('overview.alertsHelp')"
                ><IconInfoCircle
                  class="info-icon"
                  :aria-label="t('overview.alertsHelpLabel')"
                  tabindex="0"
              /></a-tooltip>
            </div>
            <div class="alerts-scroll">
              <table v-if="loading" class="alerts-table" aria-hidden="true">
                <thead>
                  <tr>
                    <th v-for="n in 4" :key="`sk-th-${n}`" scope="col">
                      <span class="sk" style="width: 40px" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="n in 5" :key="`sk-tr-${n}`">
                    <td v-for="c in 4" :key="`sk-td-${n}-${c}`">
                      <!-- 操作列放一个与真实按钮同高（28px）的占位，行高才不会跳。 -->
                      <span v-if="c === 4" class="sk sk-button" />
                      <span v-else class="sk" :style="{ width: skeletonAlertWidths[c - 1] }" />
                    </td>
                  </tr>
                </tbody>
              </table>
              <table v-else class="alerts-table">
                <thead>
                  <tr>
                    <th scope="col">{{ t('overview.severity') }}</th>
                    <th scope="col">{{ t('overview.time') }}</th>
                    <th scope="col">{{ t('overview.event') }}</th>
                    <th scope="col">{{ t('overview.action') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="alert in report.alerts" :key="alert.id">
                    <td>{{ alert.severity }}</td>
                    <td>{{ alert.time }}</td>
                    <td>{{ alert.event }}</td>
                    <td>
                      <a-button
                        type="text"
                        size="small"
                        :aria-label="t('overview.viewAlert', { event: alert.event })"
                        @click="selectedAlert = alert"
                        >{{ t('overview.details') }}</a-button
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <section
          class="overview-panel trend-panel"
          aria-labelledby="trend-heading"
        >
          <div class="panel-heading">
            <h2 id="trend-heading">{{ t('overview.chart.title') }}</h2>
            <a-tooltip :content="t('overview.chart.help')"
              ><IconInfoCircle
                class="info-icon"
                :aria-label="t('overview.chart.helpLabel')"
                tabindex="0"
            /></a-tooltip>
          </div>
          <div v-if="loading" class="trend-chart-scroll" aria-hidden="true">
            <div class="sk sk-chart" />
          </div>
          <AttackTrendChart v-else :report-name="reportName" :monthly="report.monthly" />
        </section>
      </section>
      <aside class="overview-sidebar" :aria-label="t('overview.sidebar')" :aria-busy="loading">
        <section
          class="overview-panel apps-panel"
          :class="{ 'is-collapsed': appPanelCollapsed }"
          aria-labelledby="apps-heading"
        >
          <div class="apps-panel-content">
            <div class="sidebar-heading">
              <h2 id="apps-heading">{{ t('overview.appsTitle') }}</h2>
              <button
                class="apps-collapse-btn"
                type="button"
                :aria-expanded="!appPanelCollapsed"
                :aria-label="t('overview.collapseApps')"
                @click="appPanelCollapsed = !appPanelCollapsed"
              >
                <svg class="apps-toggle-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                  <path fill="#666666" d="M2.9356 2.60229L1.9928 3.5451L4.11412 5.66642L1.9928 7.78775L2.9356 8.73055L5.99974 5.66642L2.9356 2.60229ZM13.9998 13.3331V11.9997H1.99974V13.3331H13.9998ZM13.9998 8.66641V7.33308H7.99976V8.66641H13.9998ZM13.9998 3.99975V2.66642H7.99976V3.99975H13.9998Z" />
                </svg>
              </button>
            </div>
            <template v-if="loading">
              <div v-for="count in [2, 4]" :key="`sk-group-${count}`" class="app-group" aria-hidden="true">
                <div class="group-toggle"><span class="sk-slot" style="width: 72px"><span class="sk" /></span></div>
                <div class="app-list">
                  <article v-for="n in count" :key="`sk-app-${n}`" class="app-item">
                    <span class="sk sk-icon-lg" />
                    <div class="app-copy">
                      <div class="app-name"><span class="sk" style="width: 62%" /></div>
                      <span class="app-description"><span class="sk" style="width: 84%" /></span>
                    </div>
                    <span class="sk sk-button" />
                  </article>
                </div>
              </div>
            </template>
            <template v-else>
            <div
              v-for="group in (['mine', 'more'] as const).filter((group) => overviewApps.some((app) => app.group === group))"
              :key="group"
              class="app-group"
            >
              <button
                class="group-toggle"
                type="button"
                :aria-expanded="groupsOpen[group]"
                @click="groupsOpen[group] = !groupsOpen[group]"
              >
                <IconDown
                  class="group-chevron"
                  :class="{ collapsed: !groupsOpen[group] }"
                  aria-hidden="true"
                />{{ t(group === 'mine' ? 'overview.mine' : 'overview.moreApps') }}
              </button>
              <div v-if="groupsOpen[group]" class="app-list">
                <article
                  v-for="app in overviewApps.filter(
                    (item) => item.group === group
                  )"
                  :key="app.id"
                  class="app-item"
                >
                  <span class="app-icon" aria-hidden="true">
                    <IconApps v-if="app.icon === 'hmg'" :size="36" />
                    <img v-else :src="appIconUrls[app.icon]" alt="" width="36" height="36" />
                  </span>
                  <div class="app-copy">
                    <div class="app-name" :title="appName(app)">
                      {{ appName(app) }}
                      <span v-if="app.new" class="new-label">NEW</span>
                    </div>
                    <span class="app-description">{{ t(`overview.apps.${app.icon}.description`) }}</span>
                  </div>
                  <a-button
                    v-if="appStatuses[app.id] === 'active'"
                    type="outline"
                    size="small"
                    :aria-label="t('overview.startApp', { app: appName(app) })"
                    @click="launchApp(app.id)"
                    >{{ t('overview.start') }}</a-button
                  ><a-button
                    v-else
                    type="primary"
                    size="small"
                    :aria-label="t('overview.activateApp', { app: appName(app) })"
                    @click="activateApp(app.id)"
                    >{{ t('overview.activate') }}</a-button
                  >
                </article>
              </div>
            </div>
            </template>
          </div>
        </section>
      </aside>
    </div>
    <a-drawer
      :visible="!!selectedAlert"
      :width="400"
      :title="t('overview.drawer.title')"
      :footer="false"
      @cancel="selectedAlert = null"
      ><div v-if="selectedAlert" class="alert-details">
        <dl>
          <dt>{{ t('overview.drawer.id') }}</dt>
          <dd>{{ selectedAlert.id }}</dd>
          <dt>{{ t('overview.drawer.severity') }}</dt>
          <dd>{{ selectedAlert.severity }}</dd>
          <dt>{{ t('overview.drawer.time') }}</dt>
          <dd>{{ selectedAlert.time }}</dd>
          <dt>{{ t('overview.drawer.event') }}</dt>
          <dd>{{ selectedAlert.event }}</dd>
          <dt>{{ t('overview.drawer.vehicle') }}</dt>
          <dd>{{ t('overview.drawer.testVehicle', { suffix: selectedAlert.vehicleLast4 }) }}</dd>
        </dl>
      </div></a-drawer
    >
  </main>
</template>

<style scoped>
.overview-page {
  min-height: calc(100dvh - 88px);
  padding: 0;
  background: var(--mt-fill-1);
}
.overview-layout {
  max-width: 1920px;
  margin: 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.overview-report {
  flex: 1 1 0;
  min-width: 0;
  display: grid;
  gap: 12px;
}
.overview-sidebar {
  --app-sidebar-w: 380px;
  flex: 0 0 var(--app-sidebar-w);
  width: var(--app-sidebar-w);
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    flex-basis 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.overview-layout.apps-collapsed .overview-sidebar {
  flex-basis: 0;
  width: 0;
  min-width: 0;
  overflow: hidden;
}
.overview-layout.apps-collapsed {
  gap: 0;
}
.overview-panel {
  min-width: 0;
  background: var(--app-surface);
  border-radius: 4px;
}
.report-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.report-select {
  width: 176px;
  flex: 0 0 176px;
}
.report-select :deep(.arco-select) {
  width: 100%;
}
.report-select :deep(.arco-select-view) {
  height: 32px;
  background: var(--app-surface);
  border: 1px solid var(--app-control-border);
  border-radius: 2px;
}
.report-select :deep(.arco-select-view:hover) {
  border-color: var(--app-control-border);
}
.report-select :deep(.arco-select-view:focus-within) {
  border-color: var(--mt-theme-6);
}
.fullscreen-button {
  background: var(--app-surface);
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.metric-panel {
  position: relative;
  min-width: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.panel-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-bottom: 12px;
}
.panel-heading h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}
.metric-heading {
  margin-bottom: 0;
}
.metric-heading h2 {
  color: var(--color-text-3);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.overview-page:lang(en) .metric-heading {
  min-height: 40px;
  align-items: flex-start;
}
.overview-page:lang(en) .metric-heading h2 {
  line-height: 20px;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: anywhere;
}
.info-icon {
  flex: none;
  font-size: 16px;
  color: var(--color-text-3);
  cursor: help;
  outline-offset: 2px;
}
.metric-value {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.metric-trend {
  position: absolute;
  right: 16px;
  bottom: 16px;
}
.metric-change {
  align-self: flex-start;
  margin-top: 10px;
  color: var(--color-text-2);
  font-size: 12px;
  white-space: nowrap;
}
.trend-up {
  color: var(--app-color-danger);
  font-size: 16px;
}
.trend-down {
  color: var(--app-color-success);
  font-size: 16px;
}
.sparkline {
  width: min(45%, 160px);
  height: auto;
  aspect-ratio: 160 / 56;
  color: var(--mt-theme-6);
  overflow: hidden;
}
.mini-bars {
  display: flex;
  align-items: end;
  gap: 4px;
  width: 45%;
  height: 44px;
}
.mini-bars span {
  flex: 1;
  min-width: 0;
  background: var(--app-accent);
}
.score-track {
  left: 16px;
  right: 16px;
  /* Bottom edge aligns with the 环比 text baseline slot of peer cards (card padding). */
  bottom: 16px;
  width: auto;
  height: 8px;
  margin-bottom: 0;
  background: var(--color-fill-3);
  border-radius: 0;
  overflow: hidden;
}
.score-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--mt-theme-6), var(--app-dashboard-gradient-end));
}
.report-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.ecu-panel,
.alerts-panel {
  padding: 16px;
  min-width: 0;
  min-height: 316px;
}
.ecu-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 16px;
}
.ecu-label {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-text-2);
  font-size: 12px;
  line-height: 20px;
}
.ecu-label strong {
  font-variant-numeric: tabular-nums;
}
.ecu-track {
  margin-top: 4px;
  height: 7px;
  background: var(--color-fill-3);
}
.ecu-track span {
  display: block;
  height: 100%;
  background: var(--app-accent);
}
.alerts-scroll {
  overflow-x: auto;
  margin-top: 12px;
}
.alerts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
}
.alerts-table thead { background: var(--mt-fill-2); }
.alerts-table th {
  color: var(--color-text-2);
  font-weight: 600;
}
.alerts-table th,
.alerts-table td {
  padding: 8px;
}
.alerts-table th:first-child,
.alerts-table td:first-child {
  padding-left: 12px;
}
.alerts-table th:last-child,
.alerts-table td:last-child {
  text-align: right;
  padding-right: 12px;
}
.alerts-table tbody tr:nth-child(even) {
  background: var(--color-fill-2);
}
.alerts-table .arco-btn {
  padding: 0;
}
.trend-panel {
  min-width: 0;
  padding: 16px;
}
.sidebar-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.sidebar-heading h2 {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
.sidebar-heading a {
  display: inline-flex;
  align-items: center;
  color: var(--color-text-2);
  font-size: 14px;
  text-decoration: none;
}
.sidebar-heading a:hover {
  color: var(--app-accent);
}
.apps-panel {
  padding: 16px;
  position: relative;
  overflow: hidden;
}
.apps-panel.is-collapsed {
  padding: 0;
}
.apps-toggle-btn,
.apps-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--border-radius-small);
  background: transparent;
  color: var(--color-text-2);
  font-size: 16px;
  cursor: pointer;
}
.apps-toggle-btn:hover,
.apps-collapse-btn:hover {
  background: var(--color-fill-2);
  color: var(--app-accent);
}
.apps-toggle-btn:focus-visible,
.apps-collapse-btn:focus-visible {
  outline: 2px solid var(--app-accent);
  outline-offset: 2px;
}
.apps-panel-content {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s ease;
}
.apps-panel.is-collapsed .apps-panel-content {
  transform: translateX(var(--app-sidebar-w));
  opacity: 0;
  pointer-events: none;
}
.apps-toggle-icon {
  display: block;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.notice-list,
.app-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}
.notice-item,
.app-item {
  border-radius: 4px;
}
.app-group + .app-group {
  margin-top: 16px;
}
.group-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-bottom: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-1);
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  text-align: left;
  cursor: pointer;
}
.group-chevron {
  flex: none;
  color: var(--color-text-2);
  transition: transform 0.15s ease;
}
.group-chevron.collapsed {
  transform: rotate(-90deg);
}
.app-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 64px;
  padding: 10px 12px;
}
.app-icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 4px;
}
.app-icon img {
  display: block;
  width: 36px;
  height: 36px;
}
.app-copy {
  flex: 1;
  min-width: 0;
}
.app-name {
  font-size: 14px;
  line-height: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.new-label {
  display: inline-block;
  padding: 0 3px;
  background: var(--app-color-warning);
  color: white;
  font-size: 10px;
  line-height: 14px;
  vertical-align: middle;
}
.app-description {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 20px;
}
.app-item .arco-btn {
  flex: none;
}
.alert-details dl {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  font-size: 14px;
}
.alert-details dt {
  color: var(--color-text-2);
}
.alert-details dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.alert-details p {
  color: var(--color-text-3);
  font-size: 12px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.overview-report:fullscreen {
  display: block;
  padding: 16px;
  overflow: auto;
  background: var(--mt-fill-1);
}
.overview-report:fullscreen > * + * {
  margin-top: 16px;
}
.report-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: block;
  padding: 16px;
  overflow: auto;
  background: var(--mt-fill-1);
}
.report-overlay > * + * {
  margin-top: 16px;
}

/* Skeleton placeholders.
   A gray block reserves the exact box the real content will occupy; the highlight
   is a pseudo-element overlay swept left → right, so the block itself never
   scales, rotates, or changes size. Run the sweep without animating layout. */
.overview-page {
  --sk-base: var(--color-fill-2);
  --sk-shine: var(--app-skeleton-shine);
}
body[arco-theme='dark'] .overview-page {
  --sk-base: var(--color-fill-3);
  --sk-shine: var(--app-skeleton-shine);
}
.sk {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 10px;
  overflow: hidden;
  background: var(--sk-base);
  border-radius: 2px;
  vertical-align: middle;
}
.sk::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 45%;
  background: linear-gradient(90deg, transparent, var(--sk-shine), transparent);
  transform: translateX(-100%);
  animation: sk-sweep 1.4s ease-in-out infinite;
  will-change: transform;
}
@keyframes sk-sweep {
  from { transform: translateX(-100%); }
  to { transform: translateX(320%); }
}
/* Keeps the parent's line box (and therefore its height) while the bar stays thin. */
.sk-slot {
  display: block;
  min-width: 0;
}
.sk-value {
  height: 20px;
  width: 52%;
}
.sk-change {
  height: 10px;
  width: 40%;
}
/* 环比行盒由 12px 文本 + 16px 箭头共同撑到 18.4px；骨架行显式取同高，卡片总高才一致。 */
.sk-change-slot {
  display: flex;
  align-items: center;
  height: 18.4px;
}
.sk-icon {
  display: block;
  flex: none;
  width: 20px;
  height: 20px;
}
.sk-icon-lg {
  display: block;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 4px;
}
.sk-button {
  display: block;
  flex: none;
  width: 56px;
  height: 28px;
}
.sk-chart {
  display: block;
  width: 100%;
  min-width: 680px;
  height: 340px;
  border-radius: 4px;
}
@media (prefers-reduced-motion: reduce) {
  .sk::after {
    animation: none;
    opacity: 0;
  }
  .overview-sidebar,
  .apps-panel-content {
    transition: none;
  }
}
@media (max-width: 1500px) {
  .overview-sidebar {
    --app-sidebar-w: 320px;
  }
  .metric-panel,
  .ecu-panel,
  .alerts-panel {
    padding: 16px;
  }
}
@media (max-width: 1180px) {
  .overview-layout {
    flex-direction: column;
  }
  .overview-sidebar {
    flex: 1 1 auto;
    width: auto;
    --app-sidebar-w: 100%;
  }
  .overview-layout.apps-collapsed .overview-sidebar {
    flex: 1 1 auto;
    width: 0;
    overflow: hidden;
  }
  .apps-collapse-btn {
    display: none;
  }
  .apps-panel.is-collapsed {
    padding: 16px;
  }
  .apps-panel.is-collapsed .apps-panel-content {
    transform: none;
    opacity: 1;
    pointer-events: auto;
  }
}
@media (max-width: 760px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .report-detail-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .overview-page {
    padding: 0;
  }
  .metrics-grid {
    gap: 8px;
  }
  .metric-panel {
    padding: 12px;
  }
  .metric-trend {
    position: static;
    width: 100%;
    margin-top: 12px;
  }
  .mini-bars {
    height: 28px;
  }
  .metric-change {
    font-size: 12px;
  }
}
</style>
