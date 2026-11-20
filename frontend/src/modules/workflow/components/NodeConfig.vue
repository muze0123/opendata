<script setup lang="ts">
import { useI18n } from "vue-i18n";
import MemberPicker from "./MemberPicker.vue";
import AttachmentField from "./AttachmentField.vue";
import { computed } from "vue";
import {
  PROJECT_ROLE_CODES,
  type WorkflowNode,
  type Template,
} from "../data/model";
import { roleLabel } from "../labels";
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const props = defineProps<{
  node: WorkflowNode;
  type: string;
  readonly: boolean;
  builtin?: boolean;
  users: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  templates: Template[];
}>();
const emit = defineEmits<{ templates: [] }>();
const { t } = useI18n();
const options = computed(() =>
  props.node.assignment.mode === "members"
    ? props.users
    : props.node.assignment.mode === "roles"
      ? props.roles
      : PROJECT_ROLE_CODES.map((id) => ({ id, name: roleLabel(t, id) })),
);
function applyTemplate(id: string) {
  const item = props.templates.find((v) => v.id === id);
  if (item && props.node.message)
    Object.assign(props.node.message, {
      title: item.title,
      content: item.content,
      attachments: clone(item.attachments),
    });
}
</script>
<template>
  <section v-if="readonly" class="config-block">
    <h2>{{ t("workflow.assignment") }}</h2>
    <dl class="app-detail-list">
      <div class="app-detail-row">
        <dt class="app-detail-label">{{ t("workflow.assignees") }}</dt>
        <dd class="app-detail-value">
          {{
            node.assignment.mode === "auto"
              ? t("workflow.auto")
              : node.assignment.mode === "field"
                ? t("workflow.responsible")
                : node.assignment.ids
                    .map((id) => options.find((v) => v.id === id)?.name ?? id)
                    .join("、") || "—"
          }}
        </dd>
      </div>
      <div v-if="node.kind === 'review'" class="app-detail-row">
        <dt class="app-detail-label">{{ t("workflow.approval") }}</dt>
        <dd class="app-detail-value">
          {{ node.approval === "all" ? t("workflow.all") : t("workflow.any") }}
        </dd>
      </div>
      <template v-if="node.message"
        ><div class="app-detail-row">
          <dt class="app-detail-label">{{ t("workflow.messageTitle") }}</dt>
          <dd class="app-detail-value">{{ node.message.title || "—" }}</dd>
        </div>
        <div class="app-detail-row">
          <dt class="app-detail-label">{{ t("workflow.content") }}</dt>
          <dd class="app-detail-value">{{ node.message.content || "—" }}</dd>
        </div>
        <div class="app-detail-row">
          <dt class="app-detail-label">{{ t("workflow.attachments") }}</dt>
          <dd class="app-detail-value">
            {{ node.message.attachments?.map((f) => f.name).join("、") || "—" }}
          </dd>
        </div></template
      >
    </dl>
  </section>
  <template v-else>
    <section class="config-block">
      <h2>{{ t("workflow.assignment") }}</h2>
      <a-form :model="node" layout="vertical"
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.assignmentType")
            }}</span></template
          ><a-radio-group
            v-model="node.assignment.mode"
            :disabled="readonly || builtin"
            @change="node.assignment.ids = []"
            ><a-radio v-if="type === 'normal'" value="members">{{
              t("workflow.members")
            }}</a-radio
            ><a-radio v-if="type === 'normal'" value="roles">{{
              t("workflow.roles")
            }}</a-radio
            ><a-radio v-if="type === 'project'" value="projectRoles">{{
              t("workflow.projectRole")
            }}</a-radio
            ><a-radio
              v-if="node.kind === 'execute' && builtin"
              :value="node.assignment.mode"
              >{{
                node.assignment.mode === "auto"
                  ? t("workflow.auto")
                  : t("workflow.responsible")
              }}</a-radio
            ></a-radio-group
          ></a-form-item
        ><a-form-item v-if="!['auto', 'field'].includes(node.assignment.mode)"
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.assignees")
            }}</span></template
          ><MemberPicker v-if="node.assignment.mode === 'members'" v-model="node.assignment.ids" :users="users" /><a-select v-else
            :aria-label="t('workflow.assignees')"
            v-model="node.assignment.ids"
            multiple
            allow-search
            :disabled="readonly"
            :placeholder="t('workflow.select')"
            ><a-option
              v-for="option in options"
              :key="option.id"
              :value="option.id"
              >{{ option.name }}</a-option
            ></a-select
          ></a-form-item
        ><a-form-item v-if="node.kind === 'review'"
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.approval")
            }}</span></template
          ><a-radio-group v-model="node.approval" :disabled="readonly"
            ><a-radio value="all">{{ t("workflow.all") }}</a-radio
            ><a-radio value="any">{{
              t("workflow.any")
            }}</a-radio></a-radio-group
          ></a-form-item
        ></a-form
      >
    </section>
    <section v-if="node.message" class="config-block">
      <h2>{{ t("workflow.messageContent") }}</h2>
      <a-radio-group
        v-model="node.message.source"
        type="button"
        :disabled="readonly"
        ><a-radio value="custom">{{ t("workflow.custom") }}</a-radio
        ><a-radio value="template">{{
          t("workflow.messageTemplate")
        }}</a-radio></a-radio-group
      ><a-form :model="node.message" layout="vertical"
        ><a-form-item v-if="node.message.source === 'template'"
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.messageTemplate")
            }}</span></template
          ><a-select
            v-model="node.message.templateId"
            :disabled="readonly"
            :placeholder="t('workflow.select')"
            @change="applyTemplate(String($event))"
            ><a-option
              v-for="item in templates.filter((v) => v.channel === node.kind)"
              :key="item.id"
              :value="item.id"
              >{{ item.name }}</a-option
            ></a-select
          ><a-button @click="emit('templates')">{{
            t("workflow.manageTemplates")
          }}</a-button></a-form-item
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.messageTitle")
            }}</span></template
          ><a-input
            :aria-label="t('workflow.messageTitle')"
            v-model="node.message.title"
            :max-length="20"
            show-word-limit
            :disabled="readonly" /></a-form-item
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.content")
            }}</span></template
          ><a-textarea
            :aria-label="t('workflow.content')"
            v-model="node.message.content"
            :max-length="500"
            show-word-limit
            :disabled="readonly" /></a-form-item
        ><a-form-item
          ><template #label
            ><span class="app-field-label">{{
              t("workflow.attachments")
            }}</span></template
          ><AttachmentField :model-value="node.message.attachments ?? []" @update:model-value="node.message!.attachments = $event" /></a-form-item
        ></a-form
      >
    </section>
  </template>
</template>
<style scoped>
.config-block {
  background: var(--app-surface-container);
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 2px;
}
.config-block h2 {
  font-size: 16px;
  line-height: 24px;
  margin: 0 0 12px;
}
.config-block :deep(.arco-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.config-block :deep(.arco-form) {
  margin-top: 16px;
}
small {
  display: block;
  color: var(--app-text-muted);
}
dl,
dd {
  margin: 0;
}
.config-block h2 {
  padding: 8px 0;
  margin-bottom: 12px;
}
</style>
