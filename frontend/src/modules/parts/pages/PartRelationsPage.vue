<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePartsStore } from '../stores/parts';
import AppDetailHeader from '../../../design/components/AppDetailHeader.vue';
import AppDetailList from '../../../design/components/AppDetailList.vue';
import AppPagination from '../../../design/components/AppPagination.vue';
import AppStatusTag from '../../../design/components/AppStatusTag.vue';
import { statusRole } from '../../../shared/status';
import { partTimeline, type PartStatus } from '../data/parts';

const route = useRoute();
const { t } = useI18n();
const store = usePartsStore();
const part = computed(() => store.rows.find(item => item.id === route.params.id));
const tasks = computed(() => part.value?.relatedTasks ?? []);
const task = computed(() => tasks.value.find(item => item.id === route.params.taskId));
const timeline = computed(() => part.value ? partTimeline(part.value) : []);
const page = ref(1);
const pageSize = ref(10);
watch(() => route.params.id, () => { page.value = 1; });
const pagedTasks = computed(() => tasks.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const partFields = computed(() => {
  const record = part.value;
  if (!record) return [];
  return ['code', 'name', 'regulationCode', 'certificate', 'certificateNo', 'certificateVersion', 'issueDate', 'model', 'brand', 'versionNote'].map(key => ({
    key, label: t(`parts.${key}`), value: String(record[key as keyof typeof record] || '—'),
  }));
});
function statusLabel(status: PartStatus | '') { return status ? t(`parts.statuses.${status}`) : t('parts.draft'); }
function eventLabel(action: string) { return t(`parts.events.${action}`); }
const columns = computed(() => [
  ...(['taskCode', 'taskName', 'brand', 'series', 'model', 'taskPriority', 'certificateStatus'] as const).map((key, index) => ({
    title: t(`parts.${key === 'taskPriority' ? 'priority' : key === 'certificateStatus' ? 'certificateStatus' : key}`),
    dataIndex: ['code', 'name', 'brand', 'series', 'model', 'priority', 'status'][index],
    slotName: key === 'taskPriority' ? 'priority' : key === 'certificateStatus' ? 'status' : undefined,
    width: 150,
  })),
  { title: t('parts.actions'), slotName: 'actions', width: 100 },
]);
</script>

<template>
  <main class="part-relations">
    <AppDetailHeader
      :ancestor-to="route.params.taskId ? `/data/parts/${route.params.id}/relations` : `/data/parts/${route.params.id}`"
      :ancestor-label="t(route.params.taskId ? 'parts.relatedTasks' : 'parts.partDetailTitle')"
      :current-label="t(route.params.taskId ? 'parts.taskDetail' : 'parts.relatedTasks')"
      :nav-aria-label="t('parts.relatedInfo')"
    />
    <template v-if="route.params.taskId">
      <section class="relations-region">
        <h3>{{ t('parts.taskDetail') }}</h3>
        <template v-if="task">
          <AppDetailList :fields="[{ key: 'code', label: t('parts.taskCode'), value: task.code }, { key: 'name', label: t('parts.taskName'), value: task.name }]" />
          <AppStatusTag :role="statusRole(task.status, 'certificates')" :label="statusLabel(task.status)" class="task-status" />
          <!-- 平台任务接口接入后在此展示任务执行详情。 -->
          <a-empty :description="t('parts.hmgPending')"><template #bottom>{{ t('parts.hmgHelp') }}</template></a-empty>
        </template>
        <a-empty v-else :description="t('parts.taskMissing')" />
      </section>
    </template>
    <template v-else-if="part">
      <section class="relations-region"><h3>{{ t('parts.partInformation') }}</h3><AppDetailList class="relations-fields" :fields="partFields" /></section>
      <section class="relations-region">
        <h3>{{ t('parts.relatedTasks') }}</h3>
        <a-table :columns="columns" :data="pagedTasks" row-key="id" :pagination="false" :bordered="false" :scroll="{ x: 1150 }">
          <template #priority="{ record }">{{ t(`parts.projectPriorities.${record.priority}`) }}</template>
          <template #status="{ record }"><AppStatusTag :role="statusRole(record.status, 'certificates')" :label="statusLabel(record.status)" /></template>
          <template #actions="{ record }"><router-link :to="`/data/parts/${part.id}/relations/tasks/${record.id}`">{{ t('parts.detail') }}</router-link></template>
          <template #empty><a-empty :description="t('parts.noTasks')" /></template>
        </a-table>
        <AppPagination v-model:current="page" v-model:page-size="pageSize" :total="tasks.length" />
      </section>
      <section class="relations-region" :aria-label="t('parts.timeline')">
        <h3>{{ t('parts.timeline') }}</h3>
        <a-empty v-if="!timeline.length" :description="t('parts.noTimeline')" />
        <a-timeline v-else class="processing-timeline">
          <a-timeline-item v-for="event in timeline" :key="event.id">
            <div class="timeline-heading"><strong>{{ eventLabel(event.action) }}</strong><time>{{ event.time }}</time></div>
            <p>{{ t('parts.eventDescription', { actor: event.actor, action: eventLabel(event.action), name: part.name }) }}</p>
            <p v-if="event.comment" class="event-comment">{{ t('parts.eventOpinion', { comment: event.comment }) }}</p>
          </a-timeline-item>
        </a-timeline>
      </section>
    </template>
    <section v-else class="relations-region"><a-empty :description="t('parts.missing')" /></section>
  </main>
</template>

<style scoped>
.part-relations { display: grid; gap: var(--mt-ds-space-4); min-width: 0; }
.relations-fields { grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: var(--mt-ds-space-4); }
.relations-fields :deep(.mt-detail-list__row) { grid-template-columns: minmax(0, 1fr); gap: var(--mt-ds-space-1); align-content: start; text-align: left; }
@media (max-width: 1000px) { .relations-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .relations-fields { grid-template-columns: minmax(0, 1fr); } }
.relations-region { min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
h3 { margin: 0 0 var(--mt-ds-space-4); font-size: var(--mt-ds-font-title); line-height: var(--mt-ds-line-title); font-weight: var(--mt-ds-weight-title); }
a { color: var(--app-accent); font-weight: var(--mt-ds-weight-body); text-decoration: none; }
a:hover { text-decoration: underline; }
.task-status { margin-bottom: var(--mt-ds-space-4); }
.timeline-heading { display: flex; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-4); }
.timeline-heading time { color: var(--color-text-3); }
.processing-timeline p { margin: var(--mt-ds-space-2) 0 0; line-height: var(--mt-ds-line-body); overflow-wrap: anywhere; }
.event-comment { color: var(--color-text-2); white-space: pre-wrap; }
.processing-timeline :deep(.arco-timeline-item:not(.arco-timeline-item-last)) { padding-bottom: var(--mt-ds-space-6); }
.relations-region :deep(.arco-table-th), .relations-region :deep(.arco-table-td) { font-weight: var(--mt-ds-weight-body); }
.relations-region :deep(.arco-table-th) { background: var(--app-table-header); }
</style>
