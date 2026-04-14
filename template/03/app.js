(() => {
  const MODULE_NAME = 'template-ink-runtime'
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
    if (tone === 'done') return 'var(--jade)'
    if (tone === 'warning') return 'var(--gold)'
    return 'var(--indigo)'
  }

  const toPercent = (value, total) => {
    if (!total || total <= 0) return 0
    return Number(((Number(value || 0) / total) * 100).toFixed(1))
  }

  const renderProgress = (root = document) => {
    root.querySelectorAll('[data-w]').forEach((node) => {
      const target = node.getAttribute('data-w')
      if (target) {
        node.style.width = target
      }
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
    const vm = payload.viewModel?.ink || {}
    const cover = vm.cover || {}
    const overview = toArray(vm.overview, 6)
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}
    const stats = toArray(cover.stats, 5)

    const defaultTitle = payload.meta?.title || '周报'
    const defaultSub = payload.meta?.subtitle || '本周汇总'

    document.title = cover.title || defaultTitle

    const coverEn = document.getElementById('cover-en')
    const coverTitle = document.getElementById('cover-title')
    const coverSub = document.getElementById('cover-sub')
    const coverMeta = document.getElementById('cover-meta')
    const coverStats = document.getElementById('cover-stats')
    const navBrand = document.getElementById('nav-brand')

    if (coverEn) coverEn.textContent = cover.enTitle || `${footer.issuedBy || '自动生成周报'} · Weekly Report`
    if (coverTitle) coverTitle.textContent = cover.title || defaultTitle
    if (coverSub) coverSub.textContent = cover.subTitle || '第一期'
    if (coverMeta) {
      coverMeta.textContent = `${cover.period || defaultSub} ｜ 发布日期：${cover.issuedAt || footer.date || ''} ｜ 发布单位：${cover.unit || footer.issuedBy || '自动生成周报'}`
    }
    if (navBrand) navBrand.textContent = cover.title || defaultTitle

    if (coverStats) {
      const source = stats.length > 0 ? stats : toArray(data.keyMetrics, 5)
      coverStats.innerHTML = source
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          return `
            <article class="ink-cover-stat">
              <div class="ink-cover-stat-value">${escapeHtml(parsed.value)}${
                parsed.unit ? `<span class="ink-cover-stat-unit">${escapeHtml(parsed.unit)}</span>` : ''
              }</div>
              <div class="ink-cover-stat-label">${escapeHtml(item.label || '关键指标')}</div>
            </article>
          `
        })
        .join('')
    }

    const overviewList = document.getElementById('overview-list')
    if (overviewList) {
      const source = overview.length > 0 ? overview : toArray(payload.keyPoints, 5).map((item, index) => ({
        number: String(index + 1).padStart(2, '0'),
        tag: '要点',
        title: item,
        body: payload.meta?.summary || '暂无摘要',
      }))
      overviewList.innerHTML = source
        .map(
          (item, index) => `
            <article class="ink-overview-item">
              <div class="ink-overview-no">${escapeHtml(item.number || String(index + 1).padStart(2, '0'))}</div>
              <div class="ink-overview-content">
                <span class="ink-overview-tag">${escapeHtml(item.tag || '要点')}</span>
                <h3 class="ink-overview-title">${escapeHtml(item.title || '待补充标题')}</h3>
                <p class="ink-overview-body">${escapeHtml(item.body || '暂无补充说明。')}</p>
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
        workPanel.innerHTML = '<article class="ink-work-card"><p class="ink-work-body">当前分组暂无可展示内容。</p></article>'
        return
      }

      workPanel.innerHTML = items
        .map((item) => {
          const color = toneColor(item.tone)
          return `
            <article class="ink-work-card" style="border-left-color:${color}">
              <div class="ink-work-head">
                <h3 class="ink-work-title">${escapeHtml(item.title || '待补充事项')}</h3>
                <span class="ink-work-status" style="color:${color}">${escapeHtml(item.status || '进行中')}</span>
              </div>
              <p class="ink-work-body">${escapeHtml(item.body || '暂无补充说明。')}</p>
              <div class="ink-work-progress">
                <div class="ink-work-track"><div class="ink-work-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="background:${color}"></div></div>
                <span class="ink-work-pct">${escapeHtml(String(item.progress || 0))}%</span>
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

    const metricsNode = document.getElementById('data-metrics')
    if (metricsNode) {
      const metrics = toArray(data.keyMetrics, 6)
      const source = metrics.length > 0 ? metrics : stats
      metricsNode.innerHTML = source
        .slice(0, 6)
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          return `
            <article class="ink-metric-card">
              <div class="ink-metric-value">${escapeHtml(parsed.value)}${
                parsed.unit ? `<span class="ink-metric-unit">${escapeHtml(parsed.unit)}</span>` : ''
              }</div>
              <div class="ink-metric-label">${escapeHtml(item.label || '关键指标')}</div>
            </article>
          `
        })
        .join('')
    }

    const defenseNode = document.getElementById('data-defense')
    if (defenseNode) {
      const defense = data.defense || {}
      const rows = [
        { label: '通过评审', value: Number(defense.pass || 0), color: 'var(--jade)' },
        { label: '待复审', value: Number(defense.fail || 0), color: 'var(--red)' },
        { label: '需专项评估', value: Number(defense.revised || 0), color: 'var(--gold)' },
        { label: '挂起项目', value: Number(defense.exam || 0), color: 'var(--indigo)' },
      ]
      const total = Math.max(Number(defense.total || 0), rows.reduce((sum, item) => sum + item.value, 0), 1)
      defenseNode.innerHTML = rows
        .map(
          (row) => `
            <div class="ink-row">
              <span class="ink-row-label">${row.label}</span>
              <div class="ink-row-track"><div class="ink-row-fill" data-w="${toPercent(row.value, total)}%" style="background:${row.color}"></div></div>
              <span class="ink-row-val">${row.value}人</span>
            </div>
          `,
        )
        .join('')
    }

    const progressNode = document.getElementById('data-progress')
    if (progressNode) {
      const cooperation = toArray(data.cooperation, 4).map((item) => ({ ...item, prefix: '合作' }))
      const system = toArray(data.system, 4).map((item) => ({ ...item, prefix: '体系' }))
      const rows = [...cooperation, ...system]
      if (rows.length === 0) {
        progressNode.innerHTML = '<div class="ink-row"><span class="ink-row-label">暂无数据</span><div class="ink-row-track"></div><span class="ink-row-val">--</span></div>'
      } else {
        progressNode.innerHTML = rows
          .map(
            (row) => `
              <div class="ink-row">
                <span class="ink-row-label">${escapeHtml(row.prefix)}·${escapeHtml(row.title || '事项')}</span>
                <div class="ink-row-track"><div class="ink-row-fill" data-w="${escapeHtml(String(row.progress || 0))}%" style="background:${toneColor(row.tone)}"></div></div>
                <span class="ink-row-val">${escapeHtml(String(row.progress || 0))}%</span>
              </div>
            `,
          )
          .join('')
      }
    }

    const issueNode = document.getElementById('issue-footer')
    if (issueNode) {
      issueNode.innerHTML = `
        <article class="ink-issue-item">
          <h4>报送对象</h4>
          <p>${escapeHtml(footer.recipient || '相关负责人')}</p>
        </article>
        <article class="ink-issue-item">
          <h4>发送范围</h4>
          <p>${escapeHtml(footer.distribution || '相关部门')}</p>
        </article>
        <article class="ink-issue-item">
          <h4>责编 / 核发</h4>
          <p>责编：${escapeHtml(footer.editor || '（待填写）')}<br>核发：${escapeHtml(footer.reviewer || '（待填写）')}</p>
        </article>
        <article class="ink-issue-item">
          <h4>发布日期</h4>
          <p>${escapeHtml(footer.date || footer.dateOnly || '')}</p>
        </article>
      `
    }

    const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'))
    const setActiveNav = (id) => {
      navLinks.forEach((item) => item.classList.toggle('active', item.dataset.navLink === id))
    }

    navLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault()
        const targetId = link.getAttribute('href')?.replace('#', '')
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
      link.download = '周报_国风卷轴版.html'
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
