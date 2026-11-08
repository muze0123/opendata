<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { IconPlus, IconDelete } from "@arco-design/web-vue/es/icon";
import {
  FIELD_CODES,
  newCondition,
  type Condition,
  type Leaf,
} from "../data/model";
import { fieldLabel, valueLabel } from "../labels";
const props = withDefaults(
  defineProps<{
    group: Condition;
    type: string;
    dictionaries: Record<string, string[]>;
    depth?: number;
    readonly?: boolean;
  }>(),
  { depth: 1 },
);
const { t } = useI18n();
const uuid = () => crypto.randomUUID();
function reset(leaf: Leaf) {
  leaf.operator = "";
  leaf.value = "";
}
function operators(field: string) {
  return field === "returnCount"
    ? ["eq", "gt", "gte", "lt", "lte"]
    : ["eq", "ne", "in", "notIn", "empty", "notEmpty"];
}
</script>
<template>
  <div class="condition-group">
    <div class="condition-tools">
      <a-select
        v-model="group.logic"
        :disabled="readonly"
        :aria-label="t('workflow.logic')"
        style="width: 90px"
        ><a-option value="and">{{ t("workflow.and") }}</a-option
        ><a-option value="or">{{ t("workflow.or") }}</a-option></a-select
      ><template v-if="!readonly"
        ><a-button
          size="small"
          @click="
            group.children.push({
              id: uuid(),
              field: '',
              operator: '',
              value: '',
            })
          "
          ><IconPlus />{{ t("workflow.addCondition") }}</a-button
        ><a-button
          v-if="depth < 3"
          size="small"
          @click="group.children.push(newCondition())"
          >{{ t("workflow.addGroup") }}</a-button
        ></template
      >
    </div>
    <div
      v-for="(child, index) in group.children"
      :key="child.id"
      class="condition-child"
    >
      <ConditionEditor
        v-if="'logic' in child"
        :group="child"
        :type="type"
        :dictionaries="dictionaries"
        :depth="depth + 1"
        :readonly="readonly"
      />
      <div v-else class="condition-row">
        <a-select
          v-model="child.field"
          :disabled="readonly"
          :aria-label="t('workflow.field')"
          :placeholder="t('workflow.field')"
          @change="reset(child)"
          ><a-option
            v-for="field in FIELD_CODES.filter(
              (f) =>
                type === 'project' ||
                ['approvalResult', 'returnCount'].includes(f),
            )"
            :key="field"
            :value="field"
            >{{ fieldLabel(t, field) }}</a-option
          ></a-select
        ><a-select
          v-model="child.operator"
          :disabled="readonly || !child.field"
          :aria-label="t('workflow.operator')"
          :placeholder="t('workflow.operator')"
          @change="
            child.value = ['in', 'notIn'].includes(child.operator)
              ? []
              : child.field === 'returnCount'
                ? 0
                : ''
          "
          ><a-option
            v-for="op in operators(child.field)"
            :key="op"
            :value="op"
            >{{ t(`workflow.operators.${op}`) }}</a-option
          ></a-select
        ><a-input-number
          v-if="child.field === 'returnCount'"
          v-model="child.value as number"
          :min="0"
          :precision="0"
          :disabled="readonly"
          :aria-label="t('workflow.value')"
        /><a-select
          v-else
          v-model="child.value as string | string[]"
          :multiple="['in', 'notIn'].includes(child.operator)"
          :disabled="
            readonly ||
            !child.operator ||
            ['empty', 'notEmpty'].includes(child.operator)
          "
          :aria-label="t('workflow.value')"
          :placeholder="t('workflow.value')"
          ><a-option
            v-for="value in dictionaries[child.field] ?? []"
            :key="value"
            :value="value"
            >{{ valueLabel(t, value) }}</a-option
          ></a-select
        >
      </div>
      <a-button
        v-if="!readonly"
        :aria-label="t('workflow.delete')"
        @click="group.children.splice(index, 1)"
        ><IconDelete
      /></a-button>
    </div>
  </div>
</template>
<style scoped>
.condition-group {
  border-left: 2px solid var(--app-color-primary);
  padding: 12px;
  background: var(--app-surface-container);
  min-width: 0;
}
.condition-tools {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.condition-child {
  display: flex;
  gap: 8px;
  align-items: start;
  margin-top: 8px;
}
.condition-child > .condition-group {
  flex: 1;
}
.condition-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
@media (max-width: 700px) {
  .condition-row {
    grid-template-columns: 1fr;
  }
}
</style>
