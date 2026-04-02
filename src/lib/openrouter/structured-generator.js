import { fallbackParse } from '../fallback-parser'
import { chooseMaxTokens, OPENROUTER_API_KEY, OPENROUTER_STRUCTURED_MODEL, resolvePromptProfile } from './config'
import { parseJsonObject } from './json-utils'
import { normalizeDocument } from './normalize'
import { buildStructuredMessages, buildStructuredRetryMessages } from './prompts'
import { extractResponseContent, requestOpenRouter, summarizeResponsePayload } from './transport'

export async function generateStructuredReport(params) {
  const { rawText, sensitiveMode, styleMeta, templateMeta, context, pushLog } = params
  const startedAt = performance.now()
  const warnings = []
  const model = OPENROUTER_STRUCTURED_MODEL
  const promptStrategy = resolvePromptProfile({ mode: 'structured-template', rawText, context })
  const promptProfile = promptStrategy.profile

  const primaryRequestPayload = {
    model,
    messages: buildStructuredMessages({ rawText, sensitiveMode, styleMeta, templateMeta, context, promptProfile }),
    temperature: 0.1,
    max_tokens: chooseMaxTokens(rawText, 'structured-template'),
  }
  const requestPayload = { primary: primaryRequestPayload, retry: null }

  pushLog({
    kind: 'business',
    module: '模型编排',
    event: '结构化输入',
    payload: {
      model,
      rawLength: rawText.length,
      stylePreference: styleMeta.id,
      templateId: templateMeta.id,
      department: context.department,
      audience: context.audience,
      maxTokens: primaryRequestPayload.max_tokens,
      promptProfile,
      promptSource: promptStrategy.source,
      promptBucket: promptStrategy.bucket,
    },
    timestamp: new Date().toISOString(),
  })

  if (!OPENROUTER_API_KEY) {
    const fallback = fallbackParse(rawText, sensitiveMode)
    warnings.push('未配置 OpenRouter API Key，已自动切换到本地结构化解析。')
    pushLog({
      kind: 'error',
      module: '模型编排',
      event: '缺少 API Key，结构化降级',
      payload: { model },
      timestamp: new Date().toISOString(),
    })
    return {
      document: fallback,
      warnings,
      modelUsed: 'fallback-local',
      requestPayload,
      responsePayload: { fallback: true },
    }
  }

  try {
    let responsePayload = await requestOpenRouter(primaryRequestPayload)
    let content = ''
    let parsed
    let usedRetry = false

    try {
      content = extractResponseContent(responsePayload)
      parsed = parseJsonObject(content)
    } catch (error) {
      const firstError = error instanceof Error ? error.message : '结构化输出异常'
      const retryRequestPayload = {
        model,
        messages: buildStructuredRetryMessages({
          rawText,
          styleMeta,
          templateMeta,
          context,
          promptProfile,
          brokenOutput: content || summarizeResponsePayload(responsePayload),
        }),
        temperature: 0,
        max_tokens: Math.max(2600, chooseMaxTokens(rawText, 'structured-template')),
      }
      requestPayload.retry = retryRequestPayload
      usedRetry = true

      pushLog({
        kind: 'system',
        module: '模型编排',
        event: '结构化输出异常，触发重试',
        payload: { firstError },
        timestamp: new Date().toISOString(),
      })

      responsePayload = await requestOpenRouter(retryRequestPayload)
      content = extractResponseContent(responsePayload)
      parsed = parseJsonObject(content)
      warnings.push('首轮结构化输出异常（含内容抽取或 JSON 解析），系统已自动重试并修复。')
    }

    const normalized = normalizeDocument(parsed, rawText, sensitiveMode)
    const elapsedMs = Number((performance.now() - startedAt).toFixed(2))

    pushLog({
      kind: 'business',
      module: '模型编排',
      event: '结构化输出',
      payload: {
        model,
        title: normalized.title,
        sectionCount: normalized.sections.length,
        metricCount: normalized.metrics?.length ?? 0,
        usedRetry,
        warningCount: warnings.length,
        promptProfile,
      },
      timestamp: new Date().toISOString(),
    })
    pushLog({
      kind: 'system',
      module: '模型编排',
      event: '结构化请求完成',
      payload: { elapsedMs, model },
      timestamp: new Date().toISOString(),
    })

    return {
      document: normalized,
      warnings,
      modelUsed: model,
      requestPayload,
      responsePayload,
    }
  } catch (error) {
    const fallback = fallbackParse(rawText, sensitiveMode)
    const message = error instanceof Error ? error.message : '未知异常'
    warnings.push(`模型结构化失败，已自动切换到本地结构化：${message}`)

    pushLog({
      kind: 'error',
      module: '模型编排',
      event: '结构化请求失败，降级',
      payload: { error: message, model },
      timestamp: new Date().toISOString(),
    })

    return {
      document: fallback,
      warnings,
      modelUsed: 'fallback-local',
      requestPayload,
      responsePayload: { fallback: true, error: message },
    }
  }
}
