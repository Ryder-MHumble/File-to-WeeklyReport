import { buildSharedData } from './shared-data'

export function buildTemplatePayload(templateMeta, document, generatedAt) {
  const shared = buildSharedData(document, generatedAt, templateMeta)

  const payload = {
    templateId: templateMeta.id,
    templateName: templateMeta.title,
    renderer: templateMeta.renderer,
    theme: {
      accent: templateMeta.accent,
      chip: templateMeta.chip,
    },
    moduleBlueprint: templateMeta.moduleBlueprint,
    meta: {
      title: document.title,
      subtitle: document.subtitle,
      summary: document.summary,
      generatedAt,
      sensitiveMode: document.sensitive_mode,
      departmentFocus: document.department_focus || '',
      audienceFocus: document.audience_focus || '',
    },
    keyPoints: shared.keyPoints,
    decisions: shared.decisions,
    resources: shared.resources,
    viewModel: {},
  }

  if (templateMeta.id === 'template-02') {
    payload.viewModel.magazine = buildMagazineViewModel(shared)
    return payload
  }

  if (templateMeta.id === 'template-03') {
    payload.viewModel.ink = buildInkViewModel(shared)
    return payload
  }

  if (templateMeta.id === 'template-04') {
    payload.viewModel.dashboardPlus = buildDashboardViewModel(shared)
    return payload
  }

  if (templateMeta.id === 'template-05') {
    payload.viewModel.news = buildNewsViewModel(shared)
    return payload
  }

  if (templateMeta.id === 'template-06') {
    payload.viewModel.journal = buildJournalViewModel(shared)
    return payload
  }

  if (templateMeta.id === 'template-08') {
    payload.viewModel.splitMagazine = buildSplitMagazineViewModel(shared)
    return payload
  }

  if (templateMeta.id === 'template-09') {
    payload.viewModel.swissGrid = buildSwissGridViewModel(shared)
    return payload
  }

  if (templateMeta.id === 'template-11') {
    payload.viewModel.neoBrutalPoster = buildNeoBrutalPosterViewModel(shared)
    return payload
  }

  return payload
}

function buildMagazineViewModel(shared) {
  return {
    cover: {
      issueLabel: `Vol.${String(shared.metaLine.issueLabel.match(/\d+/)?.[0] || '1').padStart(2, '0')} · ${shared.metaLine.issuedDateText.slice(0, 4)} · ${shared.metaLine.issueLabel}`,
      headline: shared.overview[0]?.title || shared.metaLine.title,
      decks: [shared.metaLine.summary, ...(shared.keyPoints ?? []).slice(0, 1)],
      period: shared.metaLine.periodText,
      unit: shared.footer.issuedBy,
    },
    stats: shared.stats.slice(0, 4),
    toc: ['本周要览', '重点工作', '数据看板', '签发信息'],
    overview: shared.overview,
    groups: shared.groups,
    data: {
      keyMetrics: shared.keyMetrics.slice(0, 6),
      defense: shared.defense,
      cooperation: shared.cooperationProgress.slice(0, 6),
    },
    footer: shared.footer,
  }
}

function buildInkViewModel(shared) {
  return {
    cover: {
      enTitle: `${shared.footer.issuedBy || 'file2web'} · Weekly Report`,
      title: shared.metaLine.title,
      subTitle: shared.metaLine.issueLabel,
      period: shared.metaLine.periodText,
      issuedAt: shared.metaLine.issuedText,
      unit: shared.footer.issuedBy,
      stats: shared.stats.slice(0, 5),
    },
    overview: shared.overview,
    groups: shared.groups,
    data: {
      keyMetrics: shared.keyMetrics.slice(0, 6),
      cooperation: shared.cooperationProgress.slice(0, 6),
      system: shared.systemProgress.slice(0, 6),
      defense: shared.defense,
    },
    footer: shared.footer,
  }
}

function buildDashboardViewModel(shared) {
  return {
    hero: {
      title: shared.metaLine.title,
      subtitle: `${shared.footer.issuedBy} · ${shared.metaLine.issueLabel} · 内部资料`,
      issuedAt: `${shared.metaLine.issuedDateText.replace(/-/g, '.')} ISSUED`,
      period: shared.metaLine.periodText,
    },
    stats: shared.stats.slice(0, 5),
    overview: shared.overview,
    groups: shared.groups,
    data: {
      cooperation: shared.cooperationProgress.slice(0, 6),
      defense: shared.defense,
      keyMetrics: shared.keyMetrics.slice(0, 6),
    },
    summaryCounts: summarizeGroupCounts(shared.groups),
    footer: shared.footer,
  }
}

function buildNewsViewModel(shared) {
  return {
    masthead: {
      brand: shared.footer.issuedBy,
      date: shared.metaLine.issuedDateText.replace(/-/g, '·'),
      issueLabel: shared.metaLine.issueLabel,
    },
    ticker: shared.keyMetrics.slice(0, 6),
    hero: {
      eyebrow: '本周要览',
      headline: shared.overview[0]?.title || shared.metaLine.title,
      deck: shared.metaLine.summary,
      stats: shared.stats.slice(0, 4),
    },
    groups: shared.groups,
    data: {
      keyMetrics: shared.keyMetrics.slice(0, 6),
      defense: shared.defense,
      cooperation: shared.cooperationProgress.slice(0, 6),
      international: shared.visitProgress.slice(0, 6),
    },
    footer: shared.footer,
  }
}

function buildJournalViewModel(shared) {
  return {
    header: {
      title: shared.metaLine.title,
      subtitle: shared.metaLine.subtitle,
      issueLabel: shared.metaLine.issueLabel,
      issuedAt: shared.metaLine.issuedText,
      period: shared.metaLine.periodText,
      tags: buildSectionTags(shared.groups),
    },
    abstract: shared.metaLine.summary,
    stats: shared.stats.slice(0, 5),
    overview: shared.overview,
    groups: shared.groups,
    data: {
      defense: shared.defense,
      cooperation: shared.cooperationProgress.slice(0, 6),
      system: shared.systemProgress.slice(0, 6),
    },
    footer: shared.footer,
  }
}

function buildSplitMagazineViewModel(shared) {
  return {
    masthead: {
      title: shared.metaLine.title || '工作周报',
      issue: `${shared.metaLine.issueLabel} · ${shared.metaLine.periodText}`,
      foot: shared.footer.dateOnly || shared.metaLine.issuedDateText,
    },
    stats: shared.stats.slice(0, 6),
    overview: shared.overview.slice(0, 6),
    groups: shared.groups,
    data: {
      keyMetrics: shared.keyMetrics.slice(0, 8),
      cooperation: shared.cooperationProgress.slice(0, 6),
      defense: shared.defense,
    },
    footer: shared.footer,
  }
}

function buildSwissGridViewModel(shared) {
  const issueNumber = String(shared.metaLine.issueLabel.match(/\d+/)?.[0] || '1').padStart(2, '0')
  const tickerSource = shared.keyMetrics.length > 0 ? shared.keyMetrics : shared.stats
  const ticker = tickerSource.slice(0, 6).map((item) => ({
    label: item.label || '指标',
    value: `${item.value || '--'}${item.unit || ''}`,
  }))

  return {
    masthead: {
      name: shared.metaLine.title || '周报',
      issue: `VOL.${issueNumber}`,
      date: shared.metaLine.issuedDateText,
      logo: (shared.metaLine.title || '报').trim().slice(0, 1) || '报',
      publisher: `${shared.footer.issuedBy || 'Internal Bulletin'} · 内部资料`,
    },
    ticker,
    stats: shared.stats.slice(0, 5),
    overview: shared.overview.slice(0, 5),
    groups: shared.groups,
    data: {
      keyMetrics: shared.keyMetrics.slice(0, 6),
      cooperation: shared.cooperationProgress.slice(0, 6),
      defense: shared.defense,
    },
    footer: shared.footer,
  }
}

function buildNeoBrutalPosterViewModel(shared) {
  const issueNumber = String(shared.metaLine.issueLabel.match(/\d+/)?.[0] || '1').padStart(2, '0')
  const progressPool = [...shared.cooperationProgress, ...shared.systemProgress, ...shared.visitProgress]
  const timeline = shared.overview.slice(0, 5).map((item, index) => ({
    node: item.number || String(index + 1).padStart(2, '0'),
    title: item.title,
    body: item.body,
    tag: item.tag,
  }))

  return {
    masthead: {
      kicker: 'BRUTAL OPS BULLETIN',
      title: shared.metaLine.title || '科研攻关战情周报',
      issue: `ISSUE ${issueNumber}`,
      period: shared.metaLine.periodText,
      signal: shared.stats[0]?.detail || '课题推进节奏稳定',
      publisher: shared.footer.issuedBy || '自动生成周报',
    },
    lead: {
      headline: shared.overview[0]?.title || shared.metaLine.title || '本周科研要点',
      subline: shared.metaLine.summary || '本周进展已整理为结构化战情信息。',
    },
    pillars: shared.stats.slice(0, 6),
    streams: {
      execution: shared.groups.internal.slice(0, 4),
      collaboration: shared.groups.cooperation.slice(0, 4),
      risk: shared.groups.system.slice(0, 4),
    },
    timeline,
    scoreboard: shared.keyMetrics.slice(0, 6),
    momentum: progressPool.slice(0, 6).map((item, index) => ({
      label: item.title || item.status || `推进事项 ${index + 1}`,
      progress: item.progress || 0,
      status: item.status || '进行中',
      tone: item.tone || 'progress',
    })),
    footer: shared.footer,
  }
}

function summarizeGroupCounts(groups) {
  const values = Object.values(groups).flat()
  return {
    done: values.filter((item) => item.tone === 'done').length,
    progress: values.filter((item) => item.tone === 'progress').length,
    pending: values.filter((item) => item.tone === 'warning').length,
  }
}

function buildSectionTags(groups) {
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([key]) => {
      if (key === 'internal') return '内部协同'
      if (key === 'cooperation') return '对外合作'
      if (key === 'visit') return '交流互访'
      return '体系建设'
    })
    .slice(0, 4)
}
