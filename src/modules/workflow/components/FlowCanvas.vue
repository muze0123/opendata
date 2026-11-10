<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Graph, Shape } from "@antv/x6";
import { IconPlus, IconMinus, IconExpand } from "@arco-design/web-vue/es/icon";
import { useI18n } from "vue-i18n";
import FlowSequence from "./FlowSequence.vue";
import type { WorkflowNode, NodeKind, Branch } from "../data/model";
const props = defineProps<{
  nodes: WorkflowNode[];
  readonly: boolean;
  locked?: boolean;
  root?: boolean;
  assigneeLabels?: Record<string, string>;
  templateLabels?: Record<string, string>;
}>();
const emit = defineEmits<{
  add: [nodes: WorkflowNode[], index: number, kind: NodeKind];
  select: [node: WorkflowNode];
  branch: [branch: Branch, node: WorkflowNode];
  change: [];
}>();
const { t } = useI18n();
const surface = ref<HTMLElement>();
const content = ref<HTMLElement>();
const target = shallowRef<HTMLElement>();
let graph: Graph | undefined;
let observer: ResizeObserver | undefined;
let shape: string | undefined;
// Vue owns business controls and keyboard semantics. X6 owns the viewport,
// transformations and scalable HTML surface, preserving the existing node model.
onMounted(async () => {
  if (!surface.value) return;
  const host = document.createElement("div");
  graph = new Graph({
    container: surface.value,
    autoResize: true,
    panning: { enabled: true, eventTypes: ["leftMouseDown", "mouseWheel"] },
    mousewheel: { enabled: true, modifiers: ["ctrl", "meta"], minScale: 0.35, maxScale: 1.8 },
    interacting: false,
    background: { color: "transparent" },
  });
  shape = `workflow-surface-${crypto.randomUUID()}`;
  Shape.HTML.register({ shape, html: host, effect: [] });
  const node = graph.addNode({
    shape, x: 0, y: 0, width: 280, height: 500,
    html: host,
  });
  target.value = host;
  await nextTick();
  let positioned = false;
  observer = new ResizeObserver(() => {
    if (!content.value || !graph) return;
    node.resize(content.value.offsetWidth, content.value.offsetHeight);
    if (!positioned) {
      graph.translate(Math.max(24, (surface.value!.clientWidth - content.value.offsetWidth) / 2), 24);
      positioned = true;
    }
  });
  if (content.value) observer.observe(content.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  graph?.dispose();
  if (shape) Graph.unregisterNode(shape);
});
function zoom(delta: number) { graph?.zoom(delta, { minScale: 0.35, maxScale: 1.8 }); }
function fit() { graph?.zoomToFit({ padding: 32, maxScale: 1 }); }
</script>
<template>
  <div class="flow-viewport">
    <div ref="surface" class="flow-surface" :aria-label="t('workflow.canvas')" />
    <div class="viewport-tools">
      <a-button :aria-label="t('workflow.zoomIn')" @click="zoom(0.1)"><IconPlus /></a-button>
      <a-button :aria-label="t('workflow.zoomOut')" @click="zoom(-0.1)"><IconMinus /></a-button>
      <a-button :aria-label="t('workflow.fitCanvas')" @click="fit"><IconExpand /></a-button>
    </div>
    <Teleport v-if="target" :to="target">
      <div ref="content" class="flow-content" @mousedown.stop @pointerdown.stop>
        <FlowSequence v-bind="props"
          @add="(a, b, c) => emit('add', a, b, c)"
          @select="emit('select', $event)"
          @branch="(a, b) => emit('branch', a, b)"
          @change="emit('change')" />
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
.flow-viewport { position: relative; height: 680px; min-width: 0; overflow: hidden; }
.flow-surface { width: 100%; height: 100%; }
.flow-content { width: max-content; padding: 24px; color: var(--app-text-primary); }
.viewport-tools { position: absolute; right: 16px; bottom: 16px; display: flex; gap: 8px; }
@media (max-width: 768px) { .flow-viewport { height: 560px; } }
</style>
