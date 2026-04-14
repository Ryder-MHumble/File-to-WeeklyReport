export const demoDocument = {
  title: '科研协同中心周报 · 示例版',
  subtitle: '科研协同与成果转化办公室 · 2026年第一期',
  summary:
    '本周围绕重点课题攻关、学术合作推进与平台能力建设三条主线开展工作，关键节点按计划完成，阶段成果已进入评审与转化准备。',
  highlights: [
    { label: '关键事项', value: '12', detail: '覆盖课题攻关、合作推进与机制建设' },
    { label: '学术活动', value: '6', detail: '含研讨会、联席评审与专题讨论' },
    { label: '合作机构', value: '7', detail: '新增 2 家、持续推进 5 家' },
  ],
  metrics: [
    { name: '里程碑按期率', value: '93%', trend: '较上周 +4%', note: '核心课题阶段任务按计划推进' },
    { name: '跨组协同事项', value: '19', trend: '较上周 +3', note: '研究组、平台组、合作组联合推进' },
    { name: '风险闭环率', value: '88%', trend: '较上周 +5%', note: '中高风险项已落实责任链' },
  ],
  key_points: ['重点课题阶段评审完成，形成下一轮攻关清单。', '共享实验平台升级上线后，数据处理效率显著提升。', '外部联合研究项目持续推进，成果转化准备同步开展。'],
  progress_items: [
    { stream: '课题攻关', status: '按期完成', outcome: '完成阶段评审并锁定下一阶段目标', owner: '课题推进组' },
    { stream: '平台升级', status: '联调中', outcome: '完成核心模块联调并进入灰度验证', owner: '平台工程组' },
    { stream: '合作推进', status: '推进中', outcome: '与 3 家合作机构完成第二轮技术评审', owner: '合作发展组' },
  ],
  risk_items: [
    { risk: '关键实验资源排期紧张', level: 'medium', mitigation: '拆分实验窗口并预留弹性排程', owner: '平台运营组' },
    { risk: '联合课题评审窗口集中', level: 'high', mitigation: '前置材料预审并设置并行评审通道', owner: '课题推进组' },
  ],
  next_actions: [
    { task: '完成下一轮课题任务分解', deadline: '下周三', owner: '课题推进组', dependency: '评审意见收口' },
    { task: '平台监控看板接入异常预警', deadline: '下周五', owner: '平台工程组', dependency: '告警权限配置' },
  ],
  decision_requests: ['确认二季度重点课题资源分配上限', '确认联合研究试运行范围与节奏'],
  resource_requests: ['新增 1 名研究项目协调专员（8 周）', '扩容高性能算力配额用于课题验证'],
  sections: [
    {
      title: '本周重点进展',
      description: '围绕评审节点与攻关计划推进核心工作。',
      items: [
        {
          title: '重点课题阶段评审完成',
          body: '完成阶段成果评估，明确下一轮技术攻关路径与责任分工。',
          tag: '课题攻关',
        },
        {
          title: '联合研究研讨会召开',
          body: '跨机构技术研讨顺利完成，形成后续协同验证计划。',
          tag: '学术合作',
        },
      ],
    },
    {
      title: '平台与协同建设',
      description: '平台能力与协同机制同步优化。',
      items: [
        {
          title: '科研数据平台升级推进',
          body: '完成关键链路联调，实验数据处理与追踪效率提升。',
          tag: '平台建设',
        },
        {
          title: '成果转化机制优化',
          body: '建立项目分级转化清单，形成标准化推进流程。',
          tag: '机制优化',
        },
      ],
    },
  ],
  source_excerpt: '',
  sensitive_mode: false,
}
