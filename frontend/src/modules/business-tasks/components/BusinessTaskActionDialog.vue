<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { FieldRule, FormInstance } from '@arco-design/web-vue';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import AppFieldLabel from '../../../design/components/AppFieldLabel.vue';
import AppFormLayout from '../../../design/components/AppFormLayout.vue';
import { actOnTask, TaskApiError } from '../api';
import { allowedActions, useBusinessTaskLabels } from '../labels';
import type { Action, Session, Task, TaskAction } from '../data/contracts';

const props = defineProps<{ visible: boolean; task: Task; session: Session; action: TaskAction }>();
const emit = defineEmits<{ 'update:visible': [value: boolean]; succeeded: [task: Task]; conflict: [] }>();
const { t } = useI18n();
const { actionLabel, errorLabel } = useBusinessTaskLabels();
const model = reactive({ reason: '' });
const form = ref<FormInstance>();
const busy = ref(false);
const error = ref<unknown>();
const needsReason = computed(() => ['return', 'cancel', 'recall'].includes(props.action));
const title = computed(() => t('businessTasks.actionTitle', { action: actionLabel(props.action), name: props.task.title }));
const canSubmit = computed(() => allowedActions(props.task, props.session).includes(props.action));
const rules = computed<FieldRule[]>(() => [{ required: true, message: t('businessTasks.reasonRequired') }, { validator: (value, callback) => callback(String(value ?? '').trim() ? undefined : t('businessTasks.reasonRequired')) }]);
let pending: { body: Action; key: string } | undefined;
watch([() => props.visible, () => props.action, () => props.task.id], () => {
  if (props.visible) { model.reason = ''; error.value = undefined; pending = undefined; void nextTick(() => form.value?.clearValidate()); }
});
watch(canSubmit, allowed => { if (!allowed && !busy.value) close(); });
onBeforeRouteLeave(() => !busy.value);
function close() { if (!busy.value) emit('update:visible', false); }
async function confirm() {
  if (busy.value || !canSubmit.value) return;
  if (needsReason.value && await form.value?.validate()) return;
  const body: Action = { action: props.action, expectedVersion: props.task.version, reason: needsReason.value ? model.reason.trim() : '' };
  if (!pending || JSON.stringify(pending.body) !== JSON.stringify(body)) pending = { body, key: crypto.randomUUID() };
  busy.value = true;
  error.value = undefined;
  try {
    const updated = await actOnTask(props.task.id, pending.body, pending.key);
    emit('succeeded', updated);
    emit('update:visible', false);
    pending = undefined;
  } catch (failure) {
    error.value = failure;
    if (failure instanceof TaskApiError && failure.status >= 400 && failure.status < 500) {
      pending = undefined;
      if (failure.status === 409) emit('conflict');
    }
  } finally { busy.value = false; }
}
</script>

<template>
  <a-modal v-if="needsReason" :visible="visible" :title="title" :width="'var(--mt-ds-confirm-width)'" :modal-style="{ maxWidth: 'calc(100vw - var(--mt-ds-space-5) * 2)' }"
    class="business-action-modal" :closable="!busy" :mask-closable="!busy" :esc-to-close="!busy" @cancel="close">
    <AppFormLayout>
      <a-form ref="form" :model="model" layout="vertical" scroll-to-first-error>
        <a-form-item field="reason" :rules="rules" required>
          <template #label><AppFieldLabel :text="t('businessTasks.reason')" /></template>
          <a-textarea v-model="model.reason" :max-length="2000" :auto-size="{ minRows: 3, maxRows: 7 }"
            :textarea-attrs="{ 'aria-label': t('businessTasks.reason') }" :disabled="busy" />
        </a-form-item>
      </a-form>
    </AppFormLayout>
    <a-alert v-if="error" type="error" :title="errorLabel(error)" />
    <template #footer>
      <a-button class="app-btn-neutral" :disabled="busy" @click="close">{{ t('businessTasks.cancel') }}</a-button>
      <a-button type="primary" :loading="busy" :disabled="!canSubmit" @click="confirm">{{ actionLabel(action) }}</a-button>
    </template>
  </a-modal>
  <ConfirmDialog v-else :visible="visible" :title="title" :description="error ? errorLabel(error) : t('businessTasks.confirmAction')"
    :ok-text="actionLabel(action)" :ok-loading="busy" :dismissible="!busy" :cancel-disabled="busy"
    @update:visible="!$event && close()" @confirm="confirm" />
</template>
