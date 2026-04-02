export function parseJsonObject(value) {
  const stripped = value.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    const start = stripped.indexOf('{')
    if (start < 0) {
      throw new Error('模型输出不包含 JSON 对象')
    }

    let depth = 0
    for (let index = start; index < stripped.length; index += 1) {
      const char = stripped[index]
      if (char === '{') {
        depth += 1
      } else if (char === '}') {
        depth -= 1
        if (depth === 0) {
          const candidate = stripped.slice(start, index + 1)
          return JSON.parse(candidate)
        }
      }
    }

    const repaired = repairPossiblyBrokenJson(stripped.slice(start))
    try {
      return JSON.parse(repaired)
    } catch {
      throw new Error('模型输出中的 JSON 不完整')
    }
  }
}

function repairPossiblyBrokenJson(source) {
  let candidate = source.trim()
  candidate = candidate.replace(/```+$/g, '').trim()
  candidate = candidate.replace(/,\s*([}\]])/g, '$1')

  const quoteCount = (candidate.match(/"/g) || []).length
  if (quoteCount % 2 === 1) {
    candidate = `${candidate}"`
  }

  const openBraces = (candidate.match(/{/g) || []).length
  const closeBraces = (candidate.match(/}/g) || []).length
  if (openBraces > closeBraces) {
    candidate += '}'.repeat(openBraces - closeBraces)
  }

  const openBrackets = (candidate.match(/\[/g) || []).length
  const closeBrackets = (candidate.match(/]/g) || []).length
  if (openBrackets > closeBrackets) {
    candidate += ']'.repeat(openBrackets - closeBrackets)
  }

  candidate = candidate.replace(/,\s*([}\]])/g, '$1')
  return candidate
}
