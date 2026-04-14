(() => {
  const MODULE_NAME = 'template-news-runtime'

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

  const toneMeta = (item) => {
    if (item.tone === 'done') return { color: 'var(--sage)', label: '已完成' }
    if (item.tone === 'warning') return { color: 'var(--orange)', label: '待推进' }
    return { color: 'var(--blue)', label: '进行中' }
  }

  const renderStory = (item) => {
    const meta = toneMeta(item)
    return `
      <div class="story-item">
        <div class="si-tag" style="color:${meta.color}"><div style="width:5px;height:5px;border-radius:50%;background:${meta.color}"></div>${escapeHtml(item.status || meta.label)}</div>
        <div class="si-title">${escapeHtml(item.title)}</div>
        <div class="si-body">${escapeHtml(item.body)}</div>
        <div class="si-prog"><div class="si-prog-track"><div class="si-prog-fill" style="background:${meta.color};width:0" data-w="${escapeHtml(String(item.progress))}%"></div></div><div class="si-prog-val">${escapeHtml(String(item.progress))}%</div></div>
      </div>
    `
  }

  const renderDataProgress = (items, colorize) =>
    items
      .map((item) => {
        const color = colorize(item)
        return `<div class="dpl-item"><div class="dpl-label">${escapeHtml(item.title)}</div><div class="dpl-track"><div class="dpl-fill" style="background:${color};width:0" data-w="${escapeHtml(String(item.progress))}%"></div></div><div class="dpl-val">${escapeHtml(String(item.progress))}%</div></div>`
      })
      .join('')

  try {
    const startedAt = performance.now()
    const previewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)
    logSystem('info', '模板启动')

    const payload = readPayload()
    const vm = payload.viewModel?.news || {}
    const masthead = vm.masthead || {}
    const ticker = Array.isArray(vm.ticker) ? vm.ticker.slice(0, 6) : []
    const hero = vm.hero || {}
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}

    const brandName = document.querySelector('.mh-name')
    const dateNode = document.querySelector('.mh-date')
    const issueNode = document.querySelector('.mh-issue')
    if (brandName) brandName.textContent = masthead.brand || footer.issuedBy || '自动生成周报'
    if (dateNode) dateNode.textContent = masthead.date || footer.dateOnly || ''
    if (issueNode) issueNode.textContent = masthead.issueLabel || '第 01 期'

    const tickerNode = document.querySelector('.ticker-items')
    if (tickerNode) {
      const cells = [...ticker, ...ticker]
      tickerNode.innerHTML = cells
        .map((item, index) => `${index > 0 ? '<div class="ticker-dot"></div>' : ''}<div class="ticker-item">${escapeHtml(item.label || '指标')} <span class="ticker-val">${escapeHtml(item.value || '--')}${item.unit ? escapeHtml(item.unit) : ''}</span></div>`)
        .join('')
    }

    const eyebrow = document.querySelector('.sh-eyebrow')
    const headline = document.querySelector('.sh-headline')
    const deck = document.querySelector('.sh-deck')
    if (eyebrow) eyebrow.textContent = hero.eyebrow || '本周要览'
    if (headline) headline.innerHTML = escapeHtml(hero.headline || payload.meta?.title || '未命名周报').replace(/\s+/g, '<br>')
    if (deck) deck.textContent = hero.deck || payload.meta?.summary || '暂无摘要信息。'

    const heroStats = document.querySelector('.sh-kpi-col')
    if (heroStats) {
      heroStats.innerHTML = (hero.stats || [])
        .map(
          (item, index) => `
            <div class="sh-kpi-item">
              <div class="ski-label">${escapeHtml(item.label || '指标')}</div>
              <div class="ski-row"><div class="ski-num" style="color:${['var(--gold)','var(--sage)','var(--blue)','var(--orange)'][index % 4]}">${escapeHtml(item.value || '--')}</div><div class="ski-unit">${escapeHtml(item.unit || '')}</div></div>
              <div class="ski-desc">${escapeHtml(item.detail || '')}</div>
            </div>
          `,
        )
        .join('')
    }

    const bodyLayout = document.querySelector('.body-layout')
    if (bodyLayout) {
      bodyLayout.innerHTML = `
        <div class="bl-col">
          <div class="col-head"><div class="ch-label"><div class="ch-dot" style="background:var(--gold)"></div>内部协同</div><div class="ch-count">${escapeHtml(String((groups.internal || []).length))} ITEMS</div></div>
          ${(groups.internal || []).map(renderStory).join('')}
          <div style="padding:0 28px"><div style="border-top:1px solid var(--border);padding:16px 0"><div class="ch-label" style="margin-bottom:12px"><div class="ch-dot" style="background:var(--lavender)"></div>交流互访</div>${(groups.visit || []).slice(0,3).map((item) => `<div class="story-item" style="padding:12px 0;border-bottom:1px solid var(--border)"><div class="si-title" style="font-size:13px">${escapeHtml(item.title)}</div><div class="si-body" style="font-size:11.5px">${escapeHtml(item.body)}</div></div>`).join('')}</div></div>
        </div>
        <div class="bl-col">
          <div class="col-head"><div class="ch-label"><div class="ch-dot" style="background:var(--coral)"></div>对外合作 · 体系建设</div><div class="ch-count">${escapeHtml(String((groups.cooperation || []).length + (groups.system || []).length))} ITEMS</div></div>
          ${(groups.cooperation || []).map(renderStory).join('')}
          <div style="padding:0 28px"><div style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px"><div class="ch-label" style="margin-bottom:12px"><div class="ch-dot" style="background:var(--gold)"></div>体系建设</div></div></div>
          ${(groups.system || []).map(renderStory).join('')}
        </div>
        <div class="bl-col">
          <div class="col-head"><div class="ch-label"><div class="ch-dot" style="background:var(--lavender)"></div>数据看板</div></div>
          <div class="dp-section"><div class="dp-title">关键数字</div><div class="dp-nums">${(data.keyMetrics || []).map((item, index) => `<div class="dp-num-cell"><div class="dn-val" style="color:${['var(--gold)','var(--sage)','var(--blue)','var(--orange)','var(--lavender)','var(--coral)'][index % 6]}">${escapeHtml(item.value || '--')}</div><div class="dn-label">${escapeHtml(item.label || '指标')}</div></div>`).join('')}</div></div>
          <div class="dp-section"><div class="dp-title">项目评审结果</div><div class="dp-donut-wrap"><div class="dp-legend" style="width:100%"><div class="dp-l-item"><div class="dp-l-dot" style="background:var(--sage)"></div><div class="dp-l-name">评审总数</div><div class="dp-l-val">${escapeHtml(String(data.defense?.total || 0))}</div></div><div class="dp-l-item"><div class="dp-l-dot" style="background:var(--blue)"></div><div class="dp-l-name">通过评审</div><div class="dp-l-val">${escapeHtml(String(data.defense?.pass || 0))}</div></div><div class="dp-l-item"><div class="dp-l-dot" style="background:var(--coral)"></div><div class="dp-l-name">待复审</div><div class="dp-l-val">${escapeHtml(String(data.defense?.fail || 0))}</div></div><div class="dp-l-item"><div class="dp-l-dot" style="background:var(--gold)"></div><div class="dp-l-name">需专项评估</div><div class="dp-l-val">${escapeHtml(String(data.defense?.revised || 0))}</div></div></div></div></div>
          <div class="dp-section"><div class="dp-title">合作推进度</div><div class="dp-prog-list">${renderDataProgress(data.cooperation || [], (item) => toneMeta(item).color)}</div></div>
          <div class="dp-section"><div class="dp-title">本周外部协同亮点</div><div style="background:var(--surface2);border-radius:8px;padding:14px;border:1px solid var(--border)"><div style="font-size:28px;font-weight:800;color:var(--gold);font-family:'Syne',sans-serif;letter-spacing:-1px;line-height:1;margin-bottom:4px">${escapeHtml(String((data.international || []).length))}<span style="font-size:14px;color:var(--muted);font-weight:400">条亮点</span></div><div style="font-size:11px;color:var(--muted);margin-bottom:10px">来自巡检、客户走访与合作沟通</div>${(data.international || []).slice(0,4).map((item) => `<div style="font-size:10px;color:var(--muted);margin-bottom:6px">${escapeHtml(item.title)}</div>`).join('')}</div></div>
        </div>
      `
    }

    const bottomStrip = document.querySelector('.bottom-strip')
    if (bottomStrip) {
      bottomStrip.innerHTML = `
        <div class="bs-cell"><div class="bsc-label">报送对象</div><div class="bsc-val">${escapeHtml(footer.recipient || '相关负责人')}</div></div>
        <div class="bs-cell"><div class="bsc-label">发送范围</div><div class="bsc-val">${escapeHtml(footer.distribution || '相关部门')}</div></div>
        <div class="bs-cell"><div class="bsc-label">责编 / 核发</div><div class="bsc-val">责编：${escapeHtml(footer.editor || '（待填写）')} · 核发：${escapeHtml(footer.reviewer || '（待填写）')}</div></div>
        <div class="bs-cell"><div class="bs-stamp">${escapeHtml(footer.dateOnly || '')}<br>${escapeHtml(masthead.issueLabel || '第 01 期')}</div></div>
      `
    }

    logBusinessJson('render_payload', {
      ticker: ticker.length,
      internal: (groups.internal || []).length,
      cooperation: (groups.cooperation || []).length,
      visit: (groups.visit || []).length,
      system: (groups.system || []).length,
      previewLite,
    })
    logSystem('info', '模板完成', { elapsedMs: Number((performance.now() - startedAt).toFixed(2)) })
  } catch (error) {
    logSystem('error', '模板渲染失败', { message: error instanceof Error ? error.message : String(error) })
  }
})()

const previewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)

if (previewLite) {
  document.querySelectorAll('.story-item,.fade-up,.data-card').forEach((el) => el.classList.add('vis'))
  document.querySelectorAll('[data-w]').forEach((el) => {
    el.style.width = el.dataset.w || '0'
  })
} else {
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      e.target.classList.add('vis');
      e.target.querySelectorAll('[data-w]').forEach(el=>{
        setTimeout(()=>el.style.width=el.dataset.w,300);
      });
      io.unobserve(e.target);
    });
  },{threshold:.04});
  document.querySelectorAll('.story-item,.fade-up,.data-card').forEach(el=>io.observe(el));
}
