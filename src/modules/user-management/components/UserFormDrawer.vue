<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message } from '@arco-design/web-vue';
import { useUserStore } from '../stores/users';
import {
  roles,
  type DepartmentNode,
  type NewUser,
  type UserRecord,
} from '../data/users';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';

const props = defineProps<{
  visible: boolean;
  mode: 'add' | 'edit';
  user: UserRecord | null;
  /** 来自部门 store 的实时部门树，用于「部门」下拉。 */
  deptTreeData: DepartmentNode[];
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'saved'): void;
}>();

const { t } = useI18n();
const store = useUserStore();

interface FormState {
  name: string;
  account: string;
  phone: string;
  email: string;
  deptId: string | undefined;
  roleIds: string[];
  enabled: boolean;
  note: string;
}

const blank: FormState = {
  name: '',
  account: '',
  phone: '',
  email: '',
  deptId: undefined,
  roleIds: [],
  enabled: true,
  note: '',
};

const form = reactive<FormState>({ ...blank });
const submitted = ref(false);
const submitting = ref(false);
const dirty = ref(false);
const discardVisible = ref(false);

/** 编辑态下是否为 owner：owner 状态锁定为启用且不可禁用。 */
const isOwner = computed(() => props.mode === 'edit' && Boolean(props.user?.owner));

/** 部门下拉按「一级 / 二级」展示层级路径，省略企业根节点（与用户详情同一口径）。 */
const deptOptions = computed(() => {
  const list: { id: string; label: string }[] = [];
  const walk = (nodes: DepartmentNode[], parents: string[]) => {
    for (const node of nodes) {
      const chain = [...parents, node.name];
      list.push({ id: node.id, label: chain.length > 1 ? chain.slice(1).join(' / ') : node.name });
      if (node.children?.length) walk(node.children, chain);
    }
  };
  walk(props.deptTreeData, []);
  return list;
});
/** 部门为选填项；未选择时新成员归入企业根部门。 */
const rootDeptId = computed(() => props.deptTreeData[0]?.id ?? 'd0');

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    submitted.value = false;
    submitting.value = false;
    dirty.value = false;
    discardVisible.value = false;
    if (props.mode === 'edit' && props.user) {
      form.name = props.user.name;
      form.account = props.user.account;
      form.phone = props.user.phone;
      form.email = props.user.email;
      form.deptId = props.user.deptId;
      form.roleIds = [...props.user.roleIds];
      form.enabled = props.user.enabled;
      form.note = props.user.note;
    } else {
      Object.assign(form, blank);
      form.deptId = undefined;
      form.roleIds = [];
    }
  },
);

function markDirty() {
  dirty.value = true;
}

const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(form.phone.trim()));
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()));

const errors = computed(() => {
  const map: Record<string, string> = {};
  if (!form.name.trim()) map.name = t('userManagement.form.validation.nameRequired');
  if (!form.account.trim()) map.account = t('userManagement.form.validation.accountRequired');
  else if (store.findByAccount(form.account) && !(props.mode === 'edit' && props.user?.account === form.account.trim())) {
    map.account = t('userManagement.form.validation.accountExists');
  }
  if (form.roleIds.length === 0) map.roleIds = t('userManagement.form.validation.rolesRequired');
  if (!form.email.trim()) map.email = t('userManagement.form.validation.emailRequired');
  else if (!emailValid.value) map.email = t('userManagement.form.validation.emailInvalid');
  if (!form.phone.trim()) map.phone = t('userManagement.form.validation.phoneRequired');
  else if (!phoneValid.value) map.phone = t('userManagement.form.validation.phoneInvalid');
  return map;
});

function handleOk() {
  submitted.value = true;
  if (Object.keys(errors.value).length > 0) return;
  submitting.value = true;
  const payload: NewUser = {
    name: form.name.trim(),
    account: form.account.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    deptId: form.deptId || rootDeptId.value,
    roleIds: [...form.roleIds],
    enabled: isOwner.value ? true : form.enabled,
    joinedAt: props.mode === 'edit' && props.user ? props.user.joinedAt : new Date().toISOString().slice(0, 10),
    lastLogin: props.mode === 'edit' && props.user ? props.user.lastLogin : '',
    note: form.note.trim(),
    owner: props.mode === 'edit' && props.user ? props.user.owner : false,
  };
  window.setTimeout(() => {
    if (props.mode === 'edit' && props.user) {
      store.updateUser(props.user.id, payload);
      Message.success(t('userManagement.form.updated'));
    } else {
      store.addUser(payload);
      Message.success(t('userManagement.form.created'));
    }
    submitting.value = false;
    dirty.value = false;
    emit('update:visible', false);
    emit('saved');
  }, 350);
}

function close() {
  emit('update:visible', false);
}

/** 遮罩 / X / Esc 触发：有未保存改动时弹出放弃确认，否则直接关闭（DESIGN.md 抽屉脏数据守卫）。 */
function onCancel() {
  if (dirty.value) {
    discardVisible.value = true;
  } else {
    close();
  }
}
function confirmDiscard() {
  discardVisible.value = false;
  close();
}
</script>

<template>
  <a-drawer
    :visible="visible"
    :width="500"
    :title="mode === 'edit' ? t('userManagement.form.editTitle') : t('userManagement.form.addTitle')"
    class="um-user-drawer"
    @cancel="onCancel"
  >
    <form class="um-form um-form-group" novalidate @submit.prevent="handleOk">
      <div class="um-field">
        <label class="app-field-label" for="um-name">
          <span class="um-req">*</span>{{ t('userManagement.form.name') }}
        </label>
        <a-input
          id="um-name"
          v-model="form.name"
          :max-length="20"
          show-word-limit
          :placeholder="t('userManagement.form.namePlaceholder')"
          allow-clear
          @input="markDirty"
        />
        <p v-if="submitted && errors.name" class="um-error">{{ errors.name }}</p>
      </div>

      <div class="um-field">
        <label class="app-field-label" for="um-account">
          <span class="um-req">*</span>{{ t('userManagement.form.account') }}
        </label>
        <a-input
          id="um-account"
          v-model="form.account"
          :max-length="50"
          show-word-limit
          :placeholder="t('userManagement.form.accountPlaceholder')"
          allow-clear
          @input="markDirty"
        />
        <p v-if="submitted && errors.account" class="um-error">{{ errors.account }}</p>
      </div>

      <div class="um-field">
        <label class="app-field-label" for="um-dept">{{ t('userManagement.form.department') }}</label>
        <a-select
          id="um-dept"
          v-model="form.deptId"
          :placeholder="t('userManagement.form.departmentPlaceholder')"
          allow-clear
          @change="markDirty"
        >
          <a-option v-for="dept in deptOptions" :key="dept.id" :value="dept.id">{{ dept.label }}</a-option>
        </a-select>
      </div>

      <div class="um-field">
        <label class="app-field-label" for="um-roles">
          <span class="um-req">*</span>{{ t('userManagement.form.roles') }}
        </label>
        <a-select
          id="um-roles"
          v-model="form.roleIds"
          :placeholder="t('userManagement.form.rolesPlaceholder')"
          multiple
          allow-clear
          @change="markDirty"
        >
          <a-option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</a-option>
        </a-select>
        <p v-if="submitted && errors.roleIds" class="um-error">{{ errors.roleIds }}</p>
      </div>

      <div class="um-field">
        <label class="app-field-label" for="um-email">
          <span class="um-req">*</span>{{ t('userManagement.form.email') }}
        </label>
        <a-input
          id="um-email"
          v-model="form.email"
          :max-length="60"
          :placeholder="t('userManagement.form.emailPlaceholder')"
          allow-clear
          @input="markDirty"
        />
        <p v-if="submitted && errors.email" class="um-error">{{ errors.email }}</p>
      </div>

      <div class="um-field">
        <label class="app-field-label" for="um-phone">
          <span class="um-req">*</span>{{ t('userManagement.form.phone') }}
        </label>
        <a-input
          id="um-phone"
          v-model="form.phone"
          :max-length="11"
          :placeholder="t('userManagement.form.phonePlaceholder')"
          allow-clear
          @input="markDirty"
        >
          <template #prefix><span class="um-phone-code">{{ t('userManagement.form.phoneCode') }}</span></template>
        </a-input>
        <p v-if="submitted && errors.phone" class="um-error">{{ errors.phone }}</p>
      </div>
    </form>

    <template #footer>
      <div class="um-form-footer">
        <a-button class="app-btn-neutral" @click="onCancel">{{ t('userManagement.delete.cancel') }}</a-button>
        <a-button type="primary" :loading="submitting" @click="handleOk">
          {{ t('userManagement.form.save') }}
        </a-button>
      </div>
    </template>

    <ConfirmDialog
      :visible="discardVisible"
      :title="t('userManagement.form.discardTitle')"
      :description="t('userManagement.form.discardDesc')"
      :cancel-text="t('userManagement.delete.cancel')"
      :ok-text="t('userManagement.form.discardConfirm')"
      @update:visible="discardVisible = $event"
      @confirm="confirmDiscard"
    />
  </a-drawer>
</template>

<style scoped>
.um-form { display: flex; flex-direction: column; gap: 16px; }
/* 抽屉表面（Fill-1 画布 + 头部/底部白底 + 16px 内边距）由 global.css 的 .um-user-drawer 提供 */
.um-form-group { padding: 16px; background: var(--app-surface); border-radius: 2px; }
.um-field { display: flex; flex-direction: column; gap: 6px; }
/* 标签为普通块级行内文本流：冒号由全局 .app-field-label::after 紧贴字段名渲染，
   不能用 flex + gap（伪元素会被当成独立 flex item，冒号前多出 4px 间隙）。 */
.um-field > label { display: block; font-size: 14px; line-height: 22px; color: var(--color-text-2); }
.um-req { margin-right: 4px; color: rgb(var(--danger-6)); }
.um-error { margin: 0; font-size: 12px; line-height: 20px; color: rgb(var(--danger-6)); }
.um-field :deep(.arco-input-wrapper),
.um-field :deep(.arco-select-view) { width: 100%; }
/* 手机号区号：参考稿里的 +86 灰底小方块 */
.um-field :deep(.um-phone-code) {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  border-right: 1px solid var(--app-control-border);
  background: var(--color-fill-2);
  color: var(--color-text-2);
  font-size: 14px;
}
.um-form-footer { display: flex; justify-content: flex-end; gap: 12px; }
</style>
