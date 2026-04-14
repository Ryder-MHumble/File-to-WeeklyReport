(() => {
  const MODULE_NAME = 'template-split-magazine-runtime'
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
    if (tone === 'done') return 'var(--sage)'
    if (tone === 'warning') return 'var(--gold)'
    return 'var(--blue)'
  }

  const renderProgress = (root = document) => {
    root.querySelectorAll('[data-w]').forEach((node) => {
      const target = node.getAttribute('data-w')
      if (target) node.style.width = target
    })
  }

  const sectionConfig = [
    { id: 'overview', label: '本周要览' },
    { id: 'internal', label: '内部协同' },
    { id: 'cooperation', label: '对外合作' },
    { id: 'visit', label: '交流互访' },
    { id: 'system', label: '体系建设' },
    { id: 'data', label: '数据看板' },
    { id: 'issue', label: '签发信息' },
  ]

  try {
    const startedAt = performance.now()
    logSystem('info', '模块启动', { previewLite })

    const payload = readPayload()
    const vm = payload.viewModel?.splitMagazine || {}
    const masthead = vm.masthead || {}
    const stats = toArray(vm.stats, 6)
    const overview = toArray(vm.overview, 6)
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}

    const leftTitle = document.getElementById('left-title')
    const leftIssue = document.getElementById('left-issue')
    const leftFoot = document.getElementById('left-foot')
    if (leftTitle) leftTitle.textContent = masthead.title || payload.meta?.title || '工作周报'
    if (leftIssue) leftIssue.textContent = masthead.issue || payload.meta?.subtitle || '内部资料'
    if (leftFoot) leftFoot.textContent = masthead.foot || footer.dateOnly || '--'

    const leftStats = document.getElementById('left-stats')
    if (leftStats) {
      const maxTarget = Math.max(1, ...stats.map((item) => Number(item.target || 0)))
      leftStats.innerHTML = stats
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          const ratio = Math.max(8, Math.min(100, Math.round(((Number(item.target || 0) || 0) / maxTarget) * 100)))
          return `
            <article class="split-stat">
              <div class="split-stat-value">${escapeHtml(parsed.value)}${
                parsed.unit ? `<span class="split-stat-unit">${escapeHtml(parsed.unit)}</span>` : ''
              }</div>
              <div class="split-stat-label">${escapeHtml(item.label || '关键指标')}</div>
              <div class="split-stat-track"><div class="split-stat-fill" data-w="${ratio}%"></div></div>
            </article>
          `
        })
        .join('')
    }

    const leftNav = document.getElementById('left-nav')
    if (leftNav) {
      leftNav.innerHTML = sectionConfig
        .map((item, index) => `<button type="button" data-target="${item.id}" class="${index === 0 ? 'active' : ''}">${item.label}</button>`)
        .join('')
    }

    const overviewNode = document.getElementById('overview-list')
    if (overviewNode) {
      const source = overview.length > 0 ? overview : toArray(payload.keyPoints, 6).map((item, index) => ({
        number: String(index + 1).padStart(2, '0'),
        tag: '要点',
        title: item,
        body: payload.meta?.summary || '暂无摘要',
      }))
      overviewNode.innerHTML = source
        .map(
          (item, index) => `
            <article class="split-overview-item">
              <div class="split-overview-no">${escapeHtml(item.number || String(index + 1).padStart(2, '0'))}</div>
              <div class="split-overview-main">
                <div class="split-overview-tag">${escapeHtml(item.tag || '重点')}</div>
                <h3 class="split-overview-title">${escapeHtml(item.title || '待补充标题')}</h3>
                <p class="split-overview-body">${escapeHtml(item.body || '暂无补充说明。')}</p>
              </div>
            </article>
          `,
        )
        .join('')
    }

    const renderWorkCards = (targetId, items) => {
      const node = document.getElementById(targetId)
      if (!node) return
      const source = toArray(items, 8)
      if (source.length === 0) {
        node.innerHTML = '<article class="split-work-card"><p class="split-work-body">当前分组暂无可展示内容。</p></article>'
        return
      }

      node.innerHTML = source
        .map((item) => {
          const color = toneColor(item.tone)
          return `
            <article class="split-work-card">
              <div class="split-work-head">
                <h3 class="split-work-title">${escapeHtml(item.title || '待补充事项')}</h3>
                <span class="split-work-status" style="color:${color}">${escapeHtml(item.status || '进行中')}</span>
              </div>
              <p class="split-work-body">${escapeHtml(item.body || '暂无补充说明。')}</p>
              <div class="split-work-progress">
                <div class="split-work-track"><div class="split-work-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="background:${color}"></div></div>
                <span class="split-work-pct">${escapeHtml(String(item.progress || 0))}%</span>
              </div>
            </article>
          `
        })
        .join('')
    }

    renderWorkCards('wk-grid', groups.internal)
    renderWorkCards('co-grid', groups.cooperation)
    renderWorkCards('vi-grid', groups.visit)
    renderWorkCards('sy-grid', groups.system)

    const metricsNode = document.getElementById('data-metrics')
    if (metricsNode) {
      const metrics = toArray(data.keyMetrics, 8)
      const source = metrics.length > 0 ? metrics : stats
      metricsNode.innerHTML = source
        .slice(0, 4)
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          return `
            <article class="split-metric">
              <div class="split-metric-value">${escapeHtml(parsed.value)}${
                parsed.unit ? `<span class="split-metric-unit">${escapeHtml(parsed.unit)}</span>` : ''
              }</div>
              <div class="split-metric-label">${escapeHtml(item.label || '指标')}</div>
            </article>
          `
        })
        .join('')
    }

    const cooperationNode = document.getElementById('data-cooperation')
    if (cooperationNode) {
      const cooperation = toArray(data.cooperation, 6)
      if (cooperation.length === 0) {
        cooperationNode.innerHTML = '<div class="split-row"><span class="split-row-label">暂无数据</span><div class="split-row-track"></div><span class="split-row-val">--</span></div>'
      } else {
        cooperationNode.innerHTML = cooperation
          .map(
            (item) => `
              <div class="split-row">
                <span class="split-row-label">${escapeHtml(item.title || '合作项')}</span>
                <div class="split-row-track"><div class="split-row-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="background:${toneColor(item.tone)}"></div></div>
                <span class="split-row-val">${escapeHtml(String(item.progress || 0))}%</span>
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
        { label: '通过评审', value: Number(defense.pass || 0), color: 'var(--sage)' },
        { label: '待复审', value: Number(defense.fail || 0), color: 'var(--red)' },
        { label: '需专项评估', value: Number(defense.revised || 0), color: 'var(--gold)' },
        { label: '挂起项目', value: Number(defense.exam || 0), color: 'var(--blue)' },
      ]
      const total = Math.max(Number(defense.total || 0), rows.reduce((sum, item) => sum + item.value, 0), 1)
      defenseNode.innerHTML = rows
        .map(
          (row) => `
            <div class="split-row">
              <span class="split-row-label">${row.label}</span>
              <div class="split-row-track"><div class="split-row-fill" data-w="${Number(((row.value / total) * 100).toFixed(1))}%" style="background:${row.color}"></div></div>
              <span class="split-row-val">${row.value}人</span>
            </div>
          `,
        )
        .join('')
    }

    const issueNode = document.getElementById('issue-footer')
    if (issueNode) {
      issueNode.innerHTML = `
        <article class="split-issue-item">
          <h4>报送对象</h4>
          <p>${escapeHtml(footer.recipient || '相关负责人')}</p>
        </article>
        <article class="split-issue-item">
          <h4>发送范围</h4>
          <p>${escapeHtml(footer.distribution || '相关部门')}</p>
        </article>
        <article class="split-issue-item">
          <h4>责编 / 核发</h4>
          <p>责编：${escapeHtml(footer.editor || '（待填写）')}<br>核发：${escapeHtml(footer.reviewer || '（待填写）')}</p>
        </article>
        <article class="split-issue-item">
          <h4>发布日期</h4>
          <p>${escapeHtml(footer.date || footer.dateOnly || '')}</p>
        </article>
      `
    }

    const navButtons = Array.from(document.querySelectorAll('.split-nav button[data-target]'))
    const setActiveNav = (id) => {
      navButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.target === id)
      })
    }

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.target
        if (!targetId) return
        const target = document.getElementById(targetId)
        if (!target) return
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    setActiveNav('overview')

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveNav(entry.target.id)
            }
          })
        },
        { rootMargin: '-30% 0px -55% 0px' },
      )

      sectionConfig.forEach((item) => {
        const node = document.getElementById(item.id)
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
      link.download = '周报_分屏杂志版.html'
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
    })
    logSystem('info', '模块完成', { elapsedMs: Number((performance.now() - startedAt).toFixed(2)) })
  } catch (error) {
    logSystem('error', '模块渲染失败', { message: error instanceof Error ? error.message : String(error) })
  }
})()
