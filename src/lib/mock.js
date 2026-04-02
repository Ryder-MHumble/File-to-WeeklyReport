export const demoDocument = {
  title: '教科人管理中心周报 · 示例版',
  subtitle: '中关村两院教科人管理中心 · 2026年第一期',
  summary:
    '本周围绕科研组织、招生协同和国际合作推进三条主线，完成了重点项目节点推进与对外合作沟通，整体节奏平稳，关键事项均按计划完成。',
  highlights: [
    { label: '关键事项', value: '12', detail: '覆盖科研、教学、国际合作' },
    { label: '会议活动', value: '7', detail: '含论坛与专题研讨' },
    { label: '合作院校', value: '6', detail: '新增与深化并行推进' },
  ],
  metrics: [
    { name: '项目按期率', value: '91%', trend: '较上周 +4%', note: '关键节点按期推进' },
    { name: '跨部门协作项', value: '18', trend: '较上周 +2', note: '含科研与培养联动事项' },
    { name: '风险闭环率', value: '87%', trend: '较上周 +6%', note: '中高风险已建立责任链' },
  ],
  key_points: [
    '重大科研成果评选完成，进入后续公示与资源对接阶段。',
    '博士生管理制度执行更加规范，流程与责任边界进一步清晰。',
    '国际合作项目持续推进，跨机构协同效率提升。',
  ],
  progress_items: [
    { stream: '成果评选', status: '按期完成', outcome: '形成推荐名单并启动公示准备', owner: '科研组织组' },
    { stream: '招生系统', status: '联调中', outcome: '完成需求映射，进入接口联调阶段', owner: '招生项目组' },
    { stream: '国际合作', status: '推进中', outcome: '与 3 所海外院校完成二轮沟通', owner: '国际合作组' },
  ],
  risk_items: [
    { risk: '跨部门审批链条偏长', level: 'medium', mitigation: '拆分审批批次并提前锁定责任人', owner: '综合管理组' },
    { risk: '国际项目排期受外部窗口影响', level: 'high', mitigation: '准备双时段方案并预留替代会议机制', owner: '国际合作组' },
  ],
  next_actions: [
    { task: '完成成果评选公示稿审校', deadline: '下周三', owner: '科研组织组', dependency: '法务审阅' },
    { task: '招生智能体完成第一轮联调', deadline: '下周五', owner: '招生项目组', dependency: '数据接口稳定性' },
  ],
  decision_requests: ['确认国际论坛预算上限', '确认跨部门流程优化方案试运行范围'],
  resource_requests: ['新增 1 名项目协调专员（2 个月）', '开通跨部门看板权限'],
  sections: [
    {
      title: '本周重点进展',
      description: '围绕重点项目与会议节点推进工作。',
      items: [
        {
          title: '两院重大科研成果评选完成',
          body: '完成多轮评审，形成推荐名单并进入后续成果转化沟通阶段。',
          tag: '科研组织',
        },
        {
          title: '第四届中关村国际青年论坛召开',
          body: '会议顺利举办，形成一批潜在合作议题并建立后续跟踪机制。',
          tag: '学术交流',
        },
      ],
    },
    {
      title: '招生与培养协同',
      description: '招生流程、课程建设和培养机制同步优化。',
      items: [
        {
          title: '招生智能体系统建设推进',
          body: '完成第一轮需求梳理与流程映射，进入功能联调准备阶段。',
          tag: '招生',
        },
        {
          title: '课程质量保障机制优化',
          body: '课程评估维度重新梳理，形成阶段性执行方案。',
          tag: '培养',
        },
      ],
    },
  ],
  source_excerpt: '',
  sensitive_mode: false,
}
