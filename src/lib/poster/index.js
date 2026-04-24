import { parseJsonObject } from '../openrouter/json-utils'
import {
  OPENROUTER_API_KEY,
  OPENROUTER_POSTER_BRIEF_MODEL,
  OPENROUTER_POSTER_IMAGE_MODEL,
} from '../openrouter/config'
import { extractResponseContent, requestOpenRouter, summarizeResponsePayload } from '../openrouter/transport'
import { buildPosterBriefMessages, buildPosterImagePrompt } from './prompts'

const maxPosterBriefTokens = 1600
const maxPosterImageTokens = 1400

export async function generatePoster(params) {
  const { rawText, posterScene, posterStyle, departmentName, aspectRatio, imageSize, sensitiveMode, pushLog } = params
  const warnings = []
  const requestPayload = {
    brief: null,
    image: null,
  }
  const responsePayload = {
    brief: null,
    image: null,
  }

  pushLog({
    kind: 'business',
    module: '海报编排',
    event: '输入',
    payload: {
      rawLength: rawText.length,
      posterScene: posterScene.id,
      posterStyle: posterStyle.id,
      departmentName,
      aspectRatio,
      imageSize,
      sensitiveMode,
      briefModel: OPENROUTER_POSTER_BRIEF_MODEL,
      imageModel: OPENROUTER_POSTER_IMAGE_MODEL,
    },
    timestamp: new Date().toISOString(),
  })

  if (!OPENROUTER_API_KEY) {
    const brief = buildFallbackPosterBrief(rawText, posterScene)
    warnings.push('未配置 OpenRouter API Key，已回退到本地海报草图。')
    return buildPosterResult({
      brief,
      imageDataUrl: buildFallbackPosterDataUrl(brief, posterStyle, aspectRatio),
      modelUsed: 'fallback-local',
      warnings,
      requestPayload,
      responsePayload: { fallback: true },
      promptSummary: '本地 SVG 草图回退',
    })
  }

  try {
    requestPayload.brief = {
      model: OPENROUTER_POSTER_BRIEF_MODEL,
      messages: buildPosterBriefMessages({ rawText, posterScene, posterStyle, departmentName, sensitiveMode }),
      temperature: 0.2,
      max_tokens: maxPosterBriefTokens,
    }

    pushLog({
      kind: 'system',
      module: '海报编排',
      event: '开始生成 brief',
      payload: { model: OPENROUTER_POSTER_BRIEF_MODEL, maxTokens: maxPosterBriefTokens },
      timestamp: new Date().toISOString(),
    })

    responsePayload.brief = await requestOpenRouter(requestPayload.brief)
    const briefContent = extractResponseContent(responsePayload.brief)
    const parsedBrief = parseJsonObject(briefContent)
    const brief = normalizePosterBrief(parsedBrief, rawText, posterScene)
    const imagePrompt = buildPosterImagePrompt({
      brief,
      posterScene,
      posterStyle,
      departmentName,
      aspectRatio,
      imageSize,
      sensitiveMode,
    })

    requestPayload.image = {
      model: OPENROUTER_POSTER_IMAGE_MODEL,
      modalities: ['image', 'text'],
      messages: [{ role: 'user', content: imagePrompt }],
      image_config: {
        aspect_ratio: aspectRatio,
        image_size: imageSize,
      },
      max_tokens: maxPosterImageTokens,
    }

    pushLog({
      kind: 'business',
      module: '海报编排',
      event: 'brief 输出',
      payload: {
        title: brief.title,
        subtitle: brief.subtitle,
        keyPointCount: brief.key_points.length,
        visualSubject: brief.visual_subject,
      },
      timestamp: new Date().toISOString(),
    })

    pushLog({
      kind: 'system',
      module: '海报编排',
      event: '开始生成海报图片',
      payload: { model: OPENROUTER_POSTER_IMAGE_MODEL, aspectRatio, imageSize },
      timestamp: new Date().toISOString(),
    })

    responsePayload.image = await requestOpenRouter(requestPayload.image, { timeoutMs: 90000 })
    const imageDataUrl = extractPosterImageUrl(responsePayload.image)

    pushLog({
      kind: 'business',
      module: '海报编排',
      event: '输出',
      payload: {
        title: brief.title,
        modelUsed: `${OPENROUTER_POSTER_BRIEF_MODEL} + ${OPENROUTER_POSTER_IMAGE_MODEL}`,
        imageType: imageDataUrl.startsWith('data:') ? 'base64-data-url' : 'remote-url',
        promptLength: imagePrompt.length,
      },
      timestamp: new Date().toISOString(),
    })

    return buildPosterResult({
      brief,
      imageDataUrl,
      modelUsed: `${OPENROUTER_POSTER_BRIEF_MODEL} + ${OPENROUTER_POSTER_IMAGE_MODEL}`,
      warnings,
      requestPayload,
      responsePayload,
      promptSummary: imagePrompt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知异常'
    const fallbackBrief = buildFallbackPosterBrief(rawText, posterScene)
    warnings.push(`海报生成失败，已回退到本地草图：${message}`)

    pushLog({
      kind: 'error',
      module: '海报编排',
      event: '生成失败，回退本地草图',
      payload: { message },
      timestamp: new Date().toISOString(),
    })

    return buildPosterResult({
      brief: fallbackBrief,
      imageDataUrl: buildFallbackPosterDataUrl(fallbackBrief, posterStyle, aspectRatio),
      modelUsed: 'fallback-local',
      warnings,
      requestPayload,
      responsePayload: {
        ...responsePayload,
        fallback: true,
        error: message,
      },
      promptSummary: '本地 SVG 草图回退',
    })
  }
}

function buildPosterResult(params) {
  const { brief, imageDataUrl, modelUsed, warnings, requestPayload, responsePayload, promptSummary } = params
  return {
    title: brief.title,
    subtitle: brief.subtitle,
    brief,
    imageDataUrl,
    modelUsed,
    warnings,
    requestPayload,
    responsePayload,
    promptSummary,
  }
}

function normalizePosterBrief(parsed, rawText, posterScene) {
  const lines = extractPosterSourceLines(rawText)
  const fallback = buildFallbackPosterBrief(rawText, posterScene)
  const title = normalizeShortText(parsed.title, 28) || fallback.title
  const subtitle = normalizeShortText(parsed.subtitle, 42) || fallback.subtitle
  const headline = normalizeShortText(parsed.headline, 32) || title
  const supportingCopy = normalizeShortText(parsed.supporting_copy, 96) || fallback.supporting_copy
  const keyPoints = normalizeStringList(parsed.key_points, 4, 28)
  const negativePrompts = normalizeStringList(parsed.negative_prompts, 5, 28)

  return {
    title,
    subtitle,
    headline,
    supporting_copy: supportingCopy,
    key_points: keyPoints.length > 0 ? keyPoints : fallback.key_points,
    visual_subject: normalizeShortText(parsed.visual_subject, 48) || inferVisualSubject(lines),
    layout_focus: normalizeShortText(parsed.layout_focus, 48) || '大标题居上，主体视觉居中，关键信息分区排布',
    cta: normalizeShortText(parsed.cta, 32) || fallback.cta,
    negative_prompts:
      negativePrompts.length > 0
        ? negativePrompts
        : ['低清晰度', '文字乱码', '过度拥挤', '营销俗气', '杂乱无层次'],
  }
}

function buildFallbackPosterBrief(rawText, posterScene) {
  const lines = extractPosterSourceLines(rawText)
  const titleSeed = lines.find((line) => line.length >= 6 && line.length <= 26) || posterScene.name
  const title = /海报|宣传|通知|论坛|讲座|招募|周报/.test(titleSeed) ? titleSeed : `${titleSeed.replace(/[：:。；！!]+$/g, '')}`
  const subtitle = lines.find((line) => line !== titleSeed && line.length >= 10 && line.length <= 40) || posterScene.description
  const summary = lines.slice(0, 3).join(' ').slice(0, 96) || posterScene.description
  const keyPoints = lines.slice(0, 4).map((line) => line.replace(/^[-•]\s*/, '').slice(0, 24)).filter(Boolean)

  return {
    title: ensurePosterTitle(title),
    subtitle,
    headline: ensurePosterTitle(title),
    supporting_copy: summary,
    key_points: keyPoints.length > 0 ? keyPoints : [posterScene.description],
    visual_subject: inferVisualSubject(lines),
    layout_focus: '大标题居上，主视觉居中，重点信息块分区展示',
    cta: /活动|通知|招募|招聘|报名/.test(posterScene.id) ? '欢迎关注并按要求参与' : '了解更多详情',
    negative_prompts: ['低清晰度', '文字乱码', '杂乱排版', '廉价营销感'],
  }
}

function inferVisualSubject(lines) {
  const merged = lines.join(' ')
  if (/讲座|论坛|会议|发布会|活动/.test(merged)) {
    return '讲台、会场、演讲者或学术活动主视觉，具备机构正式氛围'
  }
  if (/招募|招聘|岗位|人才/.test(merged)) {
    return '年轻专业人才形象、研究场景与组织品牌元素组合'
  }
  if (/平台|系统|实验|科研|项目|成果/.test(merged)) {
    return '科研设备、实验室、数据界面或研究团队工作场景，带科技感'
  }
  return '机构品牌背景、抽象图形与信息版式结合的正式宣传画面'
}

function extractPosterSourceLines(rawText) {
  return String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !isPosterMetaLine(line))
}

function isPosterMetaLine(line) {
  return /^【文档\s+\d+\/\d+｜.+】$/.test(line) || /^【补充正文】$/.test(line)
}

function extractPosterImageUrl(payload) {
  const images = []
  const firstChoice = payload?.choices?.[0] || null
  const message = firstChoice?.message || null

  if (Array.isArray(message?.images)) {
    images.push(...message.images)
  }

  if (Array.isArray(message?.content)) {
    for (const item of message.content) {
      if (item?.type === 'image_url') {
        images.push(item)
      }
      if (item?.type === 'output_image') {
        images.push(item)
      }
    }
  }

  for (const image of images) {
    const candidate =
      image?.image_url?.url ||
      image?.imageUrl?.url ||
      image?.url ||
      image?.image_url ||
      image?.imageUrl ||
      ''
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  throw new Error(`模型响应未包含图片数据（${summarizeResponsePayload(payload)}）`)
}

function buildFallbackPosterDataUrl(brief, posterStyle, aspectRatio) {
  const size = resolvePosterCanvasSize(aspectRatio)
  const accent = resolvePosterAccentColor(posterStyle.id)
  const title = escapeSvgText(brief.title)
  const subtitle = escapeSvgText(brief.subtitle)
  const headline = escapeSvgText(brief.headline)
  const points = (brief.key_points || []).slice(0, 4)
  const pointSvg = points
    .map(
      (item, index) => `
        <text x="64" y="${340 + index * 52}" font-size="28" fill="#d9ecff">• ${escapeSvgText(item)}</text>`,
    )
    .join('')

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#09111f" />
      <stop offset="55%" stop-color="#0f2340" />
      <stop offset="100%" stop-color="#081423" />
    </linearGradient>
    <radialGradient id="orb" cx="72%" cy="18%" r="46%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.95" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" rx="28" />
  <rect x="34" y="34" width="${size.width - 68}" height="${size.height - 68}" rx="26" fill="none" stroke="rgba(173,220,255,0.28)" />
  <circle cx="${Math.round(size.width * 0.78)}" cy="${Math.round(size.height * 0.2)}" r="${Math.round(size.width * 0.2)}" fill="url(#orb)" />
  <text x="64" y="92" font-size="22" letter-spacing="4" fill="#8fb5db">DOCS2BRIEF POSTER</text>
  <text x="64" y="172" font-size="56" font-weight="700" fill="#f5fbff">${title}</text>
  <text x="64" y="222" font-size="26" fill="#b9d5ef">${subtitle}</text>
  <text x="64" y="288" font-size="34" fill="#ffffff">${headline}</text>
  ${pointSvg}
  <text x="64" y="${size.height - 104}" font-size="22" fill="#92b4d6">${escapeSvgText(brief.supporting_copy.slice(0, 52))}</text>
  <text x="64" y="${size.height - 58}" font-size="20" fill="#7fcfff">${escapeSvgText(brief.cta)}</text>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function resolvePosterCanvasSize(aspectRatio) {
  if (aspectRatio === '16:9') {
    return { width: 1600, height: 900 }
  }
  if (aspectRatio === '9:16') {
    return { width: 1080, height: 1920 }
  }
  if (aspectRatio === '1:1') {
    return { width: 1400, height: 1400 }
  }
  if (aspectRatio === '3:4') {
    return { width: 1200, height: 1600 }
  }
  return { width: 1280, height: 1600 }
}

function resolvePosterAccentColor(styleId) {
  const palette = {
    'academy-premium': '#39c7ff',
    'institutional-minimal': '#6f9dd9',
    'research-news': '#54d0ff',
    'innovation-glow': '#4ce6d3',
    'ceremony-red': '#ff8a66',
    'recruitment-campaign': '#ffb347',
  }
  return palette[styleId] || '#39c7ff'
}

function normalizeShortText(value, limit) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) {
    return ''
  }
  return text.slice(0, limit)
}

function normalizeStringList(value, limit = 4, itemLimit = 32) {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => normalizeShortText(item, itemLimit))
    .filter(Boolean)
    .slice(0, limit)
}

function ensurePosterTitle(value) {
  const text = String(value || '').trim() || '研究院宣传海报'
  return text.length > 28 ? text.slice(0, 28) : text
}

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
