<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from 'vue-i18n';
import * as echarts from "echarts/core";
import type { EChartsType } from "echarts/core";
import { themeMode } from "../../../design/theme";
import { chartThemeColors } from "../../../design/charts/theme";
import type { OverviewReport } from "../data/overview";

const props = defineProps<{
  reportName: string;
  monthly: OverviewReport["monthly"];
}>();
const { t, locale } = useI18n({ useScope: 'global' });

const chartElement = ref<HTMLElement | null>(null);
let chart: EChartsType | null = null;
let observer: ResizeObserver | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
const activeIndex = ref(0);
const focused = ref(false);
// Line color for the attack-frequency trend, specified by design (#6FD195).
// Scoped to this chart on purpose: the shared series palette stays untouched.
const LINE_COLOR = "#6FD195";

function renderChart() {
  if (!chart) return;
  const color = chartThemeColors[themeMode.value];
  chart.setOption(
    {
      animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      color: [color.series[0], LINE_COLOR],
      grid: { left: 48, right: 20, top: 56, bottom: 44 },
      legend: {
        top: 4,
        right: 4,
        textStyle: { color: color.text, fontSize: 12 },
        itemWidth: 12,
        itemHeight: 8,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: color.tooltip,
        borderColor: color.grid,
        borderWidth: 1,
        textStyle: { color: color.tooltipText, fontSize: 12 },
        axisPointer: { type: "line" },
      },
      xAxis: {
        type: "category",
        data: props.monthly.map((item) => item.month),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: color.axis } },
        axisLabel: { interval: 0, color: color.text, fontSize: 12 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 20,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: color.text, fontSize: 12 },
        splitLine: { lineStyle: { color: color.grid, type: "dashed" } },
      },
      series: [
        {
          name: t('overview.chart.attacks'),
          type: "bar",
          data: props.monthly.map((item) => item.attacks),
          barMaxWidth: 54,
        },
        {
          name: t('overview.chart.index'),
          type: "line",
          data: props.monthly.map((item) => item.index),
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { color: LINE_COLOR, width: 2 },
          itemStyle: {
            borderWidth: 1,
            borderColor: LINE_COLOR,
            color: color.tooltip,
          },
        },
      ],
    },
    { notMerge: true }
  );
}

function createChart() {
  if (!chartElement.value) return;
  chart?.dispose();
  chart = echarts.init(
    chartElement.value,
    themeMode.value === "dark" ? "metritag-dark" : "metritag",
    { renderer: "canvas" }
  );
  renderChart();
}

function showValues(index: number) {
  if (!chart || !props.monthly.length) return;
  activeIndex.value = (index + props.monthly.length) % props.monthly.length;
  chart.dispatchAction({
    type: "showTip",
    seriesIndex: 0,
    dataIndex: activeIndex.value,
  });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  showValues(activeIndex.value + (event.key === "ArrowRight" ? 1 : -1));
}

onMounted(() => {
  createChart();
  observer = new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => chart?.resize(), 80);
  });
  if (chartElement.value) observer.observe(chartElement.value);
});

watch(
  () => props.monthly,
  () => {
    activeIndex.value = 0;
    renderChart();
  }
);
watch(locale, () => {
  renderChart();
  if (focused.value) showValues(activeIndex.value);
});
watch(themeMode, async () => {
  await nextTick();
  createChart();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (resizeTimer) clearTimeout(resizeTimer);
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div class="trend-chart-scroll">
    <div
      ref="chartElement"
      class="trend-chart"
      role="img"
      tabindex="0"
      :aria-label="t('overview.chart.summary', { report: reportName })"
      @focus="
        focused = true;
        showValues(0);
      "
      @blur="
        focused = false;
        chart?.dispatchAction({ type: 'hideTip' });
      "
      @keydown="onKeydown"
    />
    <p class="chart-a11y-value" aria-live="polite">
      <template v-if="focused && monthly[activeIndex]">
        {{ t('overview.chart.value', { month: monthly[activeIndex]?.month, attacks: monthly[activeIndex]?.attacks, index: monthly[activeIndex]?.index }) }}
      </template>
    </p>
  </div>
</template>

<style scoped>
.trend-chart-scroll {
  width: 100%;
  overflow-x: auto;
}
.trend-chart {
  width: 100%;
  min-width: 680px;
  height: 340px;
  outline-offset: 2px;
}
.trend-chart:focus-visible {
  outline: 2px solid var(--app-accent);
}
.chart-a11y-value {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
