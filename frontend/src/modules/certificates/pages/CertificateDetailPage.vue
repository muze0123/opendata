<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppDetailHeader from '../../../design/components/AppDetailHeader.vue';
import AppStatusTag from '../../../design/components/AppStatusTag.vue';
import { statusRole } from '../../../shared/status';
import { libraryRecords, libraryProjects, libraryTimeline, type LibraryEntry } from '../data/library';

const route = useRoute();
const { t } = useI18n();
const label = (key: string) => t(`certificateLibrary.${key}`);
const statusLabel = (code: string) => t(`certificateLibrary.statuses.${code}`);
const priorityRole = { urgent: 'danger', high: 'warning', medium: 'info', low: 'neutral' } as const;
type TagRole = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
interface DetailField { key: string; label: string; value: string; role?: TagRole }

const current = computed(() => libraryRecords.value.find(row => row.id === route.params.id));
const selectedProject = computed(() => libraryProjects.find(project => project.id === current.value?.project));

const basicFields = computed<DetailField[]>(() => {
  const row = current.value;
  if (!row) return [];
  const fields: DetailField[] = [
    { key: 'project', label: t('certificateLibrary.relatedTask'), value: row.project || '—' },
  ];
  const project = selectedProject.value;
  if (project) {
    for (const key of ['name', 'brand', 'series', 'model', 'priority', 'owner', 'createdAt', 'deadline'] as const) {
      fields.push({
        key: `project-${key}`,
        label: t(`certificateLibrary.taskInfo.${key}`),
        value: key === 'priority' ? t(`certificateLibrary.priorities.${project.priority}`) : project[key] || '—',
        role: key === 'priority' ? priorityRole[project.priority] : undefined,
      });
    }
  }
  return fields;
});

/** 法规与证书：与基础信息一致的只读字段网格；每条法规一组，末尾补证书状态。 */
const regulationGroups = computed<DetailField[][]>(() => {
  const row = current.value;
  if (!row) return [];
  return row.entries.map((entry: LibraryEntry, index): DetailField[] => [
    { key: `regulation-${index}`, label: label('regulation'), value: entry.regulation || '—' },
    { key: `regulationName-${index}`, label: label('regulationName'), value: entry.regulationName || '—' },
    { key: `number-${index}`, label: label('number'), value: entry.number || '—' },
    { key: `name-${index}`, label: label('name'), value: entry.name || row.name || '—' },
    { key: `issuer-${index}`, label: label('issuer'), value: entry.issuer || '—' },
    { key: `agency-${index}`, label: label('agency'), value: entry.agency || '—' },
    { key: `issued-${index}`, label: label('issued'), value: entry.issued || '—' },
    { key: `expires-${index}`, label: label('expires'), value: entry.expires || '—' },
    { key: `status-${index}`, label: label('certificateStatus'), value: statusLabel(row.status), role: statusRole(row.status, 'certificates') },
  ]);
});

const timeline = computed(() => current.value ? libraryTimeline(current.value) : []);
function eventLabel(action: string) { return t(`certificateLibrary.events.${action}`); }
</script>

<template>
  <main class="library-page">
    <AppDetailHeader :ancestor-to="'/data/certificates'" :ancestor-label="label('title')" :current-label="label('detailTitle')" />
    <template v-if="current">
      <section class="detail-block" :aria-label="label('base')">
        <div class="block-header"><h2>{{ label('base') }}</h2></div>
        <dl class="app-detail-list certificate-facts">
          <div v-for="field in basicFields" :key="field.key" class="app-detail-row">
            <dt class="app-detail-label">{{ field.label }}</dt>
            <dd class="app-detail-value">
              <AppStatusTag v-if="field.role" :label="field.value" :role="field.role" />
              <template v-else>{{ field.value }}</template>
            </dd>
          </div>
        </dl>
      </section>

      <section class="detail-block" :aria-label="label('regulations')">
        <div class="block-header"><h2>{{ label('regulations') }}</h2></div>
        <a-empty v-if="!regulationGroups.length" :description="label('emptyRegulations')" />
        <dl
          v-for="(group, groupIndex) in regulationGroups"
          :key="group[0]?.key ?? String(groupIndex)"
          class="app-detail-list certificate-facts"
          :class="{ 'regulation-group': groupIndex > 0 }"
        >
          <div v-for="field in group" :key="field.key" class="app-detail-row">
            <dt class="app-detail-label">{{ field.label }}</dt>
            <dd class="app-detail-value">
              <AppStatusTag v-if="field.role" :label="field.value" :role="field.role" />
              <template v-else>{{ field.value }}</template>
            </dd>
          </div>
        </dl>
      </section>

      <section class="detail-block" :aria-label="label('timeline')">
        <div class="block-header"><h2>{{ label('timeline') }}</h2></div>
        <a-empty v-if="!timeline.length" :description="label('noTimeline')" />
        <a-timeline v-else class="processing-timeline">
          <a-timeline-item v-for="event in timeline" :key="event.id">
            <div class="timeline-heading"><strong>{{ eventLabel(event.action) }}</strong><time>{{ event.time }}</time></div>
            <p>{{ t('certificateLibrary.eventDescription', { actor: event.actor, action: eventLabel(event.action), name: current.name }) }}</p>
            <p v-if="event.comment" class="event-comment">{{ t('certificateLibrary.eventOpinion', { comment: event.comment }) }}</p>
          </a-timeline-item>
        </a-timeline>
      </section>
    </template>
    <a-empty v-else :description="label('notFound')" />
  </main>
</template>

<style scoped>
.library-page { display: grid; align-content: start; gap: var(--mt-ds-space-3); min-width: 0; }
.detail-block { min-width: 0; padding: var(--mt-ds-space-4); background: var(--app-surface); border-radius: var(--mt-ds-control-radius); }
.block-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-3); margin-bottom: var(--mt-ds-space-4); }
h2 { margin: 0; font-size: var(--mt-ds-font-title); line-height: var(--mt-ds-line-title); font-weight: var(--mt-ds-weight-title); }
.certificate-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--mt-ds-space-4); margin: 0; text-align: left; }
.certificate-facts .app-detail-row { display: flex; align-items: baseline; gap: var(--mt-ds-space-2); min-width: 0; }
.certificate-facts dt { flex-shrink: 0; }
.certificate-facts dt, .certificate-facts dd { margin: 0; font-size: var(--mt-ds-font-body); font-weight: var(--mt-ds-weight-body); }
/* 多条法规时组间用细分隔线区分，与 12px 模块节奏一致 */
.certificate-facts.regulation-group { border-top: 1px solid var(--app-divider); padding-top: var(--mt-ds-space-4); }
.timeline-heading { display: flex; align-items: center; flex-wrap: wrap; gap: var(--mt-ds-space-4); }
.timeline-heading time { color: var(--color-text-3); }
.processing-timeline p { margin: var(--mt-ds-space-2) 0 0; line-height: var(--mt-ds-line-body); overflow-wrap: anywhere; }
.event-comment { color: var(--color-text-2); white-space: pre-wrap; }
.processing-timeline :deep(.arco-timeline-item:not(.arco-timeline-item-last)) { padding-bottom: var(--mt-ds-space-6); }
@media (max-width: 900px) { .certificate-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .certificate-facts { grid-template-columns: minmax(0, 1fr); } }
</style>
