import { getAudienceProfile, getDepartmentProfile } from './config'
import { escapeHtml, stripNoise } from './text-utils'

export function ensureHtmlDocument(rawContent) {
  const stripped = stripNoise(rawContent)
    .replace(/^```html/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim()

  const withoutScript = stripped.replace(/<script[\s\S]*?<\/script>/gi, '')
  const sanitized = sanitizeHtml(withoutScript)
  if (/<!doctype html>/i.test(sanitized) || /<html[\s>]/i.test(sanitized)) {
    return sanitized
  }

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>自动生成周报</title>
  <style>
    body { margin: 0; padding: 24px; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; background: #f4f6fb; color: #1f2937; }
    .page { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #d9e2ef; border-radius: 14px; padding: 24px; }
  </style>
</head>
<body>
  <article class="page">${sanitized}</article>
</body>
</html>`
}

export function sanitizeHtml(value) {
  return value
    .replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
    .replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, ' $1="#"')
}

export function buildFallbackHtmlFromDocument(document, context) {
  const departmentProfile = getDepartmentProfile(context.department)
  const audienceProfile = getAudienceProfile(context.audience)
  const metrics = (document.metrics ?? [])
    .slice(0, 4)
    .map(
      (item) =>
        `<div class="metric-card"><span>${escapeHtml(item.name || '指标')}</span><strong>${escapeHtml(item.value || '待补充')}</strong><em>${escapeHtml(item.note || item.trend || '')}</em></div>`,
    )
    .join('')
  const keyPoints = (document.key_points ?? []).slice(0, 8).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const progress = (document.progress_items ?? [])
    .slice(0, 6)
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.stream || '事项')}</strong><span>${escapeHtml(item.status || '推进中')}</span><p>${escapeHtml(item.outcome || '')}</p></li>`,
    )
    .join('')
  const risks = (document.risk_items ?? [])
    .slice(0, 6)
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.risk || '风险')}</strong><span>${escapeHtml(item.level || 'medium')}</span><p>${escapeHtml(item.mitigation || '')}</p></li>`,
    )
    .join('')
  const actions = (document.next_actions ?? [])
    .slice(0, 6)
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.task || '任务')}</strong><span>${escapeHtml(item.deadline || '下周')}</span><p>${escapeHtml(item.dependency || '')}</p></li>`,
    )
    .join('')
  const decisions = (document.decision_requests ?? []).slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join('')

  const sections = document.sections
    .map(
      (section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.description)}</p>${section.items
        .map((item) => `<p><strong>${escapeHtml(item.title)}：</strong>${escapeHtml(item.body)}</p>`)
        .join('')}</section>`,
    )
    .join('')

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(document.title)}</title>
  <style>
    body { margin: 0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; background: #f2f5fb; color: #1f2937; padding: 22px; }
    .page { max-width: 980px; margin: 0 auto; background: #fff; border-radius: 14px; border: 1px solid #dae3f1; padding: 22px; }
    h1 { margin: 0; }
    .meta { color: #64748b; font-size: 13px; margin-top: 8px; }
    .summary { margin-top: 14px; background: #f8fbff; border-left: 4px solid #2563eb; padding: 10px 12px; border-radius: 8px; }
    .grid { margin-top: 14px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .metric-card { padding: 10px; border: 1px solid #d8e3f3; border-radius: 10px; background: #fbfdff; display: grid; gap: 4px; }
    .metric-card span { color: #64748b; font-size: 12px; }
    .metric-card strong { font-size: 18px; color: #0f2f63; }
    .metric-card em { color: #7d8ea5; font-size: 12px; font-style: normal; }
    .split { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .card { border: 1px solid #d8e3f3; border-radius: 10px; padding: 12px; background: #fbfdff; }
    .card h3 { margin: 0 0 8px; font-size: 16px; color: #193f79; }
    .card ul { margin: 0; padding-left: 18px; }
    .card li { margin-bottom: 8px; }
    .card li span { margin-left: 8px; color: #607086; font-size: 12px; }
    .card li p { margin: 4px 0 0; color: #425368; font-size: 13px; line-height: 1.5; }
    section { margin-top: 16px; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .split { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <article class="page">
    <h1>${escapeHtml(document.title)}</h1>
    <div class="meta">模式：本地回退 · 部门：${escapeHtml(departmentProfile.name)} · 受众：${escapeHtml(audienceProfile.name)}</div>
    <div class="summary">${escapeHtml(document.summary)}</div>
    <div class="grid">${metrics || '<div class="metric-card"><span>关键指标</span><strong>待补充</strong><em>暂无结构化指标</em></div>'}</div>
    <div class="split">
      <div class="card">
        <h3>重点进展</h3>
        <ul>${progress || '<li>待补充</li>'}</ul>
      </div>
      <div class="card">
        <h3>风险与应对</h3>
        <ul>${risks || '<li>待补充</li>'}</ul>
      </div>
      <div class="card">
        <h3>下周计划</h3>
        <ul>${actions || '<li>待补充</li>'}</ul>
      </div>
      <div class="card">
        <h3>决策请求</h3>
        <ul>${decisions || '<li>待补充</li>'}</ul>
      </div>
    </div>
    <section>
      <h2>关键要点</h2>
      <ul>${keyPoints || '<li>待补充</li>'}</ul>
    </section>
    ${sections}
  </article>
</body>
</html>`
}

export function evaluateHtmlQuality(html) {
  const plainText = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const textLength = plainText.length
  const headingCount = (html.match(/<h[1-6]\b/gi) || []).length
  const sectionLikeCount = (html.match(/<(section|article|main|header|footer|ul|ol|div)\b/gi) || []).length
  const scaffoldHit = [/<!doctype html>/i, /<html[\s>]/i, /<head[\s>]/i, /<body[\s>]/i].filter((re) => re.test(html))
    .length

  const moduleKeywords = [
    ['摘要', '概览', '结论'],
    ['关键指标', '指标看板', '核心指标'],
    ['重点进展', '进展', '里程碑'],
    ['风险与应对', '风险', '风险处置'],
    ['下周计划', '下一步计划', '计划安排'],
    ['决策请求', '待决策事项', '请示事项'],
  ]
  const keywordHit = moduleKeywords.filter((group) => group.some((item) => plainText.includes(item))).length

  const ok =
    scaffoldHit >= 3 &&
    textLength >= 320 &&
    headingCount >= 2 &&
    sectionLikeCount >= 6 &&
    (keywordHit >= 3 || headingCount >= 4)
  const reason = `文本长度=${textLength}, 标题数=${headingCount}, 结构块=${sectionLikeCount}, 模块命中=${keywordHit}, 脚手架命中=${scaffoldHit}`

  return { ok, reason, textLength, headingCount, sectionLikeCount, keywordHit, scaffoldHit }
}

export function isHtmlLikelyComplete(html) {
  if (!html || typeof html !== 'string') {
    return false
  }

  const trimmed = html.trim()
  const hasClosingBody = /<\/body>\s*$/i.test(trimmed) || /<\/body>\s*<\/html>\s*$/i.test(trimmed)
  const hasClosingHtml = /<\/html>\s*$/i.test(trimmed)
  return hasClosingBody && hasClosingHtml
}
