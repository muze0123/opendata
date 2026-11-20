import type { TableColumnData } from '@arco-design/web-vue';

/**
 * 冻结带「列设置」的业务数据列表两端：首列固定左侧、操作列固定右侧，
 * 横向滚动时中间列随列表移动，两端保持不动（用户裁决 2026-11-12）。
 *
 * 适用前提（所有列设置页面均成立）：
 * 1. 首列在列设置中 disabled、不可隐藏也不可被拖到后面；
 * 2. 操作列不参与列设置，硬编码追加为最后一列。
 * 因此 columns[0] 与 columns[last] 的身份恒定，无需按 key 识别。
 *
 * 必须由 Arco Table 的 `fixed` 属性实现，不能用 CSS position: sticky：
 * 表格横向滚动容器会建立新的裁剪上下文，sticky 的 th 会随容器一起滚走。
 * 调用方需提供 `:scroll="{ x: ... }"`（或等效横向滚动容器），并给首列/操作列明确 width。
 *
 * 返回新数组与新对象，不修改调用方持有的列定义（部分页面复用 columnCatalog 中的对象）。
 */
export function freezeEdgeColumns(columns: TableColumnData[]): TableColumnData[] {
  if (columns.length < 2) return columns;
  const last = columns.length - 1;
  return columns.map((column, index) => {
    if (index === 0) return { ...column, fixed: 'left' as const };
    if (index === last) return { ...column, fixed: 'right' as const };
    return column;
  });
}
