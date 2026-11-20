export const products = ['天枢', 'LIMS', 'TARA', 'VSOC', 'CSMS'] as const;
export interface Release { id: string; version: string; publishedAt: string; notes: string[] }
export const releases: Release[] = [
  { id: 'r1', version: 'v1.1.3', publishedAt: '2026-08-20 10:00', notes: ['任务管理维修：列表状态操作、执行/审核评估表格优化', '整表模板列质疑增强操作，优化发布说明展示与长文本换行阅读体验', '站内消息同步推送发布摘要，支持按产品线筛选查看'] },
  { id: 'r2', version: 'v1.0.8', publishedAt: '2026-08-20 11:30', notes: ['任务详情/执行/审核与治理系统字段和流程对齐', '补充发布记录、审计轨迹与变更对比说明', '修复部分列表在小分辨率下操作列拥挤问题'] },
  { id: 'r3', version: 'v2.0.0', publishedAt: '2026-08-18 14:05', notes: ['支持提交-审核-结束工作流节点透传与状态同步', '新版版本发布日历与站内消息通知', '导出任务支持留置试题与评估表联合导出；字段枚举缓存优化，标签兼容性提升'] },
  { id: 'r4', version: 'v1.3.2', publishedAt: '2026-08-14 12:15', notes: ['细化任务执行与审核范围授权权限控制', '优化第三方通知通道配置与失败重试提示', '版本历史改为卡片展示，便于阅读较长的发布内容'] },
];
