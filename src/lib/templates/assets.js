const templateAssetCache = new Map()

const templateAssetLoaders = {
  'template-02': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/02/index.html?raw'),
      import('../../../template/02/style.css?raw'),
      import('../../../template/02/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
  'template-03': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/03/index.html?raw'),
      import('../../../template/03/style.css?raw'),
      import('../../../template/03/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
  'template-04': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/04/index.html?raw'),
      import('../../../template/04/style.css?raw'),
      import('../../../template/04/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
  'template-05': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/05/index.html?raw'),
      import('../../../template/05/style.css?raw'),
      import('../../../template/05/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
  'template-06': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/06/index.html?raw'),
      import('../../../template/06/style.css?raw'),
      import('../../../template/06/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
  'template-08': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/08/index.html?raw'),
      import('../../../template/08/style.css?raw'),
      import('../../../template/08/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
  'template-09': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/09/index.html?raw'),
      import('../../../template/09/style.css?raw'),
      import('../../../template/09/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
  'template-11': async () => {
    const [html, css, js] = await Promise.all([
      import('../../../template/11/index.html?raw'),
      import('../../../template/11/style.css?raw'),
      import('../../../template/11/app.js?raw'),
    ])
    return { html: html.default, css: css.default, js: js.default }
  },
}

export async function loadTemplateAsset(templateId) {
  if (templateAssetCache.has(templateId)) {
    return templateAssetCache.get(templateId)
  }

  const loader = templateAssetLoaders[templateId]
  if (!loader) {
    return null
  }

  const asset = await loader()
  templateAssetCache.set(templateId, asset)
  return asset
}

export function hasTemplateAsset(templateId) {
  return templateId in templateAssetLoaders
}
