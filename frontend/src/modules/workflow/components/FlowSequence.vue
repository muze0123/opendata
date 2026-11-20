<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPlus, IconDelete, IconRight } from '@arco-design/web-vue/es/icon';
import { newCondition, type WorkflowNode, type NodeKind, type Branch } from '../data/model';
import { nodeLabel, roleLabel } from '../labels';
const props = defineProps<{ nodes: WorkflowNode[]; readonly: boolean; locked?: boolean; root?: boolean; assigneeLabels?: Record<string, string>; templateLabels?: Record<string, string> }>();
const emit = defineEmits<{
  add: [nodes: WorkflowNode[], index: number, kind: NodeKind];
  select: [node: WorkflowNode]; branch: [branch: Branch, node: WorkflowNode]; change: [];
}>();
const { t } = useI18n();
// The supplied node references define this module's categorical palette.
// Keep it local so the approved application theme and design tokens are preserved.
const palette = {
  '--flow-start': '#ff8000', '--flow-execute': '#0bbfc0', '--flow-review': '#0058ff',
  '--flow-cc': '#732bd2', '--flow-application': '#7552d8', '--flow-message': '#f8bc16',
  '--flow-condition': '#b5bdd0', '--flow-parallel': '#6b7280', '--flow-end': '#87919e',
  '--flow-line': '#dedede', '--flow-action': 'var(--app-color-primary)', '--flow-heading': '#ffffff',
};
const groups: { label: string; kinds: NodeKind[] }[] = [
  { label: 'manualGroup', kinds: ['execute', 'review', 'cc'] },
  { label: 'automaticGroup', kinds: ['lims', 'tara'] },
  { label: 'notificationGroup', kinds: ['email', 'sms'] },
  { label: 'branchGroup', kinds: ['condition', 'parallel'] },
];
function summary(node: WorkflowNode) {
  if (['email', 'sms'].includes(node.kind)) return t('workflow.templateSummary', { value: props.templateLabels?.[node.message?.templateId ?? ''] || node.message?.title || t('workflow.select') });
  if (['lims', 'tara'].includes(node.kind) && !node.assignment.ids.length) return t('workflow.automaticGroup');
  if (node.assignment.mode === 'auto') return t('workflow.auto');
  if (node.assignment.mode === 'field') return t('workflow.responsible');
  const value = node.assignment.ids.map(id => node.assignment.mode === 'projectRoles' ? roleLabel(t, id) : props.assigneeLabels?.[id] ?? id).join('、') || t('workflow.select');
  const key = node.assignment.mode === 'projectRoles' ? 'projectRoleSummary' : node.assignment.mode === 'roles' ? 'roleSummary' : 'memberSummary';
  return t(`workflow.${key}`, { value });
}
function addBranch(node: WorkflowNode) {
  node.branches!.splice(-1, 0, { id: crypto.randomUUID(), priority: node.branches!.length, fallback: false, condition: newCondition(), nodes: [] });
  emit('change');
}
function removeBranch(node: WorkflowNode, branch: Branch) {
  node.branches!.splice(node.branches!.indexOf(branch), 1);
  node.branches!.filter(item => !item.fallback).forEach((item, index) => item.priority = index + 1);
  emit('change');
}
</script>
<template>
  <div class="flow-sequence" :class="{ 'flow-root': root }" :style="palette">
    <div v-if="root" class="flow-node start"><strong>{{ t('workflow.start') }}</strong><span>{{ t('workflow.allMembers') }}</span></div>
    <template v-for="index in nodes.length + 1" :key="index">
      <div class="flow-connector">
        <a-dropdown v-if="!readonly && !locked" trigger="click" position="br" :popup-max-height="640" @select="emit('add', nodes, index - 1, $event as NodeKind)">
          <a-button class="flow-add" shape="circle" :aria-label="t('workflow.addNode')"><IconPlus /></a-button>
          <template #content><div class="flow-add-menu"><a-dgroup v-for="group in groups" :key="group.label" :title="t(`workflow.${group.label}`)"><a-doption v-for="kind in group.kinds" :key="kind" :value="kind">{{ nodeLabel(t, kind) }}</a-doption></a-dgroup></div></template>
        </a-dropdown>
      </div>
      <template v-if="nodes[index - 1]">
        <div v-if="nodes[index - 1].branches" class="flow-gateway" :class="nodes[index - 1].kind">
          <a-button v-if="!readonly && !locked" class="branch-add" @click="addBranch(nodes[index - 1])"><IconPlus />{{ nodes[index - 1].kind === 'parallel' ? t('workflow.addParallelBranch') : t('workflow.addConditionBranch') }}</a-button>
          <div class="flow-branches">
            <div v-for="(branch, branchIndex) in nodes[index - 1].branches" :key="branch.id" class="flow-branch">
              <div class="branch-track">
                <div class="branch-card">
                  <button class="branch-body" :disabled="branch.fallback" @click="emit('branch', branch, nodes[index - 1])">
                    <strong><span>{{ branch.fallback ? t('workflow.fallback') : `${nodeLabel(t, nodes[index - 1].kind)}${branchIndex + 1}` }}</span><small v-if="!branch.fallback && nodes[index - 1].kind === 'condition'">{{ t('workflow.priority', { count: branch.priority }) }}</small></strong>
                    <span class="branch-description">{{ branch.fallback ? t('workflow.fallbackHelp') : t('workflow.conditionPrompt') }}<IconRight v-if="!branch.fallback" /></span>
                  </button>
                  <a-button v-if="!readonly && !locked && !branch.fallback && nodes[index - 1].branches!.length > 3" class="branch-delete" type="text" :aria-label="t('workflow.delete')" @click="removeBranch(nodes[index - 1], branch)"><IconDelete /></a-button>
                </div>
                <FlowSequence :nodes="branch.nodes" :readonly="readonly" :locked="locked" :assignee-labels="assigneeLabels" :template-labels="templateLabels" @add="(a, b, c) => emit('add', a, b, c)" @select="emit('select', $event)" @branch="(a, b) => emit('branch', a, b)" @change="emit('change')" />
              </div>
            </div>
          </div>
          <a-button v-if="!readonly && !locked" class="gateway-delete" type="text" :aria-label="t('workflow.delete')" @click="nodes.splice(index - 1, 1); emit('change')"><IconDelete /></a-button>
        </div>
        <div v-else class="flow-node" :class="nodes[index - 1].kind">
          <button class="node-body" @click="emit('select', nodes[index - 1])"><strong>{{ nodes[index - 1].name || nodeLabel(t, nodes[index - 1].kind) }}</strong><span>{{ summary(nodes[index - 1]) }}</span></button>
          <a-button v-if="!readonly && !locked" class="node-delete" type="text" :aria-label="t('workflow.delete')" @click="nodes.splice(index - 1, 1); emit('change')"><IconDelete /></a-button>
        </div>
      </template>
    </template>
    <div v-if="root" class="flow-node end"><strong>{{ t('workflow.end') }}</strong><span>{{ t('workflow.endHelp') }}</span></div>
  </div>
</template>
<style scoped>
.flow-sequence { display: flex; align-items: center; flex-direction: column; min-width: 280px; flex: 1; }
.flow-node { width: 280px; position: relative; border: 1px solid var(--flow-line); border-radius: 8px; background: var(--app-surface-container); overflow: hidden; flex-shrink: 0; }
.flow-node strong { display: block; box-sizing: border-box; min-height: 36px; padding: 7px 16px; background: var(--flow-execute); color: var(--flow-heading); text-align: left; font-size: 16px; line-height: 22px; font-weight: 400; }
.flow-node span { display: block; padding: 16px; color: var(--app-text-primary); text-align: left; font-size: 14px; line-height: 20px; min-height: 20px; overflow-wrap: anywhere; }
.start strong { background: var(--flow-start); }
.review strong { background: var(--flow-review); }
.cc strong { background: var(--flow-cc); }
.lims strong, .tara strong { background: var(--flow-application); }
.email strong, .sms strong { background: var(--flow-message); }
.end strong { background: var(--flow-end); }
.node-body, .branch-body { display: block; font: inherit; border: 0; padding: 0; background: transparent; cursor: pointer; width: 100%; }
.node-body:focus-visible, .branch-body:focus-visible { outline: 2px solid var(--flow-action); outline-offset: -3px; }
.node-delete, .branch-delete { position: absolute; right: 0; top: 2px; color: var(--flow-heading); opacity: 0; }
.flow-node:hover .node-delete, .flow-node:focus-within .node-delete, .branch-card:hover .branch-delete, .branch-card:focus-within .branch-delete { opacity: 1; }
.flow-connector { min-height: 88px; position: relative; display: flex; align-items: center; justify-content: center; flex: 1; }
.flow-root > .flow-connector { flex: none; height: 88px; }
.flow-connector::before { content: ''; position: absolute; top: 0; bottom: 0; width: 2px; background: var(--flow-line); }
.flow-add { z-index: 1; width: 36px; height: 36px; border: 2px solid var(--flow-action); background: var(--app-surface-container); color: var(--flow-action); font-size: 22px; }
.flow-gateway { position: relative; width: max-content; padding-top: 0; }
.branch-add { position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%); z-index: 2; border-radius: 24px; padding-inline: 24px; height: 36px; color: var(--flow-action); border: 1px solid var(--flow-line); background: var(--app-surface-container); }
.flow-branches { display: flex; align-items: stretch; }
.flow-branch { position: relative; display: flex; padding-inline: 20px; }
.flow-branch::before, .flow-branch::after { content: ''; position: absolute; left: 0; right: 0; height: 2px; background: var(--flow-line); }
.flow-branch::before { top: 0; }
.flow-branch::after { bottom: 0; }
.flow-branch:first-child::before, .flow-branch:first-child::after { left: 50%; }
.flow-branch:last-child::before, .flow-branch:last-child::after { right: 50%; }
.branch-track { position: relative; display: flex; align-items: center; flex-direction: column; padding-top: 56px; flex: 1; }
.branch-track::before { content: ''; position: absolute; top: 0; bottom: 0; width: 2px; background: var(--flow-line); }
.branch-card { z-index: 1; width: 300px; position: relative; background: var(--app-surface-container); border: 1px solid var(--flow-line); border-radius: 8px; overflow: hidden; }
.branch-body { text-align: left; }
.branch-body:disabled { cursor: default; color: inherit; opacity: 1; }
.branch-body strong { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 16px; background: var(--flow-condition); color: var(--flow-heading); font-size: 16px; line-height: 22px; font-weight: 400; }
.parallel > .flow-branches > .flow-branch > .branch-track > .branch-card > .branch-body strong { background: var(--flow-parallel); }
.branch-body small { font-size: 13px; white-space: nowrap; }
.branch-description { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 16px; box-sizing: border-box; min-height: 80px; line-height: 20px; font-size: 14px; color: var(--app-text-secondary); }
.branch-description svg { flex-shrink: 0; }
.gateway-delete { position: absolute; top: -16px; right: 0; }
.flow-add-menu { width: 248px; padding: 12px 8px; max-height: min(640px, calc(100vh - 32px)); overflow-y: auto; }
.flow-add-menu :deep(.arco-dropdown-group-title) { padding: 8px 12px; font-size: 14px; color: var(--app-text-muted); line-height: 22px; }
.flow-add-menu :deep(.arco-dropdown-option) { min-height: 40px; padding-inline: 24px; font-size: 14px; }
</style>
