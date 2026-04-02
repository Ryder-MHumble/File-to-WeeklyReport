import mammoth from 'mammoth/mammoth.browser'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorker

const TEXT_SUFFIX = new Set(['txt', 'md', 'csv'])

export async function extractSourceText(params) {
  const startedAt = performance.now()
  const { file, text, maxChars, pushLog } = params

  if (!file && !text.trim()) {
    throw new Error('请先上传文件或输入正文。')
  }

  const warnings = []
  const parts = []
  const sourceTypes = []

  pushLog({
    kind: 'business',
    module: '文件抽取',
    event: '输入',
    payload: {
      fileName: file?.name ?? null,
      manualTextLength: text.trim().length,
      maxChars,
    },
    timestamp: new Date().toISOString(),
  })

  if (file) {
    const suffix = getSuffix(file.name)
    const fileResult = await extractFromFile({ file, suffix, pushLog })
    if (fileResult.text) {
      parts.push(fileResult.text)
    }
    warnings.push(...fileResult.warnings)
    sourceTypes.push(fileResult.sourceType)
  }

  if (text.trim()) {
    parts.push(normalizeText(text))
    sourceTypes.push('manual-text')
  }

  const merged = normalizeText(parts.join('\n\n'))
  if (!merged) {
    throw new Error('未抽取到有效文本，请更换文件或直接粘贴正文。')
  }

  const rawText = merged.slice(0, maxChars)
  if (merged.length > maxChars) {
    warnings.push(`原文较长，已截取前 ${maxChars} 个字符参与生成。`)
  }

  const elapsedMs = Number((performance.now() - startedAt).toFixed(2))
  const sourceType = sourceTypes.join('+') || 'manual-text'
  const result = {
    rawText,
    sourceType,
    warnings,
    fileName: file?.name ?? null,
    extractedPreview: rawText.slice(0, 1200),
  }

  pushLog({
    kind: 'business',
    module: '文件抽取',
    event: '输出',
    payload: {
      sourceType,
      rawLength: rawText.length,
      warningCount: warnings.length,
    },
    timestamp: new Date().toISOString(),
  })
  pushLog({
    kind: 'system',
    module: '文件抽取',
    event: '处理完成',
    payload: { elapsedMs, sourceType },
    timestamp: new Date().toISOString(),
  })

  return result
}

async function extractFromFile(params) {
  const { file, suffix, pushLog } = params

  pushLog({
    kind: 'system',
    module: '文件抽取',
    event: '开始处理文件',
    payload: {
      fileName: file.name,
      suffix,
      size: file.size,
    },
    timestamp: new Date().toISOString(),
  })

  if (TEXT_SUFFIX.has(suffix)) {
    const raw = await file.text()
    const cleaned = suffix === 'md' ? stripMarkdown(raw) : raw
    return { text: normalizeText(cleaned), sourceType: suffix === 'csv' ? 'csv' : 'text', warnings: [] }
  }

  if (suffix === 'pdf') {
    const text = await extractPdfText(file)
    const warnings = text ? [] : ['PDF 未抽取到足够文本，可能是扫描件，建议补充粘贴正文。']
    return { text: normalizeText(text), sourceType: 'pdf', warnings }
  }

  if (suffix === 'docx') {
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const warnings = filterDocxWarnings(result.messages.map((item) => item.message))
    return { text: normalizeText(result.value), sourceType: 'docx', warnings }
  }

  if (suffix === 'doc') {
    return {
      text: '',
      sourceType: 'doc',
      warnings: ['浏览器端暂不支持 .doc 旧格式直读，建议先转成 .docx 再上传。'],
    }
  }

  throw new Error('目前支持 PDF、DOCX、DOC、TXT、MD、CSV 文件。')
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  const pageTexts = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const line = content.items
      .map((item) => {
        if ('str' in item && typeof item.str === 'string') {
          return item.str
        }
        return ''
      })
      .join(' ')
    pageTexts.push(line)
  }

  return pageTexts.join('\n')
}

function getSuffix(fileName) {
  const bits = fileName.toLowerCase().split('.')
  return bits.length > 1 ? bits[bits.length - 1] : ''
}

function normalizeText(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, index, arr) => {
      if (line) {
        return true
      }
      return index > 0 && arr[index - 1] !== ''
    })
    .join('\n')
    .trim()
}

function stripMarkdown(value) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^(\s*[-*+]\s+)/gm, '• ')
    .replace(/^(\s*\d+[.)]\s+)/gm, '• ')
}

function filterDocxWarnings(messages) {
  const benignPatterns = [
    /^An unrecognised element was ignored:/i,
    /^A v:imagedata element without a relationship ID was ignored$/i,
  ]

  return messages.filter((message) => !benignPatterns.some((pattern) => pattern.test(message)))
}
