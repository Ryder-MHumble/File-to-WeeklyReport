const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_HTML_MODEL = 'minimax/minimax-m2.7'
const DEFAULT_STRUCTURED_MODEL = 'minimax/minimax-m2.7'
const DEFAULT_POLISH_MODEL = ''
const DEFAULT_POSTER_BRIEF_MODEL = DEFAULT_STRUCTURED_MODEL
const DEFAULT_POSTER_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'
const DEFAULT_PROMPT_PROFILE = 'auto'
const DEFAULT_HTML_MAX_TOKENS_FALLBACK = 7200
const PROMPT_PROFILE_SET = new Set(['auto', 'v1', 'v2'])
const MODEL_MAX_COMPLETION_TOKENS = {
  'minimax/minimax-m2.7': 131072,
  'minimax/minimax-m2.7-20260318': 131072,
}

export const OPENROUTER_BASE_URL = (
  import.meta.env.OPENROUTER_BASE_URL || import.meta.env.MINIMAX_BASE_URL || DEFAULT_BASE_URL
).replace(/\/$/, '')
export const OPENROUTER_HTML_MODEL =
  import.meta.env.OPENROUTER_HTML_MODEL || import.meta.env.MINIMAX_HTML_MODEL || DEFAULT_HTML_MODEL
export const OPENROUTER_STRUCTURED_MODEL =
  import.meta.env.OPENROUTER_STRUCTURED_MODEL ||
  import.meta.env.MINIMAX_STRUCTURED_MODEL ||
  import.meta.env.OPENROUTER_MODEL ||
  import.meta.env.MINIMAX_MODEL ||
  DEFAULT_STRUCTURED_MODEL
export const OPENROUTER_POLISH_MODEL =
  normalizeOptionalString(import.meta.env.OPENROUTER_POLISH_MODEL || import.meta.env.MINIMAX_POLISH_MODEL || DEFAULT_POLISH_MODEL)
export const OPENROUTER_POSTER_BRIEF_MODEL = normalizeOptionalString(
  import.meta.env.OPENROUTER_POSTER_BRIEF_MODEL || DEFAULT_POSTER_BRIEF_MODEL,
)
export const OPENROUTER_POSTER_IMAGE_MODEL = normalizeOptionalString(
  import.meta.env.OPENROUTER_POSTER_IMAGE_MODEL || DEFAULT_POSTER_IMAGE_MODEL,
)
export const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY || import.meta.env.MINIMAX_API_KEY || ''
export const OPENROUTER_HTML_MAX_TOKENS = normalizePositiveInteger(
  import.meta.env.OPENROUTER_HTML_MAX_TOKENS || import.meta.env.MINIMAX_HTML_MAX_TOKENS,
)
export const OPENROUTER_PROMPT_PROFILE = normalizePromptProfile(
  import.meta.env.OPENROUTER_PROMPT_PROFILE || DEFAULT_PROMPT_PROFILE,
)

const STYLE_PROFILES = {
  official: {
    name: '正式稳重',
    languageStrategy: '用词客观克制、先结论后依据、避免口号化修饰。',
    structureStrategy: '按“结论-进展-风险-动作-请求”组织内容，层级清晰。',
    forbidden: '避免夸张词、感叹句和未经证实的价值判断。',
    htmlVisualDirection: '深色商务与低饱和科技蓝，模块分区清楚，信息密度中等偏高。',
  },
  'data-driven': {
    name: '数据导向',
    languageStrategy: '以指标和趋势为主语，强调对比关系、完成度与波动解释。',
    structureStrategy: '优先呈现指标面板，再展开进展、风险和投入产出。',
    forbidden: '避免只有形容词没有数据支撑的描述。',
    htmlVisualDirection: '指标卡片优先、对比色突出关键数字、图表占比可更高。',
  },
  narrative: {
    name: '叙事表达',
    languageStrategy: '保持事实前提下构建主线，突出阶段变化与关键转折。',
    structureStrategy: '按“背景-动作-结果-下一步”叙事，增强可读性。',
    forbidden: '避免剧情化虚构、避免脱离原文的故事延展。',
    htmlVisualDirection: '章节叙事块与时间线结合，视觉节奏更连续。',
  },
}

const DEPARTMENT_PROFILES = {
  'education-management-center': {
    name: '教学科研管理中心',
    mission: '统筹教学、科研与人才工作，确保政策与资源协同落地。',
    priorities: ['教学与科研协同推进', '人才引育留用机制', '跨条线任务闭环'],
    keyMetrics: ['重点任务完成率', '人才项目推进数', '政策执行闭环率'],
    riskFocus: ['跨条线协调延迟', '关键岗位人力紧张', '制度执行不一致'],
  },
  'science-research-center': {
    name: '科学研究中心',
    mission: '推动科研项目全周期管理与成果高质量产出。',
    priorities: ['课题立项与里程碑', '论文专利与成果转化', '平台与团队建设'],
    keyMetrics: ['在研课题阶段达成率', '成果产出数量与质量', '项目经费执行进度'],
    riskFocus: ['关键里程碑延期', '成果转化周期拉长', '科研资源配置不足'],
  },
  'industry-development-center': {
    name: '产业发展中心',
    mission: '促进产学研合作与产业化落地，扩大外部生态影响力。',
    priorities: ['合作项目拓展', '成果转化签约落地', '产业生态协同'],
    keyMetrics: ['新增合作项目数', '转化合同金额/数量', '合作项目履约率'],
    riskFocus: ['合作推进不及预期', '商务条款风险', '外部依赖过高'],
  },
  'intelligent-innovation-center': {
    name: '智能创新中心',
    mission: '推进智能化创新项目，建设可复用技术能力和试点场景。',
    priorities: ['创新项目孵化', '技术中台建设', '场景试点验证'],
    keyMetrics: ['试点项目上线率', '模型/算法迭代效率', '技术复用率'],
    riskFocus: ['技术验证周期超预期', '数据质量与可用性不足', '算力与工程资源瓶颈'],
  },
  'administration-management-center': {
    name: '行政管理中心',
    mission: '提供行政运营与资源保障，提升组织运行效率。',
    priorities: ['行政流程效率', '预算采购与资产保障', '制度执行与服务质量'],
    keyMetrics: ['流程平均周期', '预算执行率', '服务响应与满意度'],
    riskFocus: ['流程堵点反复出现', '采购履约风险', '跨部门协作成本上升'],
  },
  'party-ideology-supervision-center': {
    name: '党建思政与监督中心',
    mission: '加强党建思政引领与监督闭环，保障合规与廉政要求落实。',
    priorities: ['党建思政活动落实', '监督检查闭环', '问题整改跟踪'],
    keyMetrics: ['监督问题闭环率', '整改按期完成率', '重点事项覆盖率'],
    riskFocus: ['整改超期', '监督盲区', '制度执行偏差'],
  },
  'strategy-center': {
    name: '战略中心',
    mission: '负责中长期战略规划与重大项目统筹，驱动跨中心协同。',
    priorities: ['战略任务分解', '重点项目推进', '跨中心资源协调'],
    keyMetrics: ['战略里程碑达成率', '重大项目推进率', '跨中心协同效率'],
    riskFocus: ['战略落地节奏偏慢', '关键资源冲突', '重大项目依赖风险'],
  },
}

const LEGACY_DEPARTMENT_ALIASES = {
  research: 'science-research-center',
  teaching: 'education-management-center',
  international: 'industry-development-center',
  talent: 'education-management-center',
  operations: 'administration-management-center',
  comprehensive: 'strategy-center',
}

const AUDIENCE_PROFILES = {
  director: {
    name: '院长/主任',
    preference: '先看结论与风险，再看关键支撑事实。',
    decisionFocus: '本周最重要进展、主要风险、需要拍板事项。',
    followUps: ['是否影响年度目标', '是否需要跨部门协调', '是否需要资源倾斜'],
    sectionOrder: ['摘要结论', '关键指标', '风险与决策请求', '下周动作'],
  },
  executive: {
    name: '分管领导',
    preference: '关注任务达成度、阻塞点和投入产出。',
    decisionFocus: '关键任务是否按计划推进、阻塞点如何解除。',
    followUps: ['责任人是否明确', '时间节点是否可信', '资源投入是否匹配'],
    sectionOrder: ['目标进展', '执行状态', '阻塞与依赖', '资源诉求'],
  },
  operations: {
    name: '执行负责人',
    preference: '关注可执行清单、责任与时间点。',
    decisionFocus: '本周完成项、未完成原因、下周排期与依赖。',
    followUps: ['具体责任人是谁', '最晚完成时间', '需要谁配合'],
    sectionOrder: ['任务清单', '进展明细', '风险闭环', '下周排期'],
  },
  risk: {
    name: '风控合规负责人',
    preference: '关注风险等级、触发条件、应对动作与证据。',
    decisionFocus: '高风险事项是否已闭环、是否存在合规缺口。',
    followUps: ['风险触发阈值', '缓释措施有效性', '整改节点是否可审计'],
    sectionOrder: ['风险总览', '高风险明细', '整改动作', '监督节点'],
  },
}

export function getStyleProfile(styleId) {
  return STYLE_PROFILES[styleId] || STYLE_PROFILES.official
}

export function getDepartmentProfile(departmentId) {
  const normalized = LEGACY_DEPARTMENT_ALIASES[departmentId] || departmentId
  return DEPARTMENT_PROFILES[normalized] || DEPARTMENT_PROFILES['science-research-center']
}

export function getAudienceProfile(audienceId) {
  return AUDIENCE_PROFILES[audienceId] || AUDIENCE_PROFILES.director
}

export function chooseMaxTokens(rawText, mode) {
  if (mode === 'llm-html') {
    return resolveHtmlMaxTokens()
  }

  if (rawText.length <= 2000) {
    return 2600
  }
  if (rawText.length <= 6000) {
    return 3800
  }
  if (rawText.length <= 12000) {
    return 4600
  }
  return 5600
}

export function resolvePromptProfile(params) {
  const { mode, rawText, context } = params
  const normalizedContextProfile = normalizePromptProfile(context?.promptProfile)
  if (normalizedContextProfile !== 'auto') {
    return { profile: normalizedContextProfile, source: 'context-override', bucket: -1 }
  }

  if (OPENROUTER_PROMPT_PROFILE !== 'auto') {
    return { profile: OPENROUTER_PROMPT_PROFILE, source: 'env-override', bucket: -1 }
  }

  const textLength = rawText.length
  if ((mode === 'structured-template' && textLength >= 4200) || (mode === 'llm-html' && textLength >= 5600)) {
    return { profile: 'v2', source: 'auto-long-text', bucket: -1 }
  }

  const hashSeed = `${mode}|${context?.department || ''}|${context?.audience || ''}|${rawText.slice(0, 600)}`
  const hash = simpleHash(hashSeed)
  const bucket = hash % 2
  return { profile: bucket === 0 ? 'v1' : 'v2', source: 'auto-ab', bucket }
}

function resolveHtmlMaxTokens() {
  if (OPENROUTER_HTML_MAX_TOKENS) {
    return OPENROUTER_HTML_MAX_TOKENS
  }

  const modelId = String(OPENROUTER_HTML_MODEL || '').trim().toLowerCase()
  if (MODEL_MAX_COMPLETION_TOKENS[modelId]) {
    return MODEL_MAX_COMPLETION_TOKENS[modelId]
  }

  return DEFAULT_HTML_MAX_TOKENS_FALLBACK
}

function normalizePromptProfile(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!PROMPT_PROFILE_SET.has(text)) {
    return DEFAULT_PROMPT_PROFILE
  }
  return text
}

function normalizePositiveInteger(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }
  return parsed
}

function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function simpleHash(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}
