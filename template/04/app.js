(() => {
  const MODULE_NAME = 'template-dashboard-runtime'

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

  const toneColor = (tone) => {
    if (tone === 'done') return 'var(--lime)'
    if (tone === 'warning') return 'var(--amber)'
    return 'var(--cyan)'
  }

  const renderKanbanCards = (items) =>
    items
      .map(
        (item) => `
          <div class="kanban-card">
            <div class="kc-title">${escapeHtml(item.title)}</div>
            <div class="kc-desc">${escapeHtml(item.body)}</div>
            <div class="kc-foot">
              <div class="kc-pct-num" style="color:${toneColor(item.tone)}">${escapeHtml(String(item.progress))}%</div>
              <div class="kc-bar"><div class="kc-bar-fill" style="background:${toneColor(item.tone)};width:0" data-w="${escapeHtml(String(item.progress))}%"></div></div>
            </div>
          </div>
        `,
      )
      .join('')

  const renderTimeline = (items) =>
    items
      .map(
        (item) => `
          <div class="tl-item">
            <div class="tl-left">
              <div class="tl-dot" style="border-color:${toneColor(item.tone)}"></div>
              <div class="tl-tag" style="background:rgba(255,255,255,.06);color:${toneColor(item.tone)}">${escapeHtml(item.tag || '事项')}</div>
            </div>
            <div class="tl-right">
              <div class="tl-title">${escapeHtml(item.title)}</div>
              <div class="tl-body">${escapeHtml(item.body)}</div>
            </div>
          </div>
        `,
      )
      .join('')

  const renderProgressList = (items, palette) =>
    items
      .map(
        (item) => `
          <div class="mini-bar-item">
            <div class="mini-bar-label">${escapeHtml(item.title)}</div>
            <div class="mini-bar-track"><div class="mini-bar-fill" style="background:${palette(item)};width:0" data-w="${escapeHtml(String(item.progress))}%"></div></div>
            <div class="mini-bar-val">${escapeHtml(String(item.progress))}%</div>
          </div>
        `,
      )
      .join('')

  try {
    const startedAt = performance.now()
    const previewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)
    logSystem('info', '模板启动')

    const payload = readPayload()
    const vm = payload.viewModel?.dashboardPlus || {}
    const hero = vm.hero || {}
    const stats = Array.isArray(vm.stats) ? vm.stats.slice(0, 5) : []
    const overview = Array.isArray(vm.overview) ? vm.overview.slice(0, 5) : []
    const groups = vm.groups || {}
    const data = vm.data || {}
    const counts = vm.summaryCounts || {}
    const footer = vm.footer || {}

    const heroTitle = document.querySelector('.hero-title')
    const heroSub = document.querySelector('.hero-sub')
    const clockDate = document.querySelector('.clock-date')
    const clockPeriod = document.querySelector('.clock-period')
    if (heroTitle) heroTitle.textContent = hero.title || payload.meta?.title || '未命名周报'
    if (heroSub) heroSub.textContent = hero.subtitle || payload.meta?.subtitle || '自动生成周报'
    if (clockDate) clockDate.textContent = hero.issuedAt || footer.dateOnly || ''
    if (clockPeriod) clockPeriod.textContent = hero.period || payload.meta?.subtitle || '本周汇总'

    const kpiStrip = document.querySelector('.kpi-strip')
    if (kpiStrip) {
      kpiStrip.innerHTML = stats
        .map(
          (item) => `
            <div class="kpi-cell">
              <div class="kpi-label">${escapeHtml(item.label || '指标')}</div>
              <div class="kpi-num" data-target="${escapeHtml(String(item.target || 0))}">0</div>
              <div class="kpi-desc">${escapeHtml(item.detail || '')}</div>
            </div>
          `,
        )
        .join('')
    }

    const summaryBox = document.querySelector('.sidebar > div[style*="margin-top:auto"]')
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="background:var(--c2);border:1px solid var(--border);border-radius:6px;padding:14px;">
          <div style="font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">本期概要</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--muted)">已完成事项</span><span style="color:var(--lime);font-family:'JetBrains Mono',monospace;font-weight:700">${escapeHtml(String(counts.done || 0))}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--muted)">进行中事项</span><span style="color:var(--cyan);font-family:'JetBrains Mono',monospace;font-weight:700">${escapeHtml(String(counts.progress || 0))}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--muted)">待推进事项</span><span style="color:var(--amber);font-family:'JetBrains Mono',monospace;font-weight:700">${escapeHtml(String(counts.pending || 0))}</span></div>
          </div>
        </div>
      `
    }

    const timeline = document.querySelector('#ov .timeline')
    if (timeline) timeline.innerHTML = renderTimeline(overview)

    const syncCols = document.querySelectorAll('#sync .kanban-col')
    if (syncCols.length === 3) {
      syncCols[0].innerHTML = `<div class="kanban-col-hd"><div class="kanban-col-hd-dot" style="background:var(--lime)"></div>已完成</div>${renderKanbanCards((groups.internal || []).filter((item) => item.tone === 'done'))}`
      syncCols[1].innerHTML = `<div class="kanban-col-hd"><div class="kanban-col-hd-dot" style="background:var(--cyan)"></div>进行中</div>${renderKanbanCards((groups.internal || []).filter((item) => item.tone !== 'done' && item.tone !== 'warning'))}`
      syncCols[2].innerHTML = `<div class="kanban-col-hd"><div class="kanban-col-hd-dot" style="background:var(--amber)"></div>待推进</div>${renderKanbanCards((groups.internal || []).filter((item) => item.tone === 'warning'))}`
    }

    const collabCols = document.querySelectorAll('#collab .kanban-col')
    if (collabCols.length === 3) {
      const coop = groups.cooperation || []
      collabCols[0].innerHTML = `<div class="kanban-col-hd"><div class="kanban-col-hd-dot" style="background:var(--lime)"></div>完成/通过</div>${renderKanbanCards(coop.filter((item) => item.tone === 'done'))}`
      collabCols[1].innerHTML = `<div class="kanban-col-hd"><div class="kanban-col-hd-dot" style="background:var(--cyan)"></div>推进中</div>${renderKanbanCards(coop.filter((item) => item.tone !== 'done' && item.tone !== 'warning'))}`
      collabCols[2].innerHTML = `<div class="kanban-col-hd"><div class="kanban-col-hd-dot" style="background:var(--amber)"></div>待解决</div>${renderKanbanCards(coop.filter((item) => item.tone === 'warning'))}`
    }

    const visitGrid = document.querySelector('#visit > div:last-child')
    if (visitGrid) {
      visitGrid.innerHTML = (groups.visit || [])
        .map(
          (item, index) => `
            <div class="kanban-card" style="margin:0;${index === 4 ? 'grid-column:span 2' : ''}">
              <div class="kc-title">${escapeHtml(item.title)}</div>
              <div class="kc-desc">${escapeHtml(item.body)}</div>
              <div class="kc-foot"><div class="kc-pct-num" style="color:${toneColor(item.tone)}">${escapeHtml(String(item.progress))}%</div><div class="kc-bar"><div class="kc-bar-fill" style="background:${toneColor(item.tone)};width:0" data-w="${escapeHtml(String(item.progress))}%"></div></div></div>
            </div>
          `,
        )
        .join('')
    }

    const systemGrid = document.querySelector('#system > div:last-child')
    if (systemGrid) {
      systemGrid.innerHTML = (groups.system || [])
        .map(
          (item) => `
            <div class="kanban-card" style="margin:0">
              <div class="kc-title">${escapeHtml(item.title)}</div>
              <div class="kc-desc">${escapeHtml(item.body)}</div>
              <div class="kc-foot"><div class="kc-pct-num" style="color:${toneColor(item.tone)}">${escapeHtml(String(item.progress))}%</div><div class="kc-bar"><div class="kc-bar-fill" style="background:${toneColor(item.tone)};width:0" data-w="${escapeHtml(String(item.progress))}%"></div></div></div>
            </div>
          `,
        )
        .join('')
    }

    const vizGrid = document.querySelector('#data .viz-grid')
    if (vizGrid) {
      vizGrid.innerHTML = `
        <div class="viz-card">
          <div class="viz-card-title" style="color:var(--cyan)">对外合作推进度</div>
          <div class="mini-bar-list">${renderProgressList(data.cooperation || [], (item) => toneColor(item.tone))}</div>
        </div>
        <div class="viz-card">
          <div class="viz-card-title" style="color:var(--amber)">博士生答辩分布</div>
          <div class="donut-wrap">
            <div class="num-wall" style="grid-template-columns:repeat(2,1fr);width:100%">
              <div class="num-cell"><div class="nc-val">${escapeHtml(String(data.defense?.total || 0))}</div><div class="nc-label">答辩<br>总人数</div></div>
              <div class="num-cell"><div class="nc-val">${escapeHtml(String(data.defense?.pass || 0))}</div><div class="nc-label">开题<br>通过</div></div>
              <div class="num-cell"><div class="nc-val">${escapeHtml(String(data.defense?.fail || 0))}</div><div class="nc-label">未通过</div></div>
              <div class="num-cell"><div class="nc-val">${escapeHtml(String(data.defense?.revised || 0))}</div><div class="nc-label">修改后<br>通过</div></div>
            </div>
          </div>
        </div>
        <div class="viz-card">
          <div class="viz-card-title" style="color:var(--rose)">本周关键数字</div>
          <div class="num-wall">${(data.keyMetrics || []).map((item) => `<div class="num-cell"><div class="nc-val">${escapeHtml(item.value || '--')}</div><div class="nc-label">${escapeHtml(item.label || '指标')}</div></div>`).join('')}</div>
        </div>
      `
    }

    const footerBar = document.querySelector('#footer')
    if (footerBar) {
      footerBar.innerHTML = `
        <div><div class="footer-item-label">报送对象</div><div class="footer-item-val">${escapeHtml(footer.recipient || '相关负责人')}</div></div>
        <div><div class="footer-item-label">发送范围</div><div class="footer-item-val">${escapeHtml(footer.distribution || '相关部门')}</div></div>
        <div><div class="footer-item-label">责编 / 核发</div><div class="footer-item-val">责编：${escapeHtml(footer.editor || '（待填写）')} · 核发：${escapeHtml(footer.reviewer || '（待填写）')}</div></div>
        <div><div class="footer-item-label">发布日期</div><div class="footer-item-val" style="font-family:'JetBrains Mono',monospace;color:var(--cyan)">${escapeHtml(footer.dateOnly || '')}</div></div>
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

// 数字滚动
const previewLite = Boolean(window.__FILE2WEB_PREVIEW_LITE__)

if (previewLite) {
  document.querySelectorAll('.kpi-num[data-target]').forEach((el) => {
    const target = parseInt(el.dataset.target || '0', 10)
    el.textContent = String(target)
  })
} else {
  document.querySelectorAll('.kpi-num[data-target]').forEach(el=>{
    const t=parseInt(el.dataset.target);
    let s=performance.now();
    const d=1600;
    const go=now=>{
      const p=Math.min((now-s)/d,1);
      const e=1-Math.pow(1-p,4);
      el.textContent=Math.round(e*t);
      if(p<1)requestAnimationFrame(go);
    };
    setTimeout(()=>{s=performance.now();requestAnimationFrame(go);},300);
  });
}

// 进度条
function animateBars(container){
  container.querySelectorAll('[data-w]').forEach(el=>{
    el.style.width=el.dataset.w;
  });
}

// IntersectionObserver
if (previewLite) {
  document.querySelectorAll('.reveal,.tl-item').forEach((el) => el.classList.add('vis'))
  document.querySelectorAll('[data-w]').forEach((el) => {
    el.style.width = el.dataset.w || '0'
  })
} else {
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting)return;
      e.target.classList.add('vis');
      e.target.querySelectorAll('.tl-item').forEach((i,idx)=>{
        setTimeout(()=>i.classList.add('vis'),idx*120);
      });
      setTimeout(()=>animateBars(e.target),400);
      io.unobserve(e.target);
    });
  },{threshold:.06});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}

// 侧边栏高亮
function scrollTo2(id, evt){
  evt?.preventDefault?.();
  const el=document.getElementById(id);
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.sidebar-item').forEach(i=>i.classList.remove('active'));
  evt?.currentTarget?.classList.add('active');
}

// 滚动同步侧边栏
if (!previewLite) {
  const sections=['ov','sync','collab','visit','system','data','footer'];
  const sideItems=document.querySelectorAll('.sidebar-item');
  window.addEventListener('scroll',()=>{
    let cur='';
    sections.forEach(id=>{
      const el=document.getElementById(id);
      if(el&&window.scrollY>=el.offsetTop-200)cur=id;
    });
    sideItems.forEach((item,i)=>{
      item.classList.toggle('active',i===sections.indexOf(cur));
    });
  },{passive:true});
}
