import { getAudienceProfile, getDepartmentProfile, getStyleProfile } from './config'

function normalizePromptProfile(promptProfile) {
  return promptProfile === 'v2' ? 'v2' : 'v1'
}

export function buildStructuredMessages(params) {
  const { rawText, sensitiveMode, styleMeta, templateMeta, context, promptProfile } = params
  const profile = normalizePromptProfile(promptProfile)
  const styleProfile = getStyleProfile(styleMeta.id)
  const departmentProfile = getDepartmentProfile(context.department)
  const audienceProfile = getAudienceProfile(context.audience)
  const modeNote = sensitiveMode
    ? '敏感表达模式开启：描述需克制、客观、可追溯，不使用夸张措辞。'
    : '标准表达模式：可以有展示感，但不得编造事实。'

  const schema =
    '{"title":"","subtitle":"","summary":"","department_focus":"","audience_focus":"",' +
    '"highlights":[{"label":"","value":"","detail":""}],' +
    '"metrics":[{"name":"","value":"","trend":"","note":""}],' +
    '"key_points":[""],' +
    '"progress_items":[{"stream":"","status":"","outcome":"","owner":""}],' +
    '"risk_items":[{"risk":"","level":"","mitigation":"","owner":""}],' +
    '"next_actions":[{"task":"","deadline":"","owner":"","dependency":""}],' +
    '"decision_requests":[""],"resource_requests":[""],' +
    '"sections":[{"title":"","description":"","items":[{"title":"","body":"","tag":""}]}]}'

  const systemLines = [
    '你是 file2web 的“周报结构化抽取总编”，负责把原文提炼成稳定、可追溯的 JSON 报告数据。',
    '',
    '【输出协议】',
    '- 必须只输出一个 JSON 对象，不得输出 Markdown、解释、代码块或前后说明。',
    '- 所有字段必须出现，缺失值用空字符串或空数组补齐。',
    `- JSON 结构（不可改字段名）：${schema}`,
    '',
    '【抽取与归一化规则】',
    '1. 事实优先：只能提炼原文事实，不得编造数字、单位、人名、结论。',
    '2. 冲突保守：原文有冲突时优先使用更明确、更可核验的信息，并保持措辞保守。',
    '3. 结构稳定：highlights 固定 3 条；metrics 建议 3-6 条；sections 建议 5-8 组。',
    '4. 可执行性：progress_items/risk_items/next_actions 尽量补齐 owner 或 dependency。',
    '5. 可追溯性：summary、highlights、decision_requests 必须能在原文中找到依据。',
    '6. 紧凑输出：summary 控制在 90-180 字；每个 items.body 建议 30-90 字。',
    '7. 禁止把整段原文逐字复制到单个字段，必须做信息压缩与归纳。',
    '',
    '【组织上下文自动适配】',
    `- 部门：${departmentProfile.name}`,
    `- 部门职责：${departmentProfile.mission}`,
    `- 部门重点：${departmentProfile.priorities.join('；')}`,
    `- 重点指标：${departmentProfile.keyMetrics.join('；')}`,
    `- 风险关注：${departmentProfile.riskFocus.join('；')}`,
    `- 受众：${audienceProfile.name}`,
    `- 阅读偏好：${audienceProfile.preference}`,
    `- 决策关注：${audienceProfile.decisionFocus}`,
    `- 高频追问：${audienceProfile.followUps.join('；')}`,
    `- 风格策略：${styleProfile.name}`,
    `- 语言策略：${styleProfile.languageStrategy}`,
    `- 结构策略：${styleProfile.structureStrategy}`,
    `- 表达禁忌：${styleProfile.forbidden}`,
    `- 风格补充：${styleMeta.promptHint}`,
    '',
    '【模板参考（仅用于调整重点，不改变 JSON 架构）】',
    `- 模板侧重点：${templateMeta.focus}`,
    `- 模块蓝图：${templateMeta.moduleBlueprint.join(' -> ')}`,
    context.customRequirement ? `- 额外业务要求：${context.customRequirement}` : '- 额外业务要求：无。',
    '',
    '【质量门槛】',
    '- department_focus 和 audience_focus 各输出 1 句，明确“本部门最该关注什么”“当前受众最关心什么”。',
    '- 若原文信息不足，保持字段为空或写“待补充”，不得猜测。',
  ]

  if (profile === 'v2') {
    systemLines.push(
      '',
      '【V2 质量增强协议】',
      '- 输出必须以 { 开始并以 } 结束，不得携带任何前后缀。',
      '- decision_requests 和 resource_requests 必须可执行，优先用“动作 + 时间 + 对象”的句式。',
      '- sections 每组 items 控制在 2-6 条，优先高信号信息，不要流水账。',
      '- 若无法确认责任人或时间，明确写“待补充”，不要隐式猜测。',
    )
  }

  const userLines = [modeNote, '请按上述要求结构化整理以下周报原文，并直接返回 JSON：', rawText]
  if (profile === 'v2') {
    userLines.unshift('请在输出前自检 JSON 合法性，确保可被 JSON.parse 直接解析。')
  }

  return [
    { role: 'system', content: systemLines.join('\n') },
    { role: 'user', content: userLines.join('\n\n') },
  ]
}

export function buildStructuredRetryMessages(params) {
  const { rawText, styleMeta, templateMeta, context, brokenOutput, promptProfile } = params
  const profile = normalizePromptProfile(promptProfile)
  const styleProfile = getStyleProfile(styleMeta.id)
  const departmentProfile = getDepartmentProfile(context.department)
  const audienceProfile = getAudienceProfile(context.audience)

  const schema =
    '{"title":"","subtitle":"","summary":"","department_focus":"","audience_focus":"",' +
    '"highlights":[{"label":"","value":"","detail":""}],' +
    '"metrics":[{"name":"","value":"","trend":"","note":""}],' +
    '"key_points":[""],' +
    '"progress_items":[{"stream":"","status":"","outcome":"","owner":""}],' +
    '"risk_items":[{"risk":"","level":"","mitigation":"","owner":""}],' +
    '"next_actions":[{"task":"","deadline":"","owner":"","dependency":""}],' +
    '"decision_requests":[""],"resource_requests":[""],' +
    '"sections":[{"title":"","description":"","items":[{"title":"","body":"","tag":""}]}]}'

  const systemLines = [
    '你是 JSON 修复与压缩器。你将根据原文重新生成一个完整 JSON，不要沿用损坏输出。',
    '必须只输出一个合法 JSON 对象，不要任何解释、代码块、注释。',
    `JSON 结构（字段名不可改）：${schema}`,
    '硬性要求：',
    '1. summary 90-160 字；highlights 固定 3 条；sections 4-6 组。',
    '2. 每个 items.body 30-80 字，禁止整段复制原文。',
    '3. 信息必须来自原文，不得编造。',
    `4. 部门：${departmentProfile.name}；重点：${departmentProfile.priorities.join('、')}`,
    `5. 受众：${audienceProfile.name}；关注：${audienceProfile.decisionFocus}`,
    `6. 风格：${styleProfile.name}；策略：${styleProfile.languageStrategy}`,
    `7. 模板侧重：${templateMeta.focus}`,
  ]

  if (profile === 'v2') {
    systemLines.push('8. 若字段无法确认则使用空字符串、空数组或“待补充”，不得生成无法追溯的断言。')
    systemLines.push('9. 输出前检查括号、引号、逗号完整性，确保 JSON 一次解析成功。')
  }

  const userLines = ['以下是原始正文：', rawText, '以下是损坏输出（仅供参考，可忽略）：', brokenOutput]
  if (profile === 'v2') {
    userLines.push('请直接返回修复后的 JSON，对损坏内容可完全重写。')
  }

  return [
    { role: 'system', content: systemLines.join('\n') },
    { role: 'user', content: userLines.join('\n\n') },
  ]
}

export function buildStructuredRepairMessages(params) {
  const { rawText, styleMeta, templateMeta, context, brokenOutput, promptProfile } = params
  const profile = normalizePromptProfile(promptProfile)
  const styleProfile = getStyleProfile(styleMeta.id)
  const departmentProfile = getDepartmentProfile(context.department)
  const audienceProfile = getAudienceProfile(context.audience)

  const schema =
    '{"title":"","subtitle":"","summary":"","department_focus":"","audience_focus":""' +
    ',"highlights":[{"label":"","value":"","detail":""}]' +
    ',"metrics":[{"name":"","value":"","trend":"","note":""}]' +
    ',"key_points":[""]' +
    ',"progress_items":[{"stream":"","status":"","outcome":"","owner":""}]' +
    ',"risk_items":[{"risk":"","level":"","mitigation":"","owner":""}]' +
    ',"next_actions":[{"task":"","deadline":"","owner":"","dependency":""}]' +
    ',"decision_requests":[""],"resource_requests":[""]' +
    ',"sections":[{"title":"","description":"","items":[{"title":"","body":"","tag":""}]}]}'

  const systemLines = [
    '你是 JSON 修复器，只负责把“损坏或截断的结构化输出”修复成一个可 JSON.parse 的完整对象。',
    '只能输出 JSON 对象本体，不得输出解释、代码块、注释。',
    `字段结构固定如下（字段名不可改）：${schema}`,
    '修复规则：',
    '1. 优先保留损坏输出里已有信息，不得随意改写事实。',
    '2. 无法确认的信息填空字符串、空数组或“待补充”。',
    '3. 确保括号、引号、逗号完整，最终可被 JSON.parse 一次成功。',
    `4. 部门：${departmentProfile.name}；受众：${audienceProfile.name}`,
    `5. 风格：${styleProfile.name}；模板侧重：${templateMeta.focus}`,
  ]

  if (profile === 'v2') {
    systemLines.push('6. sections 建议 4-6 组，禁止把整段原文复制到单字段。')
    systemLines.push('7. decision_requests 与 resource_requests 优先输出可执行语句。')
  }

  const userLines = [
    '以下是损坏输出，请修复为合法 JSON：',
    brokenOutput.slice(0, 14000),
  ]

  if (rawText) {
    userLines.push('以下是原始正文片段（用于校验事实，不要求逐字覆盖）：')
    userLines.push(rawText.slice(0, 1800))
  }

  return [
    { role: 'system', content: systemLines.join('\n') },
    { role: 'user', content: userLines.join('\n\n') },
  ]
}

export function buildStructuredPolishMessages(params) {
  const { rawText, styleMeta, templateMeta, context, promptProfile, structuredDraft } = params
  const profile = normalizePromptProfile(promptProfile)
  const styleProfile = getStyleProfile(styleMeta.id)
  const departmentProfile = getDepartmentProfile(context.department)
  const audienceProfile = getAudienceProfile(context.audience)

  const schema =
    '{"title":"","subtitle":"","summary":"","department_focus":"","audience_focus":"","highlights":[{"label":"","value":"","detail":""}],' +
    '"metrics":[{"name":"","value":"","trend":"","note":""}],"key_points":[""],' +
    '"progress_items":[{"stream":"","status":"","outcome":"","owner":""}],' +
    '"risk_items":[{"risk":"","level":"","mitigation":"","owner":""}],' +
    '"next_actions":[{"task":"","deadline":"","owner":"","dependency":""}],' +
    '"decision_requests":[""],"resource_requests":[""],' +
    '"sections":[{"title":"","description":"","items":[{"title":"","body":"","tag":""}]}]}'

  const systemLines = [
    '你是“周报结构化润色编辑”。请基于原文与已有草稿 JSON，输出更可读、更可执行的最终 JSON。',
    '只允许输出一个合法 JSON 对象，禁止输出解释、代码块、注释。',
    `字段结构固定（不可改字段名）：${schema}`,
    '',
    '润色与补全规则：',
    '1. 事实不可编造：数字、时间、结论必须来自原文或草稿可追溯信息。',
    '2. 允许表达升级：在不改变事实前提下，优化措辞、压缩冗余、增强管理层可读性。',
    '3. 缺失字段要补齐：无法确认的责任人/时间/依赖统一写“待补充”，不要留空。',
    '4. summary 建议 110-200 字；highlights 固定 3 条；metrics 建议 3-6 条。',
    '5. sections 建议 5-8 组，每组 items 建议 2-6 条，每条 body 建议 35-100 字。',
    '6. decision_requests/resource_requests 要可执行，优先“动作 + 时间 + 对象”句式。',
    '',
    `部门：${departmentProfile.name}；重点：${departmentProfile.priorities.join('、')}`,
    `受众：${audienceProfile.name}；关注：${audienceProfile.decisionFocus}`,
    `风格：${styleProfile.name}；语言策略：${styleProfile.languageStrategy}`,
    `模板侧重点：${templateMeta.focus}`,
  ]

  if (profile === 'v2') {
    systemLines.push('7. 输出前做 JSON 完整性自检，确保可直接 JSON.parse。')
    systemLines.push('8. sections 中优先保留高信号事项，避免流水账。')
  }

  const userLines = [
    '以下是原文（节选）：',
    rawText.slice(0, 8000),
    '以下是结构化草稿 JSON：',
    structuredDraft.slice(0, 14000),
    '请输出润色后的最终 JSON：',
  ]

  return [
    { role: 'system', content: systemLines.join('\n') },
    { role: 'user', content: userLines.join('\n\n') },
  ]
}

export function buildHtmlMessages(params) {
  const { rawText, sensitiveMode, styleMeta, templateMeta, context, promptProfile } = params
  const profile = normalizePromptProfile(promptProfile)
  const styleProfile = getStyleProfile(styleMeta.id)
  const departmentProfile = getDepartmentProfile(context.department)
  const audienceProfile = getAudienceProfile(context.audience)

  const modeNote = sensitiveMode
    ? '敏感表达模式开启：文字必须克制、可核验，避免情绪化措辞。'
    : '标准表达模式：可以保持专业表达，但所有事实必须源于原文。'

  const systemLines = [
    '你是“企业周报 HTML 生成器”，擅长把原文事实整理成稳定、可读、可导出的单页 HTML 周报。',
    '',
    '【输出协议】',
    '- 只能输出完整 HTML 文档，不要输出解释、Markdown、代码块。',
    '- 必须包含 <!doctype html><html><head><body>。',
    '- 所有文本为中文。',
    '',
    '【事实约束】',
    '- 仅可使用原文信息，不得编造数字、时间、责任人、结论。',
    '- 缺失信息写“待补充”，不要猜测。',
    '',
    '【页面结构（必须包含）】',
    '- 摘要结论',
    '- 关键指标（3-6 个指标卡片）',
    '- 重点进展',
    '- 风险与应对',
    '- 下周计划',
    '- 决策请求',
    '',
    '【布局与样式】',
    '- 使用 CSS 变量定义色板、文字层级、边框层级。',
    '- 用 div + grid/flex 布局，禁止 table。',
    '- 移动端可读（max-width: 900px），包含 @media print。',
    '- 可选内联 SVG 做轻量可视化，但不能依赖 <script> 才能阅读核心内容。',
    '- 整体风格稳重专业，避免“营销海报感”与过度装饰。',
    '- 严禁逐段复制原文；每个模块提炼 3-6 条要点，单条建议 25-80 字。',
    '- 页面正文需信息压缩，避免超长堆砌（建议正文总量 1200-2200 中文字符）。',
    '',
    '【组织上下文】',
    `- 部门：${departmentProfile.name}`,
    `- 部门职责：${departmentProfile.mission}`,
    `- 部门重点：${departmentProfile.priorities.join('；')}`,
    `- 重点指标：${departmentProfile.keyMetrics.join('；')}`,
    `- 风险关注：${departmentProfile.riskFocus.join('；')}`,
    `- 受众：${audienceProfile.name}`,
    `- 阅读偏好：${audienceProfile.preference}`,
    `- 决策关注：${audienceProfile.decisionFocus}`,
    `- 建议阅读顺序：${audienceProfile.sectionOrder.join(' -> ')}`,
    `- 高频追问：${audienceProfile.followUps.join('；')}`,
    `- 风格策略：${styleProfile.name}`,
    `- 语言策略：${styleProfile.languageStrategy}`,
    `- 结构策略：${styleProfile.structureStrategy}`,
    `- 表达禁忌：${styleProfile.forbidden}`,
    `- 风格补充：${styleMeta.promptHint}`,
    '',
    '【模板参考（仅组织信息，不要求复刻视觉）】',
    `- 参考模板：${templateMeta.title}`,
    `- 模板侧重点：${templateMeta.focus}`,
    `- 模块蓝图：${templateMeta.moduleBlueprint.join(' -> ')}`,
    context.customRequirement ? `- 额外业务要求：${context.customRequirement}` : '- 额外业务要求：无。',
  ]

  if (profile === 'v2') {
    systemLines.push(
      '',
      '【V2 质量增强协议】',
      '- 必须为单页完整文档，不得依赖外链 CSS/JS/CDN。',
      '- 每个核心模块必须有标题和 2 条以上要点，避免空模块。',
      '- 关键指标区需包含“指标名 + 数值 + 解释”三个元素。',
      '- 不允许使用 script 执行后才可见核心内容。',
      '- 输出前检查闭合标签，确保 </body></html> 完整。',
    )
  }

  const userLines = [
    modeNote,
    '请根据以下原文生成完整 HTML 周报页面：',
    rawText,
    '再次强调：只输出 HTML 文档本体，不要输出解释。',
  ]
  if (profile === 'v2') {
    userLines.push('请优先保证信息密度与可读性平衡，避免内容重复。')
  }

  return [
    { role: 'system', content: systemLines.join('\n') },
    { role: 'user', content: userLines.join('\n\n') },
  ]
}

export function buildHtmlRepairMessages(params) {
  const { rawText, brokenOutput, qualityReason, styleMeta, templateMeta, context, promptProfile } = params
  const profile = normalizePromptProfile(promptProfile)
  const styleProfile = getStyleProfile(styleMeta.id)
  const departmentProfile = getDepartmentProfile(context.department)
  const audienceProfile = getAudienceProfile(context.audience)

  const systemLines = [
    '你是“HTML 周报修复器”。你的任务是把已有损坏输出修复为高可读、结构完整的周报 HTML。',
    '',
    '【修复目标】',
    '- 仅输出完整 HTML 文档（必须含 <!doctype html><html><head><body>）。',
    '- 保留原文事实，不得编造。',
    '- 缺失信息写“待补充”。',
    '- 必须包含以下模块：摘要结论、关键指标、重点进展、风险与应对、下周计划、决策请求。',
    '- 指标区至少 3 个卡片；页面需可响应式并包含 @media print。',
    '- 禁止输出 Markdown、解释、注释说明。',
    '- 避免逐段粘贴原文，统一做信息压缩与归纳。',
    '- 页面正文建议控制在 1200-2200 中文字符。',
    '',
    '【上下文】',
    `- 部门：${departmentProfile.name}`,
    `- 受众：${audienceProfile.name}`,
    `- 决策关注：${audienceProfile.decisionFocus}`,
    `- 风格：${styleProfile.name}（${styleMeta.promptHint}）`,
    `- 模板侧重点：${templateMeta.focus}`,
  ]

  if (profile === 'v2') {
    systemLines.push('- 必须修复所有标签闭合和文档结构缺口，禁止残缺输出。')
    systemLines.push('- 优先重写有问题片段，不要局部缝补导致结构继续不一致。')
  }

  const userLines = [
    `当前质量问题：${qualityReason}`,
    '原始正文：',
    rawText,
    '当前损坏输出（供参考，可重写）：',
    brokenOutput.slice(0, 12000),
    '请直接输出修复后的完整 HTML 文档。',
  ]

  return [
    { role: 'system', content: systemLines.join('\n') },
    { role: 'user', content: userLines.join('\n\n') },
  ]
}
