import { TemplateThumbnail } from './TemplateThumbnail'

export function TemplateBridgePanel({ bridgeListRef, selectedTemplateId, templates, onSelectTemplate }) {
  return (
    <section className="template-bridge-column">
      <div className="template-bridge-panel glass-panel">
        <div className="template-bridge-panel__header">
          <span className="template-bridge-panel__kicker">模板列表</span>
          <strong>模板切换</strong>
          <p>向下滚动查看更多模板，点击卡片立即切换预览。</p>
        </div>

        <div aria-label="模板选择列表" className="template-bridge-scroll" ref={bridgeListRef} role="listbox">
          {templates.map((item, index) => {
            const isActive = selectedTemplateId === item.id

            return (
              <button
                aria-selected={isActive}
                className={`template-bridge-card ${isActive ? 'is-active' : ''}`}
                data-template-id={item.id}
                key={item.id}
                onClick={() => onSelectTemplate(item.id)}
                role="option"
                style={{ '--template-order': index }}
                type="button"
              >
                <div className="template-bridge-card__preview">
                  <TemplateThumbnail variant={item.previewKey} />
                </div>

                <div className="template-bridge-card__body">
                  <div className="template-bridge-card__meta">
                    <span className="template-bridge-card__chip">{item.templateMeta.chip}</span>
                    <span className="template-bridge-card__index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <strong>{item.templateMeta.title}</strong>
                  <p>{item.description}</p>
                  <div className="template-bridge-card__tags">
                    <span>适合场景：{item.sceneBadge}</span>
                    <span>风格：{item.styleBadge}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="template-bridge-panel__footer">已接入 {templates.length} 个内置模板</div>
      </div>
    </section>
  )
}
