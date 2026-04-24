function buildPosterSteps(activeStep) {
  const steps = [
    { id: 'extract', title: '步骤 1', description: '抽取文档内容' },
    { id: 'analyze', title: '步骤 2', description: '生成海报 brief' },
    { id: 'render', title: '步骤 3', description: '输出海报图片' },
  ]
  const currentIndex = steps.findIndex((item) => item.id === activeStep)
  return steps.map((item, index) => {
    if (currentIndex < 0) {
      return { ...item, status: 'pending', label: '待处理' }
    }
    if (index < currentIndex) {
      return { ...item, status: 'done', label: '完成' }
    }
    if (index === currentIndex) {
      return { ...item, status: 'running', label: '处理中' }
    }
    return { ...item, status: 'pending', label: '待处理' }
  })
}

export function PosterPreviewPane({
  downloadReady,
  imageDataUrl,
  isGenerating,
  isPosterReady,
  modelUsed,
  onDownload,
  posterBrief,
  posterScene,
  posterStyle,
  progress,
  recentPosters,
  title,
}) {
  const previewState = isGenerating ? 'generating' : isPosterReady ? 'done' : 'idle'
  const steps = buildPosterSteps(progress.step)

  return (
    <section className={`preview-pane-shell glass-panel preview-pane-shell--${previewState} poster-preview-pane`}>
      <header className="preview-toolbar">
        <div className="preview-toolbar__left">
          <div className="poster-preview-heading">
            <strong>{title || '海报预览'}</strong>
            <span>{posterScene.name} · {posterStyle.name}</span>
          </div>
        </div>
        <div className="preview-toolbar__right">
          <button className="toolbar-button toolbar-button--primary" disabled={!downloadReady} onClick={onDownload} type="button">
            <span className="toolbar-button__icon">⬇</span>
            <span>下载海报</span>
          </button>
        </div>
      </header>

      <div className="preview-stage poster-preview-stage">
        <div className="preview-atmosphere" aria-hidden="true">
          <span className="preview-atmosphere__aurora" />
          <span className="preview-atmosphere__rays" />
          <span className="preview-atmosphere__grain" />
        </div>

        {previewState === 'idle' ? (
          <div className="poster-empty-state">
            <div className="poster-empty-state__copy">
              <span className="idle-state__eyebrow">Poster Pipeline</span>
              <strong>从文档生成一张可下载的宣传海报</strong>
              <p>左侧选择海报场景与风格后，上传文件或直接输入正文，系统会先整理 brief，再通过 OpenRouter 图片模型输出海报图片。</p>
            </div>
            <div className="poster-empty-state__aside">
              <div className="poster-inspector-card">
                <div className="poster-inspector-card__label">适用场景</div>
                <strong>{posterScene.name}</strong>
                <p>{posterScene.description}</p>
              </div>
              <div className="poster-inspector-card">
                <div className="poster-inspector-card__label">当前风格</div>
                <strong>{posterStyle.name}</strong>
                <p>{posterStyle.description}</p>
              </div>
            </div>
          </div>
        ) : null}

        {previewState === 'generating' ? (
          <div className="poster-progress-panel">
            <div className="poster-progress-panel__title">海报生成中</div>
            <div className="poster-progress-panel__desc">系统正在抽取内容、整理宣传 brief，并调用图片模型生成海报。</div>
            <div className="generating-progress-track">
              <span style={{ width: `${Math.max(progress.percent, 8)}%` }} />
            </div>
            <div className="progress-step-list">
              {steps.map((item) => (
                <div className={`progress-step progress-step--${item.status}`} key={item.id}>
                  <div className="progress-step__badge">{item.status === 'running' ? <span className="step-spinner" /> : item.title.replace('步骤 ', '')}</div>
                  <div className="progress-step__body">
                    <strong>{item.description}</strong>
                    <span>{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {previewState === 'done' ? (
          <div className="poster-preview-layout">
            <div className="poster-artboard-shell">
              <img alt={title || '海报预览'} className="poster-preview-image" src={imageDataUrl} />
            </div>
            <aside className="poster-inspector">
              <div className="poster-inspector-card">
                <div className="poster-inspector-card__label">模型</div>
                <strong>{modelUsed}</strong>
                <p>当前生成链路使用的海报模型组合。</p>
              </div>
              <div className="poster-inspector-card">
                <div className="poster-inspector-card__label">海报摘要</div>
                <strong>{posterBrief?.headline || title}</strong>
                <p>{posterBrief?.supporting_copy || posterStyle.description}</p>
              </div>
              <div className="poster-inspector-card">
                <div className="poster-inspector-card__label">关键信息</div>
                <div className="poster-keypoints">
                  {(posterBrief?.key_points || []).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
              {recentPosters.length > 0 ? (
                <div className="poster-inspector-card">
                  <div className="poster-inspector-card__label">最近生成</div>
                  <div className="poster-recent-list">
                    {recentPosters.map((item) => (
                      <div className="poster-recent-list__item" key={item.id}>
                        <strong>{item.title}</strong>
                        <span>{item.generatedAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  )
}
