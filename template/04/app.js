(() => {
  const MODULE_NAME = 'template-dashboard-runtime'
  const previewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)

  const escapeHtml = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const readPayload = () => {
    const node = document.getElementById('template-data')
    if (!node) {
      throw new Error('缺少 template-data 节点')
    }
    return JSON.parse(node.textContent || '{}')
  }

  const logBusinessJson = (stage, payload) => {
    console.info(
      '[业务JSON]',
      JSON.stringify(
        {
          module: MODULE_NAME,
          stage,
          timestamp: new Date().toISOString(),
          payload,
        },
        null,
        2,
      ),
    )
  }

  const logSystem = (level, event, payload = {}) => {
    const logger = level === 'error' ? console.error : console.info
    logger(
      '[系统日志]',
      JSON.stringify(
        {
          module: MODULE_NAME,
          level,
          event,
          timestamp: new Date().toISOString(),
          payload,
        },
        null,
        2,
      ),
    )
  }

  const toArray = (value, limit = Infinity) => {
    if (!Array.isArray(value)) return []
    return value.slice(0, limit)
  }

  const splitValueUnit = (value, fallbackUnit = '') => {
    const raw = String(value ?? '').trim()
    if (!raw) return { value: '--', unit: fallbackUnit }
    const match = raw.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
    if (!match) return { value: raw, unit: fallbackUnit }
    return {
      value: match[1],
      unit: (match[2] || '').trim() || fallbackUnit,
    }
  }

  const toneColor = (tone) => {
    if (tone === 'done') return 'var(--lime)'
    if (tone === 'warning') return 'var(--amber)'
    return 'var(--cyan)'
  }

  const countSummaryFromGroups = (groups) => {
    const items = Object.values(groups || {}).flatMap((value) => (Array.isArray(value) ? value : []))
    return {
      done: items.filter((item) => item.tone === 'done').length,
      progress: items.filter((item) => item.tone === 'progress').length,
      pending: items.filter((item) => item.tone === 'warning').length,
    }
  }

  const renderProgress = (root = document) => {
    root.querySelectorAll('[data-w]').forEach((node) => {
      const target = node.getAttribute('data-w')
      if (target) node.style.width = target
    })
  }

  const groupConfig = [
    { key: 'internal', label: '内部协同' },
    { key: 'cooperation', label: '对外合作' },
    { key: 'visit', label: '交流互访' },
    { key: 'system', label: '体系建设' },
  ]

  try {
    const startedAt = performance.now()
    logSystem('info', '模块启动', { previewLite })

    const payload = readPayload()
    const vm = payload.viewModel?.dashboardPlus || {}
    const hero = vm.hero || {}
    const stats = toArray(vm.stats, 5)
    const overview = toArray(vm.overview, 6)
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}
    const summaryCounts = vm.summaryCounts || countSummaryFromGroups(groups)

    const heroTitle = document.getElementById('hero-title')
    const heroSub = document.getElementById('hero-sub')
    const heroIssued = document.getElementById('hero-issued')
    const heroPeriod = document.getElementById('hero-period')

    if (heroTitle) heroTitle.textContent = hero.title || payload.meta?.title || '周报'
    if (heroSub) heroSub.textContent = hero.subtitle || payload.meta?.subtitle || '内部资料'
    if (heroIssued) heroIssued.textContent = hero.issuedAt || footer.dateOnly || 'ISSUED'
    if (heroPeriod) heroPeriod.textContent = hero.period || payload.meta?.subtitle || 'PERIOD'

    const kpiStrip = document.getElementById('kpi-strip')
    if (kpiStrip) {
      kpiStrip.innerHTML = (stats.length > 0 ? stats : toArray(data.keyMetrics, 5))
        .slice(0, 5)
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          return `
            <article class="dash-kpi-item">
              <p class="dash-kpi-label">${escapeHtml(item.label || '关键指标')}</p>
              <div class="dash-kpi-value">${escapeHtml(parsed.value)}${parsed.unit ? `<span style="font-size:13px;color:var(--muted)">${escapeHtml(parsed.unit)}</span>` : ''}</div>
              <p class="dash-kpi-detail">${escapeHtml(item.detail || item.sub || '')}</p>
            </article>
          `
        })
        .join('')
    }

    const summaryCard = document.getElementById('summary-card')
    if (summaryCard) {
      summaryCard.innerHTML = `
        <p class="dash-side-title">执行状态</p>
        <div class="dash-summary-grid">
          <article class="dash-summary-cell"><h4>已完成</h4><p style="color:var(--lime)">${escapeHtml(String(summaryCounts.done || 0))}</p></article>
          <article class="dash-summary-cell"><h4>进行中</h4><p style="color:var(--cyan)">${escapeHtml(String(summaryCounts.progress || 0))}</p></article>
          <article class="dash-summary-cell"><h4>待推进</h4><p style="color:var(--amber)">${escapeHtml(String(summaryCounts.pending || 0))}</p></article>
        </div>
      `
    }

    const overviewList = document.getElementById('overview-list')
    if (overviewList) {
      const source = overview.length > 0 ? overview : toArray(payload.keyPoints, 5).map((item) => ({
        tag: '要点',
        title: item,
        body: payload.meta?.summary || '暂无摘要',
      }))

      overviewList.innerHTML = source
        .map(
          (item) => `
            <article class="dash-item">
              <div class="dash-item-tag">${escapeHtml(item.tag || '重点')}</div>
              <div class="dash-item-main">
                <h3 class="dash-item-title">${escapeHtml(item.title || '待补充标题')}</h3>
                <p class="dash-item-body">${escapeHtml(item.body || '暂无补充说明。')}</p>
              </div>
            </article>
          `,
        )
        .join('')
    }

    const workTabs = document.getElementById('work-tabs')
    const workPanel = document.getElementById('work-panel')
    let activeGroup = groupConfig.find((item) => toArray(groups[item.key]).length > 0)?.key || 'internal'

    const renderWorkPanel = (groupKey) => {
      if (!workPanel) return
      const items = toArray(groups[groupKey], 8)
      if (items.length === 0) {
        workPanel.innerHTML = '<article class="dash-work-card"><p class="dash-work-body">当前分组暂无可展示内容。</p></article>'
        return
      }

      workPanel.innerHTML = items
        .map((item) => {
          const color = toneColor(item.tone)
          return `
            <article class="dash-work-card">
              <div class="dash-work-head">
                <h3 class="dash-work-title">${escapeHtml(item.title || '待补充事项')}</h3>
                <span class="dash-work-status" style="color:${color}">${escapeHtml(item.status || '进行中')}</span>
              </div>
              <p class="dash-work-body">${escapeHtml(item.body || '暂无补充说明。')}</p>
              <div class="dash-work-progress">
                <div class="dash-work-track"><div class="dash-work-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="background:${color}"></div></div>
                <span class="dash-work-pct">${escapeHtml(String(item.progress || 0))}%</span>
              </div>
            </article>
          `
        })
        .join('')

      renderProgress(workPanel)
    }

    if (workTabs) {
      workTabs.innerHTML = groupConfig
        .map((item) => `<button type="button" data-group="${item.key}" class="${item.key === activeGroup ? 'active' : ''}">${item.label}</button>`)
        .join('')

      workTabs.querySelectorAll('button[data-group]').forEach((button) => {
        button.addEventListener('click', () => {
          const nextGroup = button.getAttribute('data-group')
          if (!nextGroup) return
          activeGroup = nextGroup
          workTabs.querySelectorAll('button').forEach((node) => node.classList.remove('active'))
          button.classList.add('active')
          renderWorkPanel(activeGroup)
        })
      })
    }

    renderWorkPanel(activeGroup)

    const dataSummary = document.getElementById('data-summary')
    if (dataSummary) {
      dataSummary.innerHTML = `
        <h3>执行概览</h3>
        <div class="dash-summary-grid">
          <article class="dash-summary-cell"><h4>已完成</h4><p style="color:var(--lime)">${escapeHtml(String(summaryCounts.done || 0))}</p></article>
          <article class="dash-summary-cell"><h4>进行中</h4><p style="color:var(--cyan)">${escapeHtml(String(summaryCounts.progress || 0))}</p></article>
          <article class="dash-summary-cell"><h4>待推进</h4><p style="color:var(--amber)">${escapeHtml(String(summaryCounts.pending || 0))}</p></article>
        </div>
      `
    }

    const cooperationNode = document.getElementById('data-cooperation')
    if (cooperationNode) {
      const cooperation = toArray(data.cooperation, 6)
      if (cooperation.length === 0) {
        cooperationNode.innerHTML = '<div class="dash-row"><span class="dash-row-label">暂无数据</span><div class="dash-row-track"></div><span class="dash-row-val">--</span></div>'
      } else {
        cooperationNode.innerHTML = cooperation
          .map(
            (item) => `
              <div class="dash-row">
                <span class="dash-row-label">${escapeHtml(item.title || '合作项')}</span>
                <div class="dash-row-track"><div class="dash-row-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="background:${toneColor(item.tone)}"></div></div>
                <span class="dash-row-val">${escapeHtml(String(item.progress || 0))}%</span>
              </div>
            `,
          )
          .join('')
      }
    }

    const defenseNode = document.getElementById('data-defense')
    if (defenseNode) {
      const defense = data.defense || {}
      const rows = [
        { label: '通过评审', value: Number(defense.pass || 0), color: 'var(--lime)' },
        { label: '待复审', value: Number(defense.fail || 0), color: 'var(--rose)' },
        { label: '需专项评估', value: Number(defense.revised || 0), color: 'var(--amber)' },
        { label: '挂起项目', value: Number(defense.exam || 0), color: 'var(--cyan)' },
      ]
      const total = Math.max(Number(defense.total || 0), rows.reduce((sum, item) => sum + item.value, 0), 1)
      defenseNode.innerHTML = rows
        .map(
          (row) => `
            <div class="dash-row">
              <span class="dash-row-label">${row.label}</span>
              <div class="dash-row-track"><div class="dash-row-fill" data-w="${Number(((row.value / total) * 100).toFixed(1))}%" style="background:${row.color}"></div></div>
              <span class="dash-row-val">${row.value}人</span>
            </div>
          `,
        )
        .join('')
    }

    const metricsNode = document.getElementById('data-metrics')
    if (metricsNode) {
      const metrics = toArray(data.keyMetrics, 6)
      const source = metrics.length > 0 ? metrics : stats
      metricsNode.innerHTML = source
        .slice(0, 6)
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          return `
            <article class="dash-metric">
              <div class="dash-metric-value">${escapeHtml(parsed.value)}${
                parsed.unit ? `<span class="dash-metric-unit">${escapeHtml(parsed.unit)}</span>` : ''
              }</div>
              <div class="dash-metric-label">${escapeHtml(item.label || '指标')}</div>
            </article>
          `
        })
        .join('')
    }

    const issueNode = document.getElementById('issue-footer')
    if (issueNode) {
      issueNode.innerHTML = `
        <article class="dash-issue-item">
          <h4>报送对象</h4>
          <p>${escapeHtml(footer.recipient || '相关负责人')}</p>
        </article>
        <article class="dash-issue-item">
          <h4>发送范围</h4>
          <p>${escapeHtml(footer.distribution || '相关部门')}</p>
        </article>
        <article class="dash-issue-item">
          <h4>责编 / 核发</h4>
          <p>责编：${escapeHtml(footer.editor || '（待填写）')}<br>核发：${escapeHtml(footer.reviewer || '（待填写）')}</p>
        </article>
        <article class="dash-issue-item">
          <h4>发布日期</h4>
          <p>${escapeHtml(footer.date || footer.dateOnly || '')}</p>
        </article>
      `
    }

    const sideButtons = Array.from(document.querySelectorAll('.dash-side button[data-target]'))
    const setActiveSide = (id) => {
      sideButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.target === id)
      })
    }

    sideButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.target
        if (!targetId) return
        const node = document.getElementById(targetId)
        if (!node) return
        node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    setActiveSide('overview')

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveSide(entry.target.id)
          })
        },
        { rootMargin: '-30% 0px -55% 0px' },
      )

      ;['overview', 'work', 'data', 'issue'].forEach((id) => {
        const node = document.getElementById(id)
        if (node) observer.observe(node)
      })
    }

    if (previewLite) {
      renderProgress(document)
    } else if ('requestAnimationFrame' in window) {
      window.requestAnimationFrame(() => {
        window.setTimeout(() => renderProgress(document), 120)
      })
    } else {
      renderProgress(document)
    }

    const printButton = document.getElementById('print-btn')
    if (printButton) {
      printButton.addEventListener('click', () => window.print())
    }

    window.exportHTML = () => {
      const blob = new Blob(['<!DOCTYPE html>\n' + document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '周报_控制台版.html'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(link.href), 3000)
    }

    const exportButton = document.getElementById('export-btn')
    if (exportButton) {
      exportButton.addEventListener('click', () => window.exportHTML())
    }

    logBusinessJson('render_payload', {
      stats: stats.length,
      overview: overview.length,
      internal: toArray(groups.internal).length,
      cooperation: toArray(groups.cooperation).length,
      visit: toArray(groups.visit).length,
      system: toArray(groups.system).length,
      summaryCounts,
    })
    logSystem('info', '模块完成', { elapsedMs: Number((performance.now() - startedAt).toFixed(2)) })
  } catch (error) {
    logSystem('error', '模块渲染失败', { message: error instanceof Error ? error.message : String(error) })
  }
})()
