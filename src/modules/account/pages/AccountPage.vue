<script setup lang="ts">
import AccountSummary from '../components/AccountSummary.vue';
</script>

<template>
  <div class="account-page"><AccountSummary /></div>
</template>

<style scoped>
.account-page { background: var(--app-surface); padding: 24px; min-height: 360px; }
.account-page :deep(.account-summary) { max-width: 640px; }
@media (max-width: 600px) { .account-page { padding: 12px; } }
</style>
