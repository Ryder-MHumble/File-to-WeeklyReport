import { templateAssets } from './assets'
import { templateCatalog } from './catalog'
import { normalizeDocument } from './document-normalizer'
import { buildTemplatePayload } from './view-models'

export function renderTemplateHtml(templateId, document, generatedAt) {
  const templateMeta = templateCatalog.find((item) => item.id === templateId)
  const asset = templateAssets[templateId]

  if (!templateMeta || !asset) {
    return buildFallbackHtml(document, generatedAt)
  }

  const normalized = normalizeDocument(document)
  const payload = buildTemplatePayload(templateMeta, normalized, generatedAt)
  return injectTemplate(asset, payload)
}

function injectTemplate(asset, payload) {
  const serializedPayload = serializePayload(payload)
  const styleBlock = asset.css
  const scriptBlock = asset.js.replaceAll('</script>', '<\\/script>')

  return asset.html
    .replace('__TEMPLATE_STYLE__', styleBlock)
    .replace('__TEMPLATE_DATA__', serializedPayload)
    .replace('__TEMPLATE_SCRIPT__', scriptBlock)
}

function serializePayload(payload) {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/<\/script/gi, '<\\\\/script')
}

function buildFallbackHtml(document, generatedAt) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(document.title || '未命名文档')}</title>
  <style>
    body { margin: 0; padding: 24px; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; background: #f6f8fc; color: #1f2937; }
    .page { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #dbe2ea; border-radius: 14px; padding: 20px; }
  </style>
</head>
<body>
  <article class="page">
    <h1>${escapeHtml(document.title || '未命名文档')}</h1>
    <p>生成时间：${escapeHtml(generatedAt)}</p>
    <p>${escapeHtml(document.summary || '暂无摘要')}</p>
  </article>
</body>
</html>`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
