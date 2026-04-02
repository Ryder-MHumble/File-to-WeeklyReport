import { fallbackParse } from '../fallback-parser'
import { toCleanString } from './text-utils'

export function normalizeDocument(parsed, rawText, sensitiveMode) {
  const fallback = fallbackParse(rawText, sensitiveMode)

  const title = toCleanString(parsed.title) || fallback.title
  const subtitle = toCleanString(parsed.subtitle) || fallback.subtitle
  const summary = toCleanString(parsed.summary) || fallback.summary

  const highlights = normalizeHighlights(parsed.highlights)
  const metrics = normalizeMetrics(parsed.metrics)
  const keyPoints = normalizeStringList(parsed.key_points)
  const progressItems = normalizeProgressItems(parsed.progress_items)
  const riskItems = normalizeRiskItems(parsed.risk_items)
  const nextActions = normalizeNextActions(parsed.next_actions)
  const decisionRequests = normalizeStringList(parsed.decision_requests)
  const resourceRequests = normalizeStringList(parsed.resource_requests)
  const sections = normalizeSections(parsed.sections)

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
    department_focus: toCleanString(parsed.department_focus),
    audience_focus: toCleanString(parsed.audience_focus),
  }
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
