<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { useUserProfileStore } from '../../../app/stores/userProfile';
import avatarPlaceholder from '../../../assets/user-avatar-placeholder.svg';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'confirm', avatarUrl: string): void;
}>();

const { t } = useI18n();
const profile = useUserProfileStore();

const inputRef = ref<HTMLInputElement | null>(null);
const preview = ref<string>(profile.profile.avatarUrl || avatarPlaceholder);
const fileName = ref('');
const dragging = ref(false);

watch(
  () => props.visible,
  (open) => {
    if (open) {
      preview.value = profile.profile.avatarUrl || avatarPlaceholder;
      fileName.value = '';
      dragging.value = false;
    }
  },
);

const MAX_SIZE = 2 * 1024 * 1024;
const ACCEPT = ['image/jpeg', 'image/png'];

function pickFile() {
  inputRef.value?.click();
}

function onFile(file: File | undefined) {
  if (!file) return;
  if (!ACCEPT.includes(file.type)) {
    Message.error(t('account.avatarFormatHint'));
    return;
  }
  if (file.size > MAX_SIZE) {
    Message.error(t('account.avatarFormatHint'));
    return;
  }
  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    preview.value = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function onInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  onFile(target.files?.[0]);
  target.value = '';
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  dragging.value = false;
  onFile(event.dataTransfer?.files?.[0]);
}

function confirm() {
  emit('confirm', preview.value);
  emit('update:visible', false);
}
function close() {
  emit('update:visible', false);
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="t('account.changeAvatarTitle')"
    class="account-dialog"
    :width="440"
    @cancel="close"
  >
    <div class="avatar-modal">
      <div class="avatar-preview">
        <a-avatar :size="96"><img :src="preview" alt="" /></a-avatar>
      </div>
      <p class="avatar-hint">{{ t('account.avatarFormatHint') }}</p>
      <div
        class="avatar-drop"
        :class="{ 'is-dragging': dragging }"
        role="button"
        tabindex="0"
        @click="pickFile"
        @keydown.enter.prevent="pickFile"
        @keydown.space.prevent="pickFile"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop="onDrop"
      >
        <input
          ref="inputRef"
          type="file"
          accept="image/jpeg,image/png"
          class="avatar-input"
          @change="onInputChange"
        />
        <p class="avatar-drop-text">{{ t('account.avatarDropHint') }}</p>
        <p v-if="fileName" class="avatar-file">{{ fileName }}</p>
      </div>
    </div>

    <template #footer>
      <a-button class="app-btn-neutral" @click="close">{{ t('designSystem.cancel') }}</a-button>
      <a-button type="primary" @click="confirm">{{ t('account.confirm') }}</a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.avatar-modal { display: flex; flex-direction: column; align-items: center; }
.avatar-preview { display: flex; justify-content: center; margin-bottom: 12px; }
.avatar-hint { margin: 0 0 16px; color: var(--color-text-3); font-size: 13px; line-height: 20px; }
.avatar-drop {
  position: relative;
  width: 100%;
  padding: 24px 16px;
  border: 1px dashed var(--app-control-border);
  border-radius: var(--app-radius-control);
  text-align: center;
  cursor: pointer;
  transition: border-color .2s, background-color .2s;
}
.avatar-drop:hover,
.avatar-drop.is-dragging { border-color: rgb(var(--primary-6)); background: var(--app-primary-light-bg); }
.avatar-input { display: none; }
.avatar-drop-text { margin: 0; color: var(--color-text-2); font-size: 14px; line-height: 22px; }
.avatar-file { margin: 8px 0 0; color: var(--color-text-3); font-size: 12px; line-height: 20px; overflow-wrap: anywhere; }
</style>
