import { fallbackParse } from '../fallback-parser'
import {
  chooseMaxTokens,
  OPENROUTER_API_KEY,
  OPENROUTER_POLISH_MODEL,
  OPENROUTER_STRUCTURED_MODEL,
  resolvePromptProfile,
} from './config'
import { parseJsonObject } from './json-utils'
import { normalizeDocument } from './normalize'
import {
  buildStructuredMessages,
  buildStructuredPolishMessages,
  buildStructuredRepairMessages,
  buildStructuredRetryMessages,
} from './prompts'
import { extractResponseContent, requestOpenRouter, summarizeResponsePayload } from './transport'

export async function generateStructuredReport(params) {
  const { rawText, sensitiveMode, styleMeta, templateMeta, context, pushLog } = params
  const startedAt = performance.now()
  const warnings = []
  const polishTimeoutMs = 18000
  const model = OPENROUTER_STRUCTURED_MODEL
  const polishModel = OPENROUTER_POLISH_MODEL || ''
  const polishEnabled = Boolean(polishModel)
  const promptStrategy = resolvePromptProfile({ mode: 'structured-template', rawText, context })
  const promptProfile = promptStrategy.profile
  const stageDurationsMs = {
    primary: 0,
    retry: 0,
    repair: 0,
    polish: 0,
  }

  const primaryMaxTokens = chooseMaxTokens(rawText, 'structured-template')
  const primaryRequestPayload = {
    model,
    messages: buildStructuredMessages({ rawText, sensitiveMode, styleMeta, templateMeta, context, promptProfile }),
    temperature: 0.1,
    max_tokens: primaryMaxTokens,
  }
  const requestPayload = { primary: primaryRequestPayload, retry: null, repair: null, polish: null }

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
      polishEnabled,
      polishModel: polishModel || '(disabled)',
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

  let usedRetry = false
  let usedRepair = false
  let repairError = ''
  let usedPolish = false
  let polishError = ''
  let polishSelected = false

  try {
    const primaryStartedAt = performance.now()
    const responsePayload = {
      primary: await requestOpenRouter(primaryRequestPayload),
      retry: null,
      repair: null,
      polish: null,
    }
    stageDurationsMs.primary = measureElapsedMs(primaryStartedAt)
    let parsed

    try {
      const content = extractResponseContent(responsePayload.primary)
      parsed = parseJsonObject(content)
    } catch (error) {
      const firstError = error instanceof Error ? error.message : '结构化输出异常'
      const primaryBrokenOutput = resolveBrokenOutput(responsePayload.primary)
      const retryMaxTokens = Math.max(4200, Math.floor(primaryMaxTokens * 1.35))
      const retryRequestPayload = {
        model,
        messages: buildStructuredRetryMessages({
          rawText,
          styleMeta,
          templateMeta,
          context,
          promptProfile,
          brokenOutput: primaryBrokenOutput,
        }),
        temperature: 0,
        max_tokens: retryMaxTokens,
      }
      requestPayload.retry = retryRequestPayload
      usedRetry = true

      pushLog({
        kind: 'system',
        module: '模型编排',
        event: '结构化输出异常，触发重试',
        payload: { firstError, retryMaxTokens },
        timestamp: new Date().toISOString(),
      })

      const retryStartedAt = performance.now()
      responsePayload.retry = await requestOpenRouter(retryRequestPayload)
      stageDurationsMs.retry = measureElapsedMs(retryStartedAt)
      const retryBrokenOutput = resolveBrokenOutput(responsePayload.retry)

      try {
        parsed = parseJsonObject(retryBrokenOutput)
        warnings.push('首轮结构化输出异常（含内容抽取或 JSON 解析），系统已自动重试并修复。')
      } catch (retryError) {
        const secondError = retryError instanceof Error ? retryError.message : '重试结构化输出异常'
        const repairRequestPayload = {
          model,
          messages: buildStructuredRepairMessages({
            rawText,
            styleMeta,
            templateMeta,
            context,
            promptProfile,
            brokenOutput: retryBrokenOutput,
          }),
          temperature: 0,
          max_tokens: Math.max(2800, Math.floor(retryMaxTokens * 0.92)),
        }
        requestPayload.repair = repairRequestPayload
        usedRepair = true

        pushLog({
          kind: 'system',
          module: '模型编排',
          event: '结构化重试仍异常，触发 JSON 修复',
          payload: { firstError, secondError, repairMaxTokens: repairRequestPayload.max_tokens },
          timestamp: new Date().toISOString(),
        })

        const repairStartedAt = performance.now()
        responsePayload.repair = await requestOpenRouter(repairRequestPayload)
        stageDurationsMs.repair = measureElapsedMs(repairStartedAt)

        try {
          const repairContent = extractResponseContent(responsePayload.repair)
          parsed = parseJsonObject(repairContent)
          warnings.push('前两轮结构化输出异常，系统已自动触发 JSON 修复并恢复。')
        } catch (repairParseError) {
          repairError = repairParseError instanceof Error ? repairParseError.message : 'JSON 修复后解析失败'
          throw new Error(`结构化 JSON 修复失败：${secondError} -> ${repairError}`)
        }
      }
    }

    const normalized = normalizeDocument(parsed, rawText, sensitiveMode)
    let finalDocument = normalized
    const baseScore = scoreDocumentRichness(normalized)

    if (polishEnabled) {
      const polishRequestPayload = {
        model: polishModel,
        messages: buildStructuredPolishMessages({
          rawText,
          styleMeta,
          templateMeta,
          context,
          promptProfile,
          structuredDraft: resolveStructuredDraft(normalized),
        }),
        temperature: 0.15,
        max_tokens: Math.max(3200, Math.floor(primaryMaxTokens * 1.2)),
      }
      requestPayload.polish = polishRequestPayload

      pushLog({
        kind: 'business',
        module: '模型编排',
        event: '结构化润色输入',
        payload: {
          model: polishModel,
          rawLength: rawText.length,
          baseScore,
          maxTokens: polishRequestPayload.max_tokens,
          timeoutMs: polishTimeoutMs,
          promptProfile,
        },
        timestamp: new Date().toISOString(),
      })

      try {
        pushLog({
          kind: 'system',
          module: '模型编排',
          event: '结构化润色补全开始',
          payload: { model: polishModel, timeoutMs: polishTimeoutMs },
          timestamp: new Date().toISOString(),
        })

        const polishStartedAt = performance.now()
        responsePayload.polish = await requestOpenRouter(polishRequestPayload, { timeoutMs: polishTimeoutMs })
        stageDurationsMs.polish = measureElapsedMs(polishStartedAt)
        const polishedContent = extractResponseContent(responsePayload.polish)
        const polishedParsed = parseJsonObject(polishedContent)
        const polishedDocument = normalizeDocument(polishedParsed, rawText, sensitiveMode)
        const polishScore = scoreDocumentRichness(polishedDocument)
        usedPolish = true

        if (polishScore >= baseScore) {
          finalDocument = polishedDocument
          polishSelected = true
        }

        pushLog({
          kind: 'business',
          module: '模型编排',
          event: '结构化润色输出',
          payload: {
            model: polishModel,
            usedPolish,
            polishSelected,
            baseScore,
            polishScore,
            stageDurationsMs: { polish: stageDurationsMs.polish },
          },
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        polishError = error instanceof Error ? error.message : '润色阶段异常'
        if (polishError.includes('超时')) {
          warnings.push(`结构化润色超时（>${Math.floor(polishTimeoutMs / 1000)} 秒），已保留主结果。`)
        }
        pushLog({
          kind: 'system',
          module: '模型编排',
          event: '结构化润色失败，保留主结果',
          payload: { model: polishModel, error: polishError, timeoutMs: polishTimeoutMs },
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      pushLog({
        kind: 'system',
        module: '模型编排',
        event: '结构化润色已跳过',
        payload: {
          reason: '未配置润色模型',
          baseScore,
        },
        timestamp: new Date().toISOString(),
      })
    }

    const elapsedMs = Number((performance.now() - startedAt).toFixed(2))

    pushLog({
      kind: 'business',
      module: '模型编排',
      event: '结构化输出',
      payload: {
        model,
        polishModel,
        title: finalDocument.title,
        sectionCount: finalDocument.sections.length,
        metricCount: finalDocument.metrics?.length ?? 0,
        usedRetry,
        usedRepair,
        repairError,
        usedPolish,
        polishEnabled,
        polishSelected,
        polishError,
        warningCount: warnings.length,
        stageDurationsMs,
        promptProfile,
      },
      timestamp: new Date().toISOString(),
    })
    pushLog({
      kind: 'system',
      module: '模型编排',
      event: '结构化请求完成',
      payload: { elapsedMs, model, stageDurationsMs, polishEnabled },
      timestamp: new Date().toISOString(),
    })

    const modelUsed = usedPolish ? `${model} + polish:${polishModel}` : model

    return {
      document: finalDocument,
      warnings,
      modelUsed,
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
      payload: {
        error: message,
        model,
        usedRetry,
        usedRepair,
        repairError,
        usedPolish,
        polishEnabled,
        polishError,
        stageDurationsMs,
      },
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

function measureElapsedMs(startedAt) {
  return Number((performance.now() - startedAt).toFixed(2))
}

function resolveBrokenOutput(payload) {
  try {
    return extractResponseContent(payload).slice(0, 14000)
  } catch {
    return summarizeResponsePayload(payload)
  }
}

function resolveStructuredDraft(document) {
  try {
    return JSON.stringify(document)
  } catch {
    return '{}'
  }
}

function scoreDocumentRichness(document) {
  const summaryLength = String(document.summary || '').length
  const sectionCount = Array.isArray(document.sections) ? document.sections.length : 0
  const sectionItemCount = (document.sections || []).reduce((total, section) => total + (section.items?.length || 0), 0)
  const metricCount = Array.isArray(document.metrics) ? document.metrics.length : 0
  const progressCount = Array.isArray(document.progress_items) ? document.progress_items.length : 0
  const actionCount = Array.isArray(document.next_actions) ? document.next_actions.length : 0

  return (
    Math.min(220, summaryLength) / 22 +
    sectionCount * 2.4 +
    Math.min(sectionItemCount, 36) * 1.1 +
    metricCount * 1.8 +
    progressCount * 1.2 +
    actionCount * 1.2
  )
}
