(() => {
  const MODULE_NAME = 'template-journal-runtime'

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

  const statusChip = (item) => {
    if (item.tone === 'done') return 'chip-done'
    if (item.tone === 'warning') return 'chip-pend'
    return 'chip-prog'
  }

  const renderBars = (items) =>
    items
      .map(
        (item) => `
          <div class="data-row"><div class="dr-label">${escapeHtml(item.title)}</div><div class="dr-bar"><div class="dr-fill" data-w="${escapeHtml(String(item.progress))}%" style="width:0"></div></div><div class="dr-val">${escapeHtml(String(item.progress))}%</div></div>
        `,
      )
      .join('')

  try {
    const startedAt = performance.now()
    const previewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)
    logSystem('info', '模板启动')

    const payload = readPayload()
    const vm = payload.viewModel?.journal || {}
    const header = vm.header || {}
    const stats = Array.isArray(vm.stats) ? vm.stats.slice(0, 5) : []
    const overview = Array.isArray(vm.overview) ? vm.overview.slice(0, 5) : []
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}

    const title = document.querySelector('.journal-title')
    const sub = document.querySelector('.journal-sub')
    const issueNum = document.querySelector('.issue-num')
    const issueDate = document.querySelector('.issue-date')
    const metaAuthors = document.querySelector('.meta-authors')
    const metaTags = document.querySelector('.meta-tags')
    const abstract = document.querySelector('.abstract-text')
    if (title) title.textContent = header.title || payload.meta?.title || '未命名周报'
    if (sub) sub.textContent = header.subtitle || payload.meta?.subtitle || '自动生成期刊式周报'
    if (issueNum) issueNum.textContent = header.issueLabel || '第 01 期'
    if (issueDate) issueDate.textContent = header.issuedAt || footer.date || ''
    if (metaAuthors) metaAuthors.innerHTML = `报告期间：<span>${escapeHtml(header.period || payload.meta?.subtitle || '本周汇总')}</span> &nbsp;|&nbsp; 发布：<span>${escapeHtml(footer.issuedBy || '自动生成周报')}</span>`
    if (metaTags) metaTags.innerHTML = (header.tags || []).map((item) => `<span class="meta-tag">${escapeHtml(item)}</span>`).join('')
    if (abstract) abstract.textContent = vm.abstract || payload.meta?.summary || '暂无摘要信息。'

    const kpiInline = document.querySelector('.kpi-inline')
    if (kpiInline) {
      kpiInline.innerHTML = stats
        .map(
          (item) => `
            <div class="kpi-inline-cell">
              <div class="kic-num">${escapeHtml(item.value || '--')}${item.unit ? escapeHtml(item.unit) : ''}</div>
              <div class="kic-label">${escapeHtml(item.label || '指标')}</div>
            </div>
          `,
        )
        .join('')
    }

    const bodyCols = document.querySelector('.body-cols')
    if (bodyCols) {
      bodyCols.innerHTML = `
        <div class="sec-title col-reveal"><span class="sec-num">一</span>本周要览<span class="sec-title-en">/ Weekly Highlights</span></div>
        <div class="col-reveal">${overview.map((item) => `<div class="subsec">${escapeHtml(item.tag || '要览')}</div><div class="para">${escapeHtml(item.body)}</div>`).join('')}</div>
        <div class="sec-title col-reveal"><span class="sec-num">二</span>内部协同<span class="sec-title-en">/ Internal Coordination</span></div>
        <div class="col-reveal"><table class="data-table"><tr><th>事项</th><th>状态</th><th>完成度</th></tr>${(groups.internal || []).map((item) => `<tr><td>${escapeHtml(item.title)}</td><td><span class="status-chip ${statusChip(item)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(String(item.progress))}%</td></tr>`).join('')}</table></div>
        <div class="sec-title col-reveal"><span class="sec-num">三</span>对外合作<span class="sec-title-en">/ External Cooperation</span></div>
        <div class="col-reveal">${renderBars(data.cooperation || [])}</div>
        <div class="sec-title col-reveal"><span class="sec-num">四</span>交流互访<span class="sec-title-en">/ Academic Exchange</span></div>
        <div class="col-reveal">${(groups.visit || []).map((item) => `<div class="subsec">${escapeHtml(item.title)}</div><div class="para">${escapeHtml(item.body)}</div>`).join('')}</div>
        <div class="sec-title col-reveal"><span class="sec-num">五</span>体系建设<span class="sec-title-en">/ System Development</span></div>
        <div class="col-reveal">${(groups.system || []).map((item) => `<div class="subsec">${escapeHtml(item.title)}</div><div class="para">${escapeHtml(item.body)}</div>`).join('')}</div>
      `
    }

    const footnoteBar = document.querySelector('.footnote-bar')
    if (footnoteBar) {
      footnoteBar.innerHTML = `
        <div class="fn-title">签发信息 · Distribution Notes</div>
        <div class="fn-grid">
          <div><div class="fn-item-label">报送对象</div><div class="fn-item-val">${escapeHtml(footer.recipient || '相关负责人')}</div></div>
          <div><div class="fn-item-label">发送范围</div><div class="fn-item-val">${escapeHtml(footer.distribution || '相关部门')}</div></div>
          <div><div class="fn-item-label">责编 / 核发 / 日期</div><div class="fn-item-val">责编：${escapeHtml(footer.editor || '（待填写）')} · 核发：${escapeHtml(footer.reviewer || '（待填写）')} · ${escapeHtml(footer.date || '')}</div></div>
        </div>
      `
    }

    logBusinessJson('render_payload', {
      stats: stats.length,
      overview: overview.length,
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
  document.querySelectorAll('.col-reveal').forEach((el) => el.classList.add('vis'))
  document.querySelectorAll('.dr-fill,[data-w]').forEach((el) => {
    const w = el.dataset.w || el.getAttribute('data-w') || '0'
    el.style.width = w
  })
} else {
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      e.target.classList.add('vis');
      e.target.querySelectorAll('.dr-fill,[data-w]').forEach(el=>{
        const w=el.dataset.w||el.getAttribute('data-w');
        if(w)setTimeout(()=>el.style.width=w,300);
      });
      io.unobserve(e.target);
    });
  },{threshold:.05});
  document.querySelectorAll('.col-reveal').forEach(el=>io.observe(el));
}
