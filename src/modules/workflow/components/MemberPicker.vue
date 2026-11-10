<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconPlus } from '@arco-design/web-vue/es/icon';
const props = defineProps<{ modelValue: string[]; users: { id: string; name: string }[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const { t } = useI18n();
const visible = ref(false);
const selection = ref<string[]>([]);
const choices = computed(() => [
  ...props.users.map(user => ({ value: user.id, label: user.name, disabled: false })),
  ...props.modelValue.filter(id => !props.users.some(user => user.id === id)).map(id => ({ value: id, label: id, disabled: false })),
]);
function open() { selection.value = [...props.modelValue]; visible.value = true; }
function confirm() { emit('update:modelValue', [...selection.value]); visible.value = false; }
</script>
<template>
  <div class="member-picker">
    <a-button @click="open"><IconPlus />{{ t('workflow.addMembers') }}</a-button>
    <a-space wrap><a-tag v-for="id in modelValue" :key="id" closable @close="emit('update:modelValue', modelValue.filter(value => value !== id))">{{ users.find(user => user.id === id)?.name ?? id }}</a-tag></a-space>
    <a-modal v-model:visible="visible" :width="'min(640px, calc(100vw - 32px))'" :title="t('workflow.selectMembers')" :mask-closable="false" @ok="confirm">
      <a-transfer class="member-transfer" v-model="selection" :data="choices" show-search :title="[t('workflow.availableMembers'), t('workflow.selectedMembers')]" />
    </a-modal>
  </div>
</template>
<style scoped>
.member-picker { display: grid; width: 100%; gap: 12px; }
.member-picker > .arco-btn { justify-self: start; }
.member-transfer { width: 100%; }
.member-transfer :deep(.arco-transfer-view) { flex: 1; min-width: 0; }
.member-transfer :deep(.arco-transfer-view-list) { max-height: 300px; overflow-y: auto; }
@media (max-width: 600px) {
  .member-transfer { flex-direction: column; gap: 8px; }
  .member-transfer :deep(.arco-transfer-view) { width: 100%; }
  .member-transfer :deep(.arco-transfer-view-list) { max-height: 180px; }
  .member-transfer :deep(.arco-transfer-operations) { flex-direction: row; }
}
</style>
