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
      taskReturn: { node: "退至节点", description: "说明", required: "请选择退至节点", select: "请选择" },
      taskHandling: { reviewOpinion: "审核意见", upload: "点击或将文件拖拽到这里上传", fileHelp: "最多5个文件，单个不超过20MB，支持Word、Excel、PDF、PNG、JPEG", fileError: "请检查附件格式、大小及数量", copy: "抄送人", type: "类型", users: "指定人员", roles: "指定角色" },
      designSystem: {"close": "关闭","pagination": {"navigation": "列表分页", "size": "每页条数", "perPage": "{count} 条/页", "previous": "上一页", "next": "下一页", "jump": "跳至", "pages": "/{count} 页"},"language": "切换语言", "theme": "切换主题", "state": "页面状态", "states": {"ready": "正常", "empty": "空数据", "loading": "加载中", "error": "加载失败"}, "keyword": "关键词", "search": "查询", "reset": "重置", "list": "设计模式记录", "total": "共 {count} 条", "edit": "编辑示例", "error": "本地模拟加载失败", "retry": "重试", "id": "编号", "name": "名称", "noMatch": "暂无匹配结果", "empty": "暂无数据", "detail": "详情示例", "saved": "已更新本地示例", "required": "请输入名称", "cancel": "取消", "save": "保存", "discard": "确定放弃修改吗？", "confirm": "确定", "acknowledge": "我知道了"},
account: { title: "账号信息", center: "个人中心", username: "登录账号", name: "姓名", department: "部门", roles: "角色", avatar: "头像", email: "邮箱", boundPhone: "绑定手机号", changePassword: "修改密码", changePhone: "修改手机号", changeEmail: "修改邮箱", uploadAvatar: "上传头像", changeAvatarTitle: "更换头像", avatarFormatHint: "支持 JPG / PNG，大小不超过 2MB", avatarDropHint: "点击上传头像，或拖拽图片到此处", verifyPhoneTitle: "验证手机", currentPhone: "当前手机", verifyPhoneHint: "请先验证当前手机号，验证通过后再修改。", verifyEmailTitle: "验证邮箱", currentEmail: "当前邮箱", verifyEmailHint: "请先验证当前邮箱，验证通过后再修改。", changePhoneTitle: "修改手机", changePhoneHint: "当前手机已验证，请输入新手机号并完成验证。", newPhone: "新手机号", changeEmailTitle: "修改邮箱", changeEmailHint: "当前邮箱已验证，请输入新邮箱并完成验证。", newEmail: "新邮箱", changePasswordTitle: "修改密码", currentPassword: "当前密码", newPassword: "新密码", confirmPassword: "确认密码", code: "验证码", codePlaceholder: "请输入验证码", next: "下一步", confirm: "确定", demoCode: "本地模拟验证码为 123456，5 分钟内有效" },
loginExtra: {"method": "登录方式", "passwordTab": "密码登录", "emailTab": "验证码登录", "emailPlaceholder": "请输入邮箱", "codePlaceholder": "请输入邮箱验证码", "email": "邮箱", "emailError": "请输入有效邮箱地址", "code": "验证码", "codeError": "验证码无效或已过期，请重新获取", "send": "获取验证码", "resend": "{count} 秒后重试", "captcha": "图形验证码", "captchaPlaceholder": "请输入图形验证码", "captchaError": "图形验证码不正确", "refreshCaptcha": "刷新验证码", "demoCode": "本地模拟验证码为 123456，5 分钟内有效"},
messageSettings: {"title": "消息设置", "notice": "启用后将收到气泡提醒或消息中心提醒。", "rule": "开启气泡提醒会同时开启消息中心提醒；关闭消息中心提醒会同时关闭气泡提醒。", "center": "消息中心", "name": "消息标题", "description": "消息说明", "bubble": "气泡提醒", "inbox": "消息中心提醒", "roles": "通知对象", "actions": "操作", "edit": "编辑", "editTitle": "编辑 - {name}", "operator": "任务负责人", "supervisor": "审核人员", "admin": "系统管理员", "required": "配置角色不能为空", "saved": "已更新消息通知配置", "cancel": "取消", "confirm": "确定", "hint": "气泡提醒在桌面端显示，5 秒后自动消失。", "type0": "任务分配", "desc0": "新建数据处理任务指派给处理人后，推送提醒", "type1": "审核待处理", "desc1": "数据申请或任务进入审核节点，推送提醒", "type2": "同步失败", "desc2": "数据源同步中断或校验失败，推送提醒", "type3": "质量告警", "desc3": "数据质量检查发现异常记录，推送提醒", "type4": "导出完成", "desc4": "数据导出任务生成文件后，向发起人推送提醒", "type5": "授权即将到期", "desc5": "数据访问授权剩余 3 天即将失效，推送提醒", "type6": "任务转派", "desc6": "任务办理人变更后，向新的处理人推送提醒", "type7": "审核驳回", "desc7": "数据申请或任务被驳回，向发起人推送提醒", "type8": "任务逾期", "desc8": "任务超过计划完成时间仍未办理，推送提醒", "type9": "数据导入完成", "desc9": "批量导入解析完成后，向发起人推送结果提醒", "type10": "授权已失效", "desc10": "数据访问授权已过期，相关资源不可访问时推送提醒", "type11": "法规证书更新", "desc11": "法规标准或证书发布新版本，推送提醒", "type12": "版本发布", "desc12": "平台版本发布后，向相关成员推送更新摘要", "type13": "权限变更", "desc13": "账号角色或功能授权发生变更，推送提醒"},
versionHistory: {"title": "历史版本", "current": "当前版本", "unknown": "暂无版本", "content": "发布内容", "empty": "暂无发布记录"},
vehicles: {"reupload": "重新上传", "selectFile": "选择文件", "importNotes": "注意事项：", "retryTemplate": "重新生成模板","deleteAction": "删除", "deleteVehicle": "确认删除车辆「{code}」吗？", "deleteVehicleConfirm": "删除后不可恢复，请谨慎操作", "vehicleDeleted": "车辆已删除","columns": "列设置", "show": "显示", "restore": "恢复默认", "filterSettings": "筛选条件设置", "filterListAria": "可显示的筛选条件", "columnListAria": "可显示的表格列","referenced": "该目录已被项目引用，不可删除", "projectLocked": "已完成整车级项目引用该配置，目录及零部件已锁定", "partInUse": "移除的零部件仍被在途项目业务占用", "newLeaf": "新建末级目录", "partSearch": "零部件名称或编号", "selectedParts": "已选零部件（{count}）", "discard": "放弃未保存的修改？","codeLength": "车辆代号最多50个字符", "vinPattern": "VIN不符合当前目录的正则规则", "invalidDate": "日期格式不正确", "pastDate": "生效时间不可早于今日", "invalidCountry": "请选择国家字典中的资产区域", "invalidOwner": "负责人无法匹配用户管理记录", "descriptionLength": "资产描述最多500个字符", "hasChildren": "目录下仍有子目录，不可删除", "hasVehicles": "目录下仍有车辆，不可删除", "delete": "删除目录", "selectLeaf": "请选择末级目录查看车辆", "import": "导入", "importHelp": "1、支持 .xlsx 或 UTF-8 .csv 文件，请勿修改模板的表头字段\n2、单个文件不超过 20 MB，不限制数据行数\n3、标识含义：* 为必填，若不填则会导入失败\n4、国家列填写国家代码\n5、负责人填写用户姓名\n6、在「导入导出–导入数据」下载错误数据，第一列为错误原因", "template": "下载导入模板", "uploadHint": "点击上传或将文件拖到此处", "fileError": "文件无法读取，请选择有效的xlsx文件后重试", "templateError": "表头与当前车辆类型模板不匹配", "rowLimit": "请上传至少一条车辆记录", "importFailed": "导入含失败记录，成功记录已写入，请查看失败原因", "row": "行号", "reason": "失败原因","leafDetail": "末级目录详情", "leafDirectory": "末级目录", "directoryPath": "目录路径", "directoryCreated": "创建时间", "directoryUpdated": "更新时间","partCode": "零部件编号", "partName": "零部件名称", "supplier": "所属供应商", "partDetails": "零部件详情", "partView": "详情","basicInfo": "基本信息", "assetInfo": "资产信息", "close": "关闭","directoryActions": "目录操作", "addChild": "添加子目录", "edit": "编辑", "directoryDetail": "目录详情", "editDirectory": "编辑目录", "vinRegex": "VIN 正则", "parts": "关联零部件", "regexError": "正则表达式格式不正确", "duplicateDirectory": "同级目录名称已存在","levelsTitle": "目录层级设置", "save": "保存", "levelsHelp": "保存后按该层级数维护目录；写入数据后配置锁定。", "levelOption": "{count} 级", "title": "车型车辆", "directory": "目录", "levels": "层级设置", "new": "新建", "searchDirectory": "搜索目录名称", "production": "量产车辆", "prototype": "非量产车辆", "code": "VIN / 车辆代号", "created": "资产创建时间", "effective": "生效时间", "operations": "操作", "search": "搜索", "reset": "重置", "create": "新建车辆", "detail": "车辆详情", "empty": "暂无车辆", "noMatch": "暂无匹配车辆", "total": "共 {count} 项数据", "perPage": "{count} 条/页", "pageSizeAria": "每页条数", "previous": "上一页", "next": "下一页", "jumpTo": "跳至", "totalPages": "/{count} 页", "pageNavigation": "车辆分页", "confirm": "确定", "cancel": "取消", "region": "资产区域", "owner": "负责人", "description": "资产描述", "required": "请填写必填字段", "duplicate": "车辆标识已存在", "vinError": "请输入17位有效VIN（不含I、O、Q）", "saved": "零部件信息已更新", "newDirectory": "新建一级目录", "directoryName": "目录名称", "locked": "目录已写入数据，层级配置已锁定。", "levelCount": "层级数目"},
parts: {"approve": "审批", "approvalDecision": "审批结果", "approved": "通过", "rejected": "驳回", "approvalOpinion": "审批意见", "submitApproval": "提交审批", "approvalUpdated": "审批结果已更新", "import": "导入", "export": "导出", "transferFailed": "导出失败，请重试", "exportTitle": "导出提示", "exportScope": "本次将导出当前筛选条件下的所有零部件", "exportDestination": "导出结果可以在「导入导出-导出数据」中查看和下载", "exportConfirm": "确认导出", "exportEmpty": "当前筛选没有可导出的零部件", "exportSuccess": "导出成功", "importFailed": "导入失败，请检查文件格式、必填字段、枚举值及重复编号或名称", "importHelp": "1、仅支持 .xlsx 文件，请勿修改模板的表头字段\n2、单个文件不超过 20 MB\n3、标识含义：* 为必填，若不填则会导入失败\n4、零部件等级填写 qm、asilA、asilB、asilC 或 asilD；开发方式填写 internal、purchased 或 joint\n5、IP 列可留空，填写时须为合法的 IPv4 地址\n6、零部件编号或名称重复将导入失败", "imported": "已导入 {count} 条零部件记录", "selectedVersion": "已选中", "confirmDeleteNamed": "确认删除零部件「{name}」吗？", "deleteCaution": "删除后不可恢复，请谨慎操作", "partInformation": "零部件信息", "regulationInformation": "法规信息", "noRegulations": "暂无关联法规", "relatedInfo": "关联信息", "partDetailTitle": "零部件详情", "relatedProjects": "关联项目", "regulationCode": "法规编号", "regionCountry": "区域/国家", "versionDevelopment": "版本/开发", "relationStatus": "状态", "projectCode": "项目编号", "projectName": "项目名称", "brand": "品牌", "series": "车系", "model": "车型", "priority": "优先级", "projectDetail": "项目详情", "hmgPending": "HMG 项目详情暂未开放", "hmgHelp": "项目详情由 HMG 平台提供。", "projectMissing": "项目不存在或关联已移除", "deleteDescription": "确定删除零部件“{name}”（{code}）吗？删除后无法恢复，请确认后继续。", "deleteHardwareDescription": "确定删除硬件版本“{name}”及其全部软件版本吗？删除后无法恢复。", "projectPriorities": {"high": "高", "medium": "中", "low": "低"}, "projectStatuses": {"planning": "规划中", "active": "进行中", "completed": "已完成"}, "configuration": "配置", "versionList": "返回版本列表", "sbomComponents": "SBOM 组件清单", "viewProgress": "查看进度", "reupload": "重新上传", "scanStatus": "扫描进度", "componentCode": "组件编号", "componentName": "组件名称", "componentVersion": "组件版本", "componentSource": "组件来源", "title": "零部件", "code": "零部件编号", "name": "零部件名称", "abbreviation": "零部件简称", "level": "零部件等级", "development": "开发方式", "supplier": "所属供应商", "material": "物料编号", "ip": "IP", "owner": "产品责任人", "securityOwner": "安全责任人", "actions": "操作", "listTitle": "零部件列表", "filterSettings": "筛选条件设置", "show": "显示 ", "restore": "恢复默认", "columnSettings": "列设置", "basic": "基本信息", "versions": "版本信息", "hardware": "硬件版本", "software": "软件版本", "add": "新增", "addHardware": "新增硬件版本", "addSoftware": "新增软件版本", "softwareCount": "{count} 个软件版本", "interfaces": "接口", "protocols": "协议", "projects": "所在项目", "noProjects": "暂无关联项目", "missing": "零部件不存在或已删除", "empty": "暂无数据", "noMatch": "暂无匹配零部件", "initialHelp": "点击“直接创建”将使用系统默认编号规则；点击“自定义编号规则”可自定义设置编号规则，设置后不可更改。", "direct": "直接创建", "customRule": "自定义编号规则", "basicConfig": "基本配置", "ruleSection": "编号规则", "digitOption": "{count}位", "separator": "编号连接符", "digits": "编号数字位数", "fixed": "固定字符", "variable": "可变字符", "year": "固定年份", "sequence": "流水号", "preview": "编号预览", "removeSegment": "移除编号段", "invalidRule": "请至少配置一段编号，使用英文字母或数字", "invalidVariable": "请输入英文字母或数字作为可变字符", "invalidIp": "请输入有效的 IPv4 地址", "required": "请填写必填字段", "duplicate": "名称或编号已存在", "saved": "零部件信息已更新", "scanMock": "已在本地模拟数据中排队，等待接入扫描服务", "search": "搜索", "reset": "重置", "create": "新增零部件", "editTitle": "编辑零部件", "detail": "详情", "edit": "编辑", "more": "更多操作", "delete": "删除", "confirmDelete": "删除零部件", "confirmDeleteHardware": "删除硬件版本", "discard": "放弃未保存的修改？", "input": "请输入", "select": "请选择", "all": "全部", "cancel": "取消", "confirm": "确定", "back": "返回", "note": "说明", "sbomMethod": "SBOM 获取方式", "json": "手动上传 JSON", "firmware": "上传固件包", "fileHelp": "支持 JSON / bin / zip / hex，单个文件不超过 20MB", "fileError": "请检查文件类型，单个文件不得超过 20MB", "levels": {"qm": "QM", "asilA": "ASIL A", "asilB": "ASIL B", "asilC": "ASIL C", "asilD": "ASIL D"}, "developments": {"internal": "自研", "purchased": "外购", "joint": "联合开发"}, "scans": {"unconfigured": "未配置", "queued": "等待扫描", "failed": "扫描失败", "available": "SBOM 已回显"}},
"certificates": {"detailTitle": "证书详情", "basicInfo": "基础信息", "selectedProject": "选择项目", "projectCode": "项目编号", "projectName": "项目名称", "brand": "品牌", "series": "车系", "model": "车型", "priority": "优先级", "owner": "负责人", "startDate": "开始时间", "endDate": "计划结束时间", "viewProject": "查看项目详情", "regulationsCertificates": "法规与证书", "regulationName": "法规名称", "attachment": "上传证书", "reviewHistory": "审核记录", "reviewer": "审核人", "conclusion": "审核结论", "opinion": "审核意见", "reviewTime": "审核时间", "notesTitle": "注意事项", "upload": "上传文件", "importFormat": "仅支持 .xlsx 文件，请使用导入模板并保留表头。", "templatePreparing": "正在准备模板", "importFinished": "导入处理完成，请查看导入结果", "importHelp": "1、仅支持 .xlsx 文件，请勿修改模板的表头字段\n2、单个文件不超过 20 MB\n3、标识含义：* 为必填，若不填则会导入失败\n4、证书编号相同将更新既有记录\n5、状态填写 draft、reviewing、completed 或 rejected\n6、签发日期、有效期至格式为 YYYY-MM-DD，有效期至不得早于签发日期\n7、在「导入导出–导入数据」下载错误数据，失败行可修正后重新导入", "uploadHint": "点击上传或拖拽文件到此处", "reupload": "重新上传", "template": "下载导入模板", "retry": "重试", "transferError": "文件处理失败，请检查模板、必填字段和日期后重试。", "exportTitle": "导出提示", "exportScope": "本次将导出当前筛选条件下的所有证书", "exportDestination": "导出结果可以在「导入导出-导出数据」中查看和下载", "exportConfirm": "确认导出", "exportSuccess": "导出成功", "import": "导入", "export": "导出", "title": "证书", "code": "证书编号", "project": "关联项目", "regulation": "法规编号", "issuer": "签发机构", "authority": "认证机构", "issued": "签发日期", "expires": "有效期至", "status": "状态", "operations": "操作", "search": "搜索", "reset": "重置", "create": "新增证书", "editTitle": "编辑证书", "view": "详情", "edit": "编辑", "delete": "删除", "confirmDelete": "确认删除证书「{name}」吗？", "name": "证书名称", "deleteWarning": "删除后不可恢复，请谨慎操作", "approve": "审批", "approvePass": "审核通过", "approveReject": "驳回", "reviewSaved": "审核结果已更新", "backList": "返回列表", "unavailable": "证书不存在", "reviewConfirm": "确认提交审核结果吗？", "save": "确定", "cancel": "取消", "required": "请填写必填字段", "duplicate": "证书编号已存在", "dateError": "有效期不能早于签发日期", "saved": "保存成功", "empty": "暂无匹配证书", "completed": "已完成", "reviewing": "审核中", "rejected": "驳回", "draft": "待提交", "listTitle": "证书列表", "noData": "暂无证书", "more": "更多操作", "listCount": "共 {count} 个证书", "placeholderCode": "请输入证书编号", "placeholderProject": "请输入关联项目", "placeholderStatus": "请选择状态", "filterSettings": "筛选条件设置", "show": "显示 ", "restore": "恢复默认", "columnSettings": "列设置", "discardTitle": "放弃未保存的修改？", "discard": "当前修改尚未保存，离开将丢失这些修改。", "submit": "提交", "approveAction": "同意", "rejectAction": "驳回", "withdraw": "撤回", "transfer": "转交", "resubmit": "重新提交", "submitted": "已提交", "withdrawn": "已撤回", "transferred": "已转交", "transferTo": "转交给 {name}", "transferredTip": "已转交", "transferTarget": "转交给", "transferPlaceholder": "请输入接收人姓名", "transferConfirm": "确认转交", "transferEmpty": "请填写接收人", "submitConfirm": "确认提交审批？", "approveConfirmDesc": "确认同意该证书？", "withdrawConfirm": "确认撤回至草稿？", "resubmitConfirm": "确认重新提交审批？"},
"regulations": {"detailTitle": "法规详情", "basic": "基本信息", "back": "返回法规列表", "projectCode": "项目编号", "projectName": "项目名称", "brand": "品牌", "series": "车系", "model": "车型", "priority": "优先级", "reviewSaved": "审批结果已更新","delete": "删除", "deleteTitle": "确认删除法规「{name}」吗？", "deleteDescription": "删除后不可恢复，请谨慎操作", "deleted": "法规已删除", "imported": "已导入 {count} 条法规", "importHelp": "1、仅支持 .xlsx 文件，请勿修改模板的表头字段\n2、单个文件不超过 20 MB\n3、标识含义：* 为必填，若不填则会导入失败\n4、区域列填写区域代码（如 asia、europe），国家列填写与该区域对应的国家代码（如 china、germany）\n5、法规编号重复将导入失败", "transferError": "文件处理失败。请使用导出的 XLSX 格式，检查必填字段、区域国家代码及重复法规编号", "exportTitle": "导出提示", "exportScope": "本次将导出当前筛选条件下的所有法规", "exportDestination": "导出结果可以在「导入导出-导出数据」中查看和下载", "exportConfirm": "确认导出", "exportEmpty": "当前筛选没有可导出的法规", "exportSuccess": "导出成功", "import": "导入", "export": "导出","title": "法规", "list": "法规清单", "relations": "关联信息", "code": "法规编号", "name": "法规名称", "region": "区域", "country": "国家", "date": "创建时间", "creator": "创建用户", "version": "最新版本", "status": "状态", "operations": "操作", "id": "编号", "search": "查询", "reset": "重置", "placeholderCode": "请输入法规编号", "placeholderRegion": "请选择区域", "placeholderCountry": "请选择国家", "startDate": "开始日期", "endDate": "结束日期", "filterSettings": "筛选条件设置", "columnSettings": "列设置", "filterListAria": "可显示的筛选条件", "columnListAria": "可显示的表格列", "show": "显示", "restore": "恢复默认", "create": "新增法规", "editTitle": "编辑法规", "detail": "详情", "more": "更多操作", "edit": "编辑", "review": "审核", "save": "确定", "cancel": "取消", "note": "版本说明", "attachments": "附件", "required": "请完整填写必填字段", "duplicate": "法规编号已存在", "saved": "已保存", "empty": "暂无匹配法规", "select": "请选择", "discard": "放弃未保存的修改？", "project": "关联项目", "noProjects": "暂无关联项目", "opinion": "审核意见", "decision": "审核结论", "approve": "通过", "reject": "驳回", "fileHelp": "支持 .doc、.docx、.pdf，单个文件不超过 20MB", "fileError": "请上传不超过20MB的 Word 或 PDF 文件", "upload": "选择文件", "remove": "移除", "asia": "亚洲", "europe": "欧洲", "northAmerica": "北美洲", "southAmerica": "南美洲", "africa": "非洲", "oceania": "大洋洲", "china": "中国", "germany": "德国", "usa": "美国", "brazil": "巴西", "southAfrica": "南非", "australia": "澳大利亚", "pending": "未开始", "reviewing": "审核中", "completed": "已完成", "rejected": "已驳回"},
"common": {"confirm": "确定", "cancel": "取消", "acknowledge": "我知道了"},
"batchImport": {"title": "批量导入", "upload": "上传文件", "reupload": "重新上传", "hint": "点击上传，或将文件拖拽到此处", "notesTitle": "注意事项", "template": "下载导入模板", "templatePreparing": "正在准备模版…", "templateRetry": "模版生成失败，点击重试", "confirm": "导入", "cancel": "取消", "fileRequired": "请先选择要导入的文件"},
"numbering": {"modules":{"parts": "资产-零部件", "controllers": "资产-控制器", "vehicles": "资产-车辆", "software": "资产-软件", "interfaces": "资产-接口", "sensors": "资产-传感器", "projects": "项目", "activities": "安全活动", "risks": "风险", "tests": "测试任务", "reports": "测试报告", "documents": "文档"},"location": "使用位置", "fixed": "固定字符", "variable": "可变字符", "year": "固定年份", "digits": "流水号位数", "preview": "预览示例", "empty": "暂无编号规则", "emptyHelp": "待业务模块提供初始配置后显示", "count": "共 {count} 条"},
"workflow": {"filterSettings":"筛选条件设置","more":"更多操作","pagination":"流程列表分页","total":"共 {count} 项数据","pageSize":"每页条数","perPage":"{count} 条/页","previous":"上一页","nextPage":"下一页","jump":"跳至","totalPages":"/ {count} 页","basicInfo":"基本信息","definitionId":"流程编号","version":"版本","title":"流程配置","name":"流程名称","description":"流程描述","type":"流程类型","enabled":"状态","operations":"操作","create":"新建流程","search":"搜索","reset":"重置","input":"请输入","select":"请选择","every":"全部","on":"启用","off":"停用","columns":"列设置","show":"显示","restore":"恢复默认","density":"列表密度","normal":"默认","medium":"适中","compact":"紧凑","detail":"详情","edit":"编辑","delete":"删除","deleteConfirm":"确定删除“{name}”？删除后无法恢复。","empty":"暂无数据","noMatch":"暂无匹配流程","builtin":"内置","cancel":"取消","confirm":"确定","next":"下一步","save":"保存","saved":"已保存至流程服务","close":"关闭","undo":"撤销","redo":"恢复","missing":"流程不存在或已删除","required":"请填写必填字段","lockedHelp":"内置流程结构锁定，仅允许调整审核节点的项目角色和审批方式。","zoomIn":"放大画布","zoomOut":"缩小画布","fitCanvas":"适应画布","canvas":"流程画布","addNode":"添加节点","start":"发起","allMembers":"发起人：全部成员","end":"结束","endHelp":"流程已结束","auto":"系统自动完成","responsible":"责任人（发起时指定）","assigned":"已指定 {count} 项","configure":"请配置节点","branches":"分支路由","addBranch":"添加分支","priority":"优先级 {count}","fallback":"其他情况","fallbackHelp":"如存在未满足其他分支条件的情况，则进入此分支","configureCondition":"条件配置","assignment":"人员设置","assignmentType":"指派方式","members":"指定人员","roles":"系统角色","projectRole":"项目角色","assignees":"指定人员 / 角色","approval":"多人审批方式","all":"会签（所有人同意）","any":"或签（任一人同意）","messageContent":"通知内容","custom":"自定义","messageTemplate":"消息模板","manageTemplates":"模板管理","messageTitle":"标题","content":"正文","attachments":"附件","fileError":"附件仅支持 PDF、PNG、JPG，单个不超过20MB","attachmentHelp":"支持 PDF、PNG、JPG，每个文件不超过 20MB。","saveAsTemplate":"设为模板","createTemplate":"新建模板","templateName":"模板名称","channel":"通知通道","exclusiveHelp":"按优先级从高到低，仅执行第一个命中的分支。","parallelHelp":"所有满足条件的分支同时启动，全部完成后汇合。","order":"优先级 / 展示顺序","logic":"条件组逻辑","and":"且","or":"或","addCondition":"添加条件","addGroup":"添加条件组","field":"字段","operator":"运算符","value":"值","discardTitle":"放弃未保存修改？","discard":"当前修改尚未保存，离开将丢失修改。","leave":"放弃并离开","stay":"继续编辑","retry":"重试","currentActor":"当前管理员","nodes":{"execute":"执行","review":"审核","cc":"抄送","lims":"LIMS","tara":"TARA","email":"邮件","sms":"短信","condition":"条件分支","parallel":"并行分支"},"types":{"normal":"普通模板","project":"项目模板"},"projectRoles":{"projectOwner":"项目负责人","securityOwner":"安全负责人","activityOwner":"活动负责人","reviewer":"审核人员"},"fields":{"approvalResult":"上一节点审批结果","returnCount":"退回次数","projectStatus":"项目状态","projectStage":"项目阶段","activityStatus":"活动状态"},"operators":{"eq":"等于","ne":"不等于","in":"属于","notIn":"不属于","empty":"为空","notEmpty":"不为空","gt":"大于","gte":"大于等于","lt":"小于","lte":"小于等于"},"values":{"planned":"未启动","active":"进行中","suspended":"已暂停","completed":"已完成","cancelled":"已作废","concept":"概念阶段","development":"开发阶段","prototype":"样件试制","validation":"验证阶段","production":"量产阶段","maintenance":"维护阶段","pending":"待处理","overdue":"已逾期","approved":"通过","rejected":"驳回"},"errors":{"adapterMissing":"未配置外部适配器","adapterFailed":"外部服务返回失败，可重试","adapterPending":"外部服务尚未确认完成","basic":"请检查名称、类型和描述","duplicate":"名称已存在","structure":"流程结构不合法","conditions":"请完整配置条件，条件组不得为空且最多三层","branches":"分支至少包含两条配置分支和一条固定兜底","priority":"分支优先级必须唯一且连续","reviewBeforeExecute":"审核节点的每一条前序路径均须存在执行节点","assignment":"请完整配置节点人员及审批方式","message":"请填写模板名称、标题和正文并检查长度","disabled":"流程已停用，不能发起","unresolved":"无法解析办理人，请检查启动上下文中的人员和角色映射","instanceClosed":"实例已结束，不能继续办理","taskMissing":"待办不存在或已办理","forbidden":"当前身份无权执行此操作","unauthorized":"请先登录","action":"当前动作不允许或已提交意见","noReturn":"不存在可退回的上一执行节点","missing":"记录不存在，请刷新","locked":"启用流程或内置结构不可修改","referenced":"已被引用，不可删除","conflict":"版本已变化，请刷新后重新操作","context":"请检查活动、责任人、延期天数及角色映射","tooLarge":"请求内容过大，请减少附件","network":"连接失败，请重试","server":"服务处理失败，请重试","engineUnavailable":"流程服务暂不可用，请稍后重试","attachments":"请上传 PDF、PNG 或 JPG 文件，每个文件不超过 20MB"},"manualGroup":"人工操作","automaticGroup":"自动发起","notificationGroup":"消息通知","branchGroup":"分支操作","uploadAttachments":"上传附件","fileReadError":"附件读取失败，请重试","addMembers":"添加人员","selectMembers":"选择成员","availableMembers":"系统用户","selectedMembers":"已选成员","memberSummary":"指定成员：{value}","roleSummary":"指定角色：{value}","projectRoleSummary":"指定项目角色：{value}","templateSummary":"模板：{value}","addParallelBranch":"添加并行分支","addConditionBranch":"添加条件分支","conditionPrompt":"请设置条件","backToList":"返回流程配置","editPage":"编辑流程","detailPage":"流程详情","flowDeleteTitle":"确认删除流程「{name}」吗？","flowDeleteWarning":"删除后不可恢复，请谨慎操作"},
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
        sidebar: '应用', noticesTitle: '通知', more: '更多', appsTitle: '应用', collapseApps: '收起应用', expandApps: '展开应用', mine: '我的应用', moreApps: '更多应用', start: '启动', activate: '激活', startApp: '启动{app}', activateApp: '激活{app}',
        notices: {
          system: { title: '系统消息', description: '系统安全巡检已完成，请查看最新检测结果。' },
          overdue: { title: '任务逾期', description: '安全评估任务已超过处理时限，请及时处理。' },
          alert: { title: '事件告警', description: '监测到车辆网络安全事件，请查看详情。' },
        },
        apps: {
          csms: { name: 'CSMS网络安全平台', description: '网络安全管理与合规工作台' },
          hmg: { name: 'HMG', description: 'HMG应用平台' },
          vsoc: { name: '威胁情报分析平台', description: '威胁情报分析与告警处置' },
          tara: { name: '天鉴TARA分析工具', description: '车辆威胁分析与风险评估' },
          operations: { name: '车联网安全运营中心', description: '车联网安全运营分析' },
        },
        drawer: { title: '告警详情', id: '告警编号', severity: '告警级别', time: '发生时间', event: '事件', vehicle: '关联车辆', testVehicle: '测试车辆 •••• {suffix}' },
      },
      mc: {"title": "消息中心", "notifications": "消息通知", "announcements": "系统公告", "simulate": "模拟新消息（本地）", "settings": "消息设置", "total": "共计 {count} 条消息", "onlyUnread": "只看未读消息", "markAll": "一键已读（{count}）", "release": "版本更新", "releaseDetail": "数据目录检索体验优化。\\n新增数据质量检查结果汇总。", "read": "已读", "unread": "未读", "empty": "暂无消息，请调整筛选条件", "view": "查看消息", "arrival": "收到新的站内消息", "types": {"sync_failed": "同步失败", "quality_alert": "质量告警", "license_expiring": "授权即将到期", "task_assigned": "任务分配", "export_ready": "导出完成", "review_pending": "审核待处理"}, "details": {"sync_failed": "数据同步未完成，请检查连接配置后重试。", "quality_alert": "数据质量检查发现异常，请查看检查结果。", "license_expiring": "数据访问授权即将到期，请及时处理。", "task_assigned": "你收到新的数据处理任务，请及时查看。", "export_ready": "数据导出已完成，请前往任务中心查看。", "review_pending": "数据申请等待审核，请及时处理。"}},
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
        "username": "用户名",
        "usernamePlaceholder": "请输入登录账号",
        "password": "密码",
        "passwordPlaceholder": "请输入密码",
        "remember": "记住我",
        "forgot": "忘记密码？",
        "submit": "登录",
        "success": "登录成功",
        "invalid": "用户名或密码错误",
        "brandTitle": "汇聚全域数据，释放开放价值",
        "subtitle": "面向业务与安全合规的一站式数据开放服务平台"
      },
      "forgot": {
        "title": "忘记密码",
        "back": "返回登录",
        "desc": "请输入账号绑定的邮箱，获取并填写邮件验证码。",
        "emailPlaceholder": "请输入邮箱",
        "codePlaceholder": "请输入邮箱验证码",
        "sendCode": "发送验证码",
        "submit": "发送重置邮件",
        "emailNotBound": "该邮箱未绑定账号",
        "success": "密码重置成功，请使用新密码登录",
        "successUnlocked": "密码重置成功，账号已解锁，请使用新密码登录"
      },
      "shell": {
        "appName": "OpenData",
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
        "welcome": "你好，我是 OpenData AI 助手。可以帮你查找数据目录、了解待办任务，或指引功能入口。",
        "question": "今天有哪些待处理任务？",
        "tasks": "当前有 3 条导入/导出任务进行中，可在右上角「导入导出」面板查看进度；任务中心还有 5 条待处理事项。",
        "data": "数据目录按「数据材料 / 测试方法 / 规则配置」组织，可在左侧导航进入；支持按类型、状态与更新时间筛选。",
        "messages": "消息中心入口在导航栏铃铛图标，未读数显示在角标上；进入后可按类型筛选并标记已读。",
        "certificates": "证书与合规材料在「数据管理 → 证书」页维护，支持导入导出、状态筛选与版本追溯。",
        "unavailable": "当前为演示数据，暂未接入在线模型。你可以从左侧导航直接进入对应功能模块。"
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
          "certificate": "证书",
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
          "line2": "导出结果可以在「导入导出–导出数据」中查看和下载。",
          "cancel": "取消",
          "confirm": "确认导出",
          "created": "导出任务已创建，请在「导入导出–导出数据」中下载"
        }
      },
      "taskCenter": {
        "title": "导入导出",
        "tabs": {
          "import": "导入数据",
          "download": "导出数据"
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
          "certificate": "证书",
          "account": "账号与角色",
          "grant": "功能授权",
          "audit": "审计管理",
          "message": "消息中心",
          "system": "系统设置",
          "regulation": "法规",
          "part": "零部件"
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
          "view": "详情",
          "edit": "编辑",
          "delete": "删除",
          "resetPassword": "重置密码",
          "more": "更多操作"
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
            "passwordTooShort": "密码至少 6 位",
            "passwordMismatch": "两次输入的密码不一致",
            "rolesRequired": "请至少选择一个角色",
            "deptRequired": "请选择所属部门"
          }
        },
        "import": {
          "title": "批量导入",
          "downloadTemplate": "下载模板",
          "templatePreparing": "正在准备模版…",
          "templateRetry": "模版生成失败，点击重试",
          "upload": "上传文件",
          "uploadHint": "点击上传，或将文件拖拽到此处",
          "reupload": "重新上传",
          "confirm": "导入",
          "parsing": "正在解析文件…",
          "invalidFile": "仅支持 .xlsx 格式的模版文件",
          "fileTooLarge": "单个文件不能超过 20 MB",
          "emptyFile": "文件中没有可导入的数据行",
          "validSummary": "可导入 {count} 行",
          "invalidSummary": "{count} 行存在问题",
          "success": "成功导入 {count} 条用户",
          "fail": "导入失败，请检查文件格式",
          "notesTitle": "注意事项",
          "notes": "1、仅支持 .xlsx 格式文件，请勿修改模板的表头字段\n2、单个文件不超过 20 MB，不限制数据行数\n3、标识含义：* 为必填（姓名、登录账号、所属部门），未填写会导致该行导入失败\n4、所属部门需与系统已有部门名称一致；角色可填多个，以顿号或逗号分隔\n5、状态填写「启用」或「禁用」，缺省视为启用\n6、模板列：姓名、登录账号、手机号、邮箱、所属部门、角色、状态"
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
        fields: { name: '任务名称', taskId: '任务编号', status: '状态', priority: '优先级', createdAt: '创建时间', updatedAt: '更新时间', sourceApp: '来源应用', targetApp: '目标应用', project: '相关项目', vehicle: '相关车型', actions: '操作' },
        filters: { all: '全部', input: '请输入', select: '请选择', startDate: '开始日期', endDate: '结束日期', search: '查询', reset: '重置', settings: '筛选条件设置', listAria: '筛选条件列表', clearAll: '清除全部', chip: '{field}：{value}' },
        columns: { settings: '列设置', listAria: '数据列表字段列表' },
        labels: { empty: '暂无任务', noMatch: '搜索不到符合条件的任务' },
        pagination: { navigation: '任务分页', total: '共 {count} 项数据', perPage: '{count} 条/页', pageSizeAria: '每页条数', previous: '上一页', next: '下一页', jumpTo: '跳至', totalPages: '/{count} 页' },
        actions: { detail: '详情', execute: '执行', cancel: '作废', delete: '删除', more: '更多操作', overdue: '已逾期{day}天', show: '显示', restore: '恢复默认', removeFilter: '移除该筛选条件', confirm: '确定', cancelDialog: '取消' },
        create: {
          title: '新建任务', name: '任务名称', description: '任务描述', priority: '优先级', deadline: '截止时间', attachment: '附件', copiedUsers: '抄送人', assignees: '处理人', orchestration: '任务编排',
          upload: '点击或将文件拖拽到这里上传', uploadHint: '单个文件不超过 20MB，支持 PDF、PNG、JPG 格式文件。', editOrchestration: '编辑编排', submitter: '提交人', designatedMember: '指定成员', submit: '提交', review: '审核', end: '结束', ended: '流程已结束', notEnded: '流程未结束', cancel: '取消', confirm: '确定', nameRequired: '请输入任务名称', opinionRequired: '请输入说明', uploadSizeError: '单个附件不能超过 20MB', uploadTypeError: '仅支持 PDF、PNG、JPG 格式文件', success: '任务创建成功',
        },
        statuses: { pending: '待处理', 'in-progress': '进行中', completed: '已完成', rejected: '已驳回', recalled: '已撤回', cancelled: '已作废' },
        priorities: { low: '低', medium: '中', high: '高', urgent: '紧急' },
        detail: {
          back: '任务中心', overview: '任务信息', description: '任务描述', taskContent: '任务内容', attachments: '附件', flow: '任务流程', records: '操作记录', handle: '任务处理', handlingOpinion: '处理意见', uploadResult: '上传处理结果', noAttachments: '暂无附件', noOpinion: '暂无处理意见', noRecords: '暂无操作记录',
          execute: '执行任务', reject: '驳回', return: '退回', finish: '结束', recall: '撤回', transfer: '转交', cancel: '作废任务', delete: '删除任务', transferTo: '转交给', transferOpinion: '转交意见', opinion: '说明', input: '请输入', submit: '提交处理', notFound: '任务不存在', backToTasks: '返回任务中心', executeSuccess: '任务已进入进行中', deleteSuccess: '任务已删除', actionSuccess: '{action}成功', recordCreated: '创建任务并提交', recordStarted: '开始处理任务', recordApproved: '审核通过，任务结束', recordRejected: '材料不完整，退回补充', recordCancelled: '任务已作废', recordTransferred: '已转交给 {member}', rejectMessage: '确认驳回当前任务？驳回后任务将退回补充。', returnMessage: '确认将当前任务退回至上一节点？', finishMessage: '确认结束当前任务？结束后不可继续办理。', recallMessage: '确认撤回当前任务？撤回后不可编辑任务。', cancelMessage: '确认作废当前任务？作废后任务不可继续办理。', deleteMessage: '删除后不可恢复，请谨慎操作',
          breadcrumb: '页面位置', sideLabel: '任务辅助信息', resultFiles: '处理结果附件', noResultFiles: '暂无处理结果附件', uploadUnavailable: '文件上传服务尚未接入', attachmentUnavailable: '附件预览与下载尚未接入',
          flowDone: '已完成', flowCurrent: '进行中', flowPending: '待处理',
          confirmExecute: '确认执行', transferRequired: '请选择转交成员', transferMessage: '确认转交当前任务？转交后由所选成员继续处理。',
          executeConfirmTitle: '确认执行任务「{name}」吗？', cancelConfirmTitle: '确认作废任务「{name}」吗？', deleteConfirmTitle: '确认删除任务「{name}」吗？',
          executeMessage: '执行后任务状态将变为进行中，并写入操作记录。',
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
      taskReturn: { node: "Return to node", description: "Description", required: "Select a return node", select: "Please select" },
      taskHandling: { reviewOpinion: "Review opinion", upload: "Click or drag files here to upload", fileHelp: "Up to 5 files, 20MB each. Word, Excel, PDF, PNG and JPEG.", fileError: "Check file format, size and count", copy: "Copy recipients", type: "Type", users: "Specified users", roles: "Specified roles" },
      designSystem: {"close": "Close","pagination": {"navigation": "List pagination", "size": "Rows per page", "perPage": "{count} / page", "previous": "Previous page", "next": "Next page", "jump": "Jump to", "pages": "/{count} pages"},"language": "Switch language", "theme": "Switch theme", "state": "Page state", "states": {"ready": "Ready", "empty": "Empty", "loading": "Loading", "error": "Error"}, "keyword": "Keyword", "search": "Search", "reset": "Reset", "list": "Design pattern records", "total": "{count} records", "edit": "Edit example", "error": "Simulated local loading failure", "retry": "Retry", "id": "ID", "name": "Name", "noMatch": "No matching records", "empty": "No records", "detail": "Detail example", "saved": "Local example updated", "required": "Enter a name", "cancel": "Cancel", "save": "Save", "discard": "Discard your changes?", "confirm": "Confirm", "acknowledge": "Got it"},
account: { title: "Account information", center: "Personal center", username: "Login account", name: "Full name", department: "Department", roles: "Roles", avatar: "Avatar", email: "Email", boundPhone: "Bound phone", changePassword: "Change password", changePhone: "Change phone", changeEmail: "Change email", uploadAvatar: "Upload avatar", changeAvatarTitle: "Change avatar", avatarFormatHint: "JPG / PNG only, up to 2MB", avatarDropHint: "Click to upload, or drag an image here", verifyPhoneTitle: "Verify phone", currentPhone: "Current phone", verifyPhoneHint: "Verify your current phone number before changing it.", verifyEmailTitle: "Verify email", currentEmail: "Current email", verifyEmailHint: "Verify your current email before changing it.", changePhoneTitle: "Change phone", changePhoneHint: "Current phone is verified. Enter a new phone number and verify it.", newPhone: "New phone", changeEmailTitle: "Change email", changeEmailHint: "Current email is verified. Enter a new email and verify it.", newEmail: "New email", changePasswordTitle: "Change password", currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm password", code: "Verification code", codePlaceholder: "Enter the verification code", next: "Next", confirm: "Confirm", demoCode: "Local demo code is 123456, valid for 5 minutes" },
loginExtra: {"method": "Sign-in method", "passwordTab": "Password login", "emailTab": "Code login", "emailPlaceholder": "Enter your email", "codePlaceholder": "Enter the email code", "email": "Email", "emailError": "Enter a valid email address", "code": "Verification code", "codeError": "Invalid or expired code. Request a new code.", "send": "Send code", "resend": "Retry in {count}s", "captcha": "Verification code", "captchaPlaceholder": "Enter the code above", "captchaError": "Incorrect verification code", "refreshCaptcha": "Refresh code", "demoCode": "Local demo code is 123456, valid for 5 minutes"},
messageSettings: {"title": "Message settings", "notice": "Enable alerts to receive pop-up or message center notifications.", "rule": "Enabling pop-ups also enables message center alerts. Disabling message center alerts also disables pop-ups.", "center": "Message center", "name": "Message title", "description": "Description", "bubble": "Pop-up alerts", "inbox": "Message center alerts", "roles": "Recipients", "actions": "Actions", "edit": "Edit", "editTitle": "Edit - {name}", "operator": "Task owner", "supervisor": "Reviewer", "admin": "System administrator", "required": "Select at least one recipient role", "saved": "Notification settings updated", "cancel": "Cancel", "confirm": "Confirm", "hint": "Desktop pop-up alerts disappear after 5 seconds.", "type0": "Task assigned", "desc0": "Notify when a new data processing task is assigned.", "type1": "Review pending", "desc1": "Notify when a data request or task enters the review step.", "type2": "Sync failed", "desc2": "Notify when a data source sync is interrupted or fails validation.", "type3": "Quality alert", "desc3": "Notify when data quality checks detect anomalous records.", "type4": "Export ready", "desc4": "Notify the requester when an export file is ready to download.", "type5": "Authorization expiring", "desc5": "Notify three days before data access authorization expires.", "type6": "Task reassignment", "desc6": "Notify the new assignee when a task is reassigned.", "type7": "Review rejected", "desc7": "Notify the requester when a data request or task is rejected.", "type8": "Task overdue", "desc8": "Notify when a task remains open past its planned completion time.", "type9": "Import completed", "desc9": "Notify the requester when a bulk import finishes processing.", "type10": "Authorization expired", "desc10": "Notify when data access authorization expires and the resource is unavailable.", "type11": "Regulation & certificate updates", "desc11": "Notify when new versions of regulations or certificates are published.", "type12": "Release published", "desc12": "Notify relevant members when a new platform release is published.", "type13": "Permission changes", "desc13": "Notify when account roles or feature permissions change."},
versionHistory: {"title": "Version history", "current": "Current version", "unknown": "No version available", "content": "Release notes", "empty": "No release records", "records": {"r1": {"note0": "Task list actions and execution/review assessment tables improved", "note1": "Template column review actions and release note wrapping improved", "note2": "Release summaries synchronized to in-app messages with product filtering"}, "r2": {"note0": "Task detail, execution and review fields aligned with governance workflows", "note1": "Release records, audit trails and change comparison notes added", "note2": "Crowded action columns at smaller resolutions fixed"}, "r3": {"note0": "Submission, review and completion node status synchronized", "note1": "Release calendar and in-app notifications updated", "note2": "Joint export of questions and assessment tables improved, with enum caching and tag compatibility"}, "r4": {"note0": "Execution and review authorization refined", "note1": "Third-party notification configuration and retry feedback improved", "note2": "Version history presented as cards for longer release notes"}}},
vehicles: {"reupload": "Replace file", "selectFile": "Select file", "importNotes": "Instructions", "retryTemplate": "Retry template","deleteAction": "Delete", "deleteVehicle": "Confirm deletion of vehicle “{code}”?", "deleteVehicleConfirm": "Deletion cannot be undone. Proceed with caution.", "vehicleDeleted": "Vehicle deleted","columns": "Columns", "show": "Show", "restore": "Restore defaults", "filterSettings": "Filter settings", "filterListAria": "Visible filter fields", "columnListAria": "Visible table columns","referenced": "This directory is referenced by a project", "projectLocked": "A completed vehicle project locks this configuration and its parts", "partInUse": "A part being removed is used by an active project", "newLeaf": "New leaf directory", "partSearch": "Part name or number", "selectedParts": "Selected parts ({count})", "discard": "Discard unsaved changes?","codeLength": "Vehicle code must be at most 50 characters", "vinPattern": "VIN does not match this directory pattern", "invalidDate": "Invalid date", "pastDate": "Effective date cannot precede today", "invalidCountry": "Select a country from the dictionary", "invalidOwner": "Owner does not match a user record", "descriptionLength": "Description must be at most 500 characters", "hasChildren": "This directory has children and cannot be deleted", "hasVehicles": "This directory has vehicles and cannot be deleted", "delete": "Delete directory", "selectLeaf": "Select a leaf directory to view vehicles", "import": "Import", "importHelp": "1. Supports .xlsx or UTF-8 .csv files. Do not change template headers.\n2. Maximum file size is 20 MB, with no row limit.\n3. * indicates required fields. Missing values cause import failure.\n4. Enter country codes in the country column.\n5. Enter user names in the owner column.\n6. Download error data from Import/Export – Import data. The first column contains the error reason.", "template": "Download template", "uploadHint": "Click or drag a file here", "fileError": "Unable to read file. Select a valid xlsx and retry", "templateError": "Headers do not match the current vehicle type", "rowLimit": "Upload at least one vehicle record", "importFailed": "Some rows failed. Valid rows were imported. Review errors", "row": "Row", "reason": "Failure reason","leafDetail": "Leaf directory details", "leafDirectory": "Leaf directory", "directoryPath": "Directory path", "directoryCreated": "Created", "directoryUpdated": "Updated","partCode": "Part number", "partName": "Part name", "supplier": "Supplier", "partDetails": "Part details", "partView": "Details","basicInfo": "Basic information", "assetInfo": "Asset information", "close": "Close","directoryActions": "Directory actions", "addChild": "Add child directory", "edit": "Edit", "directoryDetail": "Directory details", "editDirectory": "Edit directory", "vinRegex": "VIN regular expression", "parts": "Linked parts", "regexError": "Invalid regular expression", "duplicateDirectory": "A sibling directory has this name","levelsTitle": "Directory hierarchy settings", "save": "Save", "levelsHelp": "Maintain directories using the saved depth. Configuration locks after data is written.", "levelOption": "{count} levels", "title": "Vehicles", "directory": "Directory", "levels": "Hierarchy", "new": "New", "searchDirectory": "Search directories", "production": "Production vehicles", "prototype": "Prototype vehicles", "code": "VIN / vehicle code", "created": "Asset created", "effective": "Effective date", "operations": "Actions", "search": "Search", "reset": "Reset", "create": "New vehicle", "detail": "Vehicle details", "empty": "No vehicles yet", "noMatch": "No matching vehicles", "total": "{count} items", "perPage": "{count} / page", "pageSizeAria": "Items per page", "previous": "Previous page", "next": "Next page", "jumpTo": "Jump to", "totalPages": "/{count} pages", "pageNavigation": "Vehicle pagination", "confirm": "Confirm", "cancel": "Cancel", "region": "Asset region", "owner": "Owner", "description": "Description", "required": "Complete required fields", "duplicate": "Vehicle identifier already exists", "vinError": "Enter a valid 17-character VIN without I, O or Q", "saved": "Saved to local mock data", "newDirectory": "New root directory", "directoryName": "Directory name", "locked": "Hierarchy is locked because vehicle data exists.", "levelCount": "Hierarchy levels"},
parts: {"approve": "Approve", "approvalDecision": "Decision", "approved": "Approve", "rejected": "Reject", "approvalOpinion": "Review comments", "submitApproval": "Submit review", "approvalUpdated": "Review updated", "import": "Import", "export": "Export", "transferFailed": "Export failed. Please retry.", "exportTitle": "Export notice", "exportScope": "Export all parts matching the applied filters", "exportDestination": "View and download export results in Import/Export – Export data", "exportConfirm": "Confirm export", "exportEmpty": "No parts to export under the current filters", "exportSuccess": "Export succeeded", "importFailed": "Import failed. Check file format, required fields, enum codes and duplicate IDs or names.", "importHelp": "1. Only .xlsx files are supported. Do not change the template headers.\n2. Maximum file size is 20 MB.\n3. * indicates required fields. Missing values cause import failure.\n4. Part level must be qm, asilA, asilB, asilC or asilD; development must be internal, purchased or joint.\n5. The IP column may be empty; when filled it must be a valid IPv4 address.\n6. Duplicate part numbers or names cause import failure.", "imported": "Imported {count} parts", "selectedVersion": "Selected", "confirmDeleteNamed": "Delete part “{name}”?", "deleteCaution": "Deletion cannot be undone. Please proceed with caution.", "partInformation": "Part information", "regulationInformation": "Regulation information", "noRegulations": "No related regulations", "relatedInfo": "Related information", "partDetailTitle": "Part details", "relatedProjects": "Related projects", "regulationCode": "Regulation ID", "regionCountry": "Region / Country", "versionDevelopment": "Version / Development", "relationStatus": "Status", "projectCode": "Project ID", "projectName": "Project name", "brand": "Brand", "series": "Series", "model": "Model", "priority": "Priority", "projectDetail": "Project details", "hmgPending": "HMG project details are unavailable", "hmgHelp": "Project details are provided by HMG.", "projectMissing": "Project not found or association removed", "deleteDescription": "Delete part “{name}” ({code})? This action cannot be undone.", "deleteHardwareDescription": "Delete hardware version “{name}” and all its software versions? This action cannot be undone.", "projectPriorities": {"high": "High", "medium": "Medium", "low": "Low"}, "projectStatuses": {"planning": "Planning", "active": "In progress", "completed": "Completed"}, "configuration": "Configuration", "versionList": "Back to versions", "sbomComponents": "SBOM components", "viewProgress": "View progress", "reupload": "Upload again", "scanStatus": "Scan status", "componentCode": "Component ID", "componentName": "Component name", "componentVersion": "Component version", "componentSource": "Component source", "title": "Parts", "code": "Part number", "name": "Part name", "abbreviation": "Abbreviation", "level": "Safety level", "development": "Development method", "supplier": "Supplier", "material": "Material number", "ip": "IP", "owner": "Product owner", "securityOwner": "Security owner", "actions": "Actions", "listTitle": "Parts list", "filterSettings": "Filter settings", "show": "Show ", "restore": "Restore defaults", "columnSettings": "Column settings", "basic": "Basic information", "versions": "Versions", "hardware": "Hardware version", "software": "Software version", "add": "Add", "addHardware": "Add hardware version", "addSoftware": "Add software version", "softwareCount": "{count} software versions", "interfaces": "Interfaces", "protocols": "Protocols", "projects": "Projects", "noProjects": "No associated projects", "missing": "Part missing or deleted", "empty": "No data", "noMatch": "No matching parts", "initialHelp": "Create directly to use the default numbering rule, or customize the rule before creating. The rule cannot be changed after confirmation.", "direct": "Create directly", "customRule": "Custom numbering rule", "basicConfig": "Basic settings", "ruleSection": "Numbering rule", "digitOption": "{count} digits", "separator": "Separator", "digits": "Sequence digits", "fixed": "Fixed characters", "variable": "Variable characters", "year": "Fixed year", "sequence": "Sequence", "preview": "Number preview", "removeSegment": "Remove segment", "invalidRule": "Add at least one segment using letters or numbers", "invalidVariable": "Enter letters or numbers for the variable segment", "invalidIp": "Enter a valid IPv4 address", "required": "Complete the required fields", "duplicate": "Name or number already exists", "saved": "Saved to local mock data", "scanMock": "Queued locally. Scan service integration is pending.", "search": "Search", "reset": "Reset", "create": "Create part", "editTitle": "Edit part", "detail": "Details", "edit": "Edit", "more": "More actions", "delete": "Delete", "confirmDelete": "Delete this part?", "confirmDeleteHardware": "Delete this hardware and all its software versions?", "discard": "Discard unsaved changes?", "input": "Enter a value", "select": "Select an option", "all": "All", "cancel": "Cancel", "confirm": "Confirm", "back": "Back", "note": "Description", "sbomMethod": "SBOM source", "json": "Upload JSON manually", "firmware": "Upload firmware", "fileHelp": "JSON / bin / zip / hex, up to 20MB per file", "fileError": "Check the file type and 20MB size limit", "levels": {"qm": "QM", "asilA": "ASIL A", "asilB": "ASIL B", "asilC": "ASIL C", "asilD": "ASIL D"}, "developments": {"internal": "In-house", "purchased": "Purchased", "joint": "Joint development"}, "scans": {"unconfigured": "Unconfigured", "queued": "Queued", "failed": "Scan failed", "available": "SBOM available"}},
"certificates": {"detailTitle": "Certificate details", "basicInfo": "Basic information", "selectedProject": "Selected project", "projectCode": "Project number", "projectName": "Project name", "brand": "Brand", "series": "Series", "model": "Model", "priority": "Priority", "owner": "Owner", "startDate": "Start date", "endDate": "Planned end date", "viewProject": "View project details", "regulationsCertificates": "Regulations and certificates", "regulationName": "Regulation name", "attachment": "Certificate file", "reviewHistory": "Review history", "reviewer": "Reviewer", "conclusion": "Conclusion", "opinion": "Review comments", "reviewTime": "Review time", "notesTitle": "Notes", "upload": "Upload file", "importFormat": "Only .xlsx files are supported. Use the import template and retain its headers.", "templatePreparing": "Preparing template", "importFinished": "Import processed. View the import results.", "importHelp": "1. Only .xlsx files are supported. Do not change the template headers.\n2. Maximum file size is 20 MB.\n3. * indicates required fields. Missing values cause import failure.\n4. An existing certificate with the same number is updated.\n5. Status must be draft, reviewing, completed or rejected.\n6. Issued date and expiry use YYYY-MM-DD; expiry cannot be earlier than issued.\n7. Download error data from Import/Export – Import data, correct it and re-import.", "uploadHint": "Click to upload or drag a file here", "reupload": "Upload again", "template": "Download import template", "retry": "Retry", "transferError": "File processing failed. Check the template, required fields and dates, then retry.", "exportTitle": "Export notice", "exportScope": "Export all certificates matching the applied filters", "exportDestination": "View and download export results in Import/Export – Export data", "exportConfirm": "Confirm export", "exportSuccess": "Export succeeded", "import": "Import", "export": "Export", "title": "Certificates", "code": "Certificate number", "project": "Related project", "regulation": "Regulation number", "issuer": "Issuing body", "authority": "Certification body", "issued": "Issue date", "expires": "Valid until", "status": "Status", "operations": "Actions", "search": "Search", "reset": "Reset", "create": "Add certificate", "editTitle": "Edit certificate", "view": "Details", "edit": "Edit", "delete": "Delete", "confirmDelete": "Delete certificate “{name}”?", "name": "Certificate name", "deleteWarning": "Deletion cannot be undone. Proceed with caution.", "approve": "Review", "approvePass": "Approve", "approveReject": "Reject", "reviewSaved": "Review result updated", "backList": "Back to list", "unavailable": "Certificate unavailable", "reviewConfirm": "Submit this review decision?", "save": "Confirm", "cancel": "Cancel", "required": "Complete the required fields", "duplicate": "Certificate number already exists", "dateError": "Expiry must not precede issue date", "saved": "Saved successfully", "empty": "No matching certificates", "completed": "Completed", "reviewing": "Under review", "rejected": "Rejected", "draft": "Draft", "listTitle": "Certificate list", "noData": "No certificates yet", "more": "More actions", "listCount": "Total {count} certificates", "placeholderCode": "Enter certificate number", "placeholderProject": "Enter related project", "placeholderStatus": "Select status", "filterSettings": "Filter settings", "show": "Show ", "restore": "Restore defaults", "columnSettings": "Column settings", "discardTitle": "Discard unsaved changes?", "discard": "Your changes are unsaved. Leaving will discard them.", "submit": "Submit", "approveAction": "Approve", "rejectAction": "Reject", "withdraw": "Withdraw", "transfer": "Transfer", "resubmit": "Resubmit", "submitted": "Submitted", "withdrawn": "Withdrawn", "transferred": "Transferred", "transferTo": "Transfer to {name}", "transferredTip": "Transferred", "transferTarget": "Transfer to", "transferPlaceholder": "Enter recipient name", "transferConfirm": "Confirm transfer", "transferEmpty": "Recipient is required", "submitConfirm": "Submit this certificate for review?", "approveConfirmDesc": "Approve this certificate?", "withdrawConfirm": "Withdraw to draft?", "resubmitConfirm": "Resubmit for review?"},
"regulations": {"detailTitle": "Regulation details", "basic": "Basic information", "back": "Back to regulations", "projectCode": "Project code", "projectName": "Project name", "brand": "Brand", "series": "Series", "model": "Model", "priority": "Priority", "reviewSaved": "Review result updated","delete": "Delete", "deleteTitle": "Delete regulation “{name}”?", "deleteDescription": "This action cannot be undone. Proceed with caution.", "deleted": "Regulation deleted", "imported": "Imported {count} regulations", "importHelp": "1. Only .xlsx files are supported. Do not change the template headers.\n2. Maximum file size is 20 MB.\n3. * indicates required fields. Missing values cause import failure.\n4. Enter a region code in the region column (e.g. asia, europe) and the matching country code in the country column (e.g. china, germany).\n5. Duplicate regulation numbers cause import failure.", "transferError": "File processing failed. Use the exported XLSX format and check required fields, region/country codes and duplicate codes.", "exportTitle": "Export notice", "exportScope": "Export all regulations matching the applied filters", "exportDestination": "View and download export results in Import/Export – Export data", "exportConfirm": "Confirm export", "exportEmpty": "No regulations to export under the current filters", "exportSuccess": "Export succeeded", "import": "Import", "export": "Export","title": "Regulations", "list": "Regulation list", "relations": "Related information", "code": "Regulation code", "name": "Regulation name", "region": "Region", "country": "Country", "date": "Created at", "creator": "Created by", "version": "Latest version", "status": "Status", "operations": "Actions", "id": "ID", "search": "Query", "reset": "Reset", "placeholderCode": "Enter regulation code", "placeholderRegion": "Select region", "placeholderCountry": "Select country", "startDate": "Start date", "endDate": "End date", "filterSettings": "Filter settings", "columnSettings": "Column settings", "filterListAria": "Visible filter fields", "columnListAria": "Visible table columns", "show": "Show", "restore": "Restore defaults", "create": "Add regulation", "editTitle": "Edit regulation", "detail": "Details", "more": "More actions", "edit": "Edit", "review": "Review", "save": "Confirm", "cancel": "Cancel", "note": "Version notes", "attachments": "Attachments", "required": "Complete all required fields", "duplicate": "Regulation code already exists", "saved": "Saved", "empty": "No matching regulations", "select": "Select", "discard": "Discard unsaved changes?", "project": "Related projects", "noProjects": "No related projects", "opinion": "Review comments", "decision": "Decision", "approve": "Approve", "reject": "Reject", "fileHelp": "Word or PDF files, up to 20MB each", "fileError": "Upload a Word or PDF file up to 20MB", "upload": "Choose files", "remove": "Remove", "asia": "Asia", "europe": "Europe", "northAmerica": "North America", "southAmerica": "South America", "africa": "Africa", "oceania": "Oceania", "china": "China", "germany": "Germany", "usa": "United States", "brazil": "Brazil", "southAfrica": "South Africa", "australia": "Australia", "pending": "Not started", "reviewing": "In review", "completed": "Completed", "rejected": "Rejected"},
"common": {"confirm": "Confirm", "cancel": "Cancel", "acknowledge": "Got it"},
"batchImport": {"title": "Batch import", "upload": "Upload file", "reupload": "Reupload", "hint": "Click to upload, or drag a file here", "notesTitle": "Notes", "template": "Download import template", "templatePreparing": "Preparing template…", "templateRetry": "Template failed, click to retry", "confirm": "Import", "cancel": "Cancel", "fileRequired": "Select a file to import first"},
"numbering": {"modules":{"parts": "Assets - Parts", "controllers": "Assets - Controllers", "vehicles": "Assets - Vehicles", "software": "Assets - Software", "interfaces": "Assets - Interfaces", "sensors": "Assets - Sensors", "projects": "Projects", "activities": "Security activities", "risks": "Risks", "tests": "Test tasks", "reports": "Test reports", "documents": "Documents"},"location": "Usage location", "fixed": "Fixed characters", "variable": "Variable characters", "year": "Fixed year", "digits": "Sequence digits", "preview": "Preview example", "empty": "No numbering rules", "emptyHelp": "Rules appear after business modules supply initial configurations", "count": "{count} rules"},
"workflow": {"filterSettings":"Filter settings","more":"More actions","pagination":"Workflow pagination","total":"Total: {count}","pageSize":"Page size","perPage":"{count} / page","previous":"Previous page","nextPage":"Next page","jump":"Go to","totalPages":"/ {count} pages","basicInfo":"Basic information","definitionId":"Workflow ID","version":"Version","title":"Workflow configuration","name":"Workflow name","description":"Description","type":"Type","enabled":"Status","operations":"Actions","create":"New workflow","search":"Search","reset":"Reset","input":"Enter a value","select":"Select","every":"All","on":"Enabled","off":"Disabled","columns":"Columns","show":"Show","restore":"Restore defaults","density":"Density","normal":"Default","medium":"Medium","compact":"Compact","detail":"Details","edit":"Edit","delete":"Delete","deleteConfirm":"Delete “{name}”? This cannot be undone.","empty":"No data","noMatch":"No matching workflows","builtin":"Built-in","cancel":"Cancel","confirm":"Confirm","next":"Next","save":"Save","saved":"Saved to workflow service","close":"Close","undo":"Undo","redo":"Redo","missing":"Workflow unavailable","required":"Complete required fields","lockedHelp":"Built-in structure is locked. Review project roles and approval mode can be adjusted.","zoomIn":"Zoom in","zoomOut":"Zoom out","fitCanvas":"Fit canvas","canvas":"Workflow canvas","addNode":"Add node","start":"Start","allMembers":"Initiator: all members","end":"End","endHelp":"Workflow ends","auto":"System auto-completion","responsible":"Responsible person at initiation","assigned":"{count} assignments","configure":"Configure this node","branches":"Branch routing","addBranch":"Add branch","priority":"Priority {count}","fallback":"Otherwise","fallbackHelp":"Used when no other branch matches","configureCondition":"Conditions","assignment":"Assignment","assignmentType":"Assignment mode","members":"Members","roles":"System roles","projectRole":"Project roles","assignees":"Assigned members / roles","approval":"Approval mode","all":"All must approve","any":"Any may approve","messageContent":"Notification content","custom":"Custom","messageTemplate":"Message template","manageTemplates":"Templates","messageTitle":"Title","content":"Content","attachments":"Attachments","fileError":"Use PDF, PNG or JPG, up to 20MB per file","attachmentHelp":"PDF, PNG and JPG files, up to 20MB each.","saveAsTemplate":"Save as template","createTemplate":"New template","templateName":"Template name","channel":"Channel","exclusiveHelp":"Only the first matching branch runs, in priority order.","parallelHelp":"All matching branches run together and join after completion.","order":"Priority / display order","logic":"Group logic","and":"AND","or":"OR","addCondition":"Add condition","addGroup":"Add group","field":"Field","operator":"Operator","value":"Value","discardTitle":"Discard unsaved changes?","discard":"Unsaved changes will be lost.","leave":"Discard and leave","stay":"Keep editing","retry":"Retry","currentActor":"Current administrator","nodes":{"execute":"Execution","review":"Review","cc":"CC","lims":"LIMS","tara":"TARA","email":"Email","sms":"SMS","condition":"Exclusive branch","parallel":"Parallel branch"},"types":{"normal":"General template","project":"Project template"},"projectRoles":{"projectOwner":"Project owner","securityOwner":"Security owner","activityOwner":"Activity owner","reviewer":"Reviewer"},"fields":{"approvalResult":"Previous approval result","returnCount":"Return count","projectStatus":"Project status","projectStage":"Project stage","activityStatus":"Activity status"},"operators":{"eq":"Equals","ne":"Not equal","in":"In","notIn":"Not in","empty":"Is empty","notEmpty":"Is not empty","gt":"Greater than","gte":"At least","lt":"Less than","lte":"At most"},"values":{"planned":"Planned","active":"Active","suspended":"Suspended","completed":"Completed","cancelled":"Cancelled","concept":"Concept","development":"Development","prototype":"Prototype","validation":"Validation","production":"Production","maintenance":"Maintenance","pending":"Pending","overdue":"Overdue","approved":"Approved","rejected":"Rejected"},"errors":{"adapterMissing":"External adapter not configured","adapterFailed":"External service failed; retry","adapterPending":"External service has not confirmed completion","basic":"Check name, type and description","duplicate":"Name already exists","structure":"Invalid workflow structure","conditions":"Complete conditions; groups must be nonempty and at most three levels","branches":"Use at least two branches and a fixed fallback","priority":"Branch priorities must be unique and consecutive","reviewBeforeExecute":"Every path before a review must include an execution","assignment":"Complete assignments and approval mode","message":"Check template name, title, body and lengths","disabled":"Workflow is disabled","unresolved":"Cannot resolve assignees; check launch context mappings","instanceClosed":"Instance is closed","taskMissing":"Task missing or already handled","forbidden":"Current actor is not authorized","unauthorized":"Sign in first","action":"Action unavailable or vote already submitted","noReturn":"No previous execution to return to","missing":"Record missing; refresh","locked":"Enabled definitions or built-in structure cannot be modified","referenced":"Referenced record cannot be deleted","conflict":"Version conflict; refresh before retrying","context":"Check activity, responsible person, extension days and role mappings","tooLarge":"Request too large; reduce attachments","network":"Connection failed. Please retry.","server":"Service failed; retry","engineUnavailable":"Workflow service is unavailable. Please retry.","attachments":"Upload PDF, PNG or JPG files up to 20MB each."},"manualGroup":"Human actions","automaticGroup":"Applications","notificationGroup":"Notifications","branchGroup":"Branches","uploadAttachments":"Upload attachments","fileReadError":"Could not read attachments. Please retry.","addMembers":"Add members","selectMembers":"Select members","availableMembers":"Available members","selectedMembers":"Selected members","memberSummary":"Members: {value}","roleSummary":"Roles: {value}","projectRoleSummary":"Project roles: {value}","templateSummary":"Template: {value}","addParallelBranch":"Add parallel branch","addConditionBranch":"Add conditional branch","conditionPrompt":"Set conditions","backToList":"Back to workflow configuration","editPage":"Edit workflow","detailPage":"Workflow details","flowDeleteTitle":"Delete workflow “{name}”?","flowDeleteWarning":"Deletion cannot be undone. Please proceed with caution."},
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
        sidebar: 'Apps', noticesTitle: 'Notifications', more: 'More', appsTitle: 'Apps', collapseApps: 'Collapse apps', expandApps: 'Expand apps', mine: 'My apps', moreApps: 'More apps', start: 'Launch', activate: 'Activate', startApp: 'Launch {app}', activateApp: 'Activate {app}',
        notices: {
          system: { title: 'System message', description: 'The security check is complete. Review the latest findings.' },
          overdue: { title: 'Overdue task', description: 'A security assessment task is overdue. Please review it.' },
          alert: { title: 'Event alert', description: 'A vehicle cybersecurity event was detected. View the details.' },
        },
        apps: {
          csms: { name: 'CSMS Cybersecurity Platform', description: 'Cybersecurity management and compliance' },
          hmg: { name: 'HMG', description: 'HMG application platform' },
          vsoc: { name: 'Threat Intelligence Analysis Platform', description: 'Threat intelligence and alert response' },
          tara: { name: 'Tianjian TARA Analysis Tool', description: 'Vehicle threat analysis and risk assessment' },
          operations: { name: 'Connected Vehicle Security Operations Center', description: 'Connected vehicle security operations' },
        },
        drawer: { title: 'Alert details', id: 'Alert ID', severity: 'Severity', time: 'Time', event: 'Event', vehicle: 'Associated vehicle', testVehicle: 'Test vehicle •••• {suffix}' },
      },
      mc: {"title": "Message center", "notifications": "Notifications", "announcements": "Announcements", "simulate": "Simulate arrival (local)", "settings": "Message settings", "total": "{count} messages", "onlyUnread": "Unread only", "markAll": "Mark all read ({count})", "release": "Release update", "releaseDetail": "Improved data catalog search.\nAdded data quality summaries.", "read": "Read", "unread": "Unread", "empty": "No messages. Try adjusting your filters.", "view": "View messages", "arrival": "New in-app message", "types": {"sync_failed": "Sync failed", "quality_alert": "Quality alert", "license_expiring": "Authorization expiring", "task_assigned": "Task assigned", "export_ready": "Export ready", "review_pending": "Review pending"}, "details": {"sync_failed": "Data sync failed. Check the connection and retry.", "quality_alert": "Data quality issues found. Review the check results.", "license_expiring": "Data access authorization expires soon.", "task_assigned": "A new data processing task has been assigned to you.", "export_ready": "Your export is ready. View it in the task center.", "review_pending": "A data request is awaiting review."}},
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
        "username": "Username",
        "usernamePlaceholder": "Enter your login account",
        "password": "Password",
        "passwordPlaceholder": "Enter your password",
        "remember": "Remember me",
        "forgot": "Forgot password?",
        "submit": "Sign in",
        "success": "Signed in successfully",
        "invalid": "Invalid username or password",
        "brandTitle": "Unify data assets, unlock open value",
        "subtitle": "A one-stop, compliance-ready data open service platform"
      },
      "forgot": {
        "title": "Forgot password",
        "back": "Back to sign in",
        "desc": "Enter the email bound to your account, then request and fill in the email verification code.",
        "emailPlaceholder": "Enter your email",
        "codePlaceholder": "Enter the email code",
        "sendCode": "Send code",
        "submit": "Send reset email",
        "emailNotBound": "This email is not bound to any account",
        "success": "Password reset successful. Please sign in with your new password.",
        "successUnlocked": "Password reset successful and your account has been unlocked. Please sign in with your new password."
      },
      "shell": {
        "appName": "OpenData",
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
        "welcome": "Hello, I am the OpenData AI assistant. I can help you find data catalogues, check pending tasks, or locate a feature.",
        "question": "What tasks need attention today?",
        "tasks": "Three import/export tasks are running. Check the Import / Export panel in the top-right corner; the task centre also has five items awaiting action.",
        "data": "The data catalogue is organised into Data Materials, Test Methods and Rule Configuration in the left navigation. You can filter by type, status and update time.",
        "messages": "Open the message centre from the bell icon in the navigation bar; the badge shows unread items. Filter by type and mark messages as read inside the centre.",
        "certificates": "Certificates and compliance materials live under Data Management > Certificates, with import/export, status filters and version history.",
        "unavailable": "This is demo data and no online model is connected yet. You can open the matching module directly from the left navigation."
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
          "certificate": "Certificates",
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
          "line2": "The result can be viewed and downloaded in Import / Export – Export data.",
          "cancel": "Cancel",
          "confirm": "Export",
          "created": "Export task created. Download it in Import / Export – Export data."
        }
      },
      "taskCenter": {
        "title": "Import / Export",
        "tabs": {
          "import": "Import data",
          "download": "Export data"
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
          "certificate": "Certificates",
          "account": "Accounts & roles",
          "grant": "Grants",
          "audit": "Audit",
          "message": "Message center",
          "system": "System settings",
          "regulation": "Regulations",
          "part": "Parts"
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
          "view": "Details",
          "edit": "Edit",
          "delete": "Delete",
          "resetPassword": "Reset password",
          "more": "More actions"
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
            "passwordTooShort": "Password must be at least 6 characters",
            "passwordMismatch": "The two passwords do not match",
            "rolesRequired": "Select at least one role",
            "deptRequired": "Select a department"
          }
        },
        "import": {
          "title": "Batch import",
          "downloadTemplate": "Download template",
          "templatePreparing": "Preparing template…",
          "templateRetry": "Template failed. Click to retry.",
          "upload": "Upload file",
          "uploadHint": "Click to upload, or drag a file here",
          "reupload": "Reupload",
          "confirm": "Import",
          "parsing": "Parsing file…",
          "invalidFile": "Only .xlsx template files are supported",
          "fileTooLarge": "A single file must not exceed 20 MB",
          "emptyFile": "The file has no importable data rows",
          "validSummary": "{count} rows ready",
          "invalidSummary": "{count} rows with issues",
          "success": "Imported {count} users",
          "fail": "Import failed. Check the file format.",
          "notesTitle": "Notes",
          "notes": "1. Only .xlsx files are supported; do not modify the template header fields.\n2. A single file must not exceed 20 MB; there is no limit on the number of data rows.\n3. Required fields are marked with * (Name, Account, Department); a missing required field fails that row.\n4. Department must match an existing system department; multiple roles are separated by 、or commas.\n5. Status is Enabled or Disabled; a blank status defaults to enabled.\n6. Template columns: Name, Account, Phone, Email, Department, Roles, Status."
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
        fields: { name: 'Task name', taskId: 'Task ID', status: 'Status', priority: 'Priority', createdAt: 'Created at', updatedAt: 'Updated at', sourceApp: 'Source app', targetApp: 'Target app', project: 'Project', vehicle: 'Vehicle', actions: 'Actions' },
        filters: { all: 'All', input: 'Enter', select: 'Select', startDate: 'Start date', endDate: 'End date', search: 'Query', reset: 'Reset', settings: 'Filter settings', listAria: 'Filter condition list', clearAll: 'Clear all', chip: '{field}: {value}' },
        columns: { settings: 'Column settings', listAria: 'Data table field list' },
        labels: { empty: 'No tasks yet', noMatch: 'No tasks match the current filters' },
        pagination: { navigation: 'Task pagination', total: '{count} items', perPage: '{count} / page', pageSizeAria: 'Items per page', previous: 'Previous page', next: 'Next page', jumpTo: 'Jump to', totalPages: '/{count} pages' },
        actions: { detail: 'Details', execute: 'Execute', cancel: 'Cancel task', delete: 'Delete', more: 'More actions', overdue: 'Overdue {day}d', show: 'Show', restore: 'Restore defaults', removeFilter: 'Remove this filter', confirm: 'Confirm', cancelDialog: 'Cancel' },
        create: {
          title: 'Create task', name: 'Task name', description: 'Description', priority: 'Priority', deadline: 'Deadline', attachment: 'Attachments', copiedUsers: 'CC users', assignees: 'Assignees', orchestration: 'Task orchestration',
          upload: 'Click or drag files here to upload', uploadHint: 'Each file must be no larger than 20MB. PDF, PNG, and JPG are supported.', editOrchestration: 'Edit orchestration', submitter: 'Submitted by', designatedMember: 'Assigned member', submit: 'Submit', review: 'Review', end: 'End', ended: 'Flow ended', notEnded: 'Flow not ended', cancel: 'Cancel', confirm: 'Confirm', nameRequired: 'Enter a task name', opinionRequired: 'Enter a note', uploadSizeError: 'Each attachment must be no larger than 20MB', uploadTypeError: 'Only PDF, PNG, and JPG files are supported', success: 'Task created',
        },
        statuses: { pending: 'Pending', 'in-progress': 'In progress', completed: 'Completed', rejected: 'Rejected', recalled: 'Recalled', cancelled: 'Cancelled' },
        priorities: { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' },
        detail: {
          back: 'Task center', overview: 'Task information', description: 'Description', taskContent: 'Task content', attachments: 'Attachments', flow: 'Task flow', records: 'Activity log', handle: 'Handle task', handlingOpinion: 'Handling opinion', uploadResult: 'Upload result', noAttachments: 'No attachments', noOpinion: 'No handling opinion', noRecords: 'No activity records',
          execute: 'Execute task', reject: 'Reject', return: 'Return', finish: 'Finish', recall: 'Recall', transfer: 'Transfer', cancel: 'Cancel task', delete: 'Delete task', transferTo: 'Transfer to', transferOpinion: 'Transfer note', opinion: 'Note', input: 'Enter', submit: 'Submit', notFound: 'Task not found', backToTasks: 'Back to task center', executeSuccess: 'Task is now in progress', deleteSuccess: 'Task deleted', actionSuccess: '{action} successfully', recordCreated: 'Task created and submitted', recordStarted: 'Task processing started', recordApproved: 'Review approved and task completed', recordRejected: 'Materials are incomplete; returned for completion', recordCancelled: 'Task cancelled', recordTransferred: 'Transferred to {member}', rejectMessage: 'Reject this task and return it for completion?', returnMessage: 'Return this task to the previous step?', finishMessage: 'Finish this task? It cannot be handled afterward.', recallMessage: 'Recall this task? It cannot be edited afterward.', cancelMessage: 'Cancel this task? It cannot be handled afterward.', deleteMessage: 'Deletion cannot be undone. Please proceed with caution.',
          breadcrumb: 'Breadcrumb', sideLabel: 'Task supporting information', resultFiles: 'Result files', noResultFiles: 'No result files', uploadUnavailable: 'File upload is not connected yet', attachmentUnavailable: 'Attachment preview and download are not connected yet',
          flowDone: 'Done', flowCurrent: 'In progress', flowPending: 'Pending',
          confirmExecute: 'Confirm execution', transferRequired: 'Select a member to transfer to', transferMessage: 'Transfer this task? The selected member will continue handling it.',
          executeConfirmTitle: 'Execute task "{name}"?', cancelConfirmTitle: 'Cancel task "{name}"?', deleteConfirmTitle: 'Delete task "{name}"?',
          executeMessage: 'The task will move to in progress and an activity record will be added.',
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
