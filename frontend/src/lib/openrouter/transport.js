import { OPENROUTER_API_KEY, OPENROUTER_BASE_URL } from './config'
import { stripNoise, toCleanString } from './text-utils'

export async function requestOpenRouter(payload) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'file2web-frontend',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter 请求失败：${response.status}`)
  }

  return await response.json()
}

export function extractResponseContent(payload) {
  const choices = payload.choices
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('模型响应缺少 choices')
  }

  const first = choices[0]
  const candidates = [
    first.message?.content,
    first.message?.tool_calls,
    first.message?.function_call,
    first.message?.reasoning,
    first.message,
    first.text,
    first.delta,
    payload.output_text,
    payload.output,
    payload.response,
  ]

  for (const candidate of candidates) {
    const content = extractTextFromContentLike(candidate)
    if (hasMeaningfulText(content)) {
      return stripNoise(content)
    }
  }

  const refusal = extractTextFromContentLike(first.message?.refusal)
  if (refusal) {
    throw new Error(`模型拒答：${toCleanString(refusal).slice(0, 120)}`)
  }

  throw new Error(`模型响应缺少可解析 content（${summarizeResponsePayload(payload)}）`)
}

function hasMeaningfulText(value) {
  const normalized = toCleanString(value)
  if (!normalized) {
    return false
  }

  const lowered = normalized.toLowerCase()
  if (['assistant', 'message', 'content', 'text', 'output_text'].includes(lowered)) {
    return false
  }
  return normalized.length >= 2
}

function extractTextFromContentLike(value, seen = new WeakSet()) {
  if (typeof value === 'string') {
    const text = value.trim()
    return text || ''
  }

  if (Array.isArray(value)) {
    const merged = value
      .map((item) => extractTextFromContentLike(item, seen))
      .filter(Boolean)
      .join('')
      .trim()
    return merged || ''
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  const candidate = value
  if (seen.has(candidate)) {
    return ''
  }
  seen.add(candidate)
  const directKeys = [
    'text',
    'content',
    'value',
    'output_text',
    'arguments',
    'delta',
    'parts',
    'tool_calls',
    'function_call',
    'reasoning',
    'analysis',
    'response',
    'input',
    'output',
    'data',
    'message',
  ]

  for (const key of directKeys) {
    const next = extractTextFromContentLike(candidate[key], seen)
    if (next) {
      return next
    }
  }

  const ignoredKeys = new Set(['id', 'type', 'role', 'name', 'status', 'index', 'finish_reason'])
  for (const [key, nextValue] of Object.entries(candidate)) {
    if (ignoredKeys.has(key)) {
      continue
    }
    const next = extractTextFromContentLike(nextValue, seen)
    if (next) {
      return next
    }
  }

  return ''
}

export function summarizeResponsePayload(payload) {
  const first = payload?.choices?.[0] || null
  const message = first?.message || null
  const content = message?.content
  const contentType = Array.isArray(content) ? 'array' : typeof content
  const finishReason = first?.finish_reason || 'unknown'
  const hasToolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls.length : 0
  const messageKeys = message && typeof message === 'object' ? Object.keys(message).join(',') : 'none'
  const choiceKeys = first && typeof first === 'object' ? Object.keys(first).join(',') : 'none'
  const payloadKeys = payload && typeof payload === 'object' ? Object.keys(payload).join(',') : 'none'
  return `finish_reason=${finishReason}; content_type=${contentType}; tool_calls=${hasToolCalls}; message_keys=[${messageKeys}]; choice_keys=[${choiceKeys}]; payload_keys=[${payloadKeys}]`
}
