export function fallbackParse(rawText, sensitiveMode) {
  const cleaned = normalizeText(rawText)
  const rawLines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const lines = splitLongLines(rawLines)

  const title = detectTitle(lines)
  const summary = lines.slice(0, 4).join(' ')
  const keyPoints = lines.filter((line) => line.length >= 10).slice(0, 8)

  const sections = buildSections(lines)
  const progressItems = buildProgressItems(sections)
  const riskItems = buildRiskItems(sections)
  const nextActions = buildNextActions(keyPoints)

  const highlights = [
    { label: '段落数', value: String(lines.length), detail: '自动拆分后的有效段落' },
    { label: '关键要点', value: String(keyPoints.length), detail: '可直接用于周报摘要' },
    { label: '字符规模', value: String(rawText.length), detail: '参与生成的文本字符数' },
  ]

  return {
    title,
    subtitle: sensitiveMode
      ? '敏感模式下的保守表达周报'
      : '自动整理的结构化周报，可切换模板继续预览',
    summary: summary || '未抽取到足够正文，请补充文本后重试。',
    highlights,
    metrics: [
      { name: '文本段落', value: String(lines.length), trend: '', note: '自动拆分后的段落数' },
      { name: '关键事项', value: String(keyPoints.length), trend: '', note: '提炼出的关键要点数量' },
      { name: '章节数量', value: String(sections.length), trend: '', note: '可渲染章节数量' },
    ],
    key_points: keyPoints.length > 0 ? keyPoints : [summary || '暂无摘要'],
    progress_items: progressItems,
    risk_items: riskItems,
    next_actions: nextActions,
    decision_requests: [],
    resource_requests: [],
    sections,
    source_excerpt: rawText.slice(0, 1200),
    sensitive_mode: sensitiveMode,
  }
}

function buildSections(lines) {
  if (lines.length === 0) {
    return [
      {
        title: '自动结构化结果',
        description: '当前文档还没有抽取出完整章节，系统展示默认结构。',
        items: [
          { title: '上传原文', body: '请上传 PDF/Word/TXT 或直接粘贴文本。', tag: '输入' },
          { title: '点击生成', body: '系统会整理文本并渲染为模板化 HTML。', tag: '流程' },
        ],
      },
    ]
  }

  const buckets = [
    createSection('本周重点进展', '围绕结果与里程碑梳理本周工作'),
    createSection('问题与风险', '梳理卡点、风险与待协调事项'),
    createSection('下周计划', '按优先级安排下一阶段行动'),
  ]

  lines.forEach((line, index) => {
    const item = {
      title: line.slice(0, 24),
      body: line,
      tag: index % 3 === 0 ? '进展' : index % 3 === 1 ? '风险' : '计划',
    }
    buckets[index % buckets.length].items.push(item)
  })

  return buckets
    .map((section) => ({
      ...section,
      items: section.items.slice(0, 6),
    }))
    .filter((section) => section.items.length > 0)
}

function createSection(title, description) {
  return { title, description, items: [] }
}

function buildProgressItems(sections) {
  return sections.slice(0, 6).map((section) => ({
    stream: section.title,
    status: section.items[0]?.tag || '推进中',
    outcome: section.items[0]?.body || section.description || '待补充',
    owner: '待明确',
  }))
}

function buildRiskItems(sections) {
  const riskSection = sections.find((section) => section.title.includes('风险') || section.title.includes('问题'))
  if (!riskSection) {
    return [{ risk: '暂无显式风险条目', level: 'low', mitigation: '持续监控并按周复盘。', owner: '待明确' }]
  }
  return riskSection.items.slice(0, 6).map((item) => ({
    risk: item.title,
    level: 'medium',
    mitigation: item.body,
    owner: '待明确',
  }))
}

function buildNextActions(keyPoints) {
  const actions = keyPoints.slice(0, 6).map((item) => ({
    task: item,
    deadline: '下周',
    owner: '待明确',
    dependency: '',
  }))
  return actions.length > 0
    ? actions
    : [{ task: '补充下周行动计划', deadline: '下周', owner: '待明确', dependency: '' }]
}

function normalizeText(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function detectTitle(lines) {
  const reportLine = lines.find((line) => /周报|简报|汇报/.test(line) && line.length <= 60)
  if (reportLine) {
    return reportLine
  }

  const candidate = lines.find((line) => line.length >= 4 && line.length <= 40)
  return candidate || '未命名周报'
}

function splitLongLines(lines) {
  const next = []

  lines.forEach((line) => {
    if (line.length <= 90) {
      next.push(line)
      return
    }

    const parts = line
      .split(/([。！？；])/)
      .reduce((acc, cur, index, array) => {
        if (index % 2 === 0) {
          const suffix = array[index + 1] || ''
          const merged = `${cur}${suffix}`.trim()
          if (merged) {
            acc.push(merged)
          }
        }
        return acc
      }, [])

    if (parts.length > 1) {
      parts.forEach((item) => next.push(item))
      return
    }

    next.push(line.slice(0, 88))
    next.push(line.slice(88))
  })

  return next
}
