export const productModeCatalog = [
  { id: 'report', name: '周报模式', description: '文档转结构化周报与 HTML 页面' },
  { id: 'poster', name: '海报模式', description: '文档转宣传海报与图片输出' },
]

export const posterSceneCatalog = [
  {
    id: 'external-achievement',
    name: '对外成果宣传',
    description: '适合研究成果、项目进展、平台能力对外展示。',
    audienceHint: '面向合作方、媒体、公众，强调成果感与可信度。',
    copyRule: '标题要有成果冲击力，但不得夸张失真。',
  },
  {
    id: 'internal-briefing',
    name: '院内宣传快报',
    description: '适合院内周知、阶段亮点、活动回顾与协同通报。',
    audienceHint: '面向院内师生与管理人员，强调清晰与组织感。',
    copyRule: '标题简洁明确，信息层级强，避免营销化话术。',
  },
  {
    id: 'event-announcement',
    name: '活动通知海报',
    description: '适合论坛、讲座、路演、开放日等活动发布。',
    audienceHint: '面向报名对象，强调时间地点与参与价值。',
    copyRule: '必须突出活动名、时间、地点、报名或参与方式。',
  },
  {
    id: 'policy-notice',
    name: '制度通知宣导',
    description: '适合制度发布、流程更新、专项通知。',
    audienceHint: '面向组织内部，强调规范、克制、可执行。',
    copyRule: '文案保持正式，避免花哨视觉隐喻。',
  },
  {
    id: 'talent-recruitment',
    name: '招聘招募海报',
    description: '适合人才招聘、项目招募、学生招新。',
    audienceHint: '面向候选人，强调机会、平台与行动召唤。',
    copyRule: '标题突出岗位或计划名称，行动召唤明确。',
  },
  {
    id: 'academic-conference',
    name: '学术会议海报',
    description: '适合学术论坛、成果发布会、专题研讨。',
    audienceHint: '面向研究人员与专业受众，强调学术质感。',
    copyRule: '视觉需克制专业，避免商业感过重。',
  },
]

export const posterStyleCatalog = [
  {
    id: 'academy-premium',
    name: '学院旗舰版',
    description: '深色科技底 + 精炼大标题，适合对外成果海报。',
    promptHint: '构图强、主视觉集中、标题醒目、带研究机构品牌感。',
    palette: 'navy / cyan / silver',
  },
  {
    id: 'institutional-minimal',
    name: '制度极简版',
    description: '浅底栅格 + 明确信息层级，适合通知与制度宣导。',
    promptHint: '版式克制、留白充足、文本信息区明确。',
    palette: 'paper white / slate / institutional blue',
  },
  {
    id: 'research-news',
    name: '科研快讯版',
    description: '新闻导向排版，适合院内快报与阶段亮点。',
    promptHint: '强调栏目感、快讯感、图文并置和标题条。',
    palette: 'ink / blue / warm gray',
  },
  {
    id: 'innovation-glow',
    name: '创新发布版',
    description: '高对比科技氛围，适合项目成果和发布类海报。',
    promptHint: '突出未来感、发光元素、清晰主体和仪式感。',
    palette: 'black / electric blue / mint',
  },
  {
    id: 'ceremony-red',
    name: '活动典礼版',
    description: '适合重大活动、论坛、仪式类海报。',
    promptHint: '红金点缀、正式感强、适度典礼氛围，不俗套。',
    palette: 'deep red / gold / ivory',
  },
  {
    id: 'recruitment-campaign',
    name: '招募动员版',
    description: '适合招聘、招新、招募类场景。',
    promptHint: '年轻但专业，CTA 明确，主体积极。',
    palette: 'blue / orange / white',
  },
]

export const posterAspectRatioCatalog = [
  { id: '4:5', name: '竖版 4:5', description: '默认宣传海报比例' },
  { id: '3:4', name: '竖版 3:4', description: '偏传统海报比例' },
  { id: '1:1', name: '方图 1:1', description: '适合方形卡片与社媒封面' },
  { id: '16:9', name: '横版 16:9', description: '适合屏幕、横幅与汇报封面' },
  { id: '9:16', name: '长图 9:16', description: '适合手机屏海报' },
]

export const posterImageSizeCatalog = [
  { id: '1K', name: '标准 1K', description: '默认分辨率，响应更快' },
  { id: '2K', name: '高清 2K', description: '更适合下载与印刷预览' },
  { id: '4K', name: '超清 4K', description: '质量更高，但耗时和成本更高' },
]

export const recentPosterStorageKey = 'docs2brief-recent-posters'
