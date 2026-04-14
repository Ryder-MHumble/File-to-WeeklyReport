(() => {
  const MODULE_NAME = 'template-magazine-runtime'
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

  const getIssueNo = (label) => {
    const match = String(label || '').match(/(\d+)/)
    return String(match?.[1] || '1').padStart(2, '0')
  }

  const toneColor = (tone) => {
    if (tone === 'done') return 'var(--ok)'
    if (tone === 'warning') return 'var(--warn)'
    return 'var(--progress)'
  }

  const toPercent = (value, total) => {
    if (!total || total <= 0) return 0
    return Number(((Number(value || 0) / total) * 100).toFixed(1))
  }

  const renderProgressBars = (root = document) => {
    root.querySelectorAll('[data-w]').forEach((node) => {
      const target = node.getAttribute('data-w')
      if (!target) return
      node.style.width = target
    })
  }

  const sectionGroups = [
    { key: 'internal', label: '内部协同' },
    { key: 'cooperation', label: '对外合作' },
    { key: 'visit', label: '交流互访' },
    { key: 'system', label: '体系建设' },
  ]

  const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

  try {
    const startedAt = performance.now()
    logSystem('info', '模块启动', { previewLite })

    const payload = readPayload()
    const vm = payload.viewModel?.magazine || {}
    const cover = vm.cover || {}
    const stats = toArray(vm.stats, 6)
    const toc = toArray(vm.toc, 8)
    const overview = toArray(vm.overview, 6)
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}
    const issueNo = getIssueNo(cover.issueLabel)

    const decks = toArray(cover.decks || payload.keyPoints || [], 3).filter((item) => String(item || '').trim())

    const defaultTitle = payload.meta?.title || '周报'
    const defaultSubtitle = payload.meta?.subtitle || '本周汇总'

    document.title = cover.headline || defaultTitle

    const coverPretitle = document.getElementById('cover-pretitle')
    const coverIssue = document.getElementById('cover-issue')
    const coverTitle = document.getElementById('cover-title')
    const coverHeadline = document.getElementById('cover-headline')
    const coverDecks = document.getElementById('cover-decks')
    const coverMeta = document.getElementById('cover-meta')
    const coverStats = document.getElementById('cover-stats')
    const coverToc = document.getElementById('cover-toc')
    const toolbarBrand = document.getElementById('toolbar-brand')

    if (coverPretitle) {
      coverPretitle.textContent = `${footer.issuedBy || '自动生成周报'} · Internal Affairs Magazine`
    }
    if (coverIssue) {
      coverIssue.textContent = cover.issueLabel || `Vol.${issueNo}`
    }
    if (coverTitle) {
      coverTitle.textContent = defaultTitle
    }
    if (coverHeadline) {
      coverHeadline.textContent = cover.headline || defaultTitle
    }
    if (coverDecks) {
      const content = decks.length > 0 ? decks : [payload.meta?.summary || '暂无摘要']
      coverDecks.innerHTML = content.map((item) => `<p>${escapeHtml(item)}</p>`).join('')
    }
    if (coverMeta) {
      coverMeta.textContent = `${cover.period || defaultSubtitle} ｜ ${cover.unit || footer.issuedBy || '自动生成周报'}`
    }
    if (coverStats) {
      const statItems = (stats.length > 0 ? stats : toArray(data.keyMetrics, 4)).slice(0, 4)
      coverStats.innerHTML = statItems
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          return `
            <article class="cover-stat">
              <div class="cover-stat-label">${escapeHtml(item.label || '关键指标')}</div>
              <div class="cover-stat-value">${escapeHtml(parsed.value)}${
                parsed.unit ? `<span class="cover-stat-unit">${escapeHtml(parsed.unit)}</span>` : ''
              }</div>
              <div class="cover-stat-detail">${escapeHtml(item.detail || item.sub || '')}</div>
            </article>
          `
        })
        .join('')
    }
    if (coverToc) {
      const tocItems = toc.length > 0 ? toc : ['本周要览', '重点工作', '数据看板', '签发信息']
      coverToc.innerHTML = tocItems
        .map(
          (item, index) =>
            `<li><span class="cover-toc-no">${chineseNumbers[index] || String(index + 1)}</span><span>${escapeHtml(item)}</span></li>`,
        )
        .join('')
    }
    if (toolbarBrand) {
      toolbarBrand.textContent = `周报 · 第 ${issueNo} 期`
    }

    const overviewList = document.getElementById('overview-list')
    if (overviewList) {
      const source = overview.length > 0 ? overview : toArray(payload.keyPoints, 4).map((item, index) => ({
        number: String(index + 1).padStart(2, '0'),
        tag: '要点',
        title: item,
        body: payload.meta?.summary || '',
      }))

      overviewList.innerHTML = source
        .map(
          (item, index) => `
            <article class="overview-card">
              <div class="overview-meta">
                <span class="overview-no">${escapeHtml(item.number || String(index + 1).padStart(2, '0'))}</span>
                <span class="overview-tag">${escapeHtml(item.tag || '重点')}</span>
              </div>
              <h3>${escapeHtml(item.title || '待补充标题')}</h3>
              <p>${escapeHtml(item.body || '暂无补充说明。')}</p>
            </article>
          `,
        )
        .join('')
    }

    const workTabs = document.getElementById('work-tabs')
    const workPanel = document.getElementById('work-panel')
    let activeGroup = sectionGroups.find((item) => toArray(groups[item.key]).length > 0)?.key || 'internal'

    const renderWorkPanel = (groupKey) => {
      if (!workPanel) return
      const items = toArray(groups[groupKey], 8)
      if (items.length === 0) {
        workPanel.innerHTML = '<article class="work-card"><p class="work-body">当前分组暂无可展示内容。</p></article>'
        return
      }

      workPanel.innerHTML = items
        .map((item) => {
          const color = toneColor(item.tone)
          return `
            <article class="work-card">
              <div class="work-head">
                <h3 class="work-title">${escapeHtml(item.title || '待补充事项')}</h3>
                <span class="work-status" style="color:${color}">${escapeHtml(item.status || '进行中')}</span>
              </div>
              <p class="work-body">${escapeHtml(item.body || '暂无补充说明。')}</p>
              <div class="work-progress">
                <div class="work-track"><div class="work-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="background:${color}"></div></div>
                <span class="work-pct">${escapeHtml(String(item.progress || 0))}%</span>
              </div>
            </article>
          `
        })
        .join('')

      renderProgressBars(workPanel)
    }

    if (workTabs) {
      workTabs.innerHTML = sectionGroups
        .map(
          (group) =>
            `<button type="button" data-group="${group.key}" class="${group.key === activeGroup ? 'active' : ''}">${group.label}</button>`,
        )
        .join('')

      workTabs.querySelectorAll('button[data-group]').forEach((button) => {
        button.addEventListener('click', () => {
          const nextGroup = button.getAttribute('data-group')
          if (!nextGroup) return
          activeGroup = nextGroup
          workTabs.querySelectorAll('button').forEach((item) => item.classList.remove('active'))
          button.classList.add('active')
          renderWorkPanel(activeGroup)
        })
      })
    }

    renderWorkPanel(activeGroup)

    const dataMetrics = document.getElementById('data-metrics')
    if (dataMetrics) {
      const metrics = toArray(data.keyMetrics, 5)
      const source = metrics.length > 0 ? metrics : stats
      dataMetrics.innerHTML = source
        .slice(0, 5)
        .map((item) => {
          const parsed = splitValueUnit(item.value, item.unit)
          return `
            <article class="metric-card">
              <div class="metric-value">${escapeHtml(parsed.value)}${
                parsed.unit ? `<span class="metric-unit">${escapeHtml(parsed.unit)}</span>` : ''
              }</div>
              <div class="metric-label">${escapeHtml(item.label || '关键指标')}</div>
            </article>
          `
        })
        .join('')
    }

    const defenseNode = document.getElementById('data-defense')
    if (defenseNode) {
      const defense = data.defense || {}
      const defenseRows = [
        { label: '通过评审', value: Number(defense.pass || 0), color: 'var(--ok)' },
        { label: '待复审', value: Number(defense.fail || 0), color: 'var(--accent)' },
        { label: '需专项评估', value: Number(defense.revised || 0), color: 'var(--accent-gold)' },
        { label: '挂起项目', value: Number(defense.exam || 0), color: 'var(--progress)' },
      ]
      const total = Math.max(Number(defense.total || 0), defenseRows.reduce((sum, item) => sum + item.value, 0), 1)
      defenseNode.innerHTML = defenseRows
        .map(
          (row) => `
            <div class="chart-row">
              <span class="chart-label">${row.label}</span>
              <div class="chart-track"><div class="chart-fill" data-w="${toPercent(row.value, total)}%" style="background:${row.color}"></div></div>
              <span class="chart-val">${row.value}人</span>
            </div>
          `,
        )
        .join('')
    }

    const cooperationNode = document.getElementById('data-cooperation')
    if (cooperationNode) {
      const cooperation = toArray(data.cooperation, 6)
      if (cooperation.length === 0) {
        cooperationNode.innerHTML = '<div class="chart-row"><span class="chart-label">暂无数据</span><div class="chart-track"></div><span class="chart-val">--</span></div>'
      } else {
        cooperationNode.innerHTML = cooperation
          .map(
            (item) => `
              <div class="chart-row">
                <span class="chart-label">${escapeHtml(item.title || '合作项')}</span>
                <div class="chart-track"><div class="chart-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="background:${toneColor(item.tone)}"></div></div>
                <span class="chart-val">${escapeHtml(String(item.progress || 0))}%</span>
              </div>
            `,
          )
          .join('')
      }
    }

    const issueFooter = document.getElementById('issue-footer')
    if (issueFooter) {
      issueFooter.innerHTML = `
        <article class="issue-item">
          <h4>报送对象</h4>
          <p>${escapeHtml(footer.recipient || '相关负责人')}</p>
        </article>
        <article class="issue-item">
          <h4>发送范围</h4>
          <p>${escapeHtml(footer.distribution || '相关部门')}</p>
        </article>
        <article class="issue-item">
          <h4>责编 / 核发</h4>
          <p>责编：${escapeHtml(footer.editor || '（待填写）')}<br>核发：${escapeHtml(footer.reviewer || '（待填写）')}</p>
        </article>
        <article class="issue-item">
          <h4>发布日期</h4>
          <p>${escapeHtml(footer.date || footer.dateOnly || '')}</p>
        </article>
      `
    }

    const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'))
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

    const sectionIds = ['overview', 'work', 'data', 'issue']
    const setActiveNav = (id) => {
      navLinks.forEach((item) => item.classList.toggle('active', item.dataset.navLink === id))
    }
    setActiveNav('overview')

    if ('IntersectionObserver' in window) {
      const navObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveNav(entry.target.id)
            }
          })
        },
        { rootMargin: '-30% 0px -55% 0px' },
      )

      sectionIds.forEach((id) => {
        const node = document.getElementById(id)
        if (node) navObserver.observe(node)
      })
    }

    const runAnimate = () => {
      renderProgressBars(document)
    }

    if (previewLite) {
      runAnimate()
    } else if ('requestAnimationFrame' in window) {
      window.requestAnimationFrame(() => {
        window.setTimeout(runAnimate, 120)
      })
    } else {
      runAnimate()
    }

    const printButton = document.getElementById('print-btn')
    if (printButton) {
      printButton.addEventListener('click', () => window.print())
    }

    window.exportHTML = () => {
      const blob = new Blob(['<!DOCTYPE html>\n' + document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '周报_杂志封面版.html'
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
