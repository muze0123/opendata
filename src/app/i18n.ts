import { createI18n } from 'vue-i18n';
import { DEFAULT_LOCALE, readStoredLocale } from './locale';

// 语言相关的常量与校验都在 ./locale，这里只做转出，保持旧引用路径可用
export { LOCALE_KEY } from './locale';

/**
 * 平台初始框架文案表：只包含当前仍在使用的平台级能力与保留模块（审计管理）。
 * 新增/删除文案时须同时维护 zh-CN 与 en-US，pnpm i18n:check 会校验两侧对称。
 */
const i18n = createI18n({
  legacy: false,
  locale: readStoredLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    "zh-CN": {
      designSystem: {"close": "关闭","pagination": {"navigation": "列表分页", "size": "每页条数", "perPage": "{count} 条/页", "previous": "上一页", "next": "下一页", "jump": "跳至", "pages": "/{count} 页"},"language": "切换语言", "theme": "切换主题", "state": "页面状态", "states": {"ready": "正常", "empty": "空数据", "loading": "加载中", "error": "加载失败"}, "keyword": "关键词", "search": "查询", "reset": "重置", "list": "设计模式记录", "total": "共 {count} 条", "edit": "编辑示例", "error": "本地模拟加载失败", "retry": "重试", "id": "编号", "name": "名称", "noMatch": "暂无匹配结果", "empty": "暂无数据", "detail": "详情示例", "saved": "已更新本地示例", "required": "请输入名称", "cancel": "取消", "save": "保存", "discard": "确定放弃修改吗？", "confirm": "确定", "acknowledge": "我知道了"},
account: { title: "账号信息", center: "个人中心", username: "用户名称", name: "用户姓名", department: "所在部门", roles: "所属角色" },
loginExtra: {"method": "登录方式", "passwordTab": "账号密码登录", "emailTab": "邮箱验证码登录", "email": "邮箱", "emailError": "请输入有效邮箱地址", "code": "验证码", "codeError": "验证码无效或已过期，请重新获取", "send": "获取验证码", "resend": "{count} 秒后重试", "slide": "将滑块拖至最右侧完成验证", "verified": "验证通过", "verifyFirst": "请先完成人机验证", "demoCode": "本地模拟验证码为 123456，5 分钟内有效", "mock": "本地演示：邮件发送和滑块验证均为模拟。"},
messageSettings: {"title": "消息设置", "notice": "启用后将收到气泡提醒或消息中心提醒。", "rule": "开启气泡提醒会同时开启消息中心提醒；关闭消息中心提醒会同时关闭气泡提醒。", "bind": "绑定公众号", "center": "消息中心", "name": "消息标题", "description": "消息说明", "bubble": "气泡提醒", "inbox": "消息中心提醒", "channel": "通知方式", "roles": "通知对象", "actions": "操作", "edit": "编辑", "editTitle": "编辑 - {name}", "system": "系统消息", "wechat": "公众号推送", "operator": "所属运营", "supervisor": "运营主管", "admin": "系统管理员", "required": "配置角色不能为空", "saved": "已保存至本地模拟配置", "cancel": "取消", "confirm": "确定", "binding": "微信提醒设置", "placeholder": "二维码待接入", "scan": "请用微信“扫一扫”", "follow": "微信扫码关注“游寄”微信公众号", "features": "绑定微信公众号，您将获得以下功能：", "feature1": "柜机异常、行李超时等消息通知", "feature2": "订单状态变更、退款审核等消息通知", "unavailable": "尚未接入公众号绑定服务，当前无法扫码绑定。", "first": "请先绑定公众号", "hint": "气泡提醒在桌面端显示，5 秒后自动消失。", "type0": "订单分配", "desc0": "订单分配给运营人员后，推送提醒", "type1": "订单转移", "desc1": "订单转移给其他运营人员后，推送提醒", "type2": "柜机异常告警", "desc2": "柜机出现故障或通信异常，推送提醒", "type3": "柜机即将满载", "desc3": "柜机使用率达到 85% 即将满载，推送提醒", "type4": "异常件待处理", "desc4": "产生新的异常件工单，推送提醒", "type5": "异常件处理完成", "desc5": "异常件工单处理完毕，推送提醒", "type6": "退款申请待审核", "desc6": "用户提交退款申请，推送提醒", "type7": "行李寄存到期提醒", "desc7": "行李寄存即将到期（剩余 1 天），推送提醒", "type8": "柜机故障告警", "desc8": "柜机传感器或通信模块故障，推送提醒", "type9": "寄存超时未取件", "desc9": "行李寄存到期后 24 小时仍未取件，推送提醒", "type10": "行李超时未领取", "desc10": "行李寄存到期后 72 小时未领取，升级告警", "type11": "订单超时未完成", "desc11": "订单创建 72 小时后未完成，推送提醒", "type12": "柜机授权即将到期", "desc12": "柜机授权剩余 3 天即将失效，推送提醒", "type13": "柜机授权已失效", "desc13": "柜机授权已失效，柜机不可用，推送提醒"},
versionHistory: {"title": "历史版本", "current": "当前版本", "unknown": "暂无版本", "content": "发布内容", "empty": "暂无发布记录"},
vehicles: {"partCode": "零部件编号", "partName": "零部件名称", "supplier": "所属供应商", "partDetails": "零部件详情", "partView": "详情","basicInfo": "基本信息", "assetInfo": "资产信息", "close": "关闭","directoryActions": "目录操作", "addChild": "新增子目录", "edit": "编辑", "directoryDetail": "目录详情", "editDirectory": "编辑目录", "vinRegex": "VIN 正则", "parts": "关联零部件", "regexError": "正则表达式格式不正确", "duplicateDirectory": "同级目录名称已存在","levelsTitle": "目录层级设置", "save": "保存", "levelsHelp": "保存后按该层级数维护目录；写入数据后配置锁定。", "levelOption": "{count} 级", "title": "车型车辆", "directory": "目录", "levels": "层级设置", "new": "新建", "searchDirectory": "搜索目录名称", "production": "量产车辆", "prototype": "非量产车辆", "code": "VIN / 车辆代号", "created": "资产创建时间", "effective": "生效时间", "operations": "操作", "search": "搜索", "reset": "重置", "create": "新建车辆", "detail": "车辆详情", "empty": "暂无匹配车辆", "confirm": "确定", "cancel": "取消", "region": "资产区域", "owner": "负责人", "description": "资产描述", "required": "请填写必填字段", "duplicate": "车辆标识已存在", "vinError": "请输入17位有效VIN（不含I、O、Q）", "saved": "已保存至本地模拟数据", "newDirectory": "新建一级目录", "directoryName": "目录名称", "locked": "目录已写入数据，层级配置已锁定。", "levelCount": "层级数目"},
parts: {"title": "零部件", "code": "零部件编号", "name": "零部件名称", "abbreviation": "零部件简称", "level": "零部件等级", "development": "开发方式", "supplier": "所属供应商", "material": "物料编号", "ip": "IP", "owner": "产品责任人", "securityOwner": "安全责任人", "actions": "操作", "basic": "基本信息", "versions": "版本信息", "hardware": "硬件版本", "software": "软件版本", "add": "新增", "addHardware": "新增硬件版本", "addSoftware": "新增软件版本", "softwareCount": "{count} 个软件版本", "interfaces": "接口", "protocols": "协议", "projects": "所在项目", "noProjects": "暂无关联项目", "missing": "零部件不存在或已删除", "empty": "暂无数据", "noMatch": "暂无匹配零部件", "initialHelp": "点击“直接创建”将使用系统默认编号规则；点击“自定义编号规则”可自定义设置编号规则，设置后不可更改。", "direct": "直接创建", "customRule": "自定义编号规则", "ruleLock": "编号规则确认后不可更改，请检查编号预览。", "separator": "编号连接符", "digits": "编号数字位数", "fixed": "固定字符", "variable": "可变字符", "year": "固定年份", "sequence": "流水号", "preview": "编号预览", "removeSegment": "移除编号段", "invalidRule": "请至少配置一段编号，使用英文字母或数字", "invalidVariable": "请输入英文字母或数字作为可变字符", "invalidIp": "请输入有效的 IPv4 地址", "required": "请填写必填字段", "duplicate": "名称或编号已存在", "saved": "已保存至本地模拟数据", "scanMock": "已在本地模拟数据中排队，等待接入扫描服务", "search": "搜索", "reset": "重置", "create": "新建零部件", "detail": "详情", "edit": "编辑", "delete": "删除", "confirmDelete": "确定删除此零部件？", "confirmDeleteHardware": "确定删除硬件及其全部软件版本？", "discard": "放弃未保存的修改？", "input": "请输入", "select": "请选择", "all": "全部", "cancel": "取消", "confirm": "确定", "back": "返回", "note": "说明", "sbomMethod": "SBOM 获取方式", "json": "手动上传 JSON", "firmware": "上传固件包", "fileHelp": "支持 JSON / bin / zip / hex，单个文件不超过 20MB", "fileError": "请检查文件类型，单个文件不得超过 20MB", "levels": {"qm": "QM", "asilA": "ASIL A", "asilB": "ASIL B", "asilC": "ASIL C", "asilD": "ASIL D"}, "developments": {"internal": "自研", "purchased": "外购", "joint": "联合开发"}, "scans": {"unconfigured": "未配置", "queued": "等待扫描", "failed": "扫描失败", "available": "SBOM 已回显"}},
"certificates": {"title": "证书", "code": "证书编号", "project": "关联项目", "regulation": "法规编号", "issuer": "签发机构", "authority": "认证机构", "issued": "签发日期", "expires": "有效期至", "status": "状态", "operations": "操作", "search": "搜索", "reset": "重置", "create": "新增证书", "view": "查看", "edit": "编辑", "delete": "删除", "confirmDelete": "确定删除此证书？", "save": "确定", "cancel": "取消", "required": "请填写必填字段", "duplicate": "证书编号已存在", "dateError": "有效期不能早于签发日期", "saved": "保存成功", "empty": "暂无匹配证书", "completed": "已完成", "reviewing": "审核中", "rejected": "驳回", "draft": "待提交"},
"regulations": {"title": "法规", "list": "法规清单", "relations": "关联信息", "code": "法规编号", "name": "法规名称", "region": "区域", "country": "国家", "date": "创建时间", "creator": "创建用户", "version": "最新版本", "status": "状态", "operations": "操作", "id": "编号", "search": "搜索", "reset": "重置", "create": "新增法规", "detail": "查看", "edit": "编辑", "review": "审核", "save": "确定", "cancel": "取消", "note": "版本说明", "attachments": "附件", "required": "请完整填写必填字段", "duplicate": "法规编号已存在", "saved": "已保存至本地模拟数据", "mock": "本地模拟数据，刷新后恢复初始记录", "empty": "暂无匹配法规", "select": "请选择", "discard": "放弃未保存的修改？", "project": "关联项目", "noProjects": "暂无关联项目", "opinion": "审核意见", "decision": "审核结论", "approve": "通过", "reject": "驳回", "fileHelp": "支持 .doc、.docx、.pdf，单个文件不超过 20MB", "fileError": "请上传不超过20MB的 Word 或 PDF 文件", "upload": "选择文件", "remove": "移除", "asia": "亚洲", "europe": "欧洲", "northAmerica": "北美洲", "southAmerica": "南美洲", "africa": "非洲", "oceania": "大洋洲", "china": "中国", "germany": "德国", "usa": "美国", "brazil": "巴西", "southAfrica": "南非", "australia": "澳大利亚", "pending": "未开始", "reviewing": "审核中", "completed": "已完成", "rejected": "已驳回"},
"common": {"confirm": "确定", "cancel": "取消", "acknowledge": "我知道了"},
"numbering": {"modules":{"parts": "资产-零部件", "controllers": "资产-控制器", "vehicles": "资产-车辆", "software": "资产-软件", "interfaces": "资产-接口", "sensors": "资产-传感器", "projects": "项目", "activities": "安全活动", "risks": "风险", "tests": "测试任务", "reports": "测试报告", "documents": "文档"},"location": "使用位置", "fixed": "固定字符", "variable": "可变字符", "year": "固定年份", "digits": "流水号位数", "preview": "预览示例", "empty": "暂无编号规则", "emptyHelp": "待业务模块提供初始配置后显示", "count": "共 {count} 条"},
"workflow": {"filterSettings":"筛选条件设置","more":"更多操作","pagination":"流程列表分页","total":"共 {count} 项数据","pageSize":"每页条数","perPage":"{count} 条/页","previous":"上一页","nextPage":"下一页","jump":"跳至","totalPages":"/ {count} 页","basicInfo":"基本信息","definitionId":"流程编号","version":"版本","title": "流程配置", "definitions": "流程定义", "instances": "运行实例", "business": "安全活动联动", "name": "流程名称", "description": "流程描述", "type": "流程类型", "enabled": "状态", "operations": "操作", "create": "新建流程", "search": "搜索", "reset": "重置", "input": "请输入", "select": "请选择", "every": "全部", "on": "启用", "off": "停用", "columns": "列设置", "show": "显示", "restore": "恢复默认", "density": "列表密度", "normal": "默认", "medium": "适中", "compact": "紧凑", "detail": "详情", "edit": "编辑", "delete": "删除", "deleteConfirm": "确定删除“{name}”？删除后无法恢复。", "empty": "暂无数据", "noMatch": "暂无匹配流程", "builtin": "内置", "cancel": "取消", "confirm": "确定", "next": "下一步", "save": "保存", "saved": "已保存至流程服务", "close": "关闭", "undo": "撤销", "redo": "恢复", "missing": "流程不存在或已删除", "required": "请填写必填字段", "lockedHelp": "内置流程结构锁定，仅允许调整审核节点的项目角色和审批方式。", "canvas": "流程画布", "addNode": "添加节点", "start": "发起", "allMembers": "发起人：全部成员", "end": "结束", "endHelp": "流程结束", "auto": "系统自动完成", "responsible": "责任人（发起时指定）", "assigned": "已指定 {count} 项", "configure": "请配置节点", "branches": "分支路由", "addBranch": "添加分支", "priority": "优先级 {count}", "fallback": "其他情况", "fallbackHelp": "未满足其他分支条件时进入此分支", "configureCondition": "条件配置", "assignment": "人员设置", "assignmentType": "指派方式", "members": "指定人员", "roles": "系统角色", "projectRole": "项目角色", "assignees": "指定人员 / 角色", "approval": "多人审批方式", "all": "会签（所有人同意）", "any": "或签（任一人同意）", "messageContent": "通知内容", "custom": "自定义", "messageTemplate": "消息模板", "manageTemplates": "模板管理", "messageTitle": "标题", "content": "正文", "attachments": "附件", "fileError": "附件仅支持 PDF、PNG、JPG，单个不超过20MB", "attachmentHelp": "附件保存到流程定义；本地服务请求总大小上限100MB。", "saveAsTemplate": "设为模板", "createTemplate": "新建模板", "templateName": "模板名称", "channel": "通知通道", "exclusiveHelp": "按优先级从高到低，仅执行第一个命中的分支。", "parallelHelp": "所有满足条件的分支同时启动，全部完成后汇合。", "order": "优先级 / 展示顺序", "logic": "条件组逻辑", "and": "且", "or": "或", "addCondition": "添加条件", "addGroup": "添加条件组", "field": "字段", "operator": "运算符", "value": "值", "discardTitle": "放弃未保存修改？", "discard": "当前修改尚未保存，离开将丢失修改。", "leave": "放弃并离开", "stay": "继续编辑", "retry": "重试", "refresh": "刷新", "runtimeHelp": "实例使用发起时的流程版本；停用或修改定义不影响在途实例。", "instanceId": "实例编号", "handle": "查看 / 办理", "businessHelp": "本地开发服务：安全活动、风险及站内消息真实持久化；用户与角色仍来自前端模拟组织。", "createActivity": "新建安全活动", "activity": "安全活动", "planEnd": "计划结束日期", "extension": "申请延期", "risk": "添加风险", "risks": "风险记录", "messages": "站内消息", "run": "发起运行", "runHelp": "将创建持久化实例。当前办理身份为本地管理员；角色映射由启动上下文提供。", "currentActor": "当前管理员", "projectOwner": "项目角色映射人员", "days": "延期天数", "riskDescription": "风险描述", "instance": "流程实例", "withdraw": "撤回", "void": "作废", "pending": "当前待办", "comment": "办理意见", "externalPending": "外部适配器未连接，节点等待处理；未发送通知或调用子应用。", "otherAssignee": "此任务指派给其他成员，当前管理员无权代办。", "approve": "通过", "reject": "驳回", "submit": "提交", "return": "退回上一执行节点", "history": "流转记录", "nodes": {"execute": "执行", "review": "审核", "cc": "抄送", "lims": "LIMS", "tara": "TARA", "email": "邮件", "sms": "短信", "condition": "条件分支", "parallel": "并行分支"}, "types": {"normal": "普通模板", "project": "项目模板"}, "projectRoles": {"projectOwner": "项目负责人", "securityOwner": "安全负责人", "activityOwner": "活动负责人", "reviewer": "审核人员"}, "fields": {"approvalResult": "上一节点审批结果", "returnCount": "退回次数", "projectStatus": "项目状态", "projectStage": "项目阶段", "activityStatus": "活动状态"}, "operators": {"eq": "等于", "ne": "不等于", "in": "属于", "notIn": "不属于", "empty": "为空", "notEmpty": "不为空", "gt": "大于", "gte": "大于等于", "lt": "小于", "lte": "小于等于"}, "values": {"planned": "未启动", "active": "进行中", "suspended": "已暂停", "completed": "已完成", "cancelled": "已作废", "concept": "概念阶段", "development": "开发阶段", "prototype": "样件试制", "validation": "验证阶段", "production": "量产阶段", "maintenance": "维护阶段", "pending": "待处理", "overdue": "已逾期", "approved": "通过", "rejected": "驳回", "running": "运行中", "withdrawn": "已撤回", "processing": "处理中", "resolved": "已解除"}, "events": {"externalCompleted":"外部服务已确认完成", "started": "流程已发起", "entered": "进入节点", "autoCompleted": "系统自动完成", "completed": "流程已完成", "approve": "审核通过", "reject": "审核驳回", "rejected": "流程被驳回", "submit": "执行已提交", "return": "退回上一执行", "withdrawn": "申请人已撤回", "cancelled": "流程已作废", "copied": "已生成抄送记录", "externalPending": "等待外部适配器"}, "effects": {"extendActivity": "延期申请已通过", "extensionDeclined": "延期申请未通过", "resolveRisk": "风险已解除", "cc": "流程抄送通知"}, "externalReady":"适配器已配置，可重试执行。", "errors": {"adapterMissing":"未配置外部适配器", "adapterFailed":"外部服务返回失败，可重试", "adapterPending":"外部服务尚未确认完成", "basic": "请检查名称、类型和描述", "duplicate": "名称已存在", "structure": "流程结构不合法", "conditions": "请完整配置条件，条件组不得为空且最多三层", "branches": "分支至少包含两条配置分支和一条固定兜底", "priority": "分支优先级必须唯一且连续", "reviewBeforeExecute": "审核节点的每一条前序路径均须存在执行节点", "assignment": "请完整配置节点人员及审批方式", "message": "请填写模板名称、标题和正文并检查长度", "disabled": "流程已停用，不能发起", "unresolved": "无法解析办理人，请检查启动上下文中的人员和角色映射", "instanceClosed": "实例已结束，不能继续办理", "taskMissing": "待办不存在或已办理", "forbidden": "当前身份无权执行此操作", "unauthorized": "请先登录", "action": "当前动作不允许或已提交意见", "noReturn": "不存在可退回的上一执行节点", "missing": "记录不存在，请刷新", "locked": "启用流程或内置结构不可修改", "referenced": "已被引用，不可删除", "conflict": "版本已变化，请刷新后重新操作", "context": "请检查活动、责任人、延期天数及角色映射", "tooLarge": "请求内容过大，请减少附件", "network": "无法连接流程服务，请运行 pnpm dev:workflow 后重试", "server": "服务处理失败，请重试"}},
"roleManagement": {"title": "角色管理", "name": "角色名称", "description": "角色描述", "operations": "操作", "new": "新建角色", "detail": "角色详情", "edit": "编辑", "editTitle": "编辑角色", "placeholder": "请输入", "search": "搜索", "reset": "重置", "columns": "列设置", "show": "显示", "restore": "恢复默认", "density": "列表密度", "normal": "默认", "medium": "适中", "compact": "紧凑", "more": "更多操作", "delete": "删除", "empty": "暂无匹配角色", "back": "返回", "cancel": "取消", "confirm": "确定", "basic": "基本信息", "permissions": "操作权限", "mock": "本地模拟：权限清单及已开通应用仅供演示，尚未接入真实授权服务；刷新后恢复初始数据。", "level1": "一级功能", "level2": "二级功能", "level3": "三级功能", "required": "请输入角色名称", "nameLimit": "角色名称最多20个字符", "unique": "角色名称已存在", "permissionRequired": "请至少勾选一项操作权限", "saved": "角色已在本地保存", "failed": "保存失败，请检查角色名称和权限后重试", "linked": "角色已关联用户，不可删除", "deleted": "角色已在本地删除", "deleteTitle": "删除角色", "deleteConfirm": "确定删除角色“{name}”吗？删除后无法恢复。", "discardTitle": "离开当前页面", "discard": "存在未保存的修改，离开将丢失这些修改。", "leave": "放弃修改并离开", "stay": "继续编辑", "unavailable": "角色不存在或不允许编辑", "actions": {"view": "查看", "create": "新建", "edit": "编辑", "delete": "删除", "import": "导入", "export": "导出"}, "modules": {"home": "首页概览", "tasks": "任务中心", "data": "基础数据库", "settings": "系统设置", "users": "用户管理", "roles": "角色管理", "audit": "审计管理", "workspace": "工作空间", "projects": "项目管理"}},
      "departments": {"title": "部门管理", "add": "添加部门", "child": "添加子部门", "editTitle": "编辑部门", "expand": "展开 / 收起全部", "name": "部门名称", "parent": "上级部门", "searchPlaceholder": "搜索部门", "count": "部门人数", "actions": "操作", "edit": "编辑", "delete": "删除", "more": "更多操作", "empty": "暂无搜索结果", "required": "请输入部门名称", "duplicate": "部门名称已存在", "invalid": "请选择有效上级部门", "length": "最多20字", "confirm": "确定", "cancel": "取消", "created": "部门已添加", "updated": "部门已更新", "blockedTitle": "无法删除", "blocked": "部门「{name}」下还有 {count} 名成员，请先转移成员后再删除。", "ack": "我知道了", "deleteTitle": "确认删除该部门吗？", "deleteBody": "将删除「{name}」及其 {count} 个子部门，删除后不可恢复。", "deleted": "部门已删除", "sorted": "排序已更新", "siblings": "仅支持同级部门间排序", "demo": "本地演示：修改与用户管理联动，保存在当前会话。", "toggle": "展开或收起 {name}", "placeholder": "搜索部门名称", "keyboard": "使用 Alt + 上下方向键调整同级顺序"},
      "overview": {
        reportRegion: '首页报表', loading: '正在加载概览数据', loaded: '概览数据已加载', threat: '威胁情报', intelligenceClickHint: '点击查看威胁情报平台', intelligenceComingSoon: '威胁情报平台跳转能力待打通，后续将新开标签页打开。', selectReport: '选择报表', currentReport: '当前报表：{report}',
        fullscreen: '全屏', exitFullscreen: '退出全屏', activationSuccess: '已激活，可启动应用',
        popupBlocked: '浏览器阻止了新标签页，请允许弹出窗口后重试',
        reports: { default: '默认报表', vehicle: '车辆安全报表' },
        metrics: { vulnerabilities: '网络安全漏洞', blockedAttacks: '今日拦截攻击', securityScore: '车辆安全评分', r155Compliance: 'R155 合规率' },
        descriptions: {
          default: { vulnerabilities: '当前收录的网络安全漏洞数量', blockedAttacks: '今日累计拦截攻击次数', securityScore: '车辆安全综合评分，满分 100 分', r155Compliance: '符合 R155 要求的车辆占比' },
          vehicle: { vulnerabilities: '车辆安全范围内的漏洞数量', blockedAttacks: '车辆安全范围内今日拦截攻击次数', securityScore: '车辆安全综合评分，满分 100 分', r155Compliance: '车辆安全范围内符合 R155 要求的车辆占比' },
        },
        change: '环比 {value}', miniTrend: '{metric}趋势示意',
        ecuTitle: '受影响ECU排行', ecuHelp: '按受影响次数从高到低展示', ecuHelpLabel: '排行说明',
        ecu: { gateway: 'Gateway（网关）', ivi: 'IVI（车机）', telematics: 'Telematics（T-Box）' },
        alertsTitle: '最新告警流水', alertsHelp: '当前报表的最近告警记录', alertsHelpLabel: '告警说明',
        severity: '级别', time: '时间', event: '事件', action: '操作', details: '详情', viewAlert: '查看 {event} 告警详情',
        chart: { title: '攻击频次趋势', help: '2025 年月度攻击次数及趋势指数', helpLabel: '趋势说明', attacks: '攻击次数', index: '趋势指数', summary: '{report}，2025 年每月攻击次数与趋势指数。聚焦后使用左右方向键查看每月数值。', value: '{month}：攻击次数 {attacks}，趋势指数 {index}。' },
        sidebar: '通知与应用', noticesTitle: '通知', more: '更多', appsTitle: '应用', mine: '我的应用', moreApps: '更多应用', start: '启动', activate: '激活', startApp: '启动{app}', activateApp: '激活{app}',
        notices: {
          system: { title: '系统消息', description: '系统安全巡检已完成，请查看最新检测结果。' },
          overdue: { title: '任务逾期', description: '安全评估任务已超过处理时限，请及时处理。' },
          alert: { title: '事件告警', description: '监测到车辆网络安全事件，请查看详情。' },
        },
        apps: {
          csms: { name: 'CSMS网络安全平台', description: '网络安全管理与合规工作台' },
          vsoc: { name: '威胁情报分析平台', description: '威胁情报分析与告警处置' },
          tara: { name: '天鉴TARA分析工具', description: '车辆威胁分析与风险评估' },
          operations: { name: '车联网安全运营中心', description: '车联网安全运营分析' },
        },
        drawer: { title: '告警详情', id: '告警编号', severity: '告警级别', time: '发生时间', event: '事件', vehicle: '关联车辆', testVehicle: '测试车辆 •••• {suffix}' },
      },
      mc: {"title": "消息中心", "notifications": "消息通知", "announcements": "系统公告", "simulate": "模拟新消息（本地）", "settings": "消息设置", "exception": "异常监控", "reminder": "消息提醒", "all": "全部", "total": "共计 {count} 条消息", "onlyUnread": "只看未读消息", "markAll": "一键已读（{count}）", "release": "版本更新", "releaseDetail": "数据目录检索体验优化。\\n新增数据质量检查结果汇总。", "read": "已读", "unread": "未读", "empty": "暂无消息，请调整筛选条件", "view": "查看消息", "arrival": "收到新的站内消息", "types": {"sync_failed": "同步失败", "quality_alert": "质量告警", "license_expiring": "授权即将到期", "task_assigned": "任务分配", "export_ready": "导出完成", "review_pending": "审核待处理"}, "details": {"sync_failed": "数据同步未完成，请检查连接配置后重试。", "quality_alert": "数据质量检查发现异常，请查看检查结果。", "license_expiring": "数据访问授权即将到期，请及时处理。", "task_assigned": "你收到新的数据处理任务，请及时查看。", "export_ready": "数据导出已完成，请前往任务中心查看。", "review_pending": "数据申请等待审核，请及时处理。"}},
      "messageCenter": { title: '消息中心', filter: '筛选消息类型', all: '全部消息', empty: '当前筛选下暂无消息' },
      "notices": {
        "system": "系统消息",
        "license": "许可证将于 30 日后到期，请及时续期。",
        "overdue": "任务逾期",
        "overdueDetail": "有任务已超过处理时限，请及时处理。",
        "alert": "事件告警",
        "alertDetail": "有一条 HIGH 级别告警待处理。"
      },
      "pending": {
        "description": "该功能模块正在规划中，待后续版本开放。"
      },
      "login": {
        "title": "登录开放数据平台",
        "username": "用户名",
        "usernamePlaceholder": "请输入用户名",
        "password": "密码",
        "passwordPlaceholder": "请输入密码",
        "remember": "记住我",
        "submit": "登录",
        "success": "登录成功",
        "invalid": "用户名或密码错误",
        "brandTitle": "汇聚全域数据，释放开放价值",
        "subtitle": "面向业务与安全合规的一站式数据开放服务平台"
      },
      "shell": {
        "appName": "开放数据平台",
        "navigation": "主导航",
        "logout": "退出登录",
        "theme": "主题",
        "light": "浅色",
        "dark": "深色",
        "language": "语言",
        "chinese": "简体中文",
        "english": "English",
        "notifications": "通知",
        "noNotifications": "暂无通知",
        "dismiss": "移除通知",
        "collapseSidebar": "收起侧栏",
        "expandSidebar": "展开侧栏"
      },
      "assistant": {
        "title": "AI 助手",
        "open": "打开 AI 助手",
        "close": "关闭 AI 助手",
        "send": "发送",
        "placeholder": "输入问题...",
        "welcome": "你好，有什么可以帮助你的吗？",
        "question": "今天有哪些待处理任务？",
        "tasks": "导入导出中有 3 条进行中的导入/导出任务，可在导入导出面板查看进度。",
        "unavailable": "AI 助手服务暂不可用，请稍后再试。"
      },
      "audit": {
        "listTitle": "审计记录",
        "filters": {
          "time": "操作时间",
          "actor": "操作人",
          "actionType": "操作类型",
          "module": "操作模块",
          "result": "结果",
          "keyword": "关键字",
          "keywordPlaceholder": "搜索编号、对象、摘要或操作人",
          "search": "查询",
          "reset": "重置",
          "all": "全部",
          "settings": "筛选设置",
          "show": "显示 ",
          "restore": "恢复默认"
        },
        "columns": {
          "time": "操作时间",
          "actor": "操作人",
          "module": "操作模块",
          "actionType": "操作类型",
          "target": "操作对象",
          "summary": "操作摘要",
          "result": "结果",
          "actions": "操作",
          "settings": "列设置"
        },
        "actions": {
          "detail": "详情",
          "export": "导出",
          "close": "关闭"
        },
        "results": {
          "success": "成功",
          "failure": "失败"
        },
        "actionTypes": {
          "login": "登录",
          "view": "查看",
          "create": "新建",
          "update": "修改",
          "delete": "删除",
          "import": "导入",
          "export": "导出",
          "review": "审核",
          "grant": "授权",
          "config": "配置"
        },
        "modules": {
          "account": "账号与角色",
          "grant": "功能授权",
          "audit": "审计管理",
          "message": "消息中心",
          "system": "系统设置"
        },
        "roles": {
          "admin": "管理员",
          "officer": "专员",
          "owner": "业务负责人"
        },
        "detail": {
          "title": "审计详情",
          "id": "审计编号",
          "time": "操作时间",
          "actor": "操作人",
          "module": "操作模块",
          "actionType": "操作类型",
          "target": "操作对象",
          "summary": "操作摘要",
          "result": "结果"
        },
        "table": {
          "empty": "暂无审计记录",
          "noMatch": "没有符合筛选条件的审计记录",
          "pageSize": "每页条数",
          "navigation": "审计记录分页"
        },
        "pagination": {
          "total": "共 {count} 条记录",
          "perPage": "{count} 条/页",
          "previous": "上一页",
          "next": "下一页",
          "jumpTo": "跳至",
          "totalPages": "/{count} 页"
        },
        "currentUser": "当前用户",
        "export": {
          "empty": "当前筛选没有可导出的审计记录",
          "fail": "导出失败，请重试"
        },
        "exportNotice": {
          "title": "导出提示",
          "line1": "本次将导出所选时间范围内的所有审计记录",
          "line2": "导出结果可以在「导入导出–下载任务」中查看和下载。",
          "cancel": "取消",
          "confirm": "确认导出",
          "created": "导出任务已创建，请在「导入导出–下载任务」中下载"
        }
      },
      "taskCenter": {
        "title": "导入导出",
        "tabs": {
          "import": "导入任务",
          "download": "下载任务"
        },
        "filters": {
          "module": "任务模块",
          "operator": "操作人",
          "time": "操作时间",
          "all": "全部",
          "startDate": "开始时间",
          "endDate": "结束时间",
          "search": "查询",
          "reset": "重置"
        },
        "note": "说明：导出数据在系统平台内记录最多保留 30 天，30 天后自动清除。",
        "columns": {
          "module": "模块",
          "file": "文件名称",
          "operator": "操作人",
          "time": "操作时间",
          "stage": "任务阶段",
          "actions": "操作"
        },
        "stages": {
          "processing": "处理中 {progress}%",
          "importSuccess": "总数{total}条，成功{ok}条，失败{fail}条",
          "partialFailPrefix": "总数{total}条，成功{ok}条，",
          "partialFailCount": "失败{fail}条",
          "importFailed": "导入失败",
          "exportSuccess": "导出成功",
          "exportFailed": "导出失败",
          "expired": "文件已过期，无法下载"
        },
        "actions": {
          "downloadFile": "下载文件",
          "downloadErrorData": "下载错误数据",
          "noOperation": "——"
        },
        "empty": {
          "noRecord": "暂无数据",
          "noMatch": "搜索不到相关内容"
        },
        "pagination": {
          "navigation": "导入导出分页",
          "total": "共 {count} 条记录",
          "perPage": "{count} 条/页",
          "pageSizeAria": "每页条数",
          "previous": "上一页",
          "next": "下一页",
          "jumpTo": "跳至",
          "totalPages": "/{count} 页",
          "invalidPage": "请输入有效页码"
        },
        "fileNames": {
          "import": "导入数据",
          "export": "导出",
          "importError": "导入错误数据"
        },
        "modules": {
          "account": "账号与角色",
          "grant": "功能授权",
          "audit": "审计管理",
          "message": "消息中心",
          "system": "系统设置"
        },
        "feedback": {
          "startDownload": "开始下载"
        }
      },
      "nav": {
        "home": "首页概览",
        "tasks": "任务中心",
        "data": "基础数据库",
        "systemSettings": "系统设置",
        "settings": {
          "users": "用户管理",
          "departments": "部门管理",
          "roles": "角色管理",
          "workflow": "流程配置",
          "numbering": "编号规则",
          "audit": "审计管理"
        }
      },
      "userManagement": {
        "listBlockTitle": "成员列表",
        "summary": {
          "total": "总人数 {count}",
          "direct": "部门人数 {count}"
        },
        "toolbar": {
          "searchPlaceholder": "搜索姓名、账号、手机号或邮箱",
          "search": "搜索",
          "reset": "重置",
          "add": "添加用户",
          "import": "导入",
          "export": "导出",
          "role": "角色",
          "status": "状态",
          "scope": "数据范围",
          "createdBy": "创建人",
          "createdAt": "创建时间",
          "startDate": "开始时间",
          "endDate": "结束时间",
          "allMembers": "全部成员",
          "directMembers": "仅直属成员",
          "keyword": "关键词",
          "filterSettings": "筛选设置",
          "columnSettings": "列设置",
          "show": "显示",
          "restoreDefaults": "恢复默认",
          "all": "全部",
          "batchEnable": "批量启用",
          "batchDisable": "批量禁用",
          "batchDelete": "批量删除",
          "selected": "已选 {count} 项",
          "clearSelection": "清空",
          "batchEnabled": "已启用 {count} 个用户",
          "batchDisabled": "已禁用 {count} 个用户",
          "ownerSkipped": "主管理员不可操作，已自动跳过 {count} 项"
        },
        "columns": {
          "account": "登录账号",
          "user": "姓名",
          "contact": "联系方式",
          "department": "部门",
          "role": "角色",
          "email": "邮箱",
          "phone": "手机号",
          "status": "状态",
          "lastLogin": "最近登录",
          "createdBy": "创建人",
          "createdAt": "创建时间",
          "actions": "操作"
        },
        "status": {
          "enabled": "启用",
          "disabled": "禁用",
          "control": "切换用户「{name}」的启用状态",
          "enabledToast": "已启用该用户",
          "disabledToast": "已禁用该用户"
        },
        "actions": {
          "view": "查看",
          "edit": "编辑",
          "delete": "删除",
          "resetPassword": "重置密码"
        },
        "resetPassword": {
          "title": "确认重置该用户「{name}」密码吗？",
          "desc": "重置密码，系统将生成随机密码并发送至该用户邮箱",
          "success": "已重置「{name}」的密码，随机密码已发送至用户邮箱"
        },
        "detail": {
          "title": "用户详情",
          "basicInfo": "基本信息",
          "name": "姓名",
          "account": "登录账号",
          "phone": "手机号",
          "email": "邮箱",
          "department": "部门",
          "roles": "角色",
          "createdBy": "创建人",
          "createdAt": "创建时间",
          "status": "状态",
          "owner": "主管理员",
          "joinedAt": "加入时间",
          "lastLogin": "最近登录",
          "note": "备注",
          "none": "未填写"
        },
        "form": {
          "addTitle": "添加用户",
          "editTitle": "编辑用户",
          "name": "姓名",
          "account": "登录账号",
          "phone": "手机号",
          "phoneCode": "+86",
          "email": "邮箱",
          "department": "部门",
          "roles": "角色",
          "status": "状态",
          "enabled": "启用",
          "disabled": "禁用",
          "note": "备注",
          "save": "保存",
          "namePlaceholder": "请输入",
          "accountPlaceholder": "请输入",
          "phonePlaceholder": "请输入",
          "emailPlaceholder": "请输入",
          "departmentPlaceholder": "请选择",
          "rolesPlaceholder": "请选择",
          "notePlaceholder": "可填写备注信息",
          "ownerHint": "主管理员账号不可禁用或删除",
          "created": "用户已创建",
          "updated": "用户已更新",
          "discardTitle": "放弃编辑",
          "discardDesc": "当前有未保存的修改，确定要放弃吗？",
          "discardConfirm": "放弃",
          "validation": {
            "nameRequired": "请输入姓名",
            "accountRequired": "请输入登录账号",
            "accountExists": "登录账号已存在",
            "phoneRequired": "请输入手机号",
            "phoneInvalid": "手机号格式不正确",
            "emailRequired": "请输入邮箱",
            "emailInvalid": "邮箱格式不正确",
            "rolesRequired": "请至少选择一个角色",
            "deptRequired": "请选择所属部门"
          }
        },
        "import": {
          "title": "导入用户",
          "downloadTemplate": "下载模板",
          "templatePreparing": "正在准备模版…",
          "templateRetry": "模版生成失败，点击重试",
          "upload": "上传文件",
          "uploadHint": "点击上传，或将文件拖拽到此处",
          "reupload": "重新上传",
          "confirm": "导入",
          "parsing": "正在解析文件…",
          "invalidFile": "仅支持 .xlsx 格式的模版文件",
          "emptyFile": "文件中没有可导入的数据行",
          "validSummary": "可导入 {count} 行",
          "invalidSummary": "{count} 行存在问题",
          "success": "成功导入 {count} 条用户",
          "fail": "导入失败，请检查文件格式",
          "notesTitle": "注意事项",
          "note1": "仅支持 .xlsx 格式，单次导入建议不超过 1000 行。",
          "note2": "请按模版列顺序填写，导入前系统会校验必填项与格式。",
          "columnHint": "模板列：姓名、登录账号、手机号、邮箱、所属部门、角色、状态"
        },
        "export": {
          "empty": "当前筛选没有可导出的用户",
          "fail": "导出失败，请重试",
          "notice": {
            "title": "导出提示",
            "line1": "本次将导出当前筛选条件下的所有用户",
            "line2": "导出文件将自动下载到本地，请留意浏览器下载。",
            "cancel": "取消",
            "confirm": "确认导出",
            "created": "用户列表已导出，文件已开始下载"
          }
        },
        "delete": {
          "title": "删除用户",
          "confirmTitle": "确认删除用户「{name}」吗？",
          "batchConfirmTitle": "确认删除选中的 {count} 个用户吗？",
          "desc": "删除后，该用户将无法登录，此操作不可恢复。",
          "batchDesc": "删除后，这些用户将无法登录，此操作不可恢复。",
          "cancel": "取消",
          "confirm": "确定",
          "success": "已删除所选用户"
        },
        "table": {
          "empty": "暂无用户",
          "noMatch": "没有符合筛选条件的用户",
          "pageSize": "每页条数",
          "navigation": "用户列表分页"
        },
        "pagination": {
          "total": "共 {count} 条记录",
          "perPage": "{count} 条/页",
          "previous": "上一页",
          "next": "下一页",
          "jumpTo": "跳至",
          "totalPages": "/{count} 页"
        },
        "department": {
          "orgTitle": "组织架构",
          "menuAria": "组织架构操作",
          "name": "部门名称",
          "namePlaceholder": "请输入部门名称",
          "parent": "上级部门",
          "parentPlaceholder": "请选择上级部门",
          "leaders": "负责人",
          "leadersPlaceholder": "选择负责人",
          "add": "添加部门",
          "addTitle": "新建部门",
          "addChild": "添加子部门",
          "edit": "编辑部门",
          "editTitle": "编辑部门",
          "confirm": "确定",
          "delete": "删除部门",
          "expandAll": "展开全部",
          "collapseAll": "收起全部",
          "created": "部门已创建",
          "updated": "部门已更新",
          "deleted": "部门已删除",
          "blockedTitle": "提示",
          "deleteBlocked": "部门「{name}」下还有 {count} 名成员，请先转移或移除成员后再删除。",
          "deleteConfirmTitle": "确认删除部门「{name}」吗？",
          "acknowledge": "我知道了",
          "deleteConfirmDesc": "确定要删除部门「{name}」吗？该部门及其下共 {count} 个子部门将被一并删除，此操作不可恢复。",
          "deleteConfirm": "确定",
          "validation": {
            "nameRequired": "请输入部门名称",
            "nameExists": "部门名称已存在",
            "parentRequired": "请选择上级部门"
          }
        }
      },
      "tasks": {
        tabs: { all: '全部任务', pending: '待处理', created: '我发起的', participated: '我参与的', copied: '抄送我的', completed: '已完成' },
        fields: { name: '任务名称', status: '状态', priority: '优先级', createdAt: '创建时间', updatedAt: '更新时间', sourceApp: '来源应用', targetApp: '目标应用', project: '相关项目', vehicle: '相关车型', actions: '操作' },
        filters: { all: '全部', input: '请输入', select: '请选择', startDate: '开始日期', endDate: '结束日期', search: '搜索', reset: '重置', settings: '筛选条件设置', listAria: '筛选条件列表', clearAll: '清除全部', chip: '{field}：{value}' },
        columns: { settings: '列设置', listAria: '数据列表字段列表' },
        labels: { empty: '暂无任务', noMatch: '搜索不到符合条件的任务' },
        pagination: { navigation: '任务分页', total: '共 {count} 项数据', perPage: '{count} 条/页', pageSizeAria: '每页条数', previous: '上一页', next: '下一页', jumpTo: '跳至', totalPages: '/{count} 页' },
        actions: { detail: '详情', execute: '执行', cancel: '作废', delete: '删除', overdue: '已逾期', show: '显示', restore: '恢复默认', removeFilter: '移除该筛选条件', confirm: '确定', cancelDialog: '取消' },
        create: {
          title: '新建任务', name: '任务名称', description: '任务描述', priority: '优先级', deadline: '截止时间', attachment: '附件', copiedUsers: '抄送人', assignees: '处理人', orchestration: '任务编排',
          upload: '点击或将文件拖拽到这里上传', uploadHint: '单个文件不超过 20MB，支持 PDF、PNG、JPG 格式文件。', editOrchestration: '编辑编排', submitter: '提交人', designatedMember: '指定成员', submit: '提交', review: '审核', end: '结束', ended: '流程已结束', notEnded: '流程未结束', cancel: '取消', confirm: '确定', nameRequired: '请输入任务名称', opinionRequired: '请输入说明', uploadSizeError: '单个附件不能超过 20MB', uploadTypeError: '仅支持 PDF、PNG、JPG 格式文件', success: '任务创建成功',
        },
        statuses: { pending: '待处理', 'in-progress': '进行中', completed: '已完成', rejected: '已驳回', recalled: '已撤回', cancelled: '已作废' },
        priorities: { low: '低', medium: '中', high: '高', urgent: '紧急' },
        detail: {
          back: '任务中心', overview: '任务信息', description: '任务描述', taskContent: '任务内容', attachments: '附件', flow: '流程进度', records: '操作记录', handle: '任务处理', handlingOpinion: '处理意见', uploadResult: '上传处理结果', noAttachments: '暂无附件', noOpinion: '暂无处理意见', noRecords: '暂无操作记录',
          execute: '执行任务', reject: '驳回', return: '退回', finish: '结束', recall: '撤回', transfer: '转交', cancel: '作废任务', delete: '删除任务', transferTo: '转交给', transferOpinion: '转交意见', opinion: '说明', input: '请输入', submit: '提交处理', notFound: '任务不存在', backToTasks: '返回任务中心', executeSuccess: '任务已进入进行中', deleteSuccess: '任务已删除', actionSuccess: '{action}成功', recordCreated: '创建任务并提交', recordStarted: '开始处理任务', recordApproved: '审核通过，任务结束', recordRejected: '材料不完整，退回补充', recordCancelled: '任务已作废', recordTransferred: '已转交给 {member}', rejectMessage: '确认驳回当前任务？驳回后任务将退回补充。', returnMessage: '确认将当前任务退回至上一节点？', finishMessage: '确认结束当前任务？结束后不可继续办理。', recallMessage: '确认撤回当前任务？撤回后不可编辑任务。', cancelMessage: '确认作废当前任务？作废后任务不可继续办理。', deleteMessage: '确认删除该任务？删除后不可恢复。',
        },
        orchestration: { back: '返回', title: '编辑编排', subtitle: '任务流程编排页面占位，后续支持节点新增、删除、排序与处理人配置。', save: '保存编排', previewOnly: '当前版本仅提供流程预览，暂不支持编辑流程节点。', addNode: '新增流程节点', configure: '配置', submitter: '发起人', designatedMember: '指定成员', separator: '：' },
        appLabels: { tianxun: '天巡', tianjian: '天鉴', lims: 'LIMS', csms: 'CSMS', modelProject: '车型项目', tianshu: '天枢' },
        projectLabels: { aionY: 'AION Y 项目', mtSuvA: 'MT-SUV-A 项目', mtEvB: 'MT-EV-B 项目', mtSedC: 'MT-SED-C 项目' },
        actionsLog: { submit: '发起', execute: '执行', approve: '通过', reject: '驳回', return: '退回', finish: '结束', recall: '撤回', transfer: '转交', cancel: '作废' },
      },
      "appDemo": { back: '返回天枢首页', unavailable: '应用地址与单点登录尚未接入。', notFound: '应用不存在' },
      "taskCreate": {
          title: '新建任务',
          sectionBasics: '基本信息', sectionOrchestration: '任务编排',
          name: '任务名称', namePlaceholder: '请输入', nameRequired: '请输入任务名称', nameDuplicated: '任务名称已存在，请修改后重试',
          description: '任务描述',
          priority: '优先级',
          deadline: '截止时间', deadlinePlaceholder: '请选择',
          attachments: '附件', uploadHint: '点击或将文件拖拽到此处上传', uploadMeta: '单个文件不超过 20M，支持 Word / Excel / PDF / PNG / JPEG 格式文件。', removeFile: '删除附件',
          fileTooLarge: '文件「{name}」超过 20M，未上传', fileTypeUnsupported: '文件「{name}」格式不支持，未上传', tooManyFiles: '最多上传 {count} 个文件',
          orchestration: '任务编排', orchestrationPlaceholder: '请选择', orchestrationRequired: '请选择任务编排', orchestrationTodo: '任务编排配置位于系统设置，暂未接入，无法编辑', editOrchestration: '编辑编排',
          cancel: '取消', confirm: '确定', success: '任务已创建，状态为待处理', unsaved: '有未保存的任务信息，确定关闭吗？',
        }
    },
    "en-US": {
      designSystem: {"close": "Close","pagination": {"navigation": "List pagination", "size": "Rows per page", "perPage": "{count} / page", "previous": "Previous page", "next": "Next page", "jump": "Jump to", "pages": "/{count} pages"},"language": "Switch language", "theme": "Switch theme", "state": "Page state", "states": {"ready": "Ready", "empty": "Empty", "loading": "Loading", "error": "Error"}, "keyword": "Keyword", "search": "Search", "reset": "Reset", "list": "Design pattern records", "total": "{count} records", "edit": "Edit example", "error": "Simulated local loading failure", "retry": "Retry", "id": "ID", "name": "Name", "noMatch": "No matching records", "empty": "No records", "detail": "Detail example", "saved": "Local example updated", "required": "Enter a name", "cancel": "Cancel", "save": "Save", "discard": "Discard your changes?", "confirm": "Confirm", "acknowledge": "Got it"},
account: { title: "Account information", center: "Personal center", username: "Username", name: "Full name", department: "Department", roles: "Roles" },
loginExtra: {"method": "Sign-in method", "passwordTab": "Password", "emailTab": "Email code", "email": "Email", "emailError": "Enter a valid email address", "code": "Verification code", "codeError": "Invalid or expired code. Request a new code.", "send": "Send code", "resend": "Retry in {count}s", "slide": "Slide all the way right to verify", "verified": "Verified", "verifyFirst": "Complete verification first", "demoCode": "Local demo code is 123456, valid for 5 minutes", "mock": "Local demo with simulated email delivery and slider verification."},
messageSettings: {"title": "Message settings", "notice": "Enable alerts to receive pop-up or message center notifications.", "rule": "Enabling pop-ups also enables message center alerts. Disabling message center alerts also disables pop-ups.", "bind": "Bind official account", "center": "Message center", "name": "Message title", "description": "Description", "bubble": "Pop-up alerts", "inbox": "Message center alerts", "channel": "Channels", "roles": "Recipients", "actions": "Actions", "edit": "Edit", "editTitle": "Edit - {name}", "system": "System message", "wechat": "WeChat official account", "operator": "Assigned operator", "supervisor": "Operations supervisor", "admin": "System administrator", "required": "Select at least one recipient role", "saved": "Saved to local mock settings", "cancel": "Cancel", "confirm": "Confirm", "binding": "WeChat alert settings", "placeholder": "QR code pending integration", "scan": "Scan with WeChat", "follow": "Follow the \u201c\u6e38\u5bc4\u201d WeChat official account", "features": "Binding enables the following notifications:", "feature1": "Locker faults and overdue luggage", "feature2": "Order changes and refund reviews", "unavailable": "Account binding is not connected. Scanning and binding are unavailable.", "first": "Bind an official account first", "hint": "Desktop pop-up alerts disappear after 5 seconds.", "type0": "Order assignment", "desc0": "Notify when an order is assigned.", "type1": "Order transfer", "desc1": "Notify when an order is transferred.", "type2": "Locker anomaly", "desc2": "Notify on locker faults or communication errors.", "type3": "Locker nearly full", "desc3": "Notify when locker utilization reaches 85%.", "type4": "Exception pending", "desc4": "Notify on a new exception ticket.", "type5": "Exception resolved", "desc5": "Notify when an exception ticket is resolved.", "type6": "Refund review", "desc6": "Notify when a refund request is submitted.", "type7": "Storage expiry reminder", "desc7": "Notify one day before storage expires.", "type8": "Locker fault", "desc8": "Notify on sensor or communication module faults.", "type9": "Overdue collection", "desc9": "Notify 24 hours after storage expires.", "type10": "Luggage unclaimed", "desc10": "Escalate 72 hours after storage expires.", "type11": "Order overdue", "desc11": "Notify when an order is incomplete after 72 hours.", "type12": "Locker authorization expiring", "desc12": "Notify three days before authorization expires.", "type13": "Locker authorization expired", "desc13": "Notify when locker authorization expires."},
versionHistory: {"title": "Version history", "current": "Current version", "unknown": "No version available", "content": "Release notes", "empty": "No release records", "records": {"r1": {"note0": "Task list actions and execution/review assessment tables improved", "note1": "Template column review actions and release note wrapping improved", "note2": "Release summaries synchronized to in-app messages with product filtering"}, "r2": {"note0": "Task detail, execution and review fields aligned with governance workflows", "note1": "Release records, audit trails and change comparison notes added", "note2": "Crowded action columns at smaller resolutions fixed"}, "r3": {"note0": "Submission, review and completion node status synchronized", "note1": "Release calendar and in-app notifications updated", "note2": "Joint export of questions and assessment tables improved, with enum caching and tag compatibility"}, "r4": {"note0": "Execution and review authorization refined", "note1": "Third-party notification configuration and retry feedback improved", "note2": "Version history presented as cards for longer release notes"}}},
vehicles: {"partCode": "Part number", "partName": "Part name", "supplier": "Supplier", "partDetails": "Part details", "partView": "Details","basicInfo": "Basic information", "assetInfo": "Asset information", "close": "Close","directoryActions": "Directory actions", "addChild": "Add child directory", "edit": "Edit", "directoryDetail": "Directory details", "editDirectory": "Edit directory", "vinRegex": "VIN regular expression", "parts": "Linked parts", "regexError": "Invalid regular expression", "duplicateDirectory": "A sibling directory has this name","levelsTitle": "Directory hierarchy settings", "save": "Save", "levelsHelp": "Maintain directories using the saved depth. Configuration locks after data is written.", "levelOption": "{count} levels", "title": "Vehicles", "directory": "Directory", "levels": "Hierarchy", "new": "New", "searchDirectory": "Search directories", "production": "Production vehicles", "prototype": "Prototype vehicles", "code": "VIN / vehicle code", "created": "Asset created", "effective": "Effective date", "operations": "Actions", "search": "Search", "reset": "Reset", "create": "New vehicle", "detail": "Vehicle details", "empty": "No matching vehicles", "confirm": "Confirm", "cancel": "Cancel", "region": "Asset region", "owner": "Owner", "description": "Description", "required": "Complete required fields", "duplicate": "Vehicle identifier already exists", "vinError": "Enter a valid 17-character VIN without I, O or Q", "saved": "Saved to local mock data", "newDirectory": "New root directory", "directoryName": "Directory name", "locked": "Hierarchy is locked because vehicle data exists.", "levelCount": "Hierarchy levels"},
parts: {"title": "Parts", "code": "Part number", "name": "Part name", "abbreviation": "Abbreviation", "level": "Safety level", "development": "Development method", "supplier": "Supplier", "material": "Material number", "ip": "IP", "owner": "Product owner", "securityOwner": "Security owner", "actions": "Actions", "basic": "Basic information", "versions": "Versions", "hardware": "Hardware version", "software": "Software version", "add": "Add", "addHardware": "Add hardware version", "addSoftware": "Add software version", "softwareCount": "{count} software versions", "interfaces": "Interfaces", "protocols": "Protocols", "projects": "Projects", "noProjects": "No associated projects", "missing": "Part missing or deleted", "empty": "No data", "noMatch": "No matching parts", "initialHelp": "Create directly to use the default numbering rule, or customize the rule before creating. The rule cannot be changed after confirmation.", "direct": "Create directly", "customRule": "Custom numbering rule", "ruleLock": "The rule cannot be changed after confirmation. Check the preview.", "separator": "Separator", "digits": "Sequence digits", "fixed": "Fixed characters", "variable": "Variable characters", "year": "Fixed year", "sequence": "Sequence", "preview": "Number preview", "removeSegment": "Remove segment", "invalidRule": "Add at least one segment using letters or numbers", "invalidVariable": "Enter letters or numbers for the variable segment", "invalidIp": "Enter a valid IPv4 address", "required": "Complete the required fields", "duplicate": "Name or number already exists", "saved": "Saved to local mock data", "scanMock": "Queued locally. Scan service integration is pending.", "search": "Search", "reset": "Reset", "create": "Create part", "detail": "Details", "edit": "Edit", "delete": "Delete", "confirmDelete": "Delete this part?", "confirmDeleteHardware": "Delete this hardware and all its software versions?", "discard": "Discard unsaved changes?", "input": "Enter a value", "select": "Select an option", "all": "All", "cancel": "Cancel", "confirm": "Confirm", "back": "Back", "note": "Description", "sbomMethod": "SBOM source", "json": "Upload JSON manually", "firmware": "Upload firmware", "fileHelp": "JSON / bin / zip / hex, up to 20MB per file", "fileError": "Check the file type and 20MB size limit", "levels": {"qm": "QM", "asilA": "ASIL A", "asilB": "ASIL B", "asilC": "ASIL C", "asilD": "ASIL D"}, "developments": {"internal": "In-house", "purchased": "Purchased", "joint": "Joint development"}, "scans": {"unconfigured": "Unconfigured", "queued": "Queued", "failed": "Scan failed", "available": "SBOM available"}},
"certificates": {"title": "Certificates", "code": "Certificate number", "project": "Related project", "regulation": "Regulation number", "issuer": "Issuing body", "authority": "Certification body", "issued": "Issue date", "expires": "Valid until", "status": "Status", "operations": "Actions", "search": "Search", "reset": "Reset", "create": "Add certificate", "view": "View", "edit": "Edit", "delete": "Delete", "confirmDelete": "Delete this certificate?", "save": "Confirm", "cancel": "Cancel", "required": "Complete the required fields", "duplicate": "Certificate number already exists", "dateError": "Expiry must not precede issue date", "saved": "Saved successfully", "empty": "No matching certificates", "completed": "Completed", "reviewing": "Under review", "rejected": "Rejected", "draft": "Draft"},
"regulations": {"title": "Regulations", "list": "Regulation list", "relations": "Related information", "code": "Regulation code", "name": "Regulation name", "region": "Region", "country": "Country", "date": "Created at", "creator": "Created by", "version": "Latest version", "status": "Status", "operations": "Actions", "id": "ID", "search": "Search", "reset": "Reset", "create": "Add regulation", "detail": "View", "edit": "Edit", "review": "Review", "save": "Confirm", "cancel": "Cancel", "note": "Version notes", "attachments": "Attachments", "required": "Complete all required fields", "duplicate": "Regulation code already exists", "saved": "Saved to local mock data", "mock": "Local mock data. Refresh restores initial records", "empty": "No matching regulations", "select": "Select", "discard": "Discard unsaved changes?", "project": "Related projects", "noProjects": "No related projects", "opinion": "Review comments", "decision": "Decision", "approve": "Approve", "reject": "Reject", "fileHelp": "Word or PDF files, up to 20MB each", "fileError": "Upload a Word or PDF file up to 20MB", "upload": "Choose files", "remove": "Remove", "asia": "Asia", "europe": "Europe", "northAmerica": "North America", "southAmerica": "South America", "africa": "Africa", "oceania": "Oceania", "china": "China", "germany": "Germany", "usa": "United States", "brazil": "Brazil", "southAfrica": "South Africa", "australia": "Australia", "pending": "Not started", "reviewing": "In review", "completed": "Completed", "rejected": "Rejected"},
"common": {"confirm": "Confirm", "cancel": "Cancel", "acknowledge": "Got it"},
"numbering": {"modules":{"parts": "Assets - Parts", "controllers": "Assets - Controllers", "vehicles": "Assets - Vehicles", "software": "Assets - Software", "interfaces": "Assets - Interfaces", "sensors": "Assets - Sensors", "projects": "Projects", "activities": "Security activities", "risks": "Risks", "tests": "Test tasks", "reports": "Test reports", "documents": "Documents"},"location": "Usage location", "fixed": "Fixed characters", "variable": "Variable characters", "year": "Fixed year", "digits": "Sequence digits", "preview": "Preview example", "empty": "No numbering rules", "emptyHelp": "Rules appear after business modules supply initial configurations", "count": "{count} rules"},
"workflow": {"filterSettings":"Filter settings","more":"More actions","pagination":"Workflow pagination","total":"Total: {count}","pageSize":"Page size","perPage":"{count} / page","previous":"Previous page","nextPage":"Next page","jump":"Go to","totalPages":"/ {count} pages","basicInfo":"Basic information","definitionId":"Workflow ID","version":"Version","title": "Workflow configuration", "definitions": "Definitions", "instances": "Instances", "business": "Safety activities", "name": "Workflow name", "description": "Description", "type": "Type", "enabled": "Status", "operations": "Actions", "create": "New workflow", "search": "Search", "reset": "Reset", "input": "Enter a value", "select": "Select", "every": "All", "on": "Enabled", "off": "Disabled", "columns": "Columns", "show": "Show", "restore": "Restore defaults", "density": "Density", "normal": "Default", "medium": "Medium", "compact": "Compact", "detail": "Details", "edit": "Edit", "delete": "Delete", "deleteConfirm": "Delete “{name}”? This cannot be undone.", "empty": "No data", "noMatch": "No matching workflows", "builtin": "Built-in", "cancel": "Cancel", "confirm": "Confirm", "next": "Next", "save": "Save", "saved": "Saved to workflow service", "close": "Close", "undo": "Undo", "redo": "Redo", "missing": "Workflow unavailable", "required": "Complete required fields", "lockedHelp": "Built-in structure is locked. Review project roles and approval mode can be adjusted.", "canvas": "Workflow canvas", "addNode": "Add node", "start": "Start", "allMembers": "Initiator: all members", "end": "End", "endHelp": "Workflow ends", "auto": "System auto-completion", "responsible": "Responsible person at initiation", "assigned": "{count} assignments", "configure": "Configure this node", "branches": "Branch routing", "addBranch": "Add branch", "priority": "Priority {count}", "fallback": "Otherwise", "fallbackHelp": "Used when no other branch matches", "configureCondition": "Conditions", "assignment": "Assignment", "assignmentType": "Assignment mode", "members": "Members", "roles": "System roles", "projectRole": "Project roles", "assignees": "Assigned members / roles", "approval": "Approval mode", "all": "All must approve", "any": "Any may approve", "messageContent": "Notification content", "custom": "Custom", "messageTemplate": "Message template", "manageTemplates": "Templates", "messageTitle": "Title", "content": "Content", "attachments": "Attachments", "fileError": "Use PDF, PNG or JPG, up to 20MB per file", "attachmentHelp": "Attachments are stored with the definition; local request total limit is 100MB.", "saveAsTemplate": "Save as template", "createTemplate": "New template", "templateName": "Template name", "channel": "Channel", "exclusiveHelp": "Only the first matching branch runs, in priority order.", "parallelHelp": "All matching branches run together and join after completion.", "order": "Priority / display order", "logic": "Group logic", "and": "AND", "or": "OR", "addCondition": "Add condition", "addGroup": "Add group", "field": "Field", "operator": "Operator", "value": "Value", "discardTitle": "Discard unsaved changes?", "discard": "Unsaved changes will be lost.", "leave": "Discard and leave", "stay": "Keep editing", "retry": "Retry", "refresh": "Refresh", "runtimeHelp": "Instances retain their definition snapshot; later changes do not affect them.", "instanceId": "Instance ID", "handle": "View / handle", "businessHelp": "Local development: activities, risks and in-app messages persist; organization data remains a frontend fixture.", "createActivity": "New safety activity", "activity": "Safety activity", "planEnd": "Planned end date", "extension": "Request extension", "risk": "Add risk", "risks": "Risk records", "messages": "In-app messages", "run": "Start instance", "runHelp": "Creates a persistent instance. Current actor is the local administrator; role mappings come from launch context.", "currentActor": "Current administrator", "projectOwner": "Project role member", "days": "Extension days", "riskDescription": "Risk description", "instance": "Workflow instance", "withdraw": "Withdraw", "void": "Void", "pending": "Current tasks", "comment": "Comment", "externalPending": "Adapter is not connected. This node is waiting; no notification or application call has been made.", "otherAssignee": "Assigned to other members; the current administrator cannot act for them.", "approve": "Approve", "reject": "Reject", "submit": "Submit", "return": "Return to previous execution", "history": "History", "nodes": {"execute": "Execution", "review": "Review", "cc": "CC", "lims": "LIMS", "tara": "TARA", "email": "Email", "sms": "SMS", "condition": "Exclusive branch", "parallel": "Parallel branch"}, "types": {"normal": "General template", "project": "Project template"}, "projectRoles": {"projectOwner": "Project owner", "securityOwner": "Security owner", "activityOwner": "Activity owner", "reviewer": "Reviewer"}, "fields": {"approvalResult": "Previous approval result", "returnCount": "Return count", "projectStatus": "Project status", "projectStage": "Project stage", "activityStatus": "Activity status"}, "operators": {"eq": "Equals", "ne": "Not equal", "in": "In", "notIn": "Not in", "empty": "Is empty", "notEmpty": "Is not empty", "gt": "Greater than", "gte": "At least", "lt": "Less than", "lte": "At most"}, "values": {"planned": "Planned", "active": "Active", "suspended": "Suspended", "completed": "Completed", "cancelled": "Cancelled", "concept": "Concept", "development": "Development", "prototype": "Prototype", "validation": "Validation", "production": "Production", "maintenance": "Maintenance", "pending": "Pending", "overdue": "Overdue", "approved": "Approved", "rejected": "Rejected", "running": "Running", "withdrawn": "Withdrawn", "processing": "Processing", "resolved": "Resolved"}, "events": {"externalCompleted":"External service confirmed completion", "started": "Started", "entered": "Node entered", "autoCompleted": "Auto-completed", "completed": "Completed", "approve": "Approved", "reject": "Rejected", "rejected": "Instance rejected", "submit": "Submitted", "return": "Returned", "withdrawn": "Withdrawn", "cancelled": "Cancelled", "copied": "CC recorded", "externalPending": "Waiting for adapter"}, "effects": {"extendActivity": "Extension approved", "extensionDeclined": "Extension declined", "resolveRisk": "Risk resolved", "cc": "Workflow CC"}, "externalReady":"Adapter configured. Retry execution.", "errors": {"adapterMissing":"External adapter not configured", "adapterFailed":"External service failed; retry", "adapterPending":"External service has not confirmed completion", "basic": "Check name, type and description", "duplicate": "Name already exists", "structure": "Invalid workflow structure", "conditions": "Complete conditions; groups must be nonempty and at most three levels", "branches": "Use at least two branches and a fixed fallback", "priority": "Branch priorities must be unique and consecutive", "reviewBeforeExecute": "Every path before a review must include an execution", "assignment": "Complete assignments and approval mode", "message": "Check template name, title, body and lengths", "disabled": "Workflow is disabled", "unresolved": "Cannot resolve assignees; check launch context mappings", "instanceClosed": "Instance is closed", "taskMissing": "Task missing or already handled", "forbidden": "Current actor is not authorized", "unauthorized": "Sign in first", "action": "Action unavailable or vote already submitted", "noReturn": "No previous execution to return to", "missing": "Record missing; refresh", "locked": "Enabled definitions or built-in structure cannot be modified", "referenced": "Referenced record cannot be deleted", "conflict": "Version conflict; refresh before retrying", "context": "Check activity, responsible person, extension days and role mappings", "tooLarge": "Request too large; reduce attachments", "network": "Cannot connect. Run pnpm dev:workflow and retry", "server": "Service failed; retry"}},
"roleManagement": {"title": "Role management", "name": "Role name", "description": "Description", "operations": "Actions", "new": "New role", "detail": "Role details", "edit": "Edit", "editTitle": "Edit role", "placeholder": "Please enter", "search": "Search", "reset": "Reset", "columns": "Columns", "show": "Show", "restore": "Restore defaults", "density": "List density", "normal": "Default", "medium": "Medium", "compact": "Compact", "more": "More actions", "delete": "Delete", "empty": "No matching roles", "back": "Back", "cancel": "Cancel", "confirm": "Confirm", "basic": "Basic information", "permissions": "Operation permissions", "mock": "Local demo: permission catalog and enabled apps are examples, without live authorization. Refresh resets all changes.", "level1": "Level 1 function", "level2": "Level 2 function", "level3": "Level 3 function", "required": "Enter a role name", "nameLimit": "Use no more than 20 characters", "unique": "Role name already exists", "permissionRequired": "Select at least one permission", "saved": "Role saved locally", "failed": "Save failed. Check the name and permissions, then retry.", "linked": "This role is assigned to users and cannot be deleted", "deleted": "Role deleted locally", "deleteTitle": "Delete role", "deleteConfirm": "Delete role \u201c{name}\u201d? This cannot be undone.", "discardTitle": "Leave this page", "discard": "You have unsaved changes. Leaving will discard them.", "leave": "Discard and leave", "stay": "Keep editing", "unavailable": "Role unavailable or editing is prohibited", "actions": {"view": "View", "create": "Create", "edit": "Edit", "delete": "Delete", "import": "Import", "export": "Export"}, "modules": {"home": "Home overview", "tasks": "Task center", "data": "Base database", "settings": "System settings", "users": "User management", "roles": "Role management", "audit": "Audit management", "workspace": "Workspace", "projects": "Project management"}},
      "departments": {"title": "Departments", "add": "Add department", "child": "Add child department", "editTitle": "Edit department", "expand": "Expand / collapse all", "name": "Department name", "parent": "Parent department", "searchPlaceholder": "Search departments", "count": "Members", "actions": "Actions", "edit": "Edit", "delete": "Delete", "more": "More actions", "empty": "No search results", "required": "Enter a department name", "duplicate": "Department name already exists", "invalid": "Select a valid parent department", "length": "Maximum 20 characters", "confirm": "Confirm", "cancel": "Cancel", "created": "Department added", "updated": "Department updated", "blockedTitle": "Unable to delete", "blocked": "Department “{name}” contains {count} members. Transfer them before deleting.", "ack": "Got it", "deleteTitle": "Delete this department?", "deleteBody": "Delete “{name}” and its {count} child departments? This cannot be undone.", "deleted": "Department deleted", "sorted": "Order updated", "siblings": "Only sibling departments can be reordered", "demo": "Local demo: changes are shared with user management for this session.", "toggle": "Expand or collapse {name}", "placeholder": "Search department name", "keyboard": "Use Alt + Up / Down to reorder siblings"},
      "overview": {
        reportRegion: 'Overview reports', loading: 'Loading overview data', loaded: 'Overview data loaded', threat: 'Threat intelligence', intelligenceClickHint: 'Click to open the threat intelligence platform', intelligenceComingSoon: 'The threat intelligence platform link is not connected yet. It will open in a new tab after integration.', selectReport: 'Select report', currentReport: 'Current report: {report}',
        fullscreen: 'Full screen', exitFullscreen: 'Exit full screen', activationSuccess: 'Activated. You can now launch the app.',
        popupBlocked: 'Your browser blocked the new tab. Allow pop-ups and try again.',
        reports: { default: 'Default Report', vehicle: 'Vehicle Security Report' },
        metrics: { vulnerabilities: 'Cybersecurity vulnerabilities', blockedAttacks: 'Attacks blocked today', securityScore: 'Vehicle security score', r155Compliance: 'R155 compliance rate' },
        descriptions: {
          default: { vulnerabilities: 'Total recorded cybersecurity vulnerabilities', blockedAttacks: 'Attacks blocked so far today', securityScore: 'Overall vehicle security score out of 100', r155Compliance: 'Share of vehicles meeting R155 requirements' },
          vehicle: { vulnerabilities: 'Vulnerabilities within the vehicle security scope', blockedAttacks: 'Attacks blocked today within the vehicle security scope', securityScore: 'Overall vehicle security score out of 100', r155Compliance: 'Share of vehicles in this report meeting R155 requirements' },
        },
        change: 'vs. prior {value}', miniTrend: '{metric} trend',
        ecuTitle: 'Most affected ECUs', ecuHelp: 'Ranked by affected count, highest first', ecuHelpLabel: 'Ranking information',
        ecu: { gateway: 'Gateway', ivi: 'IVI', telematics: 'Telematics (T-Box)' },
        alertsTitle: 'Latest alerts', alertsHelp: 'Most recent alerts in the current report', alertsHelpLabel: 'Alert information',
        severity: 'Severity', time: 'Time', event: 'Event', action: 'Action', details: 'Details', viewAlert: 'View details for {event}',
        chart: { title: 'Attack frequency trend', help: 'Monthly attack counts and trend index for 2025', helpLabel: 'Trend information', attacks: 'Attack count', index: 'Trend index', summary: '{report}: monthly attack counts and trend index for 2025. Focus and use the left and right arrow keys to inspect each month.', value: '{month}: attack count {attacks}, trend index {index}.' },
        sidebar: 'Notifications and apps', noticesTitle: 'Notifications', more: 'More', appsTitle: 'Apps', mine: 'My apps', moreApps: 'More apps', start: 'Launch', activate: 'Activate', startApp: 'Launch {app}', activateApp: 'Activate {app}',
        notices: {
          system: { title: 'System message', description: 'The security check is complete. Review the latest findings.' },
          overdue: { title: 'Overdue task', description: 'A security assessment task is overdue. Please review it.' },
          alert: { title: 'Event alert', description: 'A vehicle cybersecurity event was detected. View the details.' },
        },
        apps: {
          csms: { name: 'CSMS Cybersecurity Platform', description: 'Cybersecurity management and compliance' },
          vsoc: { name: 'Threat Intelligence Analysis Platform', description: 'Threat intelligence and alert response' },
          tara: { name: 'Tianjian TARA Analysis Tool', description: 'Vehicle threat analysis and risk assessment' },
          operations: { name: 'Connected Vehicle Security Operations Center', description: 'Connected vehicle security operations' },
        },
        drawer: { title: 'Alert details', id: 'Alert ID', severity: 'Severity', time: 'Time', event: 'Event', vehicle: 'Associated vehicle', testVehicle: 'Test vehicle •••• {suffix}' },
      },
      mc: {"title": "Message center", "notifications": "Notifications", "announcements": "Announcements", "simulate": "Simulate arrival (local)", "settings": "Message settings", "exception": "Monitoring", "reminder": "Reminders", "all": "All", "total": "{count} messages", "onlyUnread": "Unread only", "markAll": "Mark all read ({count})", "release": "Release update", "releaseDetail": "Improved data catalog search.\nAdded data quality summaries.", "read": "Read", "unread": "Unread", "empty": "No messages. Try adjusting your filters.", "view": "View messages", "arrival": "New in-app message", "types": {"sync_failed": "Sync failed", "quality_alert": "Quality alert", "license_expiring": "Authorization expiring", "task_assigned": "Task assigned", "export_ready": "Export ready", "review_pending": "Review pending"}, "details": {"sync_failed": "Data sync failed. Check the connection and retry.", "quality_alert": "Data quality issues found. Review the check results.", "license_expiring": "Data access authorization expires soon.", "task_assigned": "A new data processing task has been assigned to you.", "export_ready": "Your export is ready. View it in the task center.", "review_pending": "A data request is awaiting review."}},
      "messageCenter": { title: 'Message center', filter: 'Filter by message type', all: 'All messages', empty: 'No messages match this filter' },
      "notices": {
        "system": "System notice",
        "license": "The license expires in 30 days. Renew it in time.",
        "overdue": "Overdue task",
        "overdueDetail": "A task is past its deadline. Please review it.",
        "alert": "Event alert",
        "alertDetail": "A HIGH-severity alert needs attention."
      },
      "pending": {
        "description": "This module is planned and will be available in a future release."
      },
      "login": {
        "title": "Sign in to Open Data Platform",
        "username": "Username",
        "usernamePlaceholder": "Enter your username",
        "password": "Password",
        "passwordPlaceholder": "Enter your password",
        "remember": "Remember me",
        "submit": "Sign in",
        "success": "Signed in successfully",
        "invalid": "Invalid username or password",
        "brandTitle": "Unify data assets, unlock open value",
        "subtitle": "A one-stop, compliance-ready data open service platform"
      },
      "shell": {
        "appName": "Open Data Platform",
        "navigation": "Main navigation",
        "logout": "Sign out",
        "theme": "Theme",
        "light": "Light",
        "dark": "Dark",
        "language": "Language",
        "chinese": "简体中文",
        "english": "English",
        "notifications": "Notifications",
        "noNotifications": "No notifications",
        "dismiss": "Dismiss notification",
        "collapseSidebar": "Collapse sidebar",
        "expandSidebar": "Expand sidebar"
      },
      "assistant": {
        "title": "AI assistant",
        "open": "Open AI assistant",
        "close": "Close AI assistant",
        "send": "Send",
        "placeholder": "Ask a question...",
        "welcome": "Hello, how can I help?",
        "question": "What tasks need attention today?",
        "tasks": "Three import/export tasks are running. Check the Import / Export panel for progress.",
        "unavailable": "The AI assistant is temporarily unavailable. Try again later."
      },
      "audit": {
        "listTitle": "Audit records",
        "filters": {
          "time": "Time",
          "actor": "Operator",
          "actionType": "Action type",
          "module": "Module",
          "result": "Result",
          "keyword": "Keyword",
          "keywordPlaceholder": "Search id, target, summary or operator",
          "search": "Search",
          "reset": "Reset",
          "all": "All",
          "settings": "Filter settings",
          "show": "Show ",
          "restore": "Restore defaults"
        },
        "columns": {
          "time": "Time",
          "actor": "Operator",
          "module": "Module",
          "actionType": "Action type",
          "target": "Target",
          "summary": "Summary",
          "result": "Result",
          "actions": "Actions",
          "settings": "Column settings"
        },
        "actions": {
          "detail": "Details",
          "export": "Export",
          "close": "Close"
        },
        "results": {
          "success": "Success",
          "failure": "Failure"
        },
        "actionTypes": {
          "login": "Sign-in",
          "view": "View",
          "create": "Create",
          "update": "Update",
          "delete": "Delete",
          "import": "Import",
          "export": "Export",
          "review": "Review",
          "grant": "Grant",
          "config": "Configure"
        },
        "modules": {
          "account": "Accounts & roles",
          "grant": "Grants",
          "audit": "Audit",
          "message": "Message center",
          "system": "System settings"
        },
        "roles": {
          "admin": "Administrator",
          "officer": "Officer",
          "owner": "Business owner"
        },
        "detail": {
          "title": "Audit details",
          "id": "Record ID",
          "time": "Time",
          "actor": "Operator",
          "module": "Module",
          "actionType": "Action type",
          "target": "Target",
          "summary": "Summary",
          "result": "Result"
        },
        "table": {
          "empty": "No audit records yet",
          "noMatch": "No audit records match the current filters",
          "pageSize": "Items per page",
          "navigation": "Audit records pagination"
        },
        "pagination": {
          "total": "{count} records in total",
          "perPage": "{count} / page",
          "previous": "Previous page",
          "next": "Next page",
          "jumpTo": "Go to",
          "totalPages": "/{count} pages"
        },
        "currentUser": "Current user",
        "export": {
          "empty": "No filtered audit records to export",
          "fail": "Export failed. Try again."
        },
        "exportNotice": {
          "title": "Export notice",
          "line1": "All audit records within the selected time range will be exported.",
          "line2": "The result can be viewed and downloaded in Import / Export – Download tasks.",
          "cancel": "Cancel",
          "confirm": "Export",
          "created": "Export task created. Download it in Import / Export – Download tasks."
        }
      },
      "taskCenter": {
        "title": "Import / Export",
        "tabs": {
          "import": "Import tasks",
          "download": "Download tasks"
        },
        "filters": {
          "module": "Module",
          "operator": "Operator",
          "time": "Time",
          "all": "All",
          "startDate": "Start date",
          "endDate": "End date",
          "search": "Search",
          "reset": "Reset"
        },
        "note": "Note: Exported data is kept on the platform for at most 30 days and is removed automatically afterwards.",
        "columns": {
          "module": "Module",
          "file": "File name",
          "operator": "Operator",
          "time": "Time",
          "stage": "Stage",
          "actions": "Actions"
        },
        "stages": {
          "processing": "Processing {progress}%",
          "importSuccess": "Total {total}, succeeded {ok}, failed {fail}",
          "partialFailPrefix": "Total {total}, succeeded {ok}, ",
          "partialFailCount": "{fail} failed",
          "importFailed": "Import failed",
          "exportSuccess": "Export succeeded",
          "exportFailed": "Export failed",
          "expired": "The file has expired and cannot be downloaded"
        },
        "actions": {
          "downloadFile": "Download file",
          "downloadErrorData": "Download error data",
          "noOperation": "——"
        },
        "empty": {
          "noRecord": "No data",
          "noMatch": "No matching content found"
        },
        "pagination": {
          "navigation": "Import / Export pagination",
          "total": "{count} records in total",
          "perPage": "{count} / page",
          "pageSizeAria": "Items per page",
          "previous": "Previous page",
          "next": "Next page",
          "jumpTo": "Go to",
          "totalPages": "/{count} pages",
          "invalidPage": "Enter a valid page number"
        },
        "fileNames": {
          "import": "Import",
          "export": "Export",
          "importError": "Import errors"
        },
        "modules": {
          "account": "Accounts & roles",
          "grant": "Grants",
          "audit": "Audit",
          "message": "Message center",
          "system": "System settings"
        },
        "feedback": {
          "startDownload": "Download started"
        }
      },
      "nav": {
        "home": "Home overview",
        "tasks": "Task center",
        "data": "Basic database",
        "systemSettings": "System settings",
        "settings": {
          "users": "Users",
          "departments": "Departments",
          "roles": "Roles",
          "workflow": "Workflow configuration",
          "numbering": "Numbering rules",
          "audit": "Audit"
        }
      },
      "userManagement": {
        "listBlockTitle": "Members",
        "summary": {
          "total": "Total {count}",
          "direct": "Department {count}"
        },
        "toolbar": {
          "searchPlaceholder": "Search by name, account, phone or email",
          "search": "Search",
          "reset": "Reset",
          "add": "Add user",
          "import": "Import",
          "export": "Export",
          "role": "Role",
          "status": "Status",
          "scope": "Data scope",
          "createdBy": "Created by",
          "createdAt": "Created at",
          "startDate": "Start date",
          "endDate": "End date",
          "allMembers": "All members",
          "directMembers": "Direct members only",
          "keyword": "Keyword",
          "filterSettings": "Filter settings",
          "columnSettings": "Column settings",
          "show": "Show",
          "restoreDefaults": "Restore defaults",
          "all": "All",
          "batchEnable": "Enable",
          "batchDisable": "Disable",
          "batchDelete": "Delete",
          "selected": "{count} selected",
          "clearSelection": "Clear",
          "batchEnabled": "Enabled {count} users",
          "batchDisabled": "Disabled {count} users",
          "ownerSkipped": "Owners were skipped ({count})"
        },
        "columns": {
          "account": "Login account",
          "user": "Name",
          "contact": "Contact",
          "department": "Department",
          "role": "Role",
          "email": "Email",
          "phone": "Phone",
          "status": "Status",
          "lastLogin": "Last login",
          "createdBy": "Created by",
          "createdAt": "Created at",
          "actions": "Actions"
        },
        "status": {
          "enabled": "Enabled",
          "disabled": "Disabled",
          "control": "Toggle enabled status for user {name}",
          "enabledToast": "User enabled",
          "disabledToast": "User disabled"
        },
        "actions": {
          "view": "View",
          "edit": "Edit",
          "delete": "Delete",
          "resetPassword": "Reset password"
        },
        "resetPassword": {
          "title": "Reset the password for “{name}”?",
          "desc": "A new random password will be generated and sent to the user's email.",
          "success": "Password for “{name}” was reset and sent to the user's email"
        },
        "detail": {
          "title": "User details",
          "basicInfo": "Basic information",
          "name": "Name",
          "account": "Login account",
          "phone": "Phone",
          "email": "Email",
          "department": "Department",
          "roles": "Roles",
          "createdBy": "Created by",
          "createdAt": "Created at",
          "status": "Status",
          "owner": "Owner",
          "joinedAt": "Joined",
          "lastLogin": "Last login",
          "note": "Note",
          "none": "Not provided"
        },
        "form": {
          "addTitle": "Add user",
          "editTitle": "Edit user",
          "name": "Name",
          "account": "Login account",
          "phone": "Phone",
          "phoneCode": "+86",
          "email": "Email",
          "department": "Department",
          "roles": "Roles",
          "status": "Status",
          "enabled": "Enabled",
          "disabled": "Disabled",
          "note": "Note",
          "save": "Save",
          "namePlaceholder": "Please enter",
          "accountPlaceholder": "Please enter",
          "phonePlaceholder": "Please enter",
          "emailPlaceholder": "Please enter",
          "departmentPlaceholder": "Please select",
          "rolesPlaceholder": "Please select",
          "notePlaceholder": "Optional note",
          "ownerHint": "The owner account cannot be disabled or deleted",
          "created": "User created",
          "updated": "User updated",
          "discardTitle": "Discard changes",
          "discardDesc": "You have unsaved changes. Discard them?",
          "discardConfirm": "Discard",
          "validation": {
            "nameRequired": "Name is required",
            "accountRequired": "Login account is required",
            "accountExists": "Account already exists",
            "phoneRequired": "Phone is required",
            "phoneInvalid": "Invalid phone number",
            "emailRequired": "Email is required",
            "emailInvalid": "Invalid email",
            "rolesRequired": "Select at least one role",
            "deptRequired": "Select a department"
          }
        },
        "import": {
          "title": "Import users",
          "downloadTemplate": "Download template",
          "templatePreparing": "Preparing template…",
          "templateRetry": "Template failed. Click to retry.",
          "upload": "Upload file",
          "uploadHint": "Click to upload, or drag a file here",
          "reupload": "Reupload",
          "confirm": "Import",
          "parsing": "Parsing file…",
          "invalidFile": "Only .xlsx template files are supported",
          "emptyFile": "The file has no importable data rows",
          "validSummary": "{count} rows ready",
          "invalidSummary": "{count} rows with issues",
          "success": "Imported {count} users",
          "fail": "Import failed. Check the file format.",
          "notesTitle": "Notes",
          "note1": "Only .xlsx files are supported; keep each import under 1,000 rows.",
          "note2": "Fill the template in column order; required fields and formats are validated before import.",
          "columnHint": "Columns: name, account, phone, email, department, roles, status"
        },
        "export": {
          "empty": "No users to export under the current filters",
          "fail": "Export failed. Try again.",
          "notice": {
            "title": "Export notice",
            "line1": "All users under the current filters will be exported.",
            "line2": "The file will be downloaded to your device automatically.",
            "cancel": "Cancel",
            "confirm": "Export",
            "created": "The user list has been exported and the download has started."
          }
        },
        "delete": {
          "title": "Delete user",
          "confirmTitle": "Delete user “{name}”?",
          "batchConfirmTitle": "Delete the {count} selected users?",
          "desc": "The user will no longer be able to sign in. This cannot be undone.",
          "batchDesc": "These users will no longer be able to sign in. This cannot be undone.",
          "cancel": "Cancel",
          "confirm": "Confirm",
          "success": "Selected users deleted"
        },
        "table": {
          "empty": "No users yet",
          "noMatch": "No users match the current filters",
          "pageSize": "Items per page",
          "navigation": "Users pagination"
        },
        "pagination": {
          "total": "{count} records in total",
          "perPage": "{count} / page",
          "previous": "Previous page",
          "next": "Next page",
          "jumpTo": "Go to",
          "totalPages": "/{count} pages"
        },
        "department": {
          "orgTitle": "Organization",
          "menuAria": "Department actions",
          "name": "Department name",
          "namePlaceholder": "Enter department name",
          "parent": "Parent department",
          "parentPlaceholder": "Select parent department",
          "leaders": "Leaders",
          "leadersPlaceholder": "Select leaders",
          "add": "Add department",
          "addTitle": "New department",
          "addChild": "Add sub-department",
          "edit": "Edit department",
          "editTitle": "Edit department",
          "confirm": "Confirm",
          "delete": "Delete department",
          "expandAll": "Expand all",
          "collapseAll": "Collapse all",
          "created": "Department created",
          "updated": "Department updated",
          "deleted": "Department deleted",
          "blockedTitle": "Notice",
          "deleteBlocked": "Department “{name}” still has {count} members. Move or remove them before deleting.",
          "deleteConfirmTitle": "Delete department “{name}”?",
          "acknowledge": "Got it",
          "deleteConfirmDesc": "Delete department “{name}” and its {count} sub-department(s)? This cannot be undone.",
          "deleteConfirm": "Confirm",
          "validation": {
            "nameRequired": "Department name is required",
            "nameExists": "Department name already exists",
            "parentRequired": "Select a parent department"
          }
        }
      },
      "tasks": {
        tabs: { all: 'All tasks', pending: 'Pending', created: 'Created by me', participated: 'Participated', copied: 'Copied to me', completed: 'Completed' },
        fields: { name: 'Task name', status: 'Status', priority: 'Priority', createdAt: 'Created at', updatedAt: 'Updated at', sourceApp: 'Source app', targetApp: 'Target app', project: 'Project', vehicle: 'Vehicle', actions: 'Actions' },
        filters: { all: 'All', input: 'Enter', select: 'Select', startDate: 'Start date', endDate: 'End date', search: 'Search', reset: 'Reset', settings: 'Filter settings', listAria: 'Filter condition list', clearAll: 'Clear all', chip: '{field}: {value}' },
        columns: { settings: 'Column settings', listAria: 'Data table field list' },
        labels: { empty: 'No tasks yet', noMatch: 'No tasks match the current filters' },
        pagination: { navigation: 'Task pagination', total: '{count} items', perPage: '{count} / page', pageSizeAria: 'Items per page', previous: 'Previous page', next: 'Next page', jumpTo: 'Jump to', totalPages: '/{count} pages' },
        actions: { detail: 'Details', execute: 'Execute', cancel: 'Cancel task', delete: 'Delete', overdue: 'Overdue', show: 'Show', restore: 'Restore defaults', removeFilter: 'Remove this filter', confirm: 'Confirm', cancelDialog: 'Cancel' },
        create: {
          title: 'Create task', name: 'Task name', description: 'Description', priority: 'Priority', deadline: 'Deadline', attachment: 'Attachments', copiedUsers: 'CC users', assignees: 'Assignees', orchestration: 'Task orchestration',
          upload: 'Click or drag files here to upload', uploadHint: 'Each file must be no larger than 20MB. PDF, PNG, and JPG are supported.', editOrchestration: 'Edit orchestration', submitter: 'Submitted by', designatedMember: 'Assigned member', submit: 'Submit', review: 'Review', end: 'End', ended: 'Flow ended', notEnded: 'Flow not ended', cancel: 'Cancel', confirm: 'Confirm', nameRequired: 'Enter a task name', opinionRequired: 'Enter a note', uploadSizeError: 'Each attachment must be no larger than 20MB', uploadTypeError: 'Only PDF, PNG, and JPG files are supported', success: 'Task created',
        },
        statuses: { pending: 'Pending', 'in-progress': 'In progress', completed: 'Completed', rejected: 'Rejected', recalled: 'Recalled', cancelled: 'Cancelled' },
        priorities: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' },
        detail: {
          back: 'Task center', overview: 'Task information', description: 'Description', taskContent: 'Task content', attachments: 'Attachments', flow: 'Flow progress', records: 'Activity log', handle: 'Handle task', handlingOpinion: 'Handling opinion', uploadResult: 'Upload result', noAttachments: 'No attachments', noOpinion: 'No handling opinion', noRecords: 'No activity records',
          execute: 'Execute task', reject: 'Reject', return: 'Return', finish: 'Finish', recall: 'Recall', transfer: 'Transfer', cancel: 'Cancel task', delete: 'Delete task', transferTo: 'Transfer to', transferOpinion: 'Transfer note', opinion: 'Note', input: 'Enter', submit: 'Submit', notFound: 'Task not found', backToTasks: 'Back to task center', executeSuccess: 'Task is now in progress', deleteSuccess: 'Task deleted', actionSuccess: '{action} successfully', recordCreated: 'Task created and submitted', recordStarted: 'Task processing started', recordApproved: 'Review approved and task completed', recordRejected: 'Materials are incomplete; returned for completion', recordCancelled: 'Task cancelled', recordTransferred: 'Transferred to {member}', rejectMessage: 'Reject this task and return it for completion?', returnMessage: 'Return this task to the previous step?', finishMessage: 'Finish this task? It cannot be handled afterward.', recallMessage: 'Recall this task? It cannot be edited afterward.', cancelMessage: 'Cancel this task? It cannot be handled afterward.', deleteMessage: 'Delete this task? This cannot be undone.',
        },
        orchestration: { back: 'Back', title: 'Edit orchestration', subtitle: 'Placeholder for task flow orchestration. Node creation, deletion, ordering, and assignee configuration will be supported later.', save: 'Save orchestration', previewOnly: 'This version only provides a flow preview; editing flow nodes is not supported yet.', addNode: 'Add flow node', configure: 'Configure', submitter: 'Created by', designatedMember: 'Assigned member', separator: ': ' },
        records: {
          'T-20261001': { name: 'Tianxun scan result review', description: 'Review the Tianxun scan results and confirm that high-risk issues are closed.', content: 'Review component firmware and SBOM consistency, then close the task after confirming no high-risk vulnerabilities remain.' },
          'T-20261002': { name: 'TARA item boundary confirmation', description: 'Confirm TARA item boundaries and ownership.', content: 'Clarify TARA item boundaries and document the confirmation result.' },
          'T-20261003': { name: 'LIMS failed-case follow-up', description: 'Follow up on failed LIMS cases and complete remediation verification.', content: 'Follow up on failed cases and add issue localization and remediation verification results.' },
          'T-20261004': { name: 'Project extension request', description: 'Confirm the project extension request and follow-up plan.', content: 'Confirm the extension reason, impact scope, and follow-up schedule.' },
          'T-20261005': { name: 'CSMS deliverable approval', description: 'Review the CSMS project deliverables.', content: 'Review the deliverables and provide approval comments.' },
          'T-20261006': { name: 'Firmware package scan task', description: 'Complete the firmware package scan and provide the results.', content: 'Complete the firmware package scan.' },
          'T-20261007': { name: 'Security policy review', description: 'Review the security policy for the vehicle project.', content: 'Complete the security policy document review.' },
          'T-20261008': { name: 'Supplier remediation confirmation', description: 'Confirm the closure status of supplier remediation items.', content: 'Confirm whether supplier remediation items have been closed.' },
        },
        projectLabels: { aionY: 'AION Y Project', mtSuvA: 'MT-SUV-A Project', mtEvB: 'MT-EV-B Project', mtSedC: 'MT-SED-C Project' },
        appLabels: { tianxun: 'Tianxun', tianjian: 'Tianjian', lims: 'LIMS', csms: 'CSMS', modelProject: 'Model Project', tianshu: 'Tianshu' },
        actionsLog: { submit: 'Created', execute: 'Executed', approve: 'Approved', reject: 'Rejected', return: 'Returned', finish: 'Finished', recall: 'Recalled', transfer: 'Transferred', cancel: 'Cancelled' },
      },
      "appDemo": { back: 'Back to Tianshu home', unavailable: 'App URL and single sign-on are not connected yet.', notFound: 'App not found' },
      "taskCreate": {
          title: 'New task',
          sectionBasics: 'Basic information', sectionOrchestration: 'Task orchestration',
          name: 'Task name', namePlaceholder: 'Enter', nameRequired: 'Enter the task name', nameDuplicated: 'This task name already exists. Use another.',
          description: 'Task description',
          priority: 'Priority',
          deadline: 'Deadline', deadlinePlaceholder: 'Select',
          attachments: 'Attachments', uploadHint: 'Click or drag files here to upload', uploadMeta: 'Up to 20 MB per file. Word / Excel / PDF / PNG / JPEG files are accepted.', removeFile: 'Remove attachment',
          fileTooLarge: '“{name}” exceeds 20 MB and was not uploaded', fileTypeUnsupported: '“{name}” has an unsupported format and was not uploaded', tooManyFiles: 'Up to {count} files',
          orchestration: 'Orchestration', orchestrationPlaceholder: 'Select', orchestrationRequired: 'Select an orchestration', orchestrationTodo: 'Orchestration settings live in System settings and are not editable yet', editOrchestration: 'Edit orchestration',
          cancel: 'Cancel', confirm: 'OK', success: 'Task created. It is now pending', unsaved: 'You have unsaved task details. Close this drawer?',
        }
    }
  },
});

export default i18n;
