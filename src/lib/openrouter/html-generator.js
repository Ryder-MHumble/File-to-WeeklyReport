import { fallbackParse } from '../fallback-parser'
import { chooseMaxTokens, OPENROUTER_API_KEY, OPENROUTER_HTML_MODEL, resolvePromptProfile } from './config'
import { buildHtmlMessages, buildHtmlRepairMessages } from './prompts'
import { extractResponseContent, requestOpenRouter } from './transport'
import {
  buildFallbackHtmlFromDocument,
  ensureHtmlDocument,
  evaluateHtmlQuality,
  isHtmlLikelyComplete,
} from './html-utils'
import { generateStructuredReport } from './structured-generator'

export async function generatePureHtmlReport(params) {
  const { rawText, sensitiveMode, styleMeta, templateMeta, context, pushLog } = params
  const startedAt = performance.now()
  const warnings = []
  const localFallbackDocument = fallbackParse(rawText, sensitiveMode)
  let resolvedFallbackDocument = localFallbackDocument
  const model = OPENROUTER_HTML_MODEL
  const promptStrategy = resolvePromptProfile({ mode: 'llm-html', rawText, context })
  const promptProfile = promptStrategy.profile

  const primaryRequestPayload = {
    model,
    messages: buildHtmlMessages({ rawText, sensitiveMode, styleMeta, templateMeta, context, promptProfile }),
    temperature: 0.2,
    max_tokens: chooseMaxTokens(rawText, 'llm-html'),
  }
  const requestPayload = {
    primary: primaryRequestPayload,
    repair: null,
    structuredFallback: null,
  }

  pushLog({
    kind: 'business',
    module: '模型编排',
    event: 'HTML直出输入',
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
    warnings.push('未配置 OpenRouter API Key，已回退到本地模板化预览。')
    pushLog({
      kind: 'error',
      module: '模型编排',
      event: '缺少 API Key，HTML直出降级',
      payload: { model },
      timestamp: new Date().toISOString(),
    })
    return {
      document: localFallbackDocument,
      warnings,
      modelUsed: 'fallback-local',
      requestPayload,
      responsePayload: { fallback: true },
      generatedHtml: buildFallbackHtmlFromDocument(localFallbackDocument, context),
    }
  }

  try {
    const primaryResponsePayload = await requestOpenRouter(primaryRequestPayload)
    const responsePayload = {
      primary: primaryResponsePayload,
      repair: null,
      structuredFallback: null,
    }
    const content = extractResponseContent(primaryResponsePayload)
    let generatedHtml = ensureHtmlDocument(content)
    const elapsedMs = Number((performance.now() - startedAt).toFixed(2))
    let finishReason = primaryResponsePayload?.choices?.[0]?.finish_reason || 'unknown'
    let quality = evaluateHtmlQuality(generatedHtml)
    if (finishReason === 'length' && !isHtmlLikelyComplete(generatedHtml)) {
      quality = {
        ...quality,
        ok: false,
        reason: `${quality.reason}, 结束原因=length且HTML疑似截断`,
      }
    }
    let usedRepair = false
    let usedStructuredFallback = false
    let modelUsed = model

    if (!quality.ok) {
      pushLog({
        kind: 'system',
        module: '模型编排',
        event: 'HTML质量初检未通过，触发修复重试',
        payload: {
          finishReason,
          quality,
        },
        timestamp: new Date().toISOString(),
      })

      const repairRequestPayload = {
        model,
        messages: buildHtmlRepairMessages({
          rawText,
          brokenOutput: generatedHtml,
          qualityReason: quality.reason,
          styleMeta,
          templateMeta,
          context,
          promptProfile,
        }),
        temperature: 0,
        max_tokens: Math.max(4200, chooseMaxTokens(rawText, 'llm-html')),
      }
      requestPayload.repair = repairRequestPayload

      const repairResponsePayload = await requestOpenRouter(repairRequestPayload)
      responsePayload.repair = repairResponsePayload

      const repairedContent = extractResponseContent(repairResponsePayload)
      const repairedHtml = ensureHtmlDocument(repairedContent)
      finishReason = repairResponsePayload?.choices?.[0]?.finish_reason || finishReason
      let repairedQuality = evaluateHtmlQuality(repairedHtml)
      if (finishReason === 'length' && !isHtmlLikelyComplete(repairedHtml)) {
        repairedQuality = {
          ...repairedQuality,
          ok: false,
          reason: `${repairedQuality.reason}, 结束原因=length且HTML疑似截断`,
        }
      }

      if (repairedQuality.ok) {
        usedRepair = true
        warnings.push('首轮 HTML 输出未达标，系统已自动修复重试并通过质量检查。')
        generatedHtml = repairedHtml
      } else {
        const fallbackResolved = await resolveEnhancedFallbackDocument(params, localFallbackDocument, pushLog)
        resolvedFallbackDocument = fallbackResolved.document
        requestPayload.structuredFallback = fallbackResolved.requestPayload
        responsePayload.structuredFallback = fallbackResolved.responsePayload
        usedStructuredFallback = fallbackResolved.source === 'structured-model'
        modelUsed = usedStructuredFallback ? `${model} + structured-fallback` : 'fallback-local'
        warnings.push(
          usedStructuredFallback
            ? `LLM 输出内容不完整（${repairedQuality.reason}），已自动切换为“结构化+模板化增强回退”页面。`
            : `LLM 输出内容不完整（${repairedQuality.reason}），已自动切换为本地增强回退页面。`,
        )
        if (fallbackResolved.warning) {
          warnings.push(fallbackResolved.warning)
        }
        generatedHtml = buildFallbackHtmlFromDocument(resolvedFallbackDocument, context)

        pushLog({
          kind: 'system',
          module: '模型编排',
          event: 'HTML质量闸门触发回退',
          payload: {
            finishReason,
            quality: repairedQuality,
            usedRepair: false,
            fallbackSource: fallbackResolved.source,
          },
          timestamp: new Date().toISOString(),
        })
      }
    }

    pushLog({
      kind: 'business',
      module: '模型编排',
      event: 'HTML直出输出',
      payload: {
        model,
        htmlLength: generatedHtml.length,
        finishReason,
        warningCount: warnings.length,
        usedRepair,
        usedStructuredFallback,
        promptProfile,
      },
      timestamp: new Date().toISOString(),
    })
    pushLog({
      kind: 'system',
      module: '模型编排',
      event: 'HTML直出请求完成',
      payload: { elapsedMs, model },
      timestamp: new Date().toISOString(),
    })

    return {
      document: resolvedFallbackDocument,
      warnings,
      modelUsed,
      requestPayload,
      responsePayload,
      generatedHtml,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知异常'
    const fallbackResolved = await resolveEnhancedFallbackDocument(params, localFallbackDocument, pushLog)
    resolvedFallbackDocument = fallbackResolved.document
    requestPayload.structuredFallback = fallbackResolved.requestPayload

    warnings.push(`模型 HTML 直出失败，已回退到模板化预览：${message}`)
    if (fallbackResolved.source === 'structured-model') {
      warnings.push('回退阶段已使用结构化抽取结果增强展示质量。')
    }
    if (fallbackResolved.warning) {
      warnings.push(fallbackResolved.warning)
    }

    pushLog({
      kind: 'error',
      module: '模型编排',
      event: 'HTML直出请求失败，降级',
      payload: { error: message, model },
      timestamp: new Date().toISOString(),
    })

    return {
      document: resolvedFallbackDocument,
      warnings,
      modelUsed: fallbackResolved.source === 'structured-model' ? 'structured-fallback' : 'fallback-local',
      requestPayload,
      responsePayload: {
        fallback: true,
        error: message,
        structuredFallback: fallbackResolved.responsePayload,
      },
      generatedHtml: buildFallbackHtmlFromDocument(resolvedFallbackDocument, context),
    }
  }
}

async function resolveEnhancedFallbackDocument(params, localFallbackDocument, pushLog) {
  const { rawText, sensitiveMode, styleMeta, templateMeta, context } = params

  if (!OPENROUTER_API_KEY) {
    return {
      document: localFallbackDocument,
      source: 'fallback-local',
      requestPayload: null,
      responsePayload: { fallback: true },
      warning: '',
    }
  }

  try {
    const structuredContext = { ...context, generationMode: 'structured-template' }
    const structuredResult = await generateStructuredReport({
      rawText,
      sensitiveMode,
      styleMeta,
      templateMeta,
      context: structuredContext,
      pushLog,
    })
    const source = structuredResult.modelUsed === 'fallback-local' ? 'fallback-local' : 'structured-model'

    pushLog({
      kind: 'system',
      module: '模型编排',
      event: '增强回退文档就绪',
      payload: {
        source,
        modelUsed: structuredResult.modelUsed,
        warningCount: structuredResult.warnings.length,
      },
      timestamp: new Date().toISOString(),
    })

    return {
      document: structuredResult.document || localFallbackDocument,
      source,
      requestPayload: structuredResult.requestPayload,
      responsePayload: structuredResult.responsePayload,
      warning:
        structuredResult.warnings.length > 0
          ? `结构化增强回退提示：${structuredResult.warnings.join('；')}`
          : '',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知异常'
    pushLog({
      kind: 'error',
      module: '模型编排',
      event: '增强回退文档构建失败',
      payload: { error: message },
      timestamp: new Date().toISOString(),
    })

    return {
      document: localFallbackDocument,
      source: 'fallback-local',
      requestPayload: null,
      responsePayload: { fallback: true, error: message },
      warning: `增强回退失败，已使用本地结构化结果：${message}`,
    }
  }
}
