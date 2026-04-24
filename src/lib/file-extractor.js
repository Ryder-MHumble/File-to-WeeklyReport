const TEXT_SUFFIX = new Set(['txt', 'md', 'csv'])
let mammothModulePromise = null
let pdfRuntimePromise = null

export async function extractSourceText(params) {
  const startedAt = performance.now()
  const { file, files, text, maxChars, pushLog } = params
  const normalizedFiles = Array.isArray(files)
    ? files.filter(Boolean)
    : file
      ? [file]
      : []

  if (normalizedFiles.length === 0 && !text.trim()) {
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
      fileCount: normalizedFiles.length,
      fileNames: normalizedFiles.map((item) => item.name),
      manualTextLength: text.trim().length,
      maxChars,
    },
    timestamp: new Date().toISOString(),
  })

  for (let index = 0; index < normalizedFiles.length; index += 1) {
    const currentFile = normalizedFiles[index]
    const suffix = getSuffix(currentFile.name)
    const fileResult = await extractFromFile({
      file: currentFile,
      suffix,
      pushLog,
      fileIndex: index,
      fileCount: normalizedFiles.length,
    })
    if (fileResult.text) {
      parts.push(buildFileChunkLabel(currentFile.name, index, normalizedFiles.length, fileResult.text))
    }
    warnings.push(...fileResult.warnings)
    sourceTypes.push(fileResult.sourceType)
  }

  if (text.trim()) {
    parts.push(buildManualChunkLabel(text))
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
    fileNames: normalizedFiles.map((item) => item.name),
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
  const { file, suffix, pushLog, fileIndex = 0, fileCount = 1 } = params

  pushLog({
    kind: 'system',
    module: '文件抽取',
    event: '开始处理文件',
    payload: {
      fileName: file.name,
      fileIndex: fileIndex + 1,
      fileCount,
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
    const text = await extractPdfText(file, pushLog)
    const warnings = text ? [] : ['PDF 未抽取到足够文本，可能是扫描件，建议补充粘贴正文。']
    return { text: normalizeText(text), sourceType: 'pdf', warnings }
  }

  if (suffix === 'docx') {
    const mammoth = await loadMammothModule(pushLog)
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const warningMessages = result.messages.map((item) => item.message)
    let bestText = normalizeText(result.value)
    let htmlFallbackUsed = false

    if (bestText.length < 1200) {
      try {
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer })
        warningMessages.push(...htmlResult.messages.map((item) => item.message))
        const htmlText = normalizeText(stripDocxHtml(htmlResult.value))

        if (htmlText.length > bestText.length + 120) {
          bestText = htmlText
          htmlFallbackUsed = true
        }
      } catch {
        // HTML 二次抽取失败时保持主抽取链路可用
      }
    }

    const warnings = filterDocxWarnings(warningMessages)
    if (htmlFallbackUsed) {
      warnings.push('DOCX 已启用二次抽取（含表格/段落增强），用于提升结构化质量。')
      pushLog({
        kind: 'system',
        module: '文件抽取',
        event: 'DOCX 启用二次抽取',
        payload: {
          primaryLength: normalizeText(result.value).length,
          enhancedLength: bestText.length,
        },
        timestamp: new Date().toISOString(),
      })
    }

    return { text: bestText, sourceType: 'docx', warnings }
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

async function extractPdfText(file, pushLog) {
  const { getDocument } = await loadPdfRuntime(pushLog)
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

async function loadMammothModule(pushLog) {
  if (!mammothModulePromise) {
    pushLog({
      kind: 'system',
      module: '文件抽取',
      event: '按需加载DOCX解析模块',
      payload: {},
      timestamp: new Date().toISOString(),
    })
    mammothModulePromise = import('mammoth/mammoth.browser').then((module) => module.default)
  }
  return mammothModulePromise
}

async function loadPdfRuntime(pushLog) {
  if (!pdfRuntimePromise) {
    pushLog?.({
      kind: 'system',
      module: '文件抽取',
      event: '按需加载PDF解析模块',
      payload: {},
      timestamp: new Date().toISOString(),
    })
    pdfRuntimePromise = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
      ([pdfjsModule, workerModule]) => {
        const workerSrc = workerModule.default
        if (pdfjsModule.GlobalWorkerOptions.workerSrc !== workerSrc) {
          pdfjsModule.GlobalWorkerOptions.workerSrc = workerSrc
        }
        return {
          getDocument: pdfjsModule.getDocument,
        }
      },
    )
  }
  return pdfRuntimePromise
}

function getSuffix(fileName) {
  const bits = fileName.toLowerCase().split('.')
  return bits.length > 1 ? bits[bits.length - 1] : ''
}

function buildFileChunkLabel(fileName, index, totalCount, text) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return ''
  }
  return [`【文档 ${index + 1}/${totalCount}｜${fileName}】`, normalized].join('\n')
}

function buildManualChunkLabel(text) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return ''
  }
  return ['【补充正文】', normalized].join('\n')
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

function stripDocxHtml(value) {
  return String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|table|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}
