(() => {
  const MODULE_NAME = 'template-cyber-runtime'

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

  const tone = (item) => {
    if (item.tone === 'done') return { card: 'card-green', badge: 'cb-done', label: 'DONE', color: 'var(--neon-green)' }
    if (item.tone === 'warning') return { card: 'card-yellow', badge: 'cb-pend', label: 'PENDING', color: 'var(--neon-yellow)' }
    return { card: 'card-cyan', badge: 'cb-prog', label: 'ACTIVE', color: 'var(--neon-cyan)' }
  }

  const renderMatrixCard = (item) => {
    const meta = tone(item)
    return `
      <div class="matrix-card ${meta.card}">
        <div class="scan-bar"></div>
        <div class="mc-header"><div class="mc-title">${escapeHtml(item.title)}</div><span class="cyber-badge ${meta.badge}">${meta.label}</span></div>
        <div class="mc-text">${escapeHtml(item.body)}</div>
        <div class="neon-progress"><div class="np-track"><div class="np-fill" data-w="${escapeHtml(String(item.progress))}%" style="width:0%;background:${meta.color};box-shadow:0 0 6px ${meta.color}"></div></div><span class="np-pct" style="color:${meta.color}">${escapeHtml(String(item.progress))}%</span></div>
      </div>
    `
  }

  const renderProgMatrix = (items, colorize) =>
    items
      .map(
        (item) => `<div class="pm-item"><span class="pm-label">${escapeHtml(item.title)}</span><div class="pm-track"><div class="pm-fill" data-w="${escapeHtml(String(item.progress))}%" style="width:0%;background:${colorize(item)};box-shadow:0 0 6px ${colorize(item)}"></div></div><span class="pm-pct" style="color:${colorize(item)}">${escapeHtml(String(item.progress))}%</span></div>`,
      )
      .join('')

  try {
    const startedAt = performance.now()
    logSystem('info', '模板启动')

    const payload = readPayload()
    const vm = payload.viewModel?.cyber || {}
    const hero = vm.hero || {}
    const stats = Array.isArray(vm.stats) ? vm.stats.slice(0, 5) : []
    const overview = Array.isArray(vm.overview) ? vm.overview.slice(0, 5) : []
    const groups = vm.groups || {}
    const data = vm.data || {}
    const footer = vm.footer || {}

    const systemLine = document.querySelector('.hero-system-line')
    const line2 = document.querySelector('.cyber-title .line2')
    const desc = document.querySelector('.cyber-desc')
    if (systemLine) systemLine.textContent = hero.line || 'SYS_INIT: LOADING_REPORT_MODULE ... [OK]'
    if (line2) line2.textContent = hero.subtitle || payload.meta?.title || '未命名周报'
    if (desc) desc.textContent = hero.desc || payload.meta?.summary || '暂无摘要信息。'

    const statNodes = document.querySelectorAll('.cyber-stat')
    statNodes.forEach((node, index) => {
      const item = stats[index]
      if (!item) return
      const label = node.querySelector('.cs-label')
      const num = node.querySelector('.cs-num')
      const descNode = node.querySelector('.cs-desc')
      if (label) label.textContent = `// ${item.label || '指标'}`
      if (num) {
        num.textContent = '0'
        num.dataset.target = String(item.target || 0)
      }
      if (descNode) descNode.innerHTML = escapeHtml(item.detail || '').replace(/\s+/g, '<br>')
    })

    const hudGrid = document.querySelector('.hud-grid')
    if (hudGrid) {
      const main = overview[0]
      const side = overview.slice(1)
      hudGrid.innerHTML = `
        <div class="hud-card hud-main"><div class="scan-bar"></div><div class="hud-tag">PRIORITY_HIGH · ${escapeHtml(main?.tag || '重点')}</div><div class="hud-big-num"><span id="hbig">0</span><span class="hud-big-unit">项</span></div><div class="hud-title">${escapeHtml(main?.title || payload.meta?.title || '未命名周报')}</div><div class="hud-text">${escapeHtml(main?.body || payload.meta?.summary || '暂无摘要信息。')}</div><div style="margin-top:24px;display:flex;gap:8px;"><div style="flex:1;height:40px;border:1px solid rgba(0,255,255,0.15);display:flex;align-items:center;padding:0 12px;font-size:10px;color:var(--text-dim)">STATUS: <span style="color:var(--neon-green);margin-left:8px">ACTIVE</span></div><div style="width:40px;height:40px;border:1px solid rgba(0,255,255,0.15);display:flex;align-items:center;justify-content:center;font-family:'Orbitron';font-size:9px;color:var(--neon-cyan)">OK</div></div></div>
        ${side.map((item) => `<div class="hud-card"><div class="scan-bar"></div><div class="hud-tag">${escapeHtml(item.tag || 'EVENT')}</div><div class="hud-title">${escapeHtml(item.title)}</div><div class="hud-text">${escapeHtml(item.body)}</div></div>`).join('')}
      `
    }

    const panels = {
      cc1: groups.internal || [],
      cc2: groups.cooperation || [],
      cc3: groups.visit || [],
      cc4: groups.system || [],
    }
    Object.entries(panels).forEach(([id, items]) => {
      const panel = document.querySelector(`#${id} .matrix-grid`)
      if (panel) panel.innerHTML = items.map(renderMatrixCard).join('')
    })

    const dataHud = document.querySelector('.data-hud')
    if (dataHud) {
      dataHud.innerHTML = `
        <div class="data-panel"><div class="data-panel-title">关键指标</div>${(data.keyMetrics || []).map((item) => `<div class="data-list-item"><span class="dl-label">${escapeHtml(item.label || '指标')}</span><span class="dl-val">${escapeHtml(item.value || '--')}${escapeHtml(item.unit || '')}</span></div>`).join('')}</div>
        <div class="data-panel"><div class="data-panel-title">博士答辩结果</div><div style="display:flex;flex-direction:column;gap:6px"><div class="data-list-item"><span class="dl-label">总人数</span><span class="dl-val">${escapeHtml(String(data.defense?.total || 0))}</span></div><div class="data-list-item"><span class="dl-label">开题通过</span><span class="dl-val" style="color:var(--neon-green)">${escapeHtml(String(data.defense?.pass || 0))}</span></div><div class="data-list-item"><span class="dl-label">未通过</span><span class="dl-val" style="color:var(--neon-pink)">${escapeHtml(String(data.defense?.fail || 0))}</span></div><div class="data-list-item"><span class="dl-label">修改后通过</span><span class="dl-val" style="color:var(--neon-yellow)">${escapeHtml(String(data.defense?.revised || 0))}</span></div></div></div>
        <div class="data-panel"><div class="data-panel-title">体系建设进度</div><div class="prog-matrix">${renderProgMatrix(data.system || [], (item) => tone(item).color)}</div></div>
        <div class="data-panel"><div class="data-panel-title">对外合作推进进度</div><div class="prog-matrix">${renderProgMatrix(data.cooperation || [], (item) => tone(item).color)}</div></div>
      `
    }

    const cyberFooter = document.querySelector('.cyber-footer')
    if (cyberFooter) {
      cyberFooter.innerHTML = `
        <div class="terminal-line"><span class="key">REPORT_ID: </span><span class="val">${escapeHtml(payload.templateId || 'template-07')}</span></div>
        <div class="terminal-line"><span class="key">PERIOD: </span><span class="val">${escapeHtml(payload.meta?.subtitle || '本周汇总')}</span></div>
        <div class="terminal-line"><span class="key">ISSUED_BY: </span><span class="val">${escapeHtml(footer.issuedBy || '自动生成周报')}</span></div>
        <div class="terminal-line"><span class="key">ISSUED_TO: </span><span class="val">${escapeHtml(footer.recipient || '相关负责人')}</span></div>
        <div class="terminal-line"><span class="key">DISTRIBUTION: </span><span class="val">${escapeHtml(footer.distribution || '相关部门')}</span></div>
        <div class="terminal-line"><span class="key">EDITOR: </span><span class="val">${escapeHtml(footer.editor || '（待填写）')}</span></div>
        <div class="terminal-line"><span class="key">REVIEWER: </span><span class="val">${escapeHtml(footer.reviewer || '（待填写）')}</span></div>
        <div class="terminal-line"><span class="key">TIMESTAMP: </span><span class="val">${escapeHtml(footer.timestamp || '')}</span></div>
        <div class="terminal-line" style="margin-top:16px">$ <span style="color:var(--neon-green)">_</span><span class="terminal-cursor"></span></div>
      `
    }

    logBusinessJson('render_payload', { stats: stats.length, overview: overview.length, internal: (groups.internal || []).length, cooperation: (groups.cooperation || []).length, visit: (groups.visit || []).length, system: (groups.system || []).length })
    logSystem('info', '模板完成', { elapsedMs: Number((performance.now() - startedAt).toFixed(2)) })
  } catch (error) {
    logSystem('error', '模板渲染失败', { message: error instanceof Error ? error.message : String(error) })
  }
})()

// Matrix 雨
(function(){
  if (window.__FILE2WEB_PREVIEW_LITE__) return;
  const c = document.getElementById('matrix-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJK01234567890';
  const cols = Math.floor(c.width / 16);
  const drops = Array(cols).fill(1);
  function draw() {
    ctx.fillStyle = 'rgba(5,5,9,0.05)';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = '#00FF41';
    ctx.font = '12px Share Tech Mono,monospace';
    drops.forEach((d,i) => {
      const char = chars[Math.floor(Math.random()*chars.length)];
      ctx.fillText(char, i*16, d*16);
      if (d*16 > c.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }
  setInterval(draw, 50);
})();

// KPI 计数
function count(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let n = 0;
  const step = Math.ceil(target / 50);
  const t = setInterval(() => {
    n = Math.min(n + step, target);
    el.textContent = n;
    if (n >= target) clearInterval(t);
  }, 30);
}
setTimeout(() => {
  const statNodes = document.querySelectorAll('.cs-num[data-target]')
  statNodes.forEach((node, index) => count(node.id || `cs${index + 1}`, Number(node.dataset.target || 0)))
  count('hbig',5);
}, 800);

// Tab
function swC(id, btn) {
  const p = document.getElementById(id);
  if (!p) return;
  p.parentElement.querySelectorAll('.c-panel').forEach(x => x.classList.remove('active'));
  btn.parentElement.querySelectorAll('.cyber-tab').forEach(x => x.classList.remove('active'));
  p.classList.add('active');
  btn.classList.add('active');
  p.querySelectorAll('[data-w]').forEach(el => {
    el.style.width = '0%';
    setTimeout(() => el.style.width = el.getAttribute('data-w'), 60);
  });
}

// Nav
const navButtons = Array.from(document.querySelectorAll('.cyber-btn-nav'));

function activateCNById(id) {
  navButtons.forEach((btn) => {
    const target = (btn.getAttribute('data-target') || '').replace(/^#/, '');
    btn.classList.toggle('active', target === id);
  });
}

function setCN(el) {
  navButtons.forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const target = el.getAttribute('data-target');
  if (!target) return;
  const section = document.querySelector(target);
  if (!section) return;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 滚动动画
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      e.target.querySelectorAll('.hud-card').forEach((c,i) => setTimeout(() => c.classList.add('visible'), i*100));
      e.target.querySelectorAll('[data-w]').forEach(el => setTimeout(() => el.style.width = el.getAttribute('data-w'), 400));
    }
  });
}, { threshold: 0.05 });
document.querySelectorAll('.c-reveal').forEach(el => io.observe(el));

const cnSpy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      activateCNById(entry.target.id);
    });
  },
  { rootMargin: '-35% 0px -55% 0px' },
);

['ov', 'wk', 'dt', 'ft'].forEach((id) => {
  const section = document.getElementById(id);
  if (section) cnSpy.observe(section);
});

// 导出
function exportHTML() {
  const b = new Blob(['<!DOCTYPE html>\n'+document.documentElement.outerHTML],{type:'text/html'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(b); a.download='周报_赛博版.html'; a.click();
}
