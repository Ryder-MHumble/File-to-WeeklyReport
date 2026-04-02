export function buildSharedData(document, generatedAt, templateMeta) {
  const stats = buildStats(document, 6)
  const overview = buildOverviewItems(document, 5)
  const groups = buildWorkGroups(document)
  const defense = extractDefenseStats(document)
  const keyMetrics = buildMetricWall(document, stats, defense)
  const footer = buildFooter(document, generatedAt)
  const issued = formatDateParts(generatedAt)
  const metaLine = {
    periodText: document.subtitle || '本周汇总周期',
    issuedText: issued.display,
    issuedDateText: issued.dateOnly,
    issuedMachineText: issued.isoLike,
    issueLabel: `第 ${String(issued.issueNumber).padStart(2, '0')} 期`,
    unitText: document.department_focus || 'file2web 自动生成',
    title: document.title,
    subtitle: document.subtitle,
    summary: document.summary,
  }

  return {
    document,
    templateMeta,
    generatedAt,
    metaLine,
    stats,
    overview,
    groups,
    defense,
    footer,
    keyMetrics,
    keyPoints: (document.key_points ?? []).slice(0, 8),
    decisions: (document.decision_requests ?? []).slice(0, 6),
    resources: (document.resource_requests ?? []).slice(0, 6),
    cooperationProgress: groups.cooperation.slice(0, 6),
    systemProgress: groups.system.slice(0, 6),
    visitProgress: groups.visit.slice(0, 6),
    internalProgress: groups.internal.slice(0, 8),
  }
}

function buildStats(document, count) {
  const seeds = []

  ;(document.metrics ?? []).forEach((item) => {
    seeds.push({
      label: item.name || '关键指标',
      value: item.value || '--',
      detail: item.note || item.trend || '持续跟踪中',
    })
  })

  ;(document.highlights ?? []).forEach((item) => {
    seeds.push({
      label: item.label || '亮点',
      value: item.value || '--',
      detail: item.detail || '重点关注',
    })
  })

  if (seeds.length === 0) {
    buildOverviewItems(document, count).forEach((item, index) => {
      seeds.push({
        label: item.tag || `重点 ${index + 1}`,
        value: String(index + 1),
        detail: item.title,
      })
    })
  }

  return dedupeByLabel(seeds)
    .slice(0, count)
    .map((item, index) => {
      const { numeric, display, unit } = splitValueUnit(item.value)
      return {
        label: item.label,
        value: display,
        unit,
        detail: item.detail,
        target: numeric,
        tone: index % 5,
      }
    })
}

function buildOverviewItems(document, count) {
  const fromSections = document.sections
    .flatMap((section) =>
      section.items.map((item) => ({
        tag: item.tag || section.title,
        title: item.title,
        body: item.body,
      })),
    )
    .filter((item) => item.title || item.body)

  const items = (fromSections.length > 0
    ? fromSections
    : (document.highlights ?? []).map((item) => ({
        tag: item.label || '亮点',
        title: `${item.label || '亮点'} ${item.value ? `· ${item.value}` : ''}`.trim(),
        body: item.detail || document.summary,
      })))
    .slice(0, count)
    .map((item, index) => ({
      ...item,
      number: String(index + 1).padStart(2, '0'),
      tone: overviewTone(index),
    }))

  return items.length > 0
    ? items
    : [
        {
          tag: '自动结构化',
          title: '当前原文未提取出足够的重点条目',
          body: document.summary,
          number: '01',
          tone: overviewTone(0),
        },
      ]
}

function buildWorkGroups(document) {
  const groups = {
    internal: [],
    cooperation: [],
    visit: [],
    system: [],
  }

  document.sections.forEach((section) => {
    const bucket = classifyGroup(section.title)
    section.items.forEach((item) => {
      groups[bucket].push(toWorkItem(item.title, item.body, item.tag || section.title))
    })
  })

  ;(document.progress_items ?? []).forEach((item) => {
    const bucket = classifyGroup(item.stream || item.status || '')
    groups[bucket].push(
      toWorkItem(
        item.stream || '推进事项',
        [item.outcome, item.owner ? `责任人：${item.owner}` : '', item.dependency ? `依赖：${item.dependency}` : '']
          .filter(Boolean)
          .join('；'),
        item.status || '进行中',
      ),
    )
  })

  ;(document.risk_items ?? []).slice(0, 4).forEach((item) => {
    groups.system.push(toWorkItem(item.risk, item.mitigation, item.level || 'medium'))
  })

  if (groups.internal.length === 0) {
    buildOverviewItems(document, 4).forEach((item) => {
      groups.internal.push(toWorkItem(item.title, item.body, item.tag))
    })
  }

  const fallbackKeys = ['internal', 'cooperation', 'visit', 'system']
  fallbackKeys.forEach((key, index) => {
    if (groups[key].length === 0) {
      groups[key].push(
        toWorkItem(
          `${['内部协同', '对外合作', '交流互访', '体系建设'][index]}待补充`,
          '当前原文未显式抽取到该分类条目，可在原始文档中补充更明确的小节标题。',
          '待补充',
        ),
      )
    }
    groups[key] = groups[key].slice(0, key === 'internal' ? 8 : 6)
  })

  return groups
}

function buildMetricWall(document, stats, defense) {
  const items = [
    ...stats.map((item) => ({
      label: item.label,
      value: item.value,
      unit: item.unit,
      sub: item.detail,
    })),
  ]

  if (defense.total > 0) {
    items.push({ label: '答辩总人数', value: String(defense.total), unit: '人', sub: `开题通过 ${defense.pass} 人` })
  }

  ;(document.resource_requests ?? []).slice(0, 2).forEach((item, index) => {
    items.push({ label: `资源诉求 ${index + 1}`, value: String(index + 1), unit: '项', sub: item })
  })

  return items.slice(0, 12)
}

function extractDefenseStats(document) {
  const joined = [
    ...document.sections
      .filter((section) => /答辩|开题|博士/.test(section.title))
      .flatMap((section) => [section.description || '', ...section.items.map((item) => `${item.title} ${item.body}`)]),
    ...(document.progress_items ?? []).map((item) => `${item.stream} ${item.outcome}`),
  ].join(' ')

  const total = extractNumber(joined, /(参加|总人数|共)\s*(\d+)/) || 0
  const pass = extractNumber(joined, /开题通过\s*(\d+)/) || 0
  const fail = extractNumber(joined, /未通过\s*(\d+)/) || 0
  const revised = extractNumber(joined, /修改后通过\s*(\d+)/) || 0
  const exam = extractNumber(joined, /博资考通过\s*(\d+)/) || 0

  const safeTotal = total || pass + fail + revised + exam
  return {
    total: safeTotal,
    pass,
    fail,
    revised,
    exam,
  }
}

function buildFooter(document, generatedAt) {
  return {
    issuedBy: document.department_focus || '自动生成周报',
    recipient: document.audience_focus || '相关负责人',
    distribution: document.department_focus || '相关部门',
    editor: '（待填写）',
    reviewer: '（待填写）',
    date: formatDateParts(generatedAt).display,
    dateOnly: formatDateParts(generatedAt).dateOnly,
    timestamp: formatDateParts(generatedAt).isoLike,
  }
}

function classifyGroup(title) {
  const text = String(title || '')
  if (/交流|互访|论坛|访问|会议|活动/.test(text)) return 'visit'
  if (/合作|外部|联动|国际/.test(text)) return 'cooperation'
  if (/体系|制度|机制|平台|系统|课程|图谱|建设|办法/.test(text)) return 'system'
  return 'internal'
}

function toWorkItem(title, body, status) {
  const progress = inferProgress(status, body)
  return {
    title: title || '待补充事项',
    body: body || '暂无补充说明。',
    status: normalizeStatusLabel(status),
    progress,
    tone: statusTone(status, progress),
  }
}

function inferProgress(status, body) {
  const text = `${status || ''} ${body || ''}`
  const explicit = extractNumber(text, /(\d{1,3})\s*%/)
  if (explicit) return Math.max(0, Math.min(100, explicit))
  if (/已完成|完成|通过|印发|发布|DONE|ISSUED|COUNCIL_PASS/.test(text)) return 100
  if (/搁置|暂停|待解决|ON_HOLD/.test(text)) return 25
  if (/探讨|规划|计划|筹备/.test(text)) return 35
  if (/建设中|进行中|推进中|ACTIVE|BUILDING/.test(text)) return 55
  return 40
}

function normalizeStatusLabel(status) {
  const text = String(status || '')
  if (/DONE|完成|通过|印发|发布|已完成/.test(text)) return '已完成'
  if (/ON_HOLD|搁置|暂停/.test(text)) return '搁置'
  if (/待解决|待推进|PENDING/.test(text)) return '待推进'
  if (/探讨|EXPLORING/.test(text)) return '探讨中'
  if (/建设中|BUILDING/.test(text)) return '建设中'
  return text || '进行中'
}

function statusTone(status, progress) {
  const text = String(status || '')
  if (/已完成|DONE|通过|印发|发布/.test(text) || progress >= 90) return 'done'
  if (/搁置|待推进|待解决|ON_HOLD|PENDING/.test(text) || progress <= 30) return 'warning'
  return 'progress'
}

function splitValueUnit(value) {
  const text = String(value ?? '--').trim()
  const match = text.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
  if (!match) {
    return { numeric: 0, display: text || '--', unit: '' }
  }
  const numeric = Number.parseFloat(match[1])
  return {
    numeric: Number.isFinite(numeric) ? numeric : 0,
    display: match[1],
    unit: match[2].trim(),
  }
}

function dedupeByLabel(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = `${item.label}::${item.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function overviewTone(index) {
  return ['red', 'jade', 'indigo', 'gold', 'copper'][index % 5]
}

function extractNumber(text, pattern) {
  const match = String(text || '').match(pattern)
  return match ? Number.parseInt(match[2] || match[1], 10) : 0
}

function formatDateParts(generatedAt) {
  const source = String(generatedAt || '').replace(/[年月]/g, '/').replace(/[日]/g, '').replace(/\./g, '/').trim()
  const maybeDate = new Date(source)
  const date = Number.isNaN(maybeDate.getTime()) ? new Date() : maybeDate
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return {
    display: `${year}年${month}月${day}日`,
    dateOnly: `${year}-${month}-${day}`,
    isoLike: `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`,
    issueNumber: Math.ceil(Number(month) / 1),
  }
}
