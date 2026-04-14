(() => {
  const MODULE_NAME = 'template-swiss-grid-runtime'
  const isPreviewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)

  const escapeHtml = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const readPayload = () => {
    const node = document.getElementById('template-data')
    if (!node) throw new Error('缺少 template-data 节点')
    return JSON.parse(node.textContent || '{}')
  }

  const logBusinessJson = (stage, payload) => {
    console.info('[业务JSON]', JSON.stringify({ module: MODULE_NAME, stage, timestamp: new Date().toISOString(), payload }, null, 2))
  }

  const logSystem = (level, event, payload = {}) => {
    const logger = level === 'error' ? console.error : console.info
    logger('[系统日志]', JSON.stringify({ module: MODULE_NAME, level, event, timestamp: new Date().toISOString(), payload }, null, 2))
  }

  const splitValueUnit = (value, fallback = '') => {
    const raw = String(value ?? '').trim()
    if (!raw) return { value: '--', unit: fallback }
    const match = raw.match(/^([+-]?\d+(?:\.\d+)?)(.*)$/)
    if (!match) return { value: raw, unit: fallback }
    return { value: match[1], unit: (match[2] || '').trim() || fallback }
  }

  const statusClass = (item) => {
    if (item.tone === 'done') return 's-done'
    if (item.tone === 'warning') return 's-pend'
    return 's-prog'
  }

  const statusLabel = (item) => {
    if (item.tone === 'done') return '已完成'
    if (item.tone === 'warning') return '待解决'
    return '进行中'
  }

  const renderProgressBlocks = (percent) => {
    const total = 10
    const filled = Math.max(0, Math.min(total, Math.round((Number(percent || 0) / 100) * total)))
    return new Array(total)
      .fill(0)
      .map((_, index) => `<span class="tcp-bar ${index < filled ? 'fill' : ''} ${index < filled && percent >= 80 ? 'red' : ''}"></span>`)
      .join('')
  }

  const renderWorkCard = (item) => `
    <div class="tc">
      <div class="tc-status ${statusClass(item)}">● ${escapeHtml(item.status || statusLabel(item))}</div>
      <div class="tc-title">${escapeHtml(item.title || '待补充事项')}</div>
      <div class="tc-body">${escapeHtml(item.body || '暂无补充说明。')}</div>
      <div class="tc-prog"><div class="tcp-bars">${renderProgressBlocks(item.progress || 0)}</div><div class="tcp-pct">${escapeHtml(String(item.progress || 0))}%</div></div>
    </div>
  `

  try {
    const startedAt = performance.now()
    logSystem('info', '模板启动')

    const payload = readPayload()
    const vm = payload.viewModel?.swissGrid || {}
    const masthead = vm.masthead || {}
    const ticker = Array.isArray(vm.ticker) ? vm.ticker.slice(0, 6) : []
    const stats = Array.isArray(vm.stats) ? vm.stats.slice(0, 5) : []
    const overview = Array.isArray(vm.overview) ? vm.overview.slice(0, 5) : []
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}

    const swName = document.getElementById('sw-name')
    const swPub = document.getElementById('sw-pub')
    const swIssue = document.getElementById('sw-issue')
    const swDate = document.getElementById('sw-date')
    const swLogo = document.getElementById('sw-logo')
    if (swName) swName.textContent = masthead.name || payload.meta?.title || '周报'
    if (swPub) swPub.textContent = masthead.publisher || `${footer.issuedBy || 'Internal Bulletin'} · 内部资料`
    if (swIssue) swIssue.textContent = masthead.issue || 'VOL'
    if (swDate) swDate.textContent = masthead.date || footer.dateOnly || '--'
    if (swLogo) swLogo.textContent = masthead.logo || '报'

    const swTicker = document.getElementById('sw-ticker')
    if (swTicker) {
      swTicker.innerHTML = ticker
        .map((item) => `<div class="mt-item">${escapeHtml(item.label || '指标')} <span class="mt-val">${escapeHtml(String(item.value || '--'))}</span></div>`)
        .join('')
    }

    const kpiBand = document.getElementById('sw-kpi-band')
    if (kpiBand) {
      kpiBand.innerHTML = stats
        .map((item) => {
          const part = splitValueUnit(item.value, item.unit)
          return `
            <div class="kb">
              <div class="kb-n" data-target="${escapeHtml(String(item.target || 0))}">${escapeHtml(part.value)}${part.unit ? `<span class="kb-unit">${escapeHtml(part.unit)}</span>` : ''}</div>
              <div class="kb-label">${escapeHtml(item.label || '指标')}</div>
              <div class="kb-sub">${escapeHtml(item.detail || '')}</div>
            </div>
          `
        })
        .join('')
    }

    const overviewList = document.getElementById('sw-overview-list')
    if (overviewList) {
      const colors = ['#CC1A1A', '#1A5A1A', '#1A2A5A', '#5A3A1A', '#5A1A5A']
      overviewList.innerHTML = overview
        .map(
          (item, index) => `
            <div class="ev">
              <div class="ev-cat"><div class="ev-cat-label" style="color:${colors[index % colors.length]}">${escapeHtml(item.tag || '要点')}</div><div class="ev-cat-num">${String(index + 1).padStart(2, '0')}</div></div>
              <div class="ev-info"><div class="ev-title">${escapeHtml(item.title || '待补充标题')}</div><div class="ev-body">${escapeHtml(item.body || '暂无补充说明。')}</div></div>
            </div>
          `,
        )
        .join('')
    }

    const internalGrid = document.getElementById('sw-internal-grid')
    if (internalGrid) internalGrid.innerHTML = (groups.internal || []).slice(0, 8).map(renderWorkCard).join('')

    const cooperationGrid = document.getElementById('sw-cooperation-grid')
    if (cooperationGrid) cooperationGrid.innerHTML = (groups.cooperation || []).slice(0, 6).map(renderWorkCard).join('')

    const numWall = document.getElementById('sw-numwall')
    if (numWall) {
      numWall.innerHTML = (data.keyMetrics || stats)
        .slice(0, 6)
        .map((item) => {
          const part = splitValueUnit(item.value, item.unit)
          return `<div class="nw"><div class="nw-n">${escapeHtml(part.value)}</div><div class="nw-l">${escapeHtml(item.label || '指标').replace(/\s+/g, '<br>')}</div></div>`
        })
        .join('')
    }

    const coopBars = document.getElementById('sw-coop-bars')
    if (coopBars) {
      coopBars.innerHTML = (data.cooperation || [])
        .slice(0, 6)
        .map((item) => `<div class="hb-item"><div class="hb-label">${escapeHtml(item.title || '合作项')}</div><div class="hb-track"><div class="hb-fill" data-w="${escapeHtml(String(item.progress || 0))}%" style="width:0"></div></div><div class="hb-val">${escapeHtml(String(item.progress || 0))}%</div></div>`)
        .join('')
    }

    const defenseTitle = document.getElementById('sw-defense-title')
    const defenseTable = document.getElementById('sw-defense-table')
    const defense = data.defense || {}
    const defenseRows = [
      { name: '通过评审', value: defense.pass || 0, color: '#1A5A1A' },
      { name: '待复审', value: defense.fail || 0, color: '#CC1A1A' },
      { name: '需专项评估', value: defense.revised || 0, color: '#CC7A1A' },
      { name: '挂起项目', value: defense.exam || 0, color: '#1A2A5A' },
    ]
    const total = Math.max(1, Number(defense.total || 0))
    if (defenseTitle) defenseTitle.textContent = `项目评审结果（共${defense.total || 0}单）`
    if (defenseTable) {
      defenseTable.innerHTML = defenseRows
        .map((item) => {
          const pct = Math.round((item.value / total) * 100)
          return `
            <tr>
              <td><div style="font-size:12px;color:var(--ink4)">${escapeHtml(item.name)}</div></td>
              <td><div class="at-num" style="color:${item.color}">${escapeHtml(String(item.value))}</div></td>
              <td style="width:100px"><div class="at-bar" style="width:100px"><div class="at-barfill" style="width:${pct}%;background:${item.color}"></div></div></td>
            </tr>
          `
        })
        .join('')
    }

    const footerNode = document.getElementById('sw-footer')
    if (footerNode) {
      footerNode.innerHTML = `
        <div><div class="ft-item-label">报送对象</div><div class="ft-item-val">${escapeHtml(footer.recipient || '相关负责人')}</div></div>
        <div><div class="ft-item-label">发送范围</div><div class="ft-item-val">${escapeHtml(footer.distribution || '相关部门')}</div></div>
        <div><div class="ft-item-label">责编 / 核发</div><div class="ft-item-val">责编：${escapeHtml(footer.editor || '（待填写）')} · 核发：${escapeHtml(footer.reviewer || '（待填写）')}</div></div>
        <div class="ft-stamp">${escapeHtml((footer.dateOnly || '').replace(/-/g, '\n') || '--')}</div>
      `
    }

    if (!isPreviewLite) {
      document.querySelectorAll('.kb-n[data-target]').forEach((node) => {
        const target = Number(node.dataset.target || 0)
        if (!Number.isFinite(target) || target <= 0) return
        let current = 0
        const step = Math.max(1, Math.ceil(target / 36))
        const timer = window.setInterval(() => {
          current = Math.min(target, current + step)
          node.firstChild.textContent = String(current)
          if (current >= target) window.clearInterval(timer)
        }, 26)
      })
    }

    const revealImmediately = () => {
      document.querySelectorAll('.rev,.ev,.tc').forEach((el) => el.classList.add('vis'))
      document.querySelectorAll('[data-w]').forEach((el) => {
        const target = el.getAttribute('data-w')
        if (target) {
          el.style.width = target
        }
      })
    }

    if (isPreviewLite) {
      revealImmediately()
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add('vis')
            entry.target.querySelectorAll('.ev,.tc,[data-w]').forEach((el, index) => {
              window.setTimeout(() => {
                el.classList.add('vis')
                const target = el.getAttribute('data-w')
                if (target) el.style.width = target
              }, index * 24)
            })
            io.unobserve(entry.target)
          })
        },
        { threshold: 0.04 },
      )
      document.querySelectorAll('.rev,.ev-list,.two-col,.data-grid').forEach((el) => io.observe(el))
      document.querySelectorAll('.ev').forEach((el, index) => window.setTimeout(() => el.classList.add('vis'), 80 + index * 30))
    }

    logBusinessJson('render_payload', {
      stats: stats.length,
      overview: overview.length,
      internal: (groups.internal || []).length,
      cooperation: (groups.cooperation || []).length,
      keyMetrics: (data.keyMetrics || []).length,
    })
    logSystem('info', '模板完成', { elapsedMs: Number((performance.now() - startedAt).toFixed(2)) })
  } catch (error) {
    logSystem('error', '模板渲染失败', { message: error instanceof Error ? error.message : String(error) })
  }
})()

function exportHTML() {
  const blob = new Blob(['<!DOCTYPE html>\n' + document.documentElement.outerHTML], { type: 'text/html' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = '周报_瑞士版式版.html'
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 3000)
}
