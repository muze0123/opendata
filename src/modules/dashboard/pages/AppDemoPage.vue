<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from 'vue-i18n';
import { overviewApps } from "../data/overview";

const route = useRoute();
const { t } = useI18n({ useScope: 'global' });
const app = computed(() =>
  overviewApps.find((item) => item.id === route.params.appId)
);
</script>

<template>
  <main class="app-demo-page">
    <div class="app-demo-content" v-if="app">
      <router-link to="/home">{{ t('appDemo.back') }}</router-link>
      <h1>{{ t(`overview.apps.${app.icon}.name`) }}</h1>
      <p>{{ t(`overview.apps.${app.icon}.description`) }}</p>
      <a-alert type="info">{{ t('appDemo.unavailable') }}</a-alert>
    </div>
    <div class="app-demo-content" v-else>
      <h1>{{ t('appDemo.notFound') }}</h1>
      <router-link to="/home">{{ t('appDemo.back') }}</router-link>
    </div>
  </main>
</template>

<style scoped>
.app-demo-page {
  min-height: 100dvh;
  padding: 48px 32px;
  background: var(--mt-fill-1);
}
.app-demo-content {
  max-width: 960px;
  margin: 0 auto;
}
.app-demo-content a {
  color: var(--app-accent);
}
.app-demo-content h1 {
  margin: 32px 0 12px;
  font-size: 24px;
}
.app-demo-content p {
  color: var(--color-text-2);
}
.app-demo-content .arco-alert {
  margin-top: 28px;
}
</style>
