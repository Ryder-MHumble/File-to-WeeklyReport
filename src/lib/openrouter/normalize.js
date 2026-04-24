import { fallbackParse } from '../fallback-parser'
import { toCleanString } from './text-utils'

export function normalizeDocument(parsed, rawText, sensitiveMode) {
  const fallback = fallbackParse(rawText, sensitiveMode)
  const highlights = normalizeHighlights(parsed.highlights)
  const metrics = normalizeMetrics(parsed.metrics)
  const keyPoints = normalizeStringList(parsed.key_points)
  const progressItems = normalizeProgressItems(parsed.progress_items)
  const riskItems = normalizeRiskItems(parsed.risk_items)
  const nextActions = normalizeNextActions(parsed.next_actions)
  const decisionRequests = normalizeStringList(parsed.decision_requests)
  const resourceRequests = normalizeStringList(parsed.resource_requests)
  const sections = normalizeSections(parsed.sections)
  const departmentFocus = toCleanString(parsed.department_focus)
  const audienceFocus = toCleanString(parsed.audience_focus)
  const title = normalizeTitle({
    parsedTitle: toCleanString(parsed.title),
    fallbackTitle: fallback.title,
    departmentFocus,
    sections,
    keyPoints,
    fallback,
  })
  const subtitle = normalizeSubtitle({
    title,
    parsedSubtitle: toCleanString(parsed.subtitle),
    fallbackSubtitle: fallback.subtitle,
    departmentFocus,
    audienceFocus,
    sections,
    fallback,
    rawText,
    sensitiveMode,
  })
  const summary = toCleanString(parsed.summary) || fallback.summary

  return {
    title,
    subtitle,
    summary,
    highlights: highlights.length > 0 ? highlights.slice(0, 3) : fallback.highlights,
    metrics,
    key_points: keyPoints.length > 0 ? keyPoints.slice(0, 8) : fallback.key_points,
    progress_items: progressItems,
    risk_items: riskItems,
    next_actions: nextActions,
    decision_requests: decisionRequests,
    resource_requests: resourceRequests,
    sections: sections.length > 0 ? sections.slice(0, 8) : fallback.sections,
    source_excerpt: rawText.slice(0, 1200),
    sensitive_mode: sensitiveMode,
    department_focus: departmentFocus,
    audience_focus: audienceFocus,
  }
}

function normalizeTitle({ parsedTitle, fallbackTitle, departmentFocus, sections, keyPoints, fallback }) {
  if (parsedTitle && !isWeakReportTitle(parsedTitle)) {
    return parsedTitle
  }

  if (fallbackTitle && !isWeakReportTitle(fallbackTitle)) {
    return fallbackTitle
  }

  const preferredSuffix = detectReportSuffix(parsedTitle) || detectReportSuffix(fallbackTitle) || '周报'
  const topic =
    extractTitleTopic(departmentFocus) ||
    pickLeadTopic(sections) ||
    pickLeadTopic(fallback.sections) ||
    pickLeadTopicFromList(keyPoints) ||
    pickLeadTopicFromList(fallback.key_points) ||
    extractTitleTopic(fallbackTitle) ||
    extractTitleTopic(parsedTitle)

  if (topic) {
    return ensureReportSuffix(topic, preferredSuffix)
  }

  return parsedTitle || fallbackTitle || '未命名周报'
}

function normalizeSubtitle({
  title,
  parsedSubtitle,
  fallbackSubtitle,
  departmentFocus,
  audienceFocus,
  sections,
  fallback,
  rawText,
  sensitiveMode,
}) {
  if (parsedSubtitle && !isWeakSubtitle(parsedSubtitle) && !isSimilarTitleSubtitle(title, parsedSubtitle)) {
    return parsedSubtitle
  }

  if (fallbackSubtitle && !isWeakSubtitle(fallbackSubtitle) && !isSimilarTitleSubtitle(title, fallbackSubtitle)) {
    return fallbackSubtitle
  }

  const period = detectPeriodLabel(rawText)
  const scope =
    extractTitleTopic(departmentFocus) ||
    extractTitleTopic(audienceFocus) ||
    pickLeadTopic(sections) ||
    pickLeadTopic(fallback.sections)

  if (period && scope) {
    return `${period} · ${scope}`
  }

  if (scope) {
    return `${scope} · 本周进展与下周安排`
  }

  if (period) {
    return `${period}进展、风险与计划`
  }

  return sensitiveMode ? '本周重点进展与风险回顾' : '本周进展、风险与下周安排'
}

function normalizeHighlights(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const candidate = item
      const label = toCleanString(candidate.label)
      const metric = toCleanString(candidate.value)
      const detail = toCleanString(candidate.detail)
      if (!label || !metric) {
        return null
      }
      return { label, value: metric, detail }
    })
    .filter((item) => item !== null)
}

function normalizeMetrics(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const candidate = item
      const name = toCleanString(candidate.name)
      const metricValue = toCleanString(candidate.value)
      const trend = toCleanString(candidate.trend)
      const note = toCleanString(candidate.note)
      if (!name || !metricValue) {
        return null
      }
      return { name, value: metricValue, trend, note }
    })
    .filter((item) => item !== null)
}

function normalizeProgressItems(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const candidate = item
      const stream = toCleanString(candidate.stream)
      const status = toCleanString(candidate.status)
      const outcome = toCleanString(candidate.outcome)
      const owner = toCleanString(candidate.owner)
      if (!stream || !status || !outcome) {
        return null
      }
      return { stream, status, outcome, owner }
    })
    .filter((item) => item !== null)
}

function normalizeRiskItems(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const candidate = item
      const risk = toCleanString(candidate.risk)
      const level = toCleanString(candidate.level)
      const mitigation = toCleanString(candidate.mitigation)
      const owner = toCleanString(candidate.owner)
      if (!risk || !mitigation) {
        return null
      }
      return { risk, level, mitigation, owner }
    })
    .filter((item) => item !== null)
}

function normalizeNextActions(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const candidate = item
      const task = toCleanString(candidate.task)
      const deadline = toCleanString(candidate.deadline)
      const owner = toCleanString(candidate.owner)
      const dependency = toCleanString(candidate.dependency)
      if (!task) {
        return null
      }
      return { task, deadline, owner, dependency }
    })
    .filter((item) => item !== null)
}

function normalizeSections(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((section) => {
      if (!section || typeof section !== 'object') {
        return null
      }
      const sectionObj = section
      const itemsRaw = Array.isArray(sectionObj.items) ? sectionObj.items : []
      const items = itemsRaw
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null
          }
          const itemObj = item
          const title = toCleanString(itemObj.title)
          const body = toCleanString(itemObj.body)
          const tag = toCleanString(itemObj.tag)
          if (!title || !body) {
            return null
          }
          return { title, body, tag }
        })
        .filter((item) => item !== null)

      if (items.length === 0) {
        return null
      }

      return {
        title: toCleanString(sectionObj.title) || '未命名分组',
        description: toCleanString(sectionObj.description),
        items: items.slice(0, 6),
      }
    })
    .filter((section) => section !== null)
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((item) => toCleanString(item)).filter(Boolean)
}

function isWeakReportTitle(value) {
  const candidate = stripTitleNoise(value)
  if (!candidate || !/(周报|简报|汇报|报告)/.test(candidate)) {
    return false
  }

  const signal = candidate
    .replace(/(工作|项目|科研|研发|课题|部门|团队|小组|情况|进展|总结|汇总|专项|专题|内部|阶段性?)/g, ' ')
    .replace(/(周报|简报|汇报|报告)/g, ' ')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, '')

  return signal.length < 4
}

function stripTitleNoise(value) {
  return toCleanString(value)
    .replace(/[（(【\[][^）)】\]]*[）)】\]]/g, ' ')
    .replace(/\b\d{4}[./-]\d{1,2}(?:[./-]\d{1,2})?\b/g, ' ')
    .replace(/第?\s*\d+\s*(?:周|期|月|季度|季度报|周报期)/g, ' ')
    .replace(/(本周|本月|本期|周度|月度|季度|年度|双周)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitleTopic(value) {
  const candidate = stripTitleNoise(value)
  if (!candidate) {
    return ''
  }

  const topic = candidate
    .split(/[，。；：|]/)[0]
    .split(/\s{2,}/)[0]
    .split(/[、,]/)[0]
    .replace(/^(聚焦|围绕|关于|针对|当前|重点|推进|继续推进|本部门最该关注|当前受众最关心什么)\s*/g, '')
    .replace(/^(是|为|在)\s*/g, '')
    .replace(/是本(?:周|期|月)[^，。；]*$/g, '')
    .replace(/为本(?:周|期|月)[^，。；]*$/g, '')
    .replace(/需(?:重点)?关注[^，。；]*$/g, '')
    .replace(/需持续跟踪[^，。；]*$/g, '')
    .replace(/(工作|项目|科研|研发|课题)?(周报|简报|汇报|报告)$/g, '')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]+$/g, '')
    .trim()

  if (topic.length < 4) {
    return ''
  }

  return topic.slice(0, 24)
}

function pickLeadTopic(sections) {
  if (!Array.isArray(sections)) {
    return ''
  }

  for (const section of sections) {
    if (!section || typeof section !== 'object') {
      continue
    }

    const sectionTitle = extractTitleTopic(section.title)
    if (sectionTitle && !isGenericSectionTitle(section.title)) {
      return sectionTitle
    }

    const items = Array.isArray(section.items) ? section.items : []
    for (const item of items) {
      const itemTitle = extractTitleTopic(item?.title)
      if (itemTitle && !isWeakReportTitle(itemTitle)) {
        return itemTitle
      }
    }
  }

  return ''
}

function pickLeadTopicFromList(values) {
  if (!Array.isArray(values)) {
    return ''
  }

  for (const value of values) {
    const topic = extractTitleTopic(value)
    if (topic) {
      return topic
    }
  }

  return ''
}

function isGenericSectionTitle(value) {
  return /^(自动结构化结果|本周重点进展|重点进展|问题与风险|风险与问题|下周计划|工作计划|执行总览|内部推进|协同联动|体系建设|决策与保障)$/.test(
    toCleanString(value),
  )
}

function detectReportSuffix(value) {
  const matched = toCleanString(value).match(/(周报|简报|汇报|报告)$/)
  return matched?.[1] || ''
}

function ensureReportSuffix(topic, suffix) {
  if (/(周报|简报|汇报|报告)$/.test(topic)) {
    return topic
  }
  return `${topic}${suffix || '周报'}`
}

function isWeakSubtitle(value) {
  const candidate = toCleanString(value)
  if (!candidate) {
    return true
  }

  if (
    /(自动整理的结构化周报|敏感模式下的保守表达周报|Doc2Brief 自动生成报告|本周进展、风险与下周安排|本周重点进展与风险回顾)/.test(
      candidate,
    )
  ) {
    return true
  }

  if (isWeakReportTitle(candidate)) {
    return true
  }

  const signal = normalizeForCompare(candidate)
    .replace(/(本周|周度|月度|本期|阶段|对象|范围|聚焦|进展|风险|计划|安排|情况|回顾)/g, '')
    .trim()

  return signal.length < 4
}

function isSimilarTitleSubtitle(title, subtitle) {
  const normalizedTitle = normalizeForCompare(title)
  const normalizedSubtitle = normalizeForCompare(subtitle)
  if (!normalizedTitle || !normalizedSubtitle) {
    return false
  }

  return (
    normalizedTitle === normalizedSubtitle ||
    normalizedTitle.includes(normalizedSubtitle) ||
    normalizedSubtitle.includes(normalizedTitle)
  )
}

function normalizeForCompare(value) {
  return toCleanString(value)
    .toLowerCase()
    .replace(/(工作|项目|科研|研发|课题)?(周报|简报|汇报|报告)/g, '')
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '')
    .trim()
}

function detectPeriodLabel(rawText) {
  const text = toCleanString(rawText)
  const explicitRange = text.match(/\d{4}[./-]\d{1,2}[./-]\d{1,2}\s*(?:至|到|~|-)\s*\d{1,2}[./-]\d{1,2}/)
  if (explicitRange) {
    return explicitRange[0]
  }

  const explicitWeek = text.match(/第?\s*\d+\s*周/)
  if (explicitWeek) {
    return explicitWeek[0].replace(/\s+/g, '')
  }

  const explicitMonth = text.match(/\d{4}年\d{1,2}月/)
  if (explicitMonth) {
    return explicitMonth[0]
  }

  if (/本周/.test(text)) {
    return '本周'
  }

  return '周度'
}
