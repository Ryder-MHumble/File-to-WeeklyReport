function joinList(values) {
  return values.filter(Boolean).join('；')
}

export function buildPosterBriefMessages(params) {
  const { rawText, posterScene, posterStyle, departmentName, sensitiveMode } = params
  const modeNote = sensitiveMode
    ? '敏感表达模式开启：文案必须克制、正式、可核验，不使用夸张措辞。'
    : '标准表达模式：允许有传播感，但不得夸大事实。'

  const schema =
    '{"title":"","subtitle":"","headline":"","supporting_copy":"","key_points":[""],"visual_subject":"","layout_focus":"","cta":"","negative_prompts":[""]}'

  const systemLines = [
    '你是研究院宣传设计前的内容策划师，负责把长文整理成“单张宣传海报 brief JSON”。',
    '只能输出一个合法 JSON 对象，不要输出解释、代码块、注释。',
    `固定 JSON 结构如下：${schema}`,
    '',
    '字段要求：',
    '- title：20 字以内，适合作为海报主标题。',
    '- subtitle：30 字以内，补充对象、时间、场景或阶段。',
    '- headline：一句强主张，可与 title 接近但不能完全重复。',
    '- supporting_copy：80 字以内，适合作为海报正文摘要。',
    '- key_points：2-4 条，每条 8-24 字。',
    '- visual_subject：描述画面主体，应是可视化对象、人物、设备、场景或抽象构图。',
    '- layout_focus：说明版式重心，例如“左上标题 + 右下数据点”。',
    '- cta：如果适用，输出报名/关注/了解更多等动作召唤；不适用则写“无需 CTA”。',
    '- negative_prompts：列出 3-5 条不希望出现的元素或风格。',
    '',
    '质量约束：',
    `- 海报场景：${posterScene.name}；场景说明：${posterScene.description}`,
    `- 场景受众：${posterScene.audienceHint}`,
    `- 场景文案规则：${posterScene.copyRule}`,
    `- 视觉风格：${posterStyle.name}；风格说明：${posterStyle.description}`,
    `- 风格提示：${posterStyle.promptHint}`,
    `- 所属部门：${departmentName}`,
    '- 所有内容必须来自原文，不得凭空编造项目、数字、机构、奖项或时间。',
    '- 原文信息不足时减少条目，不要硬凑完整海报。',
    '- 若内容更适合作为活动通知，则优先提炼“时间、地点、对象、价值”。',
    '- 若内容更适合作为成果宣传，则优先提炼“成果、价值、影响、场景”。',
  ]

  const userLines = [modeNote, '请基于以下原文输出海报 brief JSON：', rawText]

  return [
    { role: 'system', content: systemLines.join('\n') },
    { role: 'user', content: userLines.join('\n\n') },
  ]
}

export function buildPosterImagePrompt(params) {
  const { brief, posterScene, posterStyle, departmentName, aspectRatio, imageSize, sensitiveMode } = params
  const negativePrompts = brief.negative_prompts || []

  return [
    '生成一张中文宣传海报，要求单张成图，适合研究院场景。',
    `主题场景：${posterScene.name}`,
    `画面风格：${posterStyle.name}`,
    `机构背景：${departmentName}`,
    `比例：${aspectRatio}`,
    `分辨率档位：${imageSize}`,
    sensitiveMode ? '表达要求：整体克制、正式、可信，避免煽动性和夸张效果。' : '表达要求：允许传播感，但必须专业、可信，不要廉价营销风。',
    `主标题：${brief.title}`,
    `副标题：${brief.subtitle}`,
    `主宣传语：${brief.headline}`,
    `摘要文案：${brief.supporting_copy}`,
    `关键信息：${joinList(brief.key_points || [])}`,
    `主体画面：${brief.visual_subject}`,
    `版式重点：${brief.layout_focus}`,
    `行动召唤：${brief.cta}`,
    `色彩方向：${posterStyle.palette}`,
    `风格补充：${posterStyle.promptHint}`,
    '视觉要求：大标题清晰、信息分区明确、构图完整、留白合理、适合宣传物料。',
    '文字要求：尽量保证中文标题区域清晰、规整、可读，不出现乱码、重影或随机字符。',
    '画面禁止：低清晰度、过曝、脏污纹理、杂乱拼贴、错误中文、密集小字。',
    negativePrompts.length > 0 ? `额外禁用元素：${joinList(negativePrompts)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
