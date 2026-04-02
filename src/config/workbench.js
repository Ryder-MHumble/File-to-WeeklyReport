import { templateCatalog } from '../lib/templates'

const templateMap = new Map(templateCatalog.map((item) => [item.id, item]))
const previewVariantMap = {
  'template-01': 'project-pulse',
  'template-02': 'dark-tech',
  'template-03': 'minimal-brief',
  'template-04': 'exec-summary',
  'template-05': 'business-pro',
  'template-06': 'data-insight',
  'template-07': 'project-pulse',
  'template-08': 'business-pro',
  'template-09': 'dark-tech',
  'template-10': 'exec-summary',
}

export const generationModeCatalog = [
  { id: 'structured-template', name: '模板生成', description: '结构化后套用模板，输出最稳定。' },
  { id: 'llm-html', name: 'LLM 生成', description: '模型直接返回 HTML，表达更自由。' },
]

export const styleCatalog = [
  {
    id: 'official',
    name: '正式稳重',
    description: '偏管理层汇报，强调事实和结论。',
    promptHint: '整体语气正式稳重，强调事实与执行结果。',
  },
  {
    id: 'data-driven',
    name: '数据导向',
    description: '优先强调数字、完成度和趋势。',
    promptHint: '优先提炼量化指标、完成度、同比环比等数值信息。',
  },
  {
    id: 'narrative',
    name: '叙事表达',
    description: '适合对外沟通，突出主线与阶段故事。',
    promptHint: '更强调叙事主线、阶段成果和上下文关系。',
  },
]

export const departmentCatalog = [
  { id: 'education-management-center', name: '教科人管理中心', description: '教学、科研与人才条线统筹管理' },
  { id: 'science-research-center', name: '科学研究中心', description: '课题管线、成果产出、学术平台建设' },
  { id: 'industry-development-center', name: '产业发展中心', description: '产学研合作、成果转化、生态拓展' },
  { id: 'intelligent-innovation-center', name: '智能创新中心', description: 'AI 创新项目、技术中台、产品试点' },
  { id: 'administration-management-center', name: '行政管理中心', description: '行政运营、制度执行、资源保障' },
  { id: 'party-ideology-supervision-center', name: '党建思政与监督中心', description: '党建思政、合规监督、廉政闭环' },
  { id: 'strategy-center', name: '战略中心', description: '战略规划、跨中心协同、重大项目推进' },
]

export const audienceCatalog = [
  { id: 'director', name: '院长/主任', description: '先结论后细节，强调决策事项' },
  { id: 'executive', name: '分管领导', description: '强调目标达成度与资源投入产出' },
  { id: 'operations', name: '执行负责人', description: '强调责任人、节点、落地状态' },
  { id: 'risk', name: '风控合规负责人', description: '强调风险等级与应对闭环' },
]

export const templateOptionCatalog = templateCatalog
  .map((item) => ({
    id: item.id,
    previewKey: previewVariantMap[item.id] ?? 'minimal-brief',
    name: item.name,
    description: item.focus,
    styleBadge: item.renderer,
    sceneBadge: item.bestFor,
    templateMeta: templateMap.get(item.id),
  }))
  .filter((item) => item.templateMeta)

export const recentReportStorageKey = 'reportflow-recent-reports'
