;(() => {
  const startedAt = performance.now()
  const previewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)

  function logSystem(level, event, payload = {}) {
    const msg = `系统日志 | 模块=模板11-新野兽派战情版 | 事件=${event} | 内容=${JSON.stringify(payload)}`
    if (level === 'error') {
      console.error(msg)
      return
    }
    console.info(msg)
  }

  function logBusinessJson(event, payload = {}) {
    console.info(`业务JSON | 模块=模板11-新野兽派战情版 | 事件=${event} | 内容=${JSON.stringify(payload)}`)
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function splitValueUnit(value, unit = '') {
    const text = String(value ?? '--').trim()
    if (unit) {
      return { value: text || '--', unit: String(unit).trim() }
    }
    const match = text.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
    if (!match) return { value: text || '--', unit: '' }
    return { value: match[1], unit: match[2].trim() }
  }

  function resolvePayload() {
    const raw = document.getElementById('template-data')?.textContent || '{}'
    const payload = JSON.parse(raw)
    const vm = payload?.viewModel?.neoBrutalPoster || {}

    return {
      masthead: vm.masthead || {
        kicker: 'BRUTAL OPS BULLETIN',
        title: payload?.meta?.title || '科研攻关战情周报',
        issue: 'ISSUE 01',
        period: payload?.meta?.subtitle || '--',
        signal: '课题推进节奏稳定',
      },
      lead: vm.lead || {
        headline: payload?.meta?.title || '本周科研要点',
        subline: payload?.meta?.summary || '暂无摘要信息。',
      },
      pillars: Array.isArray(vm.pillars) ? vm.pillars.slice(0, 6) : [],
      streams: vm.streams || {
        execution: [],
        collaboration: [],
        risk: [],
      },
      timeline: Array.isArray(vm.timeline) ? vm.timeline.slice(0, 5) : [],
      scoreboard: Array.isArray(vm.scoreboard) ? vm.scoreboard.slice(0, 6) : [],
      momentum: Array.isArray(vm.momentum) ? vm.momentum.slice(0, 6) : [],
      footer: vm.footer || payload?.meta || {},
    }
  }

  function renderPillars(pillars) {
    const target = document.getElementById('nbp-pillars')
    if (!target) return
    target.innerHTML = pillars
      .map((item) => {
        const part = splitValueUnit(item.value, item.unit)
        return `
          <article class="nbp-pillar nbp-reveal">
            <div class="nbp-pillar__label">${escapeHtml(item.label || '指标')}</div>
            <div class="nbp-pillar__value">${escapeHtml(part.value)}${part.unit ? `<small>${escapeHtml(part.unit)}</small>` : ''}</div>
            <div class="nbp-pillar__detail">${escapeHtml(item.detail || item.sub || '')}</div>
          </article>
        `
      })
      .join('')
  }

  function statusTone(status, tone) {
    if (tone === 'done' || /完成|已发布|闭环/.test(String(status || ''))) return 'done'
    if (tone === 'warning' || /风险|阻塞|待推进/.test(String(status || ''))) return 'warning'
    return 'progress'
  }

  function statusText(item) {
    return String(item.status || '进行中')
  }

  function renderStream(containerId, list) {
    const target = document.getElementById(containerId)
    if (!target) return
    target.innerHTML = (list || [])
      .slice(0, 4)
      .map((item) => {
        const tone = statusTone(item.status, item.tone)
        const status = statusText(item)
        const statusBg = tone === 'done' ? '#00d38a' : tone === 'warning' ? '#ff5a2f' : '#0ea2ff'
        return `
          <article class="nbp-work nbp-reveal">
            <div class="nbp-work__head">
              <div class="nbp-work__title">${escapeHtml(item.title || '待补充事项')}</div>
              <div class="nbp-work__status" style="background:${statusBg}">${escapeHtml(status)}</div>
            </div>
            <div class="nbp-work__body">${escapeHtml(item.body || '暂无补充说明。')}</div>
            <div class="nbp-work__bar">
              <div class="nbp-work__fill" data-w="${escapeHtml(String(item.progress || 0))}%"></div>
            </div>
          </article>
        `
      })
      .join('')
  }

  function renderTimeline(timeline) {
    const target = document.getElementById('nbp-timeline')
    if (!target) return
    target.innerHTML = timeline
      .map(
        (item, index) => `
          <article class="nbp-time nbp-reveal">
            <div class="nbp-time__head">
              <div class="nbp-time__node">${escapeHtml(item.node || String(index + 1).padStart(2, '0'))}</div>
              <div class="nbp-time__title">${escapeHtml(item.title || '阶段事项')}</div>
            </div>
            <div class="nbp-time__body">${escapeHtml(item.body || '暂无补充说明。')}</div>
          </article>
        `,
      )
      .join('')
  }

  function renderScoreboard(scoreboard) {
    const target = document.getElementById('nbp-scoreboard')
    if (!target) return
    target.innerHTML = scoreboard
      .map((item) => {
        const part = splitValueUnit(item.value, item.unit)
        return `
          <article class="nbp-score nbp-reveal">
            <div class="nbp-score__label">${escapeHtml(item.label || '关键指标')}</div>
            <div class="nbp-score__value">${escapeHtml(part.value)}${part.unit ? `<small>${escapeHtml(part.unit)}</small>` : ''}</div>
            <div class="nbp-score__sub">${escapeHtml(item.sub || item.detail || '')}</div>
          </article>
        `
      })
      .join('')
  }

  function renderMomentum(momentum) {
    const target = document.getElementById('nbp-momentum')
    if (!target) return
    target.innerHTML = momentum
      .map(
        (item) => `
          <article class="nbp-momentum__item nbp-reveal">
            <div class="nbp-momentum__meta">
              <strong>${escapeHtml(item.label || '推进项')}</strong>
              <span>${escapeHtml(String(item.progress || 0))}%</span>
            </div>
            <div class="nbp-momentum__track">
              <div class="nbp-momentum__fill" data-w="${escapeHtml(String(item.progress || 0))}%"></div>
            </div>
          </article>
        `,
      )
      .join('')
  }

  function renderFooter(footer) {
    const target = document.getElementById('nbp-footer')
    if (!target) return
    target.innerHTML = `
      <div>发布单位：${escapeHtml(footer.issuedBy || footer.publisher || '自动生成周报')}</div>
      <div>报送对象：${escapeHtml(footer.recipient || '相关负责人')} ｜ 发送范围：${escapeHtml(footer.distribution || '相关部门')}</div>
      <div>生成时间：${escapeHtml(footer.date || footer.generatedAt || '--')}</div>
    `
  }

  function revealAll() {
    const nodes = [...document.querySelectorAll('.nbp-reveal')]
    nodes.forEach((node, index) => {
      window.setTimeout(() => node.classList.add('is-show'), previewLite ? 0 : index * 24)
    })

    document.querySelectorAll('[data-w]').forEach((node) => {
      const width = node.getAttribute('data-w')
      if (!width) return
      window.setTimeout(
        () => {
          node.style.width = width
        },
        previewLite ? 0 : 220,
      )
    })
  }

  try {
    const payload = resolvePayload()
    const { masthead, lead, pillars, streams, timeline, scoreboard, momentum, footer } = payload

    const kicker = document.getElementById('nbp-kicker')
    const title = document.getElementById('nbp-title')
    const issue = document.getElementById('nbp-issue')
    const period = document.getElementById('nbp-period')
    const signal = document.getElementById('nbp-signal')
    const leadHeadline = document.getElementById('nbp-lead')
    const leadSubline = document.getElementById('nbp-subline')

    if (kicker) kicker.textContent = masthead.kicker || 'BRUTAL OPS BULLETIN'
    if (title) title.textContent = masthead.title || '科研攻关战情周报'
    if (issue) issue.textContent = masthead.issue || 'ISSUE 01'
    if (period) period.textContent = masthead.period || '--'
    if (signal) signal.textContent = masthead.signal || '课题推进节奏稳定'
    if (leadHeadline) leadHeadline.textContent = lead.headline || '本周科研要点'
    if (leadSubline) leadSubline.textContent = lead.subline || '暂无摘要信息。'

    renderPillars(pillars)
    renderStream('nbp-stream-execution', streams.execution)
    renderStream('nbp-stream-collaboration', streams.collaboration)
    renderStream('nbp-stream-risk', streams.risk)
    renderTimeline(timeline)
    renderScoreboard(scoreboard)
    renderMomentum(momentum)
    renderFooter(footer)

    revealAll()

    logBusinessJson('render_payload', {
      pillars: pillars.length,
      execution: (streams.execution || []).length,
      collaboration: (streams.collaboration || []).length,
      risk: (streams.risk || []).length,
      timeline: timeline.length,
      scoreboard: scoreboard.length,
      momentum: momentum.length,
    })
    logSystem('info', '模板完成', { elapsedMs: Number((performance.now() - startedAt).toFixed(2)) })
  } catch (error) {
    logSystem('error', '模板渲染失败', { message: error instanceof Error ? error.message : String(error) })
  }
})()
