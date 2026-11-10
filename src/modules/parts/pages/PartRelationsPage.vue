<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IconLeft } from '@arco-design/web-vue/es/icon';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePartsStore } from '../stores/parts';
import { developmentLabel, levelLabel } from '../labels';
import { regulationLabel } from '../../regulations/labels';
import type { Regulation } from '../../regulations/data/regulations';
import AppDetailList from '../../../design/components/AppDetailList.vue';
import AppPagination from '../../../design/components/AppPagination.vue';
const route = useRoute();
const { t } = useI18n();
const store = usePartsStore();
const part = computed(() => store.rows.find(item => item.id === route.params.id));
const projects = computed(() => part.value?.relatedProjects ?? []);
const project = computed(() => projects.value.find(item => item.id === route.params.projectId));
const page = ref(1);
const pageSize = ref(10);
watch(() => route.params.id, () => { page.value = 1; });
const pagedProjects = computed(() => projects.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const partFields = computed(() => {
  const record = part.value;
  if (!record) return [];
  return ['code', 'name', 'abbreviation', 'level', 'development', 'supplier', 'material', 'ip', 'owner', 'securityOwner'].map(key => ({
    key, label: t(`parts.${key}`),
    value: key === 'level' ? levelLabel(t, record.level) : key === 'development' ? developmentLabel(t, record.development) : String(record[key as keyof typeof record] || '—'),
  }));
});
// 只展示明确关联的法规记录，法规模块接口接入后由响应填充。
const regulations = computed(() => part.value?.relatedRegulations ?? []);
function regulationFields(record: Regulation) {
  return ['code', 'name', 'region', 'country', 'version', 'status', 'date', 'creator'].map(key => ({
    key, label: t(`regulations.${key}`),
    value: ['region', 'country', 'status'].includes(key) ? regulationLabel(t, String(record[key as keyof Regulation])) : String(record[key as keyof Regulation] || '—'),
  }));
}
const columns = computed(() => [
  ...['projectCode', 'projectName', 'brand', 'series', 'model', 'priority', 'relationStatus'].map((key, index) => ({
    title: t(`parts.${key}`), dataIndex: ['code', 'name', 'brand', 'series', 'model', 'priority', 'status'][index],
    slotName: key === 'priority' ? 'priority' : key === 'relationStatus' ? 'status' : undefined, width: 150,
  })),
  { title: t('parts.actions'), slotName: 'actions', width: 100 },
]);
</script>

<template>
  <main class="part-relations">
    <nav class="relations-toolbar" :aria-label="t('parts.relatedInfo')">
      <router-link class="relations-back" :aria-label="t('parts.back')" :to="route.params.projectId ? `/data/parts/${route.params.id}` : '/data/parts'"><IconLeft /></router-link>
      <a-breadcrumb><a-breadcrumb-item><router-link to="/data/parts">{{ t('parts.title') }}</router-link></a-breadcrumb-item><a-breadcrumb-item v-if="route.params.projectId"><router-link :to="`/data/parts/${route.params.id}`">{{ t('parts.partDetailTitle') }}</router-link></a-breadcrumb-item><a-breadcrumb-item>{{ t(route.params.projectId ? 'parts.projectDetail' : 'parts.relatedInfo') }}</a-breadcrumb-item></a-breadcrumb>
    </nav>
    <template v-if="route.params.projectId">
      <section class="relations-region">
        <h3>{{ t('parts.projectDetail') }}</h3>
        <template v-if="project">
          <AppDetailList :fields="[{ key: 'code', label: t('parts.projectCode'), value: project.code }, { key: 'name', label: t('parts.projectName'), value: project.name }]" />
          <!-- HMG 接入位置。拿到平台路由与授权协议后替换此占位内容。 -->
          <a-empty :description="t('parts.hmgPending')"><template #bottom>{{ t('parts.hmgHelp') }}</template></a-empty>
        </template>
        <a-empty v-else :description="t('parts.projectMissing')" />
      </section>
    </template>
    <template v-else-if="part">
      <section class="relations-region"><h3>{{ t('parts.partInformation') }}</h3><AppDetailList class="relations-fields" :fields="partFields" /></section>
      <section class="relations-region">
        <h3>{{ t('parts.regulationInformation') }}</h3>
        <div v-for="record in regulations" :key="record.id" class="regulation-record"><AppDetailList class="relations-fields" :fields="regulationFields(record)" /></div>
        <a-empty v-if="!regulations.length" :description="t('parts.noRegulations')" />
      </section>
      <section class="relations-region projects-region">
        <h3>{{ t('parts.relatedProjects') }}</h3>
        <a-table :columns="columns" :data="pagedProjects" row-key="id" :pagination="false" :bordered="false" :scroll="{ x: 1150 }">
          <template #priority="{ record }">{{ t(`parts.projectPriorities.${record.priority}`) }}</template>
          <template #status="{ record }">{{ t(`parts.projectStatuses.${record.status}`) }}</template>
          <template #actions="{ record }"><router-link :to="`/data/parts/${part.id}/relations/projects/${record.id}`">{{ t('parts.detail') }}</router-link></template>
          <template #empty><a-empty :description="t('parts.noProjects')" /></template>
        </a-table>
        <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="projects.length" />
      </section>
    </template>
    <section v-else class="relations-region"><a-empty :description="t('parts.missing')" /></section>
  </main>
</template>

<style scoped>
.part-relations { display: grid; gap: var(--mt-ds-space-4); min-width: 0; }
.relations-toolbar { display: flex; align-items: center; gap: var(--mt-ds-space-3); padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.relations-back { display: inline-grid; place-items: center; width: 32px; height: 32px; flex: none; color: var(--color-text-3); border-radius: var(--mt-ds-control-radius); }
.relations-back:hover { color: var(--app-accent); background: var(--color-fill-2); }
.relations-back:focus-visible { outline: 2px solid var(--app-accent); }
/* 面包屑（与证书/法规/零部件详情对齐）：返回按钮与上层层级文本默认灰色、hover 主题高亮；当前页名称黑色。 */
.part-relations .relations-back { color: var(--color-text-3); }
.part-relations .relations-back:hover { color: var(--app-accent); }
.part-relations .relations-toolbar .arco-breadcrumb a { color: var(--color-text-3); }
.part-relations .relations-toolbar .arco-breadcrumb a:hover { color: var(--app-accent); text-decoration: none; }
.part-relations .relations-toolbar .arco-breadcrumb-item:last-child { color: var(--color-text-1); }
.relations-fields { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: var(--mt-ds-space-4); }
.relations-fields :deep(.mt-detail-list__row) { grid-template-columns: minmax(0, 1fr); gap: var(--mt-ds-space-1); align-content: start; text-align: left; }
@media (max-width: 1000px) { .relations-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .relations-fields { grid-template-columns: minmax(0, 1fr); } }
.relations-region { min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
h3 { margin: 0 0 var(--mt-ds-space-4); font-size: var(--mt-ds-font-title); line-height: var(--mt-ds-line-title); font-weight: var(--mt-ds-weight-title); }
a { color: var(--app-accent); font-weight: var(--mt-ds-weight-body); text-decoration: none; }
.regulation-record + .regulation-record { margin-top: var(--mt-ds-space-4); padding-top: var(--mt-ds-space-4); border-top: 1px solid var(--app-divider); }
a:hover { text-decoration: underline; }
.projects-region :deep(.arco-table-th), .projects-region :deep(.arco-table-td) { font-weight: var(--mt-ds-weight-body); }
.projects-region :deep(.arco-table-th) { background: var(--app-table-header); }
</style>
