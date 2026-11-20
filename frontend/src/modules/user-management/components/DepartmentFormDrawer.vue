<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Message, type ButtonProps } from '@arco-design/web-vue';
import { useDepartmentStore } from '../stores/departments';
import { type Department, type DepartmentNode } from '../data/users';

/** Arco 的 ButtonProps 未声明 class，运行时透传是支持的，这里单独收敛类型。 */
const neutralCancelButtonProps = { class: 'app-btn-neutral' } as unknown as ButtonProps;

const props = defineProps<{
  visible: boolean;
  mode: 'add' | 'edit';
  department: Department | null;
  /** 新建时的默认上级部门（未选部门时回退到根部门）。 */
  parentId: string | null;
  /** 编辑时排除自身及其下级，避免循环上级。 */
  excludeIds: string[];
  /** 来自部门 store 的实时部门树。 */
  deptTreeData: DepartmentNode[];
  /** 是否为「添加子部门」场景：为 true 时新建标题显示为「添加子部门」。 */
  addAsChild?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'saved'): void;
}>();

const { t } = useI18n();
const deptStore = useDepartmentStore();


interface FormState {
  name: string;
  parent: string;
  leaders: string[];
}

const blank: FormState = { name: '', parent: '', leaders: [] };
const form = reactive<FormState>({ ...blank });
const submitted = ref(false);
const submitting = ref(false);

/** 上级部门下拉：排除自身及其下级子树。 */
const parentOptions = computed<DepartmentNode[]>(() => {
  const exclude = new Set(props.excludeIds);
  const depthOf = (id: string): number => {
    const parent = deptStore.getById(id)?.parent;
    return parent ? depthOf(parent) + 1 : 0;
  };
  const contextId = props.mode === 'edit' ? props.department?.id : props.parentId;
  const maxDepth = depthOf(contextId ?? deptStore.rootId);
  const prune = (nodes: DepartmentNode[]): DepartmentNode[] =>
    nodes
      .filter((node) => !exclude.has(node.id) && depthOf(node.id) <= maxDepth)
      .map((node) => ({
        ...node,
        children: node.children.length ? prune(node.children) : [],
      }));
  return prune(props.deptTreeData);
});

const isRoot = computed(() => Boolean(props.department && props.department.parent === null));

function resetForm() {
  if (props.mode === 'edit' && props.department) {
    form.name = props.department.name;
    form.parent = props.department.parent ?? '';
    form.leaders = [...props.department.leaders];
  } else {
    form.name = '';
    form.parent = props.parentId ?? deptStore.rootId;
    form.leaders = [];
  }
  submitted.value = false;
  submitting.value = false;
}

watch(
  () => [props.visible, props.mode, props.department, props.parentId],
  () => {
    if (props.visible) resetForm();
  },
  { immediate: true },
);

const errors = computed(() => {
  const e: { name?: string; parent?: string } = {};
  if (!form.name.trim()) {
    e.name = t('userManagement.department.validation.nameRequired');
  } else if (
    deptStore.departments.some(
      (d) => d.name === form.name.trim() && d.id !== props.department?.id,
    )
  ) {
    e.name = t('userManagement.department.validation.nameExists');
  }
  if (!form.parent) {
    e.parent = t('userManagement.department.validation.parentRequired');
  }
  return e;
});

async function handleOk() {
  if (submitting.value) return;
  submitted.value = true;
  if (errors.value.name || errors.value.parent) return;
  submitting.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      parent: form.parent,
      leaders: [...form.leaders],
    };
    if (props.mode === 'edit' && props.department) {
      deptStore.updateDepartment(props.department.id, payload);
      Message.success(t('userManagement.department.updated'));
    } else {
      deptStore.addDepartment(payload);
      Message.success(t('userManagement.department.created'));
    }
    emit('update:visible', false);
    emit('saved');
  } finally {
    submitting.value = false;
  }
}

/** 居中弹窗：X / 取消直接关闭，不做「放弃未保存修改」二次确认（DESIGN.md · Dialog）。 */
function close() {
  emit('update:visible', false);
}
</script>

<template>
  <a-modal
    :visible="visible"
    :width="640"
    :title="mode === 'edit' ? t('userManagement.department.editTitle') : (addAsChild ? t('userManagement.department.addChild') : t('userManagement.department.addTitle'))"
    :mask-closable="false"
    :ok-text="t('userManagement.department.confirm')"
    :cancel-text="t('userManagement.delete.cancel')"
    :cancel-button-props="neutralCancelButtonProps"
    :ok-loading="submitting"
    class="um-dept-drawer department-dialog"
    @ok="handleOk"
    @cancel="close"
  >
    <form class="um-form" novalidate @submit.prevent="handleOk">
      <div class="um-field">
        <label class="app-field-label" for="um-dept-name">
          <span class="um-req">*</span>{{ t('userManagement.department.name') }}
        </label>
        <a-input
          id="um-dept-name"
          v-model="form.name"
          :max-length="50"
          show-word-limit
          :placeholder="t('userManagement.department.namePlaceholder')"
        />
        <p v-if="submitted && errors.name" class="um-error">{{ errors.name }}</p>
      </div>

      <div class="um-field">
        <label class="app-field-label" for="um-dept-parent">
          <span class="um-req">*</span>{{ t('userManagement.department.parent') }}
        </label>
        <a-tree-select
          id="um-dept-parent"
          v-model="form.parent"
          :data="parentOptions"
          :disabled="isRoot"
          :placeholder="t('userManagement.department.parentPlaceholder')"
          :field-names="{ key: 'id', title: 'name', children: 'children' }"
          tree-default-expand-all
          allow-clear
          :dropdown-style="{ maxHeight: '320px', overflow: 'auto' }"
        />
        <p v-if="submitted && errors.parent" class="um-error">{{ errors.parent }}</p>
      </div>

    </form>
  </a-modal>
</template>

<style scoped>
/* 内容区的上下 24px 由 .department-dialog .arco-modal-body 统一提供，这里不再叠加内边距。 */
.um-form { display: flex; flex-direction: column; gap: 16px; width: 500px; max-width: 100%; margin: auto; }
.um-field { display: flex; flex-direction: column; gap: 6px; }
/* 冒号由全局 .app-field-label::after 紧贴字段名渲染；不采用 flex + gap。 */
.um-field > label { display: block; font-size: 14px; line-height: 22px; color: var(--color-text-2); }
.um-req { margin-right: 4px; color: rgb(var(--danger-6)); }
.um-error { margin: 0; font-size: 12px; line-height: 20px; color: rgb(var(--danger-6)); }
.um-field :deep(.arco-input-wrapper),
.um-field :deep(.arco-select-view),
.um-field :deep(.arco-tree-select-view) { width: 100%; }
</style>
