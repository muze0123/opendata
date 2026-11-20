<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import type { UserRecord } from '../data/users';

const props = defineProps<{
  visible: boolean;
  users: UserRecord[];
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'confirm'): void;
}>();

const { t } = useI18n();

const isSingle = computed(() => props.users.length === 1);
const title = computed(() =>
  isSingle.value
    ? t('userManagement.delete.confirmTitle', { name: props.users[0]?.name ?? '' })
    : t('userManagement.delete.batchConfirmTitle', { count: props.users.length }),
);
const description = computed(() =>
  isSingle.value
    ? t('userManagement.delete.desc')
    : t('userManagement.delete.batchDesc'),
);
</script>

<template>
  <ConfirmDialog
    :visible="visible"
    :title="title"
    :description="description"
    :cancel-text="t('userManagement.delete.cancel')"
    :ok-text="t('userManagement.delete.confirm')"
    @update:visible="emit('update:visible', $event)"
    @confirm="emit('confirm')"
  />
</template>
