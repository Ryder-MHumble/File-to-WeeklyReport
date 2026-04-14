(() => {
  const current = document.currentScript
  const templateId = current?.dataset.templateId || document.body.dataset.templateId || 'template-02'
  const styleHref = current?.dataset.styleHref || './style.css'
  const scriptSrc = current?.dataset.scriptSrc || './app.js'
  const styleNode = document.getElementById('template-inline-style')
  const dataNode = document.getElementById('template-data')

  const serializePayload = (payload) =>
    JSON.stringify(payload)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/<\/script/gi, '<\\\\/script')

  const workItem = (title, body, status, progress, tone) => ({
    title,
    body,
    status,
    progress,
    tone,
  })

  const stats = [
    { label: '重点课题按期率', value: '94', unit: '%', detail: '关键节点稳定交付', target: 94 },
    { label: '阶段成果转化率', value: '7.8', unit: '%', detail: '较上周提升 0.9%', target: 7.8 },
    { label: '合作机构数', value: '8', unit: '家', detail: '新增联合研究合作', target: 8 },
    { label: '评审事项总量', value: '136', unit: '单', detail: '已完成分级处置', target: 136 },
    { label: '实验效率提升', value: '18', unit: '%', detail: '链路优化策略见效', target: 18 },
  ]

  const overview = [
    { number: '01', tag: '课题推进', title: '重点课题阶段评审闭环', body: '完成评审链路复盘并锁定下一轮攻关任务与资源节奏。', tone: 'red' },
    { number: '02', tag: '平台协同', title: '科研数据平台联调上线', body: '核心处理链路吞吐提升，节点响应时间明显缩短。', tone: 'jade' },
    { number: '03', tag: '外部合作', title: '联合研究网络扩容', body: '新增 8 家合作机构，覆盖多学科联合攻关方向。', tone: 'indigo' },
    { number: '04', tag: '学术支持', title: '项目评审分级机制跑通', body: '高优先级课题闭环时效提升，升级项跟踪机制生效。', tone: 'gold' },
    { number: '05', tag: '机制优化', title: '科研数据看板升级', body: '新增里程碑预警与自动建议策略，支持日报决策。', tone: 'copper' },
  ]

  const groups = {
    internal: [
      workItem('阶段评审复盘会', '形成 11 项攻关动作并明确责任人。', '已完成', 100, 'done'),
      workItem('平台联调灰度', '核心模块联调上线，性能监控持续观察。', '进行中', 68, 'progress'),
      workItem('评审规则升级', '高风险课题自动标记规则已生效。', '进行中', 56, 'progress'),
      workItem('实验效率提升专项', '实验链路优化进入第二阶段。', '推进中', 62, 'progress'),
      workItem('里程碑跟踪看板', '新增关键节点偏差预测模型。', '推进中', 44, 'progress'),
    ],
    cooperation: [
      workItem('联合研究机构合作', '完成合作条款确认，进入联合验证排期。', '已完成', 82, 'done'),
      workItem('跨机构实验平台联建', '试点课题扩展到 3 个核心方向。', '推进中', 58, 'progress'),
      workItem('实验资源池扩容', '新增夜间算力窗口与高峰备援方案。', '推进中', 51, 'progress'),
      workItem('联合发布活动', '联合成果摘要审核通过，待发布。', '待推进', 39, 'warning'),
      workItem('跨校数据协同链路', '接口评审完成，等待合规确认。', '待推进', 33, 'warning'),
    ],
    visit: [
      workItem('科研平台中心走访', '确认高峰计算瓶颈并制定改造计划。', '已完成', 100, 'done'),
      workItem('联合实验室巡检', '完成 12 个实验节点配置一致性检查。', '进行中', 71, 'progress'),
      workItem('研究团队访谈', '收集协同反馈并建立问题清单。', '推进中', 47, 'progress'),
      workItem('夜间实验窗口观察', '发现峰值切换延迟，已挂单跟进。', '待推进', 26, 'warning'),
    ],
    system: [
      workItem('科研数据看板升级', '里程碑预警、攻关建议、进度对比三模块已发布。', '已完成', 92, 'done'),
      workItem('评审规则库', '完成优先级策略与自动分派映射。', '推进中', 63, 'progress'),
      workItem('课题预算守护规则', '新增日内偏差阈值和提醒机制。', '推进中', 48, 'progress'),
      workItem('跨平台资源结算规范', '条款评审完成，准备发布。', '待推进', 36, 'warning'),
      workItem('课题风险周会机制', '已固化复盘模板与责任追踪链。', '已完成', 100, 'done'),
    ],
  }

  const keyMetrics = [
    { label: '里程碑按期率', value: '94', unit: '%', sub: '关键节点稳定在目标线以上' },
    { label: '阶段成果转化率', value: '7.8', unit: '%', sub: '成果提交-评审链路优化' },
    { label: '合作机构数', value: '8', unit: '家', sub: '新增联合研究合作伙伴' },
    { label: '评审事项', value: '136', unit: '单', sub: '已完成分级和优先级归档' },
    { label: '实验效率提升', value: '18', unit: '%', sub: '关键实验耗时环比下降' },
    { label: '跨机构协同时效', value: '3.2', unit: '小时', sub: '核心协同链路平均耗时' },
  ]

  const defense = { total: 136, pass: 108, fail: 18, revised: 10, exam: 0 }

  const footer = {
    issuedBy: '科研协同与成果转化办公室',
    recipient: '课题推进管理委员会',
    distribution: '课题推进中心各小组',
    editor: '（待填写）',
    reviewer: '（待填写）',
    date: '2026年04月14日',
    dateOnly: '2026-04-14',
    timestamp: '2026-04-14T10:00:00+08:00',
  }

  const metaTitle = '科研协同中心周报 · 示例版'
  const metaSubtitle = '科研协同与成果转化办公室 · 2026年4月第2周'

  const payloadCatalog = {
    'template-01': {
      templateId: 'template-01',
      templateName: '极简周报版式',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '本周重点围绕课题攻关、合作推进与平台能力建设展开，关键链路整体稳定。',
      },
      viewModel: {
        minimal: {
          hero: {
            eyebrow: `${footer.issuedBy} · 内部周报`,
            title: metaTitle,
            summary: '本周重点围绕课题攻关、合作推进与平台能力建设展开，关键链路整体稳定。',
            period: metaSubtitle,
            unit: footer.issuedBy,
            issuedAt: footer.date,
            bgNumber: '02',
          },
          stats,
          overview,
          groups,
          data: {
            keyMetrics,
            cooperation: groups.cooperation.slice(0, 5),
            system: groups.system.slice(0, 5),
          },
          footer,
        },
      },
    },
    'template-02': {
      templateId: 'template-02',
      templateName: '杂志封面周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '本期围绕课题攻关、平台协同、外部合作和规则升级四条主线展开。',
      },
      viewModel: {
        magazine: {
          cover: {
            issueLabel: 'Vol.02 · 2026 · 第02期',
            headline: '科研平台联调上线，协同效率进入稳定区间',
            decks: ['攻关、协同、平台三条主线本周均有阶段成果。', '下周将进入新一轮联合验证与评审窗口。'],
            period: '2026年4月8日—4月14日',
            unit: footer.issuedBy,
          },
          stats: stats.slice(0, 4),
          toc: ['本周要览', '重点工作', '数据看板', '签发信息'],
          overview,
          groups,
          data: {
            keyMetrics: keyMetrics.slice(0, 5),
            defense,
            cooperation: groups.cooperation.slice(0, 6),
          },
          footer,
        },
      },
    },
    'template-03': {
      templateId: 'template-03',
      templateName: '国风卷轴周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '以章节方式呈现科研进展、协同推进、评审反馈与机制迭代。',
      },
      viewModel: {
        ink: {
          cover: {
            enTitle: 'Research Progress Unit · Weekly Report · Issue No.2',
            title: '科研协同中心周报',
            subTitle: '第二期 · 二〇二六年春',
            period: '2026年4月8日 — 4月14日',
            issuedAt: footer.date,
            unit: footer.issuedBy,
            stats,
          },
          overview,
          groups,
          data: {
            keyMetrics,
            cooperation: groups.cooperation.slice(0, 6),
            system: groups.system.slice(0, 6),
            defense,
          },
          footer,
        },
      },
    },
    'template-04': {
      templateId: 'template-04',
      templateName: '控制台仪表盘周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '当前进入执行追踪阶段，重点观察课题协同效率与评审节奏。',
      },
      viewModel: {
        dashboardPlus: {
          hero: {
            title: '科研协同中心周报',
            subtitle: `${footer.issuedBy} · 第02期 · 内部资料`,
            issuedAt: '2026.04.14 ISSUED',
            period: '2026.04.08 — 04.14',
          },
          stats,
          overview,
          groups,
          data: {
            cooperation: groups.cooperation.slice(0, 6),
            defense,
            keyMetrics,
          },
          summaryCounts: { done: 7, progress: 10, pending: 4 },
          footer,
        },
      },
    },
    'template-05': {
      templateId: 'template-05',
      templateName: '新闻简报周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '本周课题推进稳定提升，外部合作与平台优化同步推进。',
      },
      viewModel: {
        news: {
          masthead: {
            brand: footer.issuedBy,
            date: '2026·04·14',
            issueLabel: '第 02 期',
          },
          ticker: keyMetrics.slice(0, 6).map((item) => ({ label: item.label, value: item.value, unit: item.unit })),
          hero: {
            eyebrow: '本周要览',
            headline: '重点课题攻关与平台升级进入稳定执行期',
            deck: '课题、协同、平台三条工作线同步推进，风险项已纳入分级跟踪。',
            stats: stats.slice(0, 4),
          },
          groups,
          data: {
            keyMetrics,
            defense,
            cooperation: groups.cooperation.slice(0, 6),
            international: groups.visit.slice(0, 4),
          },
          footer,
        },
      },
    },
    'template-06': {
      templateId: 'template-06',
      templateName: '学术期刊周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '本周周报按期刊结构编排，突出摘要、要览、推进与签发信息。',
      },
      viewModel: {
        journal: {
          header: {
            title: metaTitle,
            subtitle: metaSubtitle,
            issueLabel: '第 02 期',
            issuedAt: footer.date,
            period: '2026年4月8日—4月14日',
            tags: ['执行推进', '协同联动', '巡检反馈', '机制优化'],
          },
          abstract: '本周围绕攻关提效、协同优化与平台治理三条主线开展工作，整体推进节奏可控。',
          stats,
          overview,
          groups,
          data: {
            defense,
            cooperation: groups.cooperation.slice(0, 6),
            system: groups.system.slice(0, 6),
          },
          footer,
        },
      },
    },
    'template-07': {
      templateId: 'template-07',
      templateName: '赛博控制台周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '系统视角呈现课题链路、协同链路与风险分布。',
      },
      viewModel: {
        cyber: {
          hero: {
            line: 'SYS_INIT: LOADING_RESEARCH_REPORT_2026.04.14 ... [OK]',
            subtitle: `${footer.issuedBy} · 第02期`,
            desc: `REPORT_PERIOD: 2026.04.08 — 2026.04.14 | ISSUED: 2026.04.14 | UNIT: ${footer.issuedBy}`,
          },
          stats,
          overview,
          groups,
          data: {
            keyMetrics,
            defense,
            system: groups.system.slice(0, 5),
            cooperation: groups.cooperation.slice(0, 6),
          },
          footer,
        },
      },
    },
    'template-08': {
      templateId: 'template-08',
      templateName: '分屏杂志周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '分屏杂志风格，左侧固定边栏，右侧可滚动内容区，呈现执行与数据看板。',
      },
      viewModel: {
        splitMagazine: {
          masthead: {
            title: '科研协同中心周报',
            issue: '第 02 期',
            foot: '2026-04-14',
          },
          stats: stats.slice(0, 5),
          overview: overview.slice(0, 4),
          groups,
          data: {
            keyMetrics: keyMetrics.slice(0, 4),
            cooperation: groups.cooperation.slice(0, 4),
            defense,
          },
          footer,
        },
      },
    },
    'template-09': {
      templateId: 'template-09',
      templateName: '瑞士网格周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '瑞士网格风格展示关键指标、任务进展与风险闭环。',
      },
      viewModel: {
        swissGrid: {
          masthead: {
            name: '科研协同中心周报',
            issue: 'VOL.02',
            date: '2026-04-14',
            logo: '研',
            publisher: `${footer.issuedBy} · 内部资料`,
          },
          ticker: keyMetrics.slice(0, 6).map((item) => ({ label: item.label, value: `${item.value}${item.unit || ''}` })),
          stats: stats.slice(0, 5),
          overview: overview.slice(0, 5),
          groups,
          data: {
            keyMetrics: keyMetrics.slice(0, 6),
            cooperation: groups.cooperation.slice(0, 6),
            defense,
          },
          footer,
        },
      },
    },
    'template-11': {
      templateId: 'template-11',
      templateName: '新野兽派战情周报',
      meta: {
        title: metaTitle,
        subtitle: metaSubtitle,
        summary: '海报风战情版式，强调科研推进力度、轨迹与风险闭环。',
      },
      viewModel: {
        neoBrutalPoster: {
          masthead: {
            kicker: 'BRUTAL OPS BULLETIN',
            title: '科研协同中心周报',
            issue: 'ISSUE 02',
            period: '2026.04.08 — 04.14',
            signal: '课题治理与协同链路双线提升',
            publisher: footer.issuedBy,
          },
          lead: {
            headline: '课题评审与平台联调形成闭环动作',
            subline: '成果转化、协同时效、平台稳定三项指标同步优化。',
          },
          pillars: stats.slice(0, 6),
          streams: {
            execution: groups.internal.slice(0, 4),
            collaboration: groups.cooperation.slice(0, 4),
            risk: groups.system.slice(0, 4),
          },
          timeline: overview.slice(0, 5).map((item) => ({ node: item.number, title: item.title, body: item.body, tag: item.tag })),
          scoreboard: keyMetrics.slice(0, 6),
          momentum: [...groups.cooperation, ...groups.system].slice(0, 6).map((item) => ({
            label: item.title,
            progress: item.progress,
            status: item.status,
            tone: item.tone,
          })),
          footer,
        },
      },
    },
  }

  if (styleNode) {
    styleNode.textContent = ''
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = styleHref
  document.head.appendChild(link)

  if (dataNode) {
    dataNode.textContent = serializePayload(payloadCatalog[templateId] || payloadCatalog['template-02'])
  }

  const runtimeScript = document.createElement('script')
  runtimeScript.src = scriptSrc
  document.body.appendChild(runtimeScript)
})()
