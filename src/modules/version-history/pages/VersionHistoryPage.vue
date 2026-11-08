<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { products, releases } from '../data/releases';
const { t, te } = useI18n();
const route = useRoute();
const router = useRouter();
const activeProduct = computed(() => products.find(product => product === route.query.product) ?? products[0]);
const visibleReleases = computed(() => activeProduct.value === products[0] ? releases : []);
function selectProduct(product: string | number) {
  void router.push({ query: { ...route.query, product: String(product) } });
}
function noteText(id: string, index: number, fallback: string) {
  const key = `versionHistory.records.${id}.note${index}`;
  return te(key) ? t(key) : fallback;
}
</script>

<template>
  <section class="version-history" :aria-label="t('versionHistory.title')">
    <div class="version-toolbar">
      <a-tabs :active-key="activeProduct" @change="selectProduct">
        <a-tab-pane v-for="product in products" :key="product" :title="product" />
      </a-tabs>
      <div class="current-version">
        <span>{{ t('versionHistory.current') }}</span>
        <strong>{{ activeProduct === products[0] ? 'v1.0.8' : t('versionHistory.unknown') }}</strong>
      </div>
    </div>
    <div v-if="visibleReleases.length" class="release-list">
      <article v-for="release in visibleReleases" :key="release.id" class="release-card">
        <header><h2>{{ release.version }}</h2><time>{{ release.publishedAt }}</time></header>
        <div class="release-body">
          <div class="release-label">{{ t('versionHistory.content') }}</div>
          <ol><li v-for="(note, index) in release.notes" :key="index">{{ noteText(release.id, index, note) }}</li></ol>
        </div>
      </article>
    </div>
    <a-empty v-else :description="t('versionHistory.empty')" />
  </section>
</template>

<style scoped>
.version-history { padding: 16px; background: var(--color-bg-2); min-height: calc(100vh - 88px); }
.version-toolbar { display: flex; align-items: flex-start; gap: 24px; border-bottom: 1px solid var(--color-border-2); margin-bottom: 20px; }
.version-toolbar :deep(.arco-tabs) { flex: 1; min-width: 0; }
.version-toolbar :deep(.arco-tabs-nav::before) { display: none; }
.version-toolbar :deep(.arco-tabs-content) { display: none; }
.current-version { display: flex; gap: 12px; padding-top: 12px; color: var(--color-text-2); white-space: nowrap; }
.current-version strong { color: rgb(var(--primary-6)); font-weight: 500; }
.release-list { display: grid; gap: 12px; }
.release-card { border: 1px solid var(--color-border-2); border-radius: var(--border-radius-small); overflow: hidden; }
.release-card header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; background: var(--color-fill-1); }
.release-card h2 { margin: 0; font-size: 16px; font-weight: 600; line-height: 24px; color: rgb(var(--primary-6)); }
.release-card time, .release-label { color: var(--color-text-3); font-size: 13px; }
.release-body { padding: 16px; }
.release-label { margin-bottom: 8px; }
ol { margin: 0; padding-left: 20px; color: var(--color-text-1); line-height: 22px; overflow-wrap: anywhere; }
@media (max-width: 900px) { .version-toolbar { flex-wrap: wrap; gap: 0; } .version-toolbar :deep(.arco-tabs) { flex-basis: 100%; } .current-version { padding: 0 0 12px; } }
</style>
