export function parseJsonObject(value) {
  const stripped = sanitizeJsonText(stripCodeFence(value))
  if (!stripped) {
    throw new Error('模型输出不包含 JSON 对象')
  }

  const primaryCandidates = [stripped, extractFirstBalancedObject(stripped)].filter(Boolean)
  for (const candidate of primaryCandidates) {
    const parsed = safeJsonParse(candidate)
    if (parsed) {
      return parsed
    }
  }

  const repairedCandidates = [
    repairLikelyBrokenJson(stripped),
    repairLikelyBrokenJson(extractFirstBalancedObject(stripped)),
  ].filter(Boolean)

  const deduped = Array.from(new Set(repairedCandidates))
  for (const candidate of deduped) {
    const parsed = safeJsonParse(candidate)
    if (parsed) {
      return parsed
    }
  }

  throw new Error('模型输出中的 JSON 不完整')
}

function stripCodeFence(value) {
  return String(value ?? '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function sanitizeJsonText(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, ' ')
    .trim()
}

function safeJsonParse(candidate) {
  if (!candidate) {
    return null
  }
  try {
    const parsed = JSON.parse(candidate)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function extractFirstBalancedObject(source) {
  const text = String(source ?? '')
  const start = text.indexOf('{')
  if (start < 0) {
    return ''
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return text.slice(start)
}

function repairLikelyBrokenJson(source) {
  const candidate = sanitizeJsonText(source)
  if (!candidate) {
    return ''
  }

  const start = candidate.indexOf('{')
  if (start < 0) {
    return ''
  }

  const text = candidate.slice(start)
  const stack = []
  let output = ''
  let inString = false
  let escaped = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      output += char
      continue
    }

    if (char === '{') {
      stack.push('}')
      output += char
      continue
    }

    if (char === '[') {
      stack.push(']')
      output += char
      continue
    }

    if (char === '}' || char === ']') {
      const expected = stack[stack.length - 1]
      if (expected === char) {
        stack.pop()
        output += char
      }
      continue
    }

    output += char
  }

  if (inString) {
    if (escaped) {
      output += '\\'
    }
    output += '"'
  }

  output = output.replace(/,\s*([}\]])/g, '$1')

  while (stack.length > 0) {
    output += stack.pop()
  }

  return output.replace(/,\s*([}\]])/g, '$1')
}
