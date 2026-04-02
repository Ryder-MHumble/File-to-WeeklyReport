export function escapeHtml(value) {
  const safeValue = value == null ? '' : String(value)
  if (!safeValue) {
    return ''
  }

  return safeValue
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function toCleanString(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .replace(/```+/g, ' ')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripNoise(value) {
  return value.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}
