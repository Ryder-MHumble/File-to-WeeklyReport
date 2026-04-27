import crypto from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants as zlibConstants, createBrotliCompress, createGzip, gzipSync } from 'node:zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const reportsRoot = path.join(projectRoot, 'data', 'reports')
const reportIndexPath = path.join(reportsRoot, 'index.json')
const usageRoot = path.join(projectRoot, 'data', 'usage')
const usageLogPath = path.join(usageRoot, 'openrouter-usage.ndjson')

hydrateEnvFromDotEnv(path.join(projectRoot, '.env'))

const serverHost = process.env.REPORT_SERVER_HOST || '0.0.0.0'
const serverPort = Number(process.env.REPORT_SERVER_PORT || 5173)
const publishBodyLimitBytes = Number(process.env.REPORT_BODY_LIMIT_BYTES || 6 * 1024 * 1024)
const publicShareBaseUrl = normalizeBaseUrl(process.env.PUBLIC_SHARE_BASE_URL || '')
const reportRetentionDays = parseNonNegativeInt(process.env.REPORT_RETENTION_DAYS, 30)
const reportMaxCount = parseNonNegativeInt(process.env.REPORT_MAX_COUNT, 500)
const reportCleanupOnStartup = parseBooleanFlag(process.env.REPORT_CLEANUP_ON_STARTUP, true)
const reportCleanupOnPublish = parseBooleanFlag(process.env.REPORT_CLEANUP_ON_PUBLISH, true)
const usageRetentionDays = parseNonNegativeInt(process.env.USAGE_RETENTION_DAYS, 90)
const usageMaxRecords = parseNonNegativeInt(process.env.USAGE_MAX_RECORDS, 20000)
const usageAutoCleanupOnWrite = parseBooleanFlag(process.env.USAGE_CLEANUP_ON_WRITE, true)
const openrouterProxyEnabled = parseBooleanFlag(process.env.OPENROUTER_PROXY_ENABLED, true)
const openrouterProxyBodyLimitBytes = parseNonNegativeInt(
  process.env.OPENROUTER_PROXY_BODY_LIMIT_BYTES,
  2 * 1024 * 1024,
)
const openrouterProxyBaseUrl = normalizeBaseUrl(
  process.env.OPENROUTER_BASE_URL || process.env.MINIMAX_BASE_URL || 'https://openrouter.ai/api/v1',
)
const openrouterProxyApiKey = String(process.env.OPENROUTER_API_KEY || process.env.MINIMAX_API_KEY || '').trim()
const siliconflowProxyBaseUrl = normalizeBaseUrl(process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1')
const siliconflowProxyApiKey = String(process.env.SILICONFLOW_API_KEY || '').trim()
const siliconflowProxyModel = String(process.env.SILICONFLOW_MODEL || 'Pro/moonshotai/Kimi-K2.6').trim()
const openrouterModelPricing = parseModelPricingMap(
  process.env.OPENROUTER_MODEL_PRICING_JSON || process.env.MINIMAX_MODEL_PRICING_JSON || '',
)
let modelProviderSwitch = {
  dayKey: '',
  preferredProvider: 'openrouter',
}
let reportCleanupTask = null
let usageCleanupTask = null
let usageRecordsCache = []
let usageRecordsReady = false
let usageRealtimeVersion = 0
let usageStreamClientSeq = 0
const usageStreamClients = new Map()

function hydrateEnvFromDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  try {
    const raw = readFileSync(filePath, 'utf-8')
    const lines = raw.split(/\r?\n/)
    for (const line of lines) {
      const text = String(line || '').trim()
      if (!text || text.startsWith('#')) {
        continue
      }
      const index = text.indexOf('=')
      if (index <= 0) {
        continue
      }
      const key = text.slice(0, index).trim()
      if (!key || process.env[key] !== undefined) {
        continue
      }
      let value = text.slice(index + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  } catch (error) {
    printSystemLog('服务启动', '读取 .env 失败', { message: error.message }, true)
  }
}

function createEmptyReportIndex() {
  return {
    version: 1,
    updatedAt: '',
    reports: {},
  }
}

function printSystemLog(module, event, payload = {}, isError = false) {
  const content = JSON.stringify(payload)
  const line = `系统日志 | 模块=${module} | 事件=${event} | 内容=${content}`
  if (isError) {
    console.error(line)
    return
  }
  console.info(line)
}

function printBusinessJson(module, event, payload = {}) {
  const content = JSON.stringify(payload)
  console.info(`业务JSON | 模块=${module} | 事件=${event} | 内容=${content}`)
}

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) {
    return ''
  }
  return value.replace(/\/+$/, '')
}

function parseNonNegativeInt(raw, fallback) {
  const value = Number.parseInt(String(raw ?? '').trim(), 10)
  if (!Number.isFinite(value) || value < 0) {
    return fallback
  }
  return value
}

function parseBooleanFlag(raw, fallback) {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value) {
    return fallback
  }
  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false
  }
  return fallback
}

function parsePositiveNumber(raw, fallback = 0) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return fallback
  }
  return value
}

function parseModelPricingMap(raw) {
  const text = String(raw || '').trim()
  if (!text) {
    return {}
  }

  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    const output = {}
    for (const [modelKey, config] of Object.entries(parsed)) {
      if (!modelKey || !config || typeof config !== 'object') {
        continue
      }
      const inputPer1M = parsePositiveNumber(
        config.inputPer1M ?? config.input ?? config.promptPer1M ?? config.prompt ?? config.in ?? 0,
      )
      const outputPer1M = parsePositiveNumber(
        config.outputPer1M ?? config.output ?? config.completionPer1M ?? config.completion ?? config.out ?? 0,
      )
      if (inputPer1M <= 0 && outputPer1M <= 0) {
        continue
      }
      output[String(modelKey).trim().toLowerCase()] = { inputPer1M, outputPer1M }
    }
    return output
  } catch {
    return {}
  }
}

function applyCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function writeJson(res, statusCode, payload) {
  const output = JSON.stringify(payload)
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(output)
}

function writeHtml(res, statusCode, html) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(html)
}

function writeHtmlWithCompression(req, res, statusCode, html, cacheControl = 'no-cache') {
  const contentType = 'text/html; charset=utf-8'
  const source = Buffer.from(String(html || ''), 'utf-8')
  const encoding = resolveCompressionEncoding(req, contentType)
  let payload = source

  if (source.length >= 1024) {
    if (encoding === 'br') {
      payload = brotliCompressSync(source, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 5,
        },
      })
    } else if (encoding === 'gzip') {
      payload = gzipSync(source, { level: 6 })
    }
  }

  res.statusCode = statusCode
  res.setHeader('Content-Type', contentType)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', cacheControl)
  res.setHeader('Vary', 'Accept-Encoding')
  if (payload !== source && encoding) {
    res.setHeader('Content-Encoding', encoding)
  }

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  res.end(payload)
}

function buildErrorPage(title, message) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 24px; background: #f3f5f8; color: #1f2937; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
    .wrap { max-width: 720px; margin: 80px auto; background: #fff; border: 1px solid #dce3ec; border-radius: 12px; padding: 24px; }
    h1 { margin-top: 0; font-size: 22px; }
    p { line-height: 1.7; }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`
}

function createReportId() {
  const prefix = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString('base64url')
  return `rpt_${prefix}_${random}`
}

function sanitizeShareHtml(rawHtml) {
  let html = String(rawHtml || '')
  html = html.replace(/<script\b[^>]*\bsrc\s*=\s*(['"])[^'"]+\1[^>]*>\s*<\/script>/gi, '')
  html = html.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"')
  html = html.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
  html = stripRemoteFontImports(html)
  return html
}

function stripRemoteFontImports(html) {
  return String(html || '')
    .replace(/@import\s+url\((['"])https:\/\/fonts\.googleapis\.com[^;]+;\s*/gi, '')
    .replace(/<link\b[^>]*href=(['"])https:\/\/fonts\.(?:googleapis|gstatic)\.com[^'"]*\1[^>]*>/gi, '')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildShareUrl(req, reportId) {
  if (publicShareBaseUrl) {
    return `${publicShareBaseUrl}/r/${reportId}`
  }

  const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim()
  const forwardedHost = (req.headers['x-forwarded-host'] || '').toString().split(',')[0].trim()
  const protocol = forwardedProto || 'http'
  const host = forwardedHost || req.headers.host || `127.0.0.1:${serverPort}`
  return `${protocol}://${host}/r/${reportId}`
}

async function ensureReportDirectories() {
  await fs.mkdir(reportsRoot, { recursive: true })
  if (!existsSync(reportIndexPath)) {
    await fs.writeFile(reportIndexPath, JSON.stringify(createEmptyReportIndex(), null, 2), 'utf-8')
  }
}

async function loadReportIndex() {
  try {
    const raw = await fs.readFile(reportIndexPath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return createEmptyReportIndex()
    }
    if (!parsed.reports || typeof parsed.reports !== 'object') {
      parsed.reports = {}
    }
    return parsed
  } catch (error) {
    printSystemLog('报告存储', '读取索引失败，回退空索引', { message: error.message }, true)
    return createEmptyReportIndex()
  }
}

async function saveReportIndex(indexPayload) {
  const next = {
    ...createEmptyReportIndex(),
    ...indexPayload,
    updatedAt: new Date().toISOString(),
  }
  const tmpPath = `${reportIndexPath}.tmp`
  await fs.writeFile(tmpPath, JSON.stringify(next, null, 2), 'utf-8')
  await fs.rename(tmpPath, reportIndexPath)
}

function resolveReportFilePath(relativePath) {
  const value = String(relativePath || '').trim()
  if (!value) {
    return null
  }
  const absolute = path.resolve(reportsRoot, value)
  const baseRoot = `${path.resolve(reportsRoot)}${path.sep}`
  if (!absolute.startsWith(baseRoot)) {
    return null
  }
  return absolute
}

function getMetaCreatedAtMs(meta) {
  const ts = Date.parse(String(meta?.createdAt || ''))
  if (!Number.isFinite(ts)) {
    return 0
  }
  return ts
}

function shouldExpireByRetention(meta, nowMs) {
  if (reportRetentionDays <= 0) {
    return false
  }
  const createdAtMs = getMetaCreatedAtMs(meta)
  if (createdAtMs <= 0) {
    return false
  }
  return nowMs - createdAtMs > reportRetentionDays * 24 * 60 * 60 * 1000
}

async function tryRemoveFile(filePath, summary) {
  if (!filePath || !existsSync(filePath)) {
    return
  }
  try {
    await fs.rm(filePath, { force: true })
    summary.deletedFiles += 1
  } catch (error) {
    summary.failedFiles += 1
    printSystemLog('报告清理', '删除文件失败', { filePath, message: error.message }, true)
  }
}

async function tryRemoveEmptyDir(dirPath, summary) {
  if (!dirPath || !existsSync(dirPath) || dirPath === reportsRoot) {
    return
  }
  try {
    const items = await fs.readdir(dirPath)
    if (items.length === 0) {
      await fs.rmdir(dirPath)
      summary.deletedDirs += 1
    }
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTEMPTY') {
      return
    }
    summary.failedDirs += 1
    printSystemLog('报告清理', '删除空目录失败', { dirPath, message: error.message }, true)
  }
}

async function cleanupReportsInternal(reason) {
  const startedAt = Date.now()
  const nowMs = Date.now()
  const indexPayload = await loadReportIndex()
  const entries = Object.entries(indexPayload.reports || {}).map(([id, meta]) => ({
    id,
    meta: meta || {},
  }))

  const summary = {
    reason,
    retentionDays: reportRetentionDays,
    maxCount: reportMaxCount,
    totalBefore: entries.length,
    totalAfter: entries.length,
    expiredByDays: 0,
    trimmedByCount: 0,
    deletedFiles: 0,
    deletedDirs: 0,
    failedFiles: 0,
    failedDirs: 0,
    invalidPathRecords: 0,
    durationMs: 0,
  }

  if (entries.length === 0) {
    summary.durationMs = Date.now() - startedAt
    printBusinessJson('报告清理', '输出', summary)
    printSystemLog('报告清理', '无需清理', summary)
    return summary
  }

  entries.sort((a, b) => {
    const diff = getMetaCreatedAtMs(b.meta) - getMetaCreatedAtMs(a.meta)
    if (diff !== 0) {
      return diff
    }
    return String(b.id).localeCompare(String(a.id))
  })

  const removeList = []
  let keepCounter = 0
  for (const entry of entries) {
    const expiredByDays = shouldExpireByRetention(entry.meta, nowMs)
    const trimmedByCount = reportMaxCount > 0 && keepCounter >= reportMaxCount

    if (expiredByDays || trimmedByCount) {
      if (expiredByDays) {
        summary.expiredByDays += 1
      }
      if (trimmedByCount) {
        summary.trimmedByCount += 1
      }
      removeList.push(entry)
      continue
    }
    keepCounter += 1
  }

  if (removeList.length === 0) {
    summary.durationMs = Date.now() - startedAt
    printBusinessJson('报告清理', '输出', summary)
    printSystemLog('报告清理', '无需清理', summary)
    return summary
  }

  const dayDirs = new Set()
  for (const entry of removeList) {
    delete indexPayload.reports[entry.id]

    const htmlPath = resolveReportFilePath(entry.meta.fileRelativePath)
    if (!htmlPath) {
      summary.invalidPathRecords += 1
      continue
    }

    const dayDir = path.dirname(htmlPath)
    dayDirs.add(dayDir)
    await tryRemoveFile(htmlPath, summary)
    await tryRemoveFile(path.join(dayDir, `${entry.id}.json`), summary)
  }

  await saveReportIndex(indexPayload)
  summary.totalAfter = Object.keys(indexPayload.reports || {}).length

  for (const dayDir of dayDirs) {
    await tryRemoveEmptyDir(dayDir, summary)
  }

  summary.durationMs = Date.now() - startedAt
  printBusinessJson('报告清理', '输出', summary)
  printSystemLog('报告清理', '清理完成', summary)
  return summary
}

async function runReportCleanup(reason) {
  if (reportCleanupTask) {
    printSystemLog('报告清理', '复用进行中的任务', { reason })
    return reportCleanupTask
  }

  reportCleanupTask = cleanupReportsInternal(reason)
    .catch((error) => {
      printSystemLog('报告清理', '清理失败', { reason, message: error.message }, true)
      return null
    })
    .finally(() => {
      reportCleanupTask = null
    })

  return reportCleanupTask
}

async function ensureUsageStorage() {
  await fs.mkdir(usageRoot, { recursive: true })
  if (!existsSync(usageLogPath)) {
    await fs.writeFile(usageLogPath, '', 'utf-8')
  }
}

function normalizeUsageRecord(item) {
  if (!item || typeof item !== 'object') {
    return null
  }
  const ts = Number(item.ts || Date.parse(String(item.createdAt || '')))
  if (!Number.isFinite(ts) || ts <= 0) {
    return null
  }
  const createdAt = item.createdAt || new Date(ts).toISOString()
  return {
    ...item,
    ts,
    createdAt,
  }
}

function parseUsageLogContent(raw) {
  if (!String(raw || '').trim()) {
    return []
  }
  const lines = String(raw || '').split('\n')
  const records = []
  for (const line of lines) {
    const text = line.trim()
    if (!text) {
      continue
    }
    try {
      const normalized = normalizeUsageRecord(JSON.parse(text))
      if (normalized) {
        records.push(normalized)
      }
    } catch {
      // 跳过损坏行，保持服务可用
    }
  }
  return records
}

async function loadUsageRecordsFromDisk() {
  try {
    if (!existsSync(usageLogPath)) {
      return []
    }
    const raw = await fs.readFile(usageLogPath, 'utf-8')
    return parseUsageLogContent(raw).sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0))
  } catch (error) {
    printSystemLog('用量监控', '读取记录失败', { message: error.message }, true)
    return []
  }
}

async function loadUsageRecords(forceReload = false) {
  if (!forceReload && usageRecordsReady) {
    return usageRecordsCache
  }
  const records = await loadUsageRecordsFromDisk()
  usageRecordsCache = records
  usageRecordsReady = true
  printBusinessJson('用量监控', '缓存同步', {
    reason: forceReload ? 'force-reload' : 'load',
    records: usageRecordsCache.length,
    version: usageRealtimeVersion,
  })
  return usageRecordsCache
}

async function overwriteUsageRecords(records) {
  const normalized = records
    .map((item) => normalizeUsageRecord(item))
    .filter(Boolean)
    .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0))
  const lines = normalized.map((item) => JSON.stringify(item)).join('\n')
  await fs.writeFile(usageLogPath, lines ? `${lines}\n` : '', 'utf-8')
  usageRecordsCache = normalized
  usageRecordsReady = true
  usageRealtimeVersion += 1
  if (usageStreamClients.size > 0) {
    void broadcastUsageRealtimeUpdate('overwrite')
  }
}

async function appendUsageRecord(record) {
  const normalized = normalizeUsageRecord(record)
  if (!normalized) {
    printSystemLog('用量监控', '写入被拒绝', { reason: 'invalid-record' }, true)
    return null
  }
  try {
    await ensureUsageStorage()
    await fs.appendFile(usageLogPath, `${JSON.stringify(normalized)}\n`, 'utf-8')
    if (!usageRecordsReady) {
      await loadUsageRecords()
    }
    usageRecordsCache.push(normalized)
    usageRealtimeVersion += 1
    if (usageStreamClients.size > 0) {
      void broadcastUsageRealtimeUpdate('append', normalized.id)
    }
    return normalized
  } catch (error) {
    printSystemLog('用量监控', '写入记录失败', { message: error.message }, true)
    return null
  }
}

async function cleanupUsageRecordsInternal(reason) {
  const startedAt = Date.now()
  const nowMs = Date.now()
  const source = await loadUsageRecords()
  const summary = {
    reason,
    retentionDays: usageRetentionDays,
    maxRecords: usageMaxRecords,
    totalBefore: source.length,
    totalAfter: source.length,
    expiredByDays: 0,
    trimmedByCount: 0,
    durationMs: 0,
  }

  if (source.length === 0) {
    summary.durationMs = Date.now() - startedAt
    printBusinessJson('用量监控', '清理输出', summary)
    return summary
  }

  const ordered = source
    .slice()
    .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0))
    .filter((item) => {
      if (usageRetentionDays <= 0) {
        return true
      }
      const ts = Number(item.ts || 0)
      if (!Number.isFinite(ts) || ts <= 0) {
        summary.expiredByDays += 1
        return false
      }
      const expired = nowMs - ts > usageRetentionDays * 24 * 60 * 60 * 1000
      if (expired) {
        summary.expiredByDays += 1
      }
      return !expired
    })

  let kept = ordered
  if (usageMaxRecords > 0 && ordered.length > usageMaxRecords) {
    summary.trimmedByCount = ordered.length - usageMaxRecords
    kept = ordered.slice(-usageMaxRecords)
  }

  summary.totalAfter = kept.length
  summary.durationMs = Date.now() - startedAt

  if (summary.totalAfter !== summary.totalBefore) {
    await overwriteUsageRecords(kept)
  }

  printBusinessJson('用量监控', '清理输出', summary)
  printSystemLog('用量监控', '清理完成', summary)
  return summary
}

async function runUsageCleanup(reason) {
  if (usageCleanupTask) {
    return usageCleanupTask
  }
  usageCleanupTask = cleanupUsageRecordsInternal(reason)
    .catch((error) => {
      printSystemLog('用量监控', '清理失败', { reason, message: error.message }, true)
      return null
    })
    .finally(() => {
      usageCleanupTask = null
    })
  return usageCleanupTask
}

function parseTimeRange(searchParams) {
  const nowMs = Date.now()
  const periodRaw = String(searchParams.get('period') || '24h').trim().toLowerCase()
  const periodMap = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  }

  const fromRaw = searchParams.get('from')
  const toRaw = searchParams.get('to')
  const fromMs = fromRaw ? Date.parse(fromRaw) : Number.NaN
  const toMs = toRaw ? Date.parse(toRaw) : Number.NaN

  if (Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs <= toMs) {
    return {
      fromMs,
      toMs,
      period: 'custom',
    }
  }

  const duration = periodMap[periodRaw] || periodMap['24h']
  return {
    fromMs: nowMs - duration,
    toMs: nowMs,
    period: periodMap[periodRaw] ? periodRaw : '24h',
  }
}

function summarizeUsageRecords(records) {
  const summary = {
    requests: records.length,
    successRequests: 0,
    failedRequests: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    models: {},
  }
  const durationSamples = []

  for (const item of records) {
    const status = Number(item.statusCode || 0)
    if (status >= 200 && status < 400 && !item.error) {
      summary.successRequests += 1
    } else {
      summary.failedRequests += 1
    }

    const promptTokens = parsePositiveNumber(item.promptTokens, 0)
    const completionTokens = parsePositiveNumber(item.completionTokens, 0)
    const totalTokens =
      parsePositiveNumber(item.totalTokens, 0) || Math.max(0, Math.round(promptTokens + completionTokens))
    const costUsd = parsePositiveNumber(item.costUsd, 0)
    const durationMs = parsePositiveNumber(item.durationMs, 0)
    const model = String(item.model || 'unknown')

    summary.promptTokens += promptTokens
    summary.completionTokens += completionTokens
    summary.totalTokens += totalTokens
    summary.totalCostUsd += costUsd
    if (durationMs > 0) {
      durationSamples.push(durationMs)
    }

    if (!summary.models[model]) {
      summary.models[model] = {
        model,
        requests: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      }
    }
    summary.models[model].requests += 1
    summary.models[model].totalTokens += totalTokens
    summary.models[model].totalCostUsd += costUsd
  }

  const modelList = Object.values(summary.models).sort((a, b) => {
    const diffByCost = b.totalCostUsd - a.totalCostUsd
    if (Math.abs(diffByCost) > 1e-9) {
      return diffByCost
    }
    return b.requests - a.requests
  })
  const sortedDurationSamples = durationSamples.slice().sort((a, b) => a - b)
  const p95Index = sortedDurationSamples.length > 0 ? Math.min(sortedDurationSamples.length - 1, Math.floor(sortedDurationSamples.length * 0.95)) : -1
  const avgDurationMs =
    durationSamples.length > 0 ? Number((durationSamples.reduce((sum, value) => sum + value, 0) / durationSamples.length).toFixed(2)) : 0
  const p95DurationMs = p95Index >= 0 ? Number(sortedDurationSamples[p95Index].toFixed(2)) : 0
  const successRate = summary.requests > 0 ? Number(((summary.successRequests / summary.requests) * 100).toFixed(2)) : 0

  return {
    ...summary,
    models: modelList,
    totalCostUsd: Number(summary.totalCostUsd.toFixed(6)),
    avgDurationMs,
    p95DurationMs,
    successRate,
  }
}

function parseUsageLimit(searchParams, fallback = 200) {
  return Math.max(1, Math.min(1000, parseNonNegativeInt(searchParams.get('limit'), fallback)))
}

function parseUsageOffset(searchParams) {
  return Math.max(0, parseNonNegativeInt(searchParams.get('offset'), 0))
}

function toUsageRecordRow(item) {
  return {
    id: item.id,
    createdAt: item.createdAt,
    model: item.model || 'unknown',
    statusCode: item.statusCode,
    durationMs: item.durationMs,
    promptTokens: item.promptTokens || 0,
    completionTokens: item.completionTokens || 0,
    totalTokens: item.totalTokens || 0,
    costUsd: Number(parsePositiveNumber(item.costUsd, 0).toFixed(6)),
    costSource: item.costSource || 'unavailable',
    finishReason: item.finishReason || '',
    error: item.error || '',
  }
}

function buildUsageWindowSummary(records, durationMs, nowMs) {
  const fromMs = nowMs - durationMs
  const scoped = records.filter((item) => item.ts >= fromMs && item.ts <= nowMs)
  const summary = summarizeUsageRecords(scoped)
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(nowMs).toISOString(),
    requests: summary.requests,
    totalTokens: summary.totalTokens,
    totalCostUsd: summary.totalCostUsd,
    successRate: summary.successRate,
  }
}

function buildUsageSnapshotPayload(records, searchParams) {
  const range = parseTimeRange(searchParams)
  const limit = parseUsageLimit(searchParams, 300)
  const offset = parseUsageOffset(searchParams)
  const scoped = records
    .filter((item) => item.ts >= range.fromMs && item.ts <= range.toMs)
    .sort((a, b) => b.ts - a.ts)
  const summary = summarizeUsageRecords(scoped)
  const nowMs = Date.now()

  return {
    range: {
      from: new Date(range.fromMs).toISOString(),
      to: new Date(range.toMs).toISOString(),
      period: range.period,
    },
    summary,
    total: scoped.length,
    offset,
    limit,
    records: scoped.slice(offset, offset + limit).map(toUsageRecordRow),
    realtime: {
      version: usageRealtimeVersion,
      serverTime: new Date(nowMs).toISOString(),
      streamClients: usageStreamClients.size,
      window1m: buildUsageWindowSummary(records, 60 * 1000, nowMs),
      window5m: buildUsageWindowSummary(records, 5 * 60 * 1000, nowMs),
    },
  }
}

async function buildUsageSnapshot(searchParams) {
  const source = await loadUsageRecords()
  return buildUsageSnapshotPayload(source, searchParams)
}

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

async function pushUsageSnapshotToClient(client, reason, lastRecordId = '') {
  try {
    const params = new URLSearchParams(client.query)
    const snapshot = await buildUsageSnapshot(params)
    writeSseEvent(client.res, 'snapshot', {
      ...snapshot,
      event: reason,
      lastRecordId,
    })
  } catch (error) {
    printSystemLog('用量监控', '推送失败', { clientId: client.id, message: error.message }, true)
    closeUsageStreamClient(client.id, 'push-failed')
  }
}

function closeUsageStreamClient(clientId, reason) {
  const client = usageStreamClients.get(clientId)
  if (!client) {
    return
  }
  clearInterval(client.pingTimer)
  try {
    client.res.end()
  } catch {
    // 忽略连接已关闭异常
  }
  usageStreamClients.delete(clientId)
  printSystemLog('用量监控', '实时订阅关闭', {
    clientId,
    reason,
    activeClients: usageStreamClients.size,
  })
}

async function broadcastUsageRealtimeUpdate(reason, lastRecordId = '') {
  if (usageStreamClients.size === 0) {
    return
  }
  const clients = Array.from(usageStreamClients.values())
  await Promise.all(clients.map((client) => pushUsageSnapshotToClient(client, reason, lastRecordId)))
  printBusinessJson('用量监控', '实时推送', {
    reason,
    lastRecordId,
    version: usageRealtimeVersion,
    activeClients: usageStreamClients.size,
  })
}

async function readJsonBody(req, limitBytes = publishBodyLimitBytes) {
  return new Promise((resolve, reject) => {
    let totalBytes = 0
    const chunks = []

    req.on('data', (chunk) => {
      totalBytes += chunk.length
      if (totalBytes > limitBytes) {
        reject(new Error(`请求体超过限制(${limitBytes} bytes)`))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf-8')
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(new Error(`JSON 解析失败: ${error.message}`))
      }
    })

    req.on('error', (error) => {
      reject(error)
    })
  })
}

function contentTypeByExt(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.map') return 'application/json; charset=utf-8'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.ico') return 'image/x-icon'
  if (ext === '.txt') return 'text/plain; charset=utf-8'
  if (ext === '.woff2') return 'font/woff2'
  return 'application/octet-stream'
}

function isCompressibleContentType(contentType) {
  return (
    contentType.startsWith('text/') ||
    contentType.includes('javascript') ||
    contentType.includes('json') ||
    contentType.includes('xml') ||
    contentType.includes('svg')
  )
}

function resolveCompressionEncoding(req, contentType) {
  if (!isCompressibleContentType(contentType)) {
    return ''
  }

  const accepted = String(req.headers['accept-encoding'] || '')
  if (accepted.includes('br')) {
    return 'br'
  }
  if (accepted.includes('gzip')) {
    return 'gzip'
  }
  return ''
}

function resolveDistPath(requestPathname) {
  const decoded = decodeURIComponent(requestPathname)
  const cleaned = decoded.replace(/^\/+/, '')
  const absolute = path.resolve(distDir, cleaned)
  const distRoot = `${path.resolve(distDir)}${path.sep}`
  if (absolute !== path.resolve(distDir) && !absolute.startsWith(distRoot)) {
    return null
  }
  return absolute
}

async function serveStatic(req, res, pathname) {
  if (!existsSync(distDir)) {
    writeJson(res, 503, {
      code: 'DIST_NOT_FOUND',
      message: '前端构建目录不存在，请先执行 npm run build',
    })
    return
  }

  const requestPath = pathname === '/' ? '/index.html' : pathname
  const maybeFilePath = resolveDistPath(requestPath)
  if (maybeFilePath) {
    try {
      const stat = await fs.stat(maybeFilePath)
      if (stat.isFile()) {
        const contentType = contentTypeByExt(maybeFilePath)
        const encoding = resolveCompressionEncoding(req, contentType)
        res.statusCode = 200
        res.setHeader('Content-Type', contentType)
        res.setHeader('Cache-Control', requestPath.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
        res.setHeader('Vary', 'Accept-Encoding')
        if (encoding) {
          res.setHeader('Content-Encoding', encoding)
        }
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        const fileStream = createReadStream(maybeFilePath)
        fileStream.on('error', () => {
          if (!res.headersSent) {
            writeJson(res, 500, { code: 'STATIC_STREAM_ERROR', message: '静态资源读取失败' })
          } else {
            res.destroy()
          }
        })

        if (encoding === 'br') {
          fileStream
            .pipe(
              createBrotliCompress({
                params: {
                  [zlibConstants.BROTLI_PARAM_QUALITY]: 5,
                },
              }),
            )
            .pipe(res)
          return
        }

        if (encoding === 'gzip') {
          fileStream.pipe(createGzip({ level: 6 })).pipe(res)
          return
        }

        fileStream.pipe(res)
        return
      }
    } catch {
      // 继续走 SPA fallback
    }
  }

  if (path.extname(pathname)) {
    writeJson(res, 404, { code: 'STATIC_NOT_FOUND', message: '静态资源不存在' })
    return
  }

  const fallbackPath = path.join(distDir, 'index.html')
  try {
    const html = await fs.readFile(fallbackPath, 'utf-8')
    writeHtml(res, 200, html)
  } catch {
    writeJson(res, 500, { code: 'INDEX_NOT_FOUND', message: 'index.html 不存在，请重新构建前端' })
  }
}

async function handlePublishReport(req, res) {
  applyCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const rawHtml = String(body.html || '')
    const title = String(body.title || '未命名周报').trim() || '未命名周报'
    const generationMode = String(body.generationMode || 'unknown')
    const templateId = String(body.templateId || '')

    printSystemLog('报告发布', '开始发布', {
      title,
      generationMode,
      templateId,
      inputBytes: Buffer.byteLength(rawHtml, 'utf-8'),
    })

    if (!rawHtml.trim()) {
      writeJson(res, 400, { code: 'EMPTY_HTML', message: 'html 内容不能为空' })
      return
    }

    const sanitizedHtml = sanitizeShareHtml(rawHtml)
    const reportId = createReportId()
    const dayKey = new Date().toISOString().slice(0, 10)
    const dayDir = path.join(reportsRoot, dayKey)
    const htmlFileName = `${reportId}.html`
    const metaFileName = `${reportId}.json`
    const htmlFilePath = path.join(dayDir, htmlFileName)
    const metaFilePath = path.join(dayDir, metaFileName)

    await fs.mkdir(dayDir, { recursive: true })
    await fs.writeFile(htmlFilePath, sanitizedHtml, 'utf-8')

    const createdAt = new Date().toISOString()
    const relativeHtmlPath = path.join(dayKey, htmlFileName)
    const metaPayload = {
      id: reportId,
      title,
      generationMode,
      templateId,
      createdAt,
      generatedAt: String(body.generatedAt || ''),
      sourceType: String(body.sourceType || ''),
      fileRelativePath: relativeHtmlPath,
      contentBytes: Buffer.byteLength(sanitizedHtml, 'utf-8'),
    }
    await fs.writeFile(metaFilePath, JSON.stringify(metaPayload, null, 2), 'utf-8')

    const indexPayload = await loadReportIndex()
    indexPayload.reports[reportId] = metaPayload
    await saveReportIndex(indexPayload)

    if (reportCleanupOnPublish) {
      void runReportCleanup('publish')
    }

    const shareUrl = buildShareUrl(req, reportId)
    printBusinessJson('报告发布', '输出', {
      reportId,
      title,
      shareUrl,
      contentBytes: metaPayload.contentBytes,
    })
    writeJson(res, 200, {
      reportId,
      shareUrl,
      createdAt,
    })
  } catch (error) {
    printSystemLog('报告发布', '发布失败', { message: error.message }, true)
    writeJson(res, 500, { code: 'PUBLISH_FAILED', message: error.message || '发布失败' })
  }
}

async function handleReportVisit(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET/HEAD' })
    return
  }

  const reportId = decodeURIComponent(pathname.slice('/r/'.length))
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(reportId)) {
    writeHtml(res, 404, buildErrorPage('周报不存在', '链接格式无效，请确认 URL 是否完整。'))
    return
  }

  try {
    const indexPayload = await loadReportIndex()
    const meta = indexPayload.reports?.[reportId]
    if (!meta?.fileRelativePath) {
      writeHtml(res, 404, buildErrorPage('周报不存在', '该周报可能已被删除或从未发布。'))
      return
    }

    const htmlFilePath = resolveReportFilePath(meta.fileRelativePath)
    if (!htmlFilePath) {
      writeHtml(res, 403, buildErrorPage('访问受限', '检测到非法访问路径。'))
      return
    }

    const html = stripRemoteFontImports(await fs.readFile(htmlFilePath, 'utf-8'))
    printSystemLog('报告访问', '命中分享页', { reportId, title: meta.title })
    writeHtmlWithCompression(req, res, 200, html, 'public, max-age=300')
  } catch (error) {
    printSystemLog('报告访问', '读取失败', { reportId, message: error.message }, true)
    writeHtml(res, 500, buildErrorPage('打开失败', '报告读取失败，请稍后重试。'))
  }
}

function resolveForwardedOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
  const forwardedHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim()
  const protocol = forwardedProto || 'http'
  const host = forwardedHost || req.headers.host || `127.0.0.1:${serverPort}`
  return `${protocol}://${host}`
}

function toTokenNumber(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.round(value)
}

function pickPositiveNumber(values) {
  for (const raw of values) {
    const value = Number(raw)
    if (Number.isFinite(value) && value >= 0) {
      return value
    }
  }
  return 0
}

function resolveUsageCost(modelId, promptTokens, completionTokens, usagePayload, responseHeaders) {
  const headerCost = pickPositiveNumber([
    responseHeaders.get('x-openrouter-cost'),
    responseHeaders.get('x-usage-cost'),
    responseHeaders.get('x-total-cost'),
  ])
  const payloadCost = pickPositiveNumber([
    usagePayload?.usage?.total_cost,
    usagePayload?.usage?.cost,
    usagePayload?.total_cost,
    usagePayload?.cost,
  ])
  const providerCost = payloadCost > 0 ? payloadCost : headerCost
  if (providerCost > 0) {
    return { costUsd: providerCost, costSource: 'provider' }
  }

  const pricing =
    openrouterModelPricing[String(modelId || '').toLowerCase()] ||
    openrouterModelPricing[String(usagePayload?.model || '').toLowerCase()] ||
    openrouterModelPricing['*']

  if (pricing) {
    const inputPer1M = parsePositiveNumber(pricing.inputPer1M, 0)
    const outputPer1M = parsePositiveNumber(pricing.outputPer1M, 0)
    const costUsd = (promptTokens * inputPer1M + completionTokens * outputPer1M) / 1_000_000
    return {
      costUsd: Number(costUsd.toFixed(6)),
      costSource: 'estimated',
    }
  }

  return { costUsd: 0, costSource: 'unavailable' }
}

function extractUsageMetrics(payload) {
  const usage = payload?.usage && typeof payload.usage === 'object' ? payload.usage : {}
  const promptTokens = toTokenNumber(
    usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.inputTokens ?? 0,
  )
  const completionTokens = toTokenNumber(
    usage.completion_tokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.outputTokens ?? 0,
  )
  const totalTokens = toTokenNumber(
    usage.total_tokens ?? usage.totalTokens ?? (promptTokens > 0 || completionTokens > 0 ? promptTokens + completionTokens : 0),
  )
  const finishReason = String(payload?.choices?.[0]?.finish_reason || payload?.finish_reason || '')
  const model = String(payload?.model || payload?.choices?.[0]?.model || '')
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    finishReason,
    model,
  }
}

function buildUsageMonitorPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Docs2Brief API 用量监控</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(60% 80% at 85% -10%, rgba(56, 162, 255, 0.25), transparent 72%),
        radial-gradient(62% 90% at -10% 110%, rgba(45, 196, 255, 0.2), transparent 72%),
        #0a1020;
      color: #e6eeff;
    }
    .wrap { max-width: 1440px; margin: 0 auto; padding: 20px; }
    .top {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .title { font-size: 24px; font-weight: 700; }
    .controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    select, button {
      height: 34px; border-radius: 8px; border: 1px solid rgba(134, 171, 231, 0.4);
      background: #111a31; color: #e6eeff; padding: 0 10px;
    }
    button { cursor: pointer; }
    .stream-badge {
      display: inline-flex;
      align-items: center;
      height: 28px;
      border-radius: 999px;
      padding: 0 10px;
      border: 1px solid rgba(125, 167, 227, 0.35);
      background: rgba(15, 26, 45, 0.9);
      color: #9eb9e5;
      font-size: 12px;
    }
    .stream-badge.is-ok {
      border-color: rgba(98, 224, 158, 0.45);
      color: #80f0bb;
      background: rgba(19, 45, 34, 0.92);
    }
    .stream-badge.is-warn {
      border-color: rgba(255, 198, 112, 0.44);
      color: #ffd197;
      background: rgba(56, 37, 18, 0.92);
    }
    .stream-badge.is-pending {
      border-color: rgba(108, 185, 255, 0.48);
      color: #b8dcff;
      background: rgba(17, 33, 62, 0.92);
    }
    .cards {
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .card {
      border: 1px solid rgba(126, 168, 237, 0.28);
      border-radius: 12px;
      background: rgba(17, 26, 49, 0.92);
      padding: 12px;
      box-shadow: inset 0 1px 0 rgba(208, 227, 255, 0.08);
    }
    .card .k { color: #9ab2d8; font-size: 12px; }
    .card .v { margin-top: 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .card .sub { margin-top: 6px; color: #8ca6d2; font-size: 11px; }
    .meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      color: #8fa8d0;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(300px, 34%) minmax(0, 1fr);
      gap: 12px;
      min-height: 0;
    }
    .panel {
      border: 1px solid rgba(126, 168, 237, 0.28);
      border-radius: 12px;
      background: rgba(14, 22, 42, 0.95);
      overflow: hidden;
    }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 11px 12px;
      border-bottom: 1px solid rgba(126, 168, 237, 0.2);
      background: rgba(17, 31, 58, 0.64);
    }
    .panel-head strong {
      font-size: 13px;
      color: #d8e8ff;
    }
    .panel-head span {
      font-size: 11px;
      color: #9ab7e2;
    }
    .scroll-zone {
      max-height: 62vh;
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead th {
      text-align: left;
      padding: 10px 8px;
      font-size: 12px;
      color: #a4bfeb;
      border-bottom: 1px solid rgba(126, 168, 237, 0.24);
      white-space: nowrap;
    }
    tbody td {
      padding: 9px 8px;
      border-bottom: 1px solid rgba(126, 168, 237, 0.14);
      font-size: 12px;
      vertical-align: top;
    }
    tbody tr:hover { background: rgba(42, 74, 128, 0.18); }
    .status-ok { color: #60d394; }
    .status-err { color: #ff8b8b; }
    .mono { font-family: "SFMono-Regular", Consolas, monospace; }
    .muted { color: #8fa8d0; }
    @media (max-width: 1180px) {
      .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .layout { grid-template-columns: 1fr; }
      .scroll-zone { max-height: 46vh; }
    }
    @media (max-width: 760px) {
      .cards { grid-template-columns: 1fr; }
      .wrap { padding: 12px; }
      .title { font-size: 20px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="top">
      <div class="title">Docs2Brief API 用量监控</div>
      <div class="controls">
        <label>
          周期
          <select id="period">
            <option value="24h">近 24 小时</option>
            <option value="7d">近 7 天</option>
            <option value="30d">近 30 天</option>
            <option value="90d">近 90 天</option>
          </select>
        </label>
        <button id="refresh">立即刷新</button>
        <span class="stream-badge is-pending" id="streamState">实时流连接中</span>
      </div>
    </div>
    <div class="meta-row">
      <div id="range">统计区间：-</div>
      <div id="updatedAt">最后更新：-</div>
    </div>
    <section class="cards">
      <article class="card"><div class="k">请求总数</div><div class="v" id="reqTotal">-</div></article>
      <article class="card"><div class="k">总费用 (USD)</div><div class="v mono" id="costTotal">-</div></article>
      <article class="card"><div class="k">总 Token</div><div class="v" id="tokenTotal">-</div><div class="sub" id="tokenSplit">输入 - / 输出 -</div></article>
      <article class="card"><div class="k">成功率 / P95 耗时</div><div class="v" id="successAndP95">-</div><div class="sub" id="avgLatency">平均耗时 - ms</div></article>
      <article class="card"><div class="k">近 1 分钟</div><div class="v" id="window1mReq">-</div><div class="sub mono" id="window1mCost">费用 -</div></article>
      <article class="card"><div class="k">近 5 分钟</div><div class="v" id="window5mReq">-</div><div class="sub mono" id="window5mCost">费用 -</div></article>
      <article class="card"><div class="k">订阅状态</div><div class="v" id="streamVersion">v-</div><div class="sub" id="streamClients">在线订阅 -</div></article>
      <article class="card"><div class="k">失败请求</div><div class="v" id="failedReq">-</div><div class="sub" id="successReq">成功请求 -</div></article>
    </section>
    <section class="layout">
      <article class="panel">
        <div class="panel-head">
          <strong>模型费用分布</strong>
          <span id="modelCount">0 个模型</span>
        </div>
        <div class="scroll-zone">
          <table>
            <thead>
              <tr>
                <th>模型</th>
                <th>请求数</th>
                <th>Total Token</th>
                <th>费用(USD)</th>
                <th>费用占比</th>
              </tr>
            </thead>
            <tbody id="modelRows"></tbody>
          </table>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <strong>最近请求明细</strong>
          <span id="recordCount">0 条</span>
        </div>
        <div class="scroll-zone">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>模型</th>
                <th>状态</th>
                <th>耗时(ms)</th>
                <th>Prompt</th>
                <th>Completion</th>
                <th>Total</th>
                <th>费用(USD)</th>
                <th>费用来源</th>
                <th>错误</th>
              </tr>
            </thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
      </article>
    </section>
  </main>
  <script>
    const formatNum = (value) => new Intl.NumberFormat('zh-CN').format(Number(value || 0));
    const formatUsd = (value) => Number(value || 0).toFixed(6);
    const formatPct = (value) => Number(value || 0).toFixed(2) + '%';
    const formatMs = (value) => Number(value || 0).toFixed(2);
    const escapeHtml = (value) =>
      String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const periodEl = document.getElementById('period');
    const rowsEl = document.getElementById('rows');
    const modelRowsEl = document.getElementById('modelRows');
    const streamStateEl = document.getElementById('streamState');
    const state = {
      eventSource: null,
      fallbackTimer: null,
      latestPeriod: periodEl.value,
    };

    function setStreamState(text, tone) {
      streamStateEl.textContent = text;
      streamStateEl.className = 'stream-badge ' + tone;
    }

    function stopFallbackPolling() {
      if (state.fallbackTimer) {
        clearInterval(state.fallbackTimer);
        state.fallbackTimer = null;
      }
    }

    function startFallbackPolling() {
      if (state.fallbackTimer) {
        return;
      }
      state.fallbackTimer = setInterval(() => { void loadSnapshot('polling'); }, 5000);
    }

    function renderModels(summary) {
      const models = Array.isArray(summary.models) ? summary.models : [];
      document.getElementById('modelCount').textContent = models.length + ' 个模型';
      if (models.length === 0) {
        modelRowsEl.innerHTML = '<tr><td colspan="5" class="muted">暂无模型数据</td></tr>';
        return;
      }
      const totalCost = Number(summary.totalCostUsd || 0);
      modelRowsEl.innerHTML = models
        .map((model) => {
          const share = totalCost > 0 ? formatPct((Number(model.totalCostUsd || 0) / totalCost) * 100) : '-';
          return '<tr>' +
            '<td class="mono">' + escapeHtml(model.model || 'unknown') + '</td>' +
            '<td>' + formatNum(model.requests || 0) + '</td>' +
            '<td>' + formatNum(model.totalTokens || 0) + '</td>' +
            '<td class="mono">' + formatUsd(model.totalCostUsd || 0) + '</td>' +
            '<td>' + share + '</td>' +
          '</tr>';
        })
        .join('');
    }

    function renderRecords(records) {
      document.getElementById('recordCount').textContent = (records || []).length + ' 条';
      rowsEl.innerHTML = (records || [])
        .map((item) => {
          const ok = Number(item.statusCode || 0) >= 200 && Number(item.statusCode || 0) < 400 && !item.error;
          return '<tr>' +
            '<td class="mono">' + escapeHtml(item.createdAt || '-') + '</td>' +
            '<td class="mono">' + escapeHtml(item.model || '-') + '</td>' +
            '<td class="' + (ok ? 'status-ok' : 'status-err') + '">' + escapeHtml(item.statusCode || '-') + '</td>' +
            '<td>' + formatNum(item.durationMs || 0) + '</td>' +
            '<td>' + formatNum(item.promptTokens || 0) + '</td>' +
            '<td>' + formatNum(item.completionTokens || 0) + '</td>' +
            '<td>' + formatNum(item.totalTokens || 0) + '</td>' +
            '<td class="mono">' + formatUsd(item.costUsd || 0) + '</td>' +
            '<td>' + escapeHtml(item.costSource || '-') + '</td>' +
            '<td title="' + escapeHtml(item.error || '') + '">' + escapeHtml((item.error || '').slice(0, 80) || '-') + '</td>' +
          '</tr>';
        })
        .join('');
      if (!rowsEl.innerHTML) {
        rowsEl.innerHTML = '<tr><td colspan="10" class="muted">当前筛选区间暂无请求记录</td></tr>';
      }
    }

    function renderSnapshot(payload) {
      const summary = payload.summary || {};
      const range = payload.range || {};
      const realtime = payload.realtime || {};
      const window1m = realtime.window1m || {};
      const window5m = realtime.window5m || {};
      document.getElementById('range').textContent =
        '统计区间：' + (range.from || '-') + ' ~ ' + (range.to || '-') + '（周期：' + (range.period || periodEl.value) + '）';
      document.getElementById('updatedAt').textContent = '最后更新：' + (realtime.serverTime || new Date().toISOString());
      document.getElementById('reqTotal').textContent = formatNum(summary.requests || 0);
      document.getElementById('failedReq').textContent = formatNum(summary.failedRequests || 0);
      document.getElementById('successReq').textContent = '成功请求 ' + formatNum(summary.successRequests || 0);
      document.getElementById('costTotal').textContent = formatUsd(summary.totalCostUsd || 0);
      document.getElementById('tokenTotal').textContent = formatNum(summary.totalTokens || 0);
      document.getElementById('tokenSplit').textContent =
        '输入 ' + formatNum(summary.promptTokens || 0) + ' / 输出 ' + formatNum(summary.completionTokens || 0);
      document.getElementById('successAndP95').textContent =
        formatPct(summary.successRate || 0) + ' / ' + formatMs(summary.p95DurationMs || 0) + ' ms';
      document.getElementById('avgLatency').textContent = '平均耗时 ' + formatMs(summary.avgDurationMs || 0) + ' ms';
      document.getElementById('window1mReq').textContent = formatNum(window1m.requests || 0) + ' 次';
      document.getElementById('window1mCost').textContent =
        '费用 ' + formatUsd(window1m.totalCostUsd || 0) + ' / Token ' + formatNum(window1m.totalTokens || 0);
      document.getElementById('window5mReq').textContent = formatNum(window5m.requests || 0) + ' 次';
      document.getElementById('window5mCost').textContent =
        '费用 ' + formatUsd(window5m.totalCostUsd || 0) + ' / Token ' + formatNum(window5m.totalTokens || 0);
      document.getElementById('streamVersion').textContent = 'v' + formatNum(realtime.version || 0);
      document.getElementById('streamClients').textContent = '在线订阅 ' + formatNum(realtime.streamClients || 0);
      renderModels(summary);
      renderRecords(payload.records || []);
    }

    async function loadSnapshot(reason) {
      const period = periodEl.value;
      const response = await fetch(
        '/api/dashboard/live?period=' + encodeURIComponent(period) + '&limit=300',
        { cache: 'no-store' }
      );
      if (!response.ok) {
        throw new Error('快照请求失败(' + response.status + ')');
      }
      const payload = await response.json();
      renderSnapshot(payload);
      if (reason === 'manual') {
        setStreamState('手动刷新完成', 'is-ok');
      }
    }

    function connectStream() {
      if (state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
      }
      const period = periodEl.value;
      state.latestPeriod = period;
      const streamUrl = '/api/dashboard/stream?period=' + encodeURIComponent(period) + '&limit=300';
      setStreamState('实时流连接中', 'is-pending');
      const es = new EventSource(streamUrl);
      state.eventSource = es;

      es.addEventListener('connected', () => {
        stopFallbackPolling();
        setStreamState('实时流已连接', 'is-ok');
      });

      es.addEventListener('snapshot', (event) => {
        try {
          const payload = JSON.parse(event.data || '{}');
          if (periodEl.value !== state.latestPeriod) {
            return;
          }
          renderSnapshot(payload);
          stopFallbackPolling();
          setStreamState('实时流已连接', 'is-ok');
        } catch (error) {
          setStreamState('实时流数据异常，切换轮询', 'is-warn');
          startFallbackPolling();
        }
      });

      es.onerror = () => {
        setStreamState('实时流中断，切换轮询', 'is-warn');
        startFallbackPolling();
      };
    }

    async function bootstrap() {
      try {
        await loadSnapshot('init');
      } catch (error) {
        rowsEl.innerHTML =
          '<tr><td colspan="10" class="status-err">首次加载失败：' + escapeHtml(error.message || String(error)) + '</td></tr>';
      }
      connectStream();
    }

    document.getElementById('refresh').addEventListener('click', () => { void loadSnapshot('manual'); });
    periodEl.addEventListener('change', () => {
      void loadSnapshot('period');
      connectStream();
    });
    window.addEventListener('beforeunload', () => {
      if (state.eventSource) {
        state.eventSource.close();
      }
      stopFallbackPolling();
    });
    void bootstrap();
  </script>
</body>
</html>`
}

async function handleUsageSummary(req, res, urlObj) {
  applyCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' })
    return
  }

  const snapshot = await buildUsageSnapshot(urlObj.searchParams)
  printBusinessJson('用量监控', '摘要查询', {
    period: snapshot.range.period,
    total: snapshot.summary.requests,
    totalTokens: snapshot.summary.totalTokens,
    totalCostUsd: snapshot.summary.totalCostUsd,
  })

  writeJson(res, 200, {
    range: snapshot.range,
    summary: snapshot.summary,
    realtime: snapshot.realtime,
  })
}

async function handleUsageRecords(req, res, urlObj) {
  applyCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' })
    return
  }

  const snapshot = await buildUsageSnapshot(urlObj.searchParams)
  printBusinessJson('用量监控', '明细查询', {
    period: snapshot.range.period,
    total: snapshot.total,
    offset: snapshot.offset,
    limit: snapshot.limit,
  })

  writeJson(res, 200, {
    total: snapshot.total,
    offset: snapshot.offset,
    limit: snapshot.limit,
    records: snapshot.records,
    realtime: snapshot.realtime,
  })
}

async function handleUsageLive(req, res, urlObj) {
  applyCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' })
    return
  }

  const snapshot = await buildUsageSnapshot(urlObj.searchParams)
  printBusinessJson('用量监控', '实时快照', {
    period: snapshot.range.period,
    total: snapshot.summary.requests,
    records: snapshot.records.length,
    version: snapshot.realtime.version,
  })
  writeJson(res, 200, snapshot)
}

async function handleUsageStream(req, res, urlObj) {
  applyCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'GET') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET' })
    return
  }

  const clientId = `usage-stream-${Date.now().toString(36)}-${(usageStreamClientSeq += 1)}`
  const query = urlObj.searchParams.toString()

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders()
  }

  const client = {
    id: clientId,
    res,
    query,
    pingTimer: setInterval(() => {
      res.write(': ping\n\n')
    }, 15000),
  }
  usageStreamClients.set(clientId, client)
  printSystemLog('用量监控', '实时订阅建立', {
    clientId,
    query,
    activeClients: usageStreamClients.size,
  })

  writeSseEvent(res, 'connected', {
    clientId,
    serverTime: new Date().toISOString(),
    version: usageRealtimeVersion,
  })
  await pushUsageSnapshotToClient(client, 'connected')

  req.on('close', () => {
    closeUsageStreamClient(clientId, 'request-close')
  })
  req.on('aborted', () => {
    closeUsageStreamClient(clientId, 'request-aborted')
  })
}

async function handleUsagePage(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET/HEAD' })
    return
  }
  writeHtmlWithCompression(req, res, 200, buildUsageMonitorPage(), 'no-cache')
}

async function handleOpenRouterProxy(req, res) {
  applyCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }
  if (req.method !== 'POST') {
    writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST' })
    return
  }
  if (!openrouterProxyEnabled) {
    writeJson(res, 503, { code: 'PROXY_DISABLED', message: 'OpenRouter 代理未启用' })
    return
  }
  if (!openrouterProxyApiKey && !siliconflowProxyApiKey) {
    writeJson(res, 503, { code: 'MISSING_API_KEY', message: '服务端未配置可用模型供应商 API Key' })
    return
  }

  const startedAt = Date.now()
  let requestModel = 'unknown'
  let requestMaxTokens = 0
  let requestMessageCount = 0
  let requestChars = 0
  let responseProvider = 'openrouter'

  try {
    const payload = await readJsonBody(req, openrouterProxyBodyLimitBytes)
    if (!payload || typeof payload !== 'object') {
      writeJson(res, 400, { code: 'INVALID_PAYLOAD', message: '请求体必须是 JSON 对象' })
      return
    }

    requestModel = String(payload.model || 'unknown')
    requestMaxTokens = parseNonNegativeInt(payload.max_tokens, 0)
    requestMessageCount = Array.isArray(payload.messages) ? payload.messages.length : 0
    requestChars = Buffer.byteLength(JSON.stringify(payload.messages || []), 'utf-8')

    const { provider, upstreamResponse, responseText, requestModelResolved } = await requestWithAutoProviderSwitch(
      payload,
      req,
    )
    responseProvider = provider
    requestModel = requestModelResolved

    const responseType = upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8'
    let responseJson = null
    try {
      responseJson = responseText ? JSON.parse(responseText) : null
    } catch {
      responseJson = null
    }

    const usage = extractUsageMetrics(responseJson)
    const durationMs = Date.now() - startedAt
    const cost = resolveUsageCost(requestModel, usage.promptTokens, usage.completionTokens, responseJson, upstreamResponse.headers)
    const usageRecord = {
      id: createReportId(),
      ts: Date.now(),
      createdAt: new Date().toISOString(),
      model: usage.model || requestModel,
      provider: responseProvider,
      statusCode: upstreamResponse.status,
      durationMs,
      requestMaxTokens,
      requestMessageCount,
      requestChars,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      finishReason: usage.finishReason,
      costUsd: Number(cost.costUsd.toFixed(6)),
      costSource: cost.costSource,
      error: upstreamResponse.ok ? '' : String(responseJson?.error?.message || responseText || '').slice(0, 280),
    }
    await appendUsageRecord(usageRecord)
    if (usageAutoCleanupOnWrite) {
      void runUsageCleanup('write')
    }

    printBusinessJson('API用量', '请求记录', {
      id: usageRecord.id,
      provider: usageRecord.provider,
      model: usageRecord.model,
      statusCode: usageRecord.statusCode,
      durationMs: usageRecord.durationMs,
      totalTokens: usageRecord.totalTokens,
      costUsd: usageRecord.costUsd,
      costSource: usageRecord.costSource,
    })

    res.statusCode = upstreamResponse.status
    res.setHeader('Content-Type', responseType)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-LLM-Provider', responseProvider)
    res.end(responseText)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const usageRecord = {
      id: createReportId(),
      ts: Date.now(),
      createdAt: new Date().toISOString(),
      model: requestModel,
      provider: responseProvider,
      statusCode: 502,
      durationMs: Date.now() - startedAt,
      requestMaxTokens,
      requestMessageCount,
      requestChars,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      finishReason: '',
      costUsd: 0,
      costSource: 'unavailable',
      error: message.slice(0, 280),
    }
    await appendUsageRecord(usageRecord)
    writeJson(res, 502, { code: 'MODEL_PROXY_FAILED', message })
  }
}

async function requestWithAutoProviderSwitch(payload, req) {
  const providerOrder = resolveProviderOrderForToday()
  const failedAttempts = []

  for (const provider of providerOrder) {
    try {
      const result = await requestProvider(provider, payload, req)
      if (provider !== providerOrder[0]) {
        markPreferredProvider(provider, `前序供应商失败后自动切换成功`, {
          from: providerOrder[0],
          to: provider,
        })
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failedAttempts.push({ provider, message })
      printSystemLog('模型代理', '供应商请求失败', { provider, message }, true)
    }
  }

  const detail = failedAttempts.map((item) => `${item.provider}: ${item.message}`).join(' | ')
  throw new Error(`所有供应商请求失败：${detail}`)
}

async function requestProvider(provider, payload, req) {
  const providerConfig = resolveProviderConfig(provider)
  if (!providerConfig) {
    throw new Error(`供应商未配置：${provider}`)
  }

  const requestPayload =
    provider === 'siliconflow'
      ? {
          ...payload,
          model: siliconflowProxyModel || payload.model,
        }
      : payload
  const requestModelResolved = String(requestPayload.model || payload.model || 'unknown')
  const requestHeaders = {
    Authorization: `Bearer ${providerConfig.apiKey}`,
    'Content-Type': 'application/json',
  }
  if (provider === 'openrouter') {
    requestHeaders['HTTP-Referer'] = resolveForwardedOrigin(req)
    requestHeaders['X-Title'] = 'Docs2Brief'
  }

  const upstreamResponse = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(requestPayload),
  })
  const responseText = await upstreamResponse.text()
  if (!upstreamResponse.ok) {
    const detail = responseText ? `，响应=${responseText.slice(0, 300)}` : ''
    throw new Error(`${provider} 请求失败：${upstreamResponse.status}${detail}`)
  }

  return {
    provider,
    upstreamResponse,
    responseText,
    requestModelResolved,
  }
}

function resolveProviderConfig(provider) {
  if (provider === 'openrouter' && openrouterProxyApiKey) {
    return {
      name: 'openrouter',
      baseUrl: openrouterProxyBaseUrl,
      apiKey: openrouterProxyApiKey,
    }
  }
  if (provider === 'siliconflow' && siliconflowProxyApiKey) {
    return {
      name: 'siliconflow',
      baseUrl: siliconflowProxyBaseUrl,
      apiKey: siliconflowProxyApiKey,
    }
  }
  return null
}

function resolveProviderOrderForToday() {
  refreshProviderSwitchForToday()
  const availableProviders = []
  if (openrouterProxyApiKey) {
    availableProviders.push('openrouter')
  }
  if (siliconflowProxyApiKey) {
    availableProviders.push('siliconflow')
  }

  if (availableProviders.length <= 1) {
    return availableProviders
  }

  if (modelProviderSwitch.preferredProvider === 'siliconflow') {
    return ['siliconflow', 'openrouter']
  }
  return ['openrouter', 'siliconflow']
}

function refreshProviderSwitchForToday() {
  const dayKey = new Date().toISOString().slice(0, 10)
  if (modelProviderSwitch.dayKey !== dayKey) {
    modelProviderSwitch = {
      dayKey,
      preferredProvider: 'openrouter',
    }
    printSystemLog('模型代理', '新的一天重置优先级', {
      dayKey,
      preferredProvider: modelProviderSwitch.preferredProvider,
    })
  }
}

function markPreferredProvider(provider, reason, payload = {}) {
  if (modelProviderSwitch.preferredProvider === provider) {
    return
  }
  modelProviderSwitch.preferredProvider = provider
  printSystemLog('模型代理', '切换优先供应商', {
    dayKey: modelProviderSwitch.dayKey,
    preferredProvider: provider,
    reason,
    ...payload,
  })
}

const server = http.createServer(async (req, res) => {
  const startAt = Date.now()
  const method = req.method || 'GET'
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = urlObj.pathname

  printSystemLog('HTTP入口', '收到请求', { method, pathname })

  try {
    if (pathname === '/api/openrouter/chat/completions') {
      await handleOpenRouterProxy(req, res)
      return
    }

    if (pathname === '/api/reports/publish') {
      await handlePublishReport(req, res)
      return
    }

    if (pathname === '/api/dashboard/summary' || pathname === '/api/ops/usage/summary') {
      await handleUsageSummary(req, res, urlObj)
      return
    }

    if (pathname === '/api/dashboard/records' || pathname === '/api/ops/usage/records') {
      await handleUsageRecords(req, res, urlObj)
      return
    }

    if (pathname === '/api/dashboard/live' || pathname === '/api/ops/usage/live') {
      await handleUsageLive(req, res, urlObj)
      return
    }

    if (pathname === '/api/dashboard/stream' || pathname === '/api/ops/usage/stream') {
      await handleUsageStream(req, res, urlObj)
      return
    }

    if (pathname === '/dashboard' || pathname === '/ops/usage') {
      await handleUsagePage(req, res)
      return
    }

    if (pathname === '/api/health') {
      applyCorsHeaders(res)
      writeJson(res, 200, {
        status: 'ok',
        time: new Date().toISOString(),
      })
      return
    }

    if (pathname.startsWith('/r/')) {
      await handleReportVisit(req, res, pathname)
      return
    }

    if (method !== 'GET' && method !== 'HEAD') {
      writeJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '仅支持 GET/HEAD/POST/OPTIONS' })
      return
    }

    await serveStatic(req, res, pathname)
  } catch (error) {
    printSystemLog('HTTP入口', '未处理异常', { method, pathname, message: error.message }, true)
    writeJson(res, 500, { code: 'INTERNAL_ERROR', message: '服务内部错误' })
  } finally {
    printSystemLog('HTTP入口', '请求完成', {
      method,
      pathname,
      statusCode: res.statusCode,
      durationMs: Date.now() - startAt,
    })
  }
})

async function startServer() {
  await ensureReportDirectories()
  await ensureUsageStorage()
  if (reportCleanupOnStartup) {
    await runReportCleanup('startup')
  }
  await runUsageCleanup('startup')
  server.listen(serverPort, serverHost, () => {
    printSystemLog('服务启动', '服务已启动', {
      host: serverHost,
      port: serverPort,
      distDir,
      reportsRoot,
      usageLogPath,
      publicShareBaseUrl: publicShareBaseUrl || '(auto)',
      reportRetentionDays,
      reportMaxCount,
      reportCleanupOnStartup,
      reportCleanupOnPublish,
      usageRetentionDays,
      usageMaxRecords,
      openrouterProxyEnabled,
      openrouterProxyBaseUrl,
      siliconflowProxyBaseUrl,
      siliconflowProxyEnabled: Boolean(siliconflowProxyApiKey),
      siliconflowProxyModel: siliconflowProxyModel || '(unset)',
    })
  })
}

startServer().catch((error) => {
  printSystemLog('服务启动', '启动失败', { message: error.message }, true)
  process.exit(1)
})
