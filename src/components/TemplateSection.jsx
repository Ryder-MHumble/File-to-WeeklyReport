import { TemplateThumbnail } from './TemplateThumbnail'

export function TemplateSection({ templates, selectedTemplateId, onSelectTemplate }) {
  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) ?? templates[0] ?? null

  return (
    <section className="control-section glass-panel">
      <div className="section-header section-header--compact">
        <span className="section-index">模板选择</span>
        <div>
          <h2 className="font-headline">选择模板</h2>
          <p>用紧凑列表浏览模板，右侧只聚焦当前选中的版本。</p>
        </div>
      </div>

      <div className="template-browser">
        <div className="template-browser__list">
          {templates.map((item) => (
            <button
              key={item.id}
              className={`template-row ${selectedTemplateId === item.id ? 'is-selected' : ''}`}
              onClick={() => onSelectTemplate(item.id)}
              type="button"
            >
              <span className="template-row__chip">{item.templateMeta.chip}</span>
              <div className="template-row__body">
                <strong>{item.templateMeta.title}</strong>
                <span>{item.templateMeta.bestFor}</span>
              </div>
              {selectedTemplateId === item.id ? <i className="template-row__check">✓</i> : null}
            </button>
          ))}
        </div>

        {selectedTemplate ? (
          <div className="template-focus-card">
            <div className="template-focus-card__preview">
              <TemplateThumbnail variant={selectedTemplate.previewKey} />
            </div>
            <div className="template-focus-card__body">
              <span className="template-focus-card__chip">{selectedTemplate.templateMeta.chip}</span>
              <strong>{selectedTemplate.templateMeta.title}</strong>
              <p>{selectedTemplate.description}</p>
              <div className="badge-row">
                <span>{selectedTemplate.styleBadge}</span>
                <span>{selectedTemplate.sceneBadge}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
