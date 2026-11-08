<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  IconPlus,
  IconDelete,
  IconArrowDown,
} from "@arco-design/web-vue/es/icon";
import {
  NODE_CODES,
  newCondition,
  type WorkflowNode,
  type NodeKind,
  type Branch,
} from "../data/model";
import { nodeLabel } from "../labels";
const props = defineProps<{
  nodes: WorkflowNode[];
  readonly: boolean;
  locked?: boolean;
  root?: boolean;
}>();
const emit = defineEmits<{
  add: [nodes: WorkflowNode[], index: number, kind: NodeKind];
  select: [node: WorkflowNode];
  branch: [branch: Branch, node: WorkflowNode];
  change: [];
}>();
const { t } = useI18n();
function addBranch(node: WorkflowNode) {
  node.branches!.splice(-1, 0, {
    id: crypto.randomUUID(),
    priority: node.branches!.length,
    fallback: false,
    condition: newCondition(),
    nodes: [],
  });
  emit("change");
}
</script>
<template>
  <div class="flow-sequence">
    <div v-if="root" class="flow-node start">
      <strong>{{ t("workflow.start") }}</strong
      ><span>{{ t("workflow.allMembers") }}</span>
    </div>
    <template v-for="index in nodes.length + 1" :key="index"
      ><div class="flow-connector">
        <a-dropdown
          v-if="!readonly && !locked"
          trigger="click"
          @select="emit('add', nodes, index - 1, $event as NodeKind)"
          ><a-button shape="circle" :aria-label="t('workflow.addNode')"
            ><IconPlus /></a-button
          ><template #content
            ><a-doption v-for="kind in NODE_CODES" :key="kind" :value="kind">{{
              nodeLabel(t, kind)
            }}</a-doption></template
          ></a-dropdown
        ><IconArrowDown v-else />
      </div>
      <template v-if="nodes[index - 1]"
        ><div class="flow-node" :class="nodes[index - 1].kind">
          <button class="node-body" @click="emit('select', nodes[index - 1])">
            <strong>{{
              nodes[index - 1].name || nodeLabel(t, nodes[index - 1].kind)
            }}</strong
            ><span>{{
              ["condition", "parallel"].includes(nodes[index - 1].kind)
                ? t("workflow.branches")
                : nodes[index - 1].assignment?.mode === "auto"
                  ? t("workflow.auto")
                  : nodes[index - 1].assignment?.mode === "field"
                    ? t("workflow.responsible")
                    : nodes[index - 1].assignment?.ids?.length
                      ? t("workflow.assigned", {
                          count: nodes[index - 1].assignment.ids.length,
                        })
                      : t("workflow.configure")
            }}</span></button
          ><a-button
            v-if="!readonly && !locked"
            class="node-delete"
            type="text"
            :aria-label="t('workflow.delete')"
            @click="
              nodes.splice(index - 1, 1);
              emit('change');
            "
            ><IconDelete
          /></a-button>
        </div>
        <template v-if="nodes[index - 1].branches"
          ><a-button
            v-if="!readonly && !locked"
            @click="addBranch(nodes[index - 1])"
            ><IconPlus />{{ t("workflow.addBranch") }}</a-button
          >
          <div class="flow-branches">
            <div
              v-for="branch in nodes[index - 1].branches"
              :key="branch.id"
              class="flow-branch"
            >
              <button
                class="branch-card"
                @click="
                  !branch.fallback && emit('branch', branch, nodes[index - 1])
                "
              >
                <strong>{{
                  branch.fallback
                    ? t("workflow.fallback")
                    : t("workflow.priority", { count: branch.priority })
                }}</strong
                ><span>{{
                  branch.fallback
                    ? t("workflow.fallbackHelp")
                    : t("workflow.configureCondition")
                }}</span></button
              ><a-button
                v-if="
                  !readonly &&
                  !locked &&
                  !branch.fallback &&
                  nodes[index - 1].branches!.length > 3
                "
                type="text"
                @click="
                  nodes[index - 1].branches!.splice(
                    nodes[index - 1].branches!.indexOf(branch),
                    1,
                  );
                  nodes[index - 1]
                    .branches!.filter((b) => !b.fallback)
                    .forEach((b, i) => (b.priority = i + 1));
                  emit('change');
                "
                >{{ t("workflow.delete") }}</a-button
              ><FlowCanvas
                :nodes="branch.nodes"
                :readonly="readonly"
                :locked="locked"
                @add="(a, b, c) => emit('add', a, b, c)"
                @select="emit('select', $event)"
                @branch="(a, b) => emit('branch', a, b)"
                @change="emit('change')"
              />
            </div></div></template></template
    ></template>
    <div v-if="root" class="flow-node end">
      <strong>{{ t("workflow.end") }}</strong
      ><span>{{ t("workflow.endHelp") }}</span>
    </div>
  </div>
</template>
<style scoped>
.flow-sequence {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 0;
  min-width: 260px;
}
.flow-node {
  width: 252px;
  position: relative;
  border: 1px solid var(--app-divider);
  border-radius: 4px;
  background: var(--app-surface-container);
  overflow: hidden;
  flex-shrink: 0;
}
.flow-node strong {
  display: block;
  padding: 9px 16px;
  background: var(--app-primary-light-bg);
  color: var(--app-text-primary);
  text-align: left;
}
.flow-node span {
  display: block;
  padding: 12px 16px;
  color: var(--app-text-secondary);
  text-align: left;
  font-size: 13px;
}
.start strong {
  background: var(--app-warning-bg);
}
.end strong {
  background: var(--app-fill-2);
}
.node-body {
  font: inherit;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  width: 100%;
}
.node-body:focus-visible,
.branch-card:focus-visible {
  outline: 2px solid var(--app-color-primary);
  outline-offset: -2px;
}
.node-delete {
  position: absolute;
  right: 0;
  top: 3px;
}
.flow-connector {
  height: 64px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
}
.flow-connector:before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--app-divider);
}
.flow-connector > * {
  z-index: 1;
  background: var(--app-surface-container);
}
.flow-branches {
  display: flex;
  border-block: 1px solid var(--app-divider);
  gap: 24px;
  padding: 24px 12px;
  margin-top: 16px;
}
.flow-branch {
  display: flex;
  align-items: center;
  flex-direction: column;
  min-width: 260px;
}
.branch-card {
  width: 252px;
  min-height: 88px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  border: 1px solid var(--app-divider);
  background: var(--app-surface-container);
  padding: 12px;
  border-radius: 4px;
}
.branch-card strong,
.branch-card span {
  display: block;
}
.branch-card span {
  font-size: 12px;
  margin-top: 8px;
  color: var(--app-text-secondary);
}
</style>
