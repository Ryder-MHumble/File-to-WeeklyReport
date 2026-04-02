function buildGenerationSteps(activeStep, generationMode) {
  const steps = [
    { id: 'extract', title: '步骤 1', description: '解析文档内容' },
    { id: 'analyze', title: '步骤 2', description: 'AI 分析并提取结构' },
    {
      id: 'render',
      title: '步骤 3',
      description: generationMode === 'llm-html' ? '生成 HTML 页面' : '渲染可视化报告',
    },
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

export function PreviewPane({
  generationMode,
  copiedReady,
  copyReady,
  previewState,
  previewDevice,
  onCopyLink,
  onDeviceChange,
  onFullscreen,
  onExport,
  fullscreenReady,
  exportReady,
  iframeHtml,
  iframeKey,
  previewTitle,
  templates,
  selectedTemplate,
  progress,
  recentReports,
  showSuccessToast,
  previewStageRef,
}) {
  const steps = buildGenerationSteps(progress.step, generationMode)
  const showTemplateRail = generationMode === 'structured-template' && Boolean(selectedTemplate)
  const activeStep = steps.find((item) => item.status === 'running') ?? steps[steps.length - 1]

  return (
    <section className={`preview-pane-shell glass-panel preview-pane-shell--${previewState}`}>
      <div className="preview-toolbar">
        <div className="preview-toolbar__left">
          <div className="device-toggle">
            <button
              className={previewDevice === 'desktop' ? 'is-active' : ''}
              onClick={() => onDeviceChange('desktop')}
              type="button"
            >
              桌面
            </button>
            <button
              className={previewDevice === 'mobile' ? 'is-active' : ''}
              onClick={() => onDeviceChange('mobile')}
              type="button"
            >
              移动
            </button>
          </div>
        </div>

        <div className="preview-toolbar__right">
          <button className="toolbar-button toolbar-button--ghost" disabled={!fullscreenReady} onClick={onFullscreen} type="button">
            <span className="toolbar-button__icon" aria-hidden="true">
              ⛶
            </span>
            <span>全屏</span>
          </button>
          <button
            className={`toolbar-button toolbar-button--ghost ${copiedReady ? 'toolbar-button--copied' : ''}`}
            disabled={!copyReady}
            onClick={onCopyLink}
            type="button"
          >
            <span className="toolbar-button__icon" aria-hidden="true">
              ⧉
            </span>
            <span>{copiedReady ? '已复制' : '复制链接'}</span>
          </button>
          <button className="toolbar-button toolbar-button--primary" disabled={!exportReady} onClick={onExport} type="button">
            <span className="toolbar-button__icon" aria-hidden="true">
              ⬇
            </span>
            <span>导出 HTML</span>
          </button>
        </div>
      </div>

      <div className={`preview-stage preview-stage--${previewState}`} ref={previewStageRef}>
        <div className="preview-atmosphere" aria-hidden="true">
          <span className="preview-atmosphere__aurora" />
          <span className="preview-atmosphere__rays" />
          <span className="preview-atmosphere__grain" />
        </div>

        {previewState === 'idle' ? (
          <div className="idle-state">
            <div className="orbital-wrapper">
              <span className="orbital-halo orbital-halo--outer" />
              <span className="orbital-halo orbital-halo--inner" />
              <svg className="orbital-sphere" viewBox="0 0 240 240" aria-hidden="true">
                <circle cx="120" cy="120" r="76" />
                <ellipse cx="120" cy="120" rx="92" ry="32" />
                <ellipse cx="120" cy="120" rx="92" ry="32" transform="rotate(60 120 120)" />
                <ellipse cx="120" cy="120" rx="92" ry="32" transform="rotate(120 120 120)" />
              </svg>
              <span className="orbital-spark orbital-spark--1" />
              <span className="orbital-spark orbital-spark--2" />
              <span className="orbital-spark orbital-spark--3" />
              <span className="orbital-core" />
            </div>
            <p>{generationMode === 'llm-html' ? 'LLM 模式下将直接展示模型返回的 HTML 页面。' : '在中间模板卡片列选择模板后，点击生成即可。'}</p>

            {recentReports.length > 0 ? (
              <div className="recent-reports">
                <span>最近生成</span>
                <ul>
                  {recentReports.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong>
                      <span>{item.generatedAt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showTemplateRail && templates.length > 0 ? (
              <div className="idle-template-hint">
                已接入 {templates.length} 个内置模板，支持纵向滚动浏览并点击切换
              </div>
            ) : null}
          </div>
        ) : null}

        {previewState === 'template' || previewState === 'done' ? (
          <div className={`iframe-shell ${previewDevice === 'mobile' ? 'is-mobile' : ''}`}>
            <iframe
              key={iframeKey}
              className={`preview-frame ${previewDevice === 'mobile' ? 'is-mobile' : ''}`}
              srcDoc={iframeHtml}
              title={previewTitle || selectedTemplate?.name || 'ReportFlow Preview'}
            />
          </div>
        ) : null}

        {previewState === 'generating' ? (
          <div className="generating-state">
            <div className="progress-card glass-panel" role="status" aria-live="polite">
              <div className="progress-card__aurora" aria-hidden="true" />

              <div className="progress-card__header">
                <div className="progress-signal" aria-hidden="true">
                  <span className="progress-signal__ring" />
                  <span className="progress-signal__ring progress-signal__ring--outer" />
                  <span className="progress-signal__core" />
                </div>
                <div className="progress-card__headline">
                  <strong>报告生成引擎运行中</strong>
                  <span>正在并行执行内容抽取、结构推理与页面渲染</span>
                </div>
                <div className="progress-percent-chip">{progress.percent}%</div>
              </div>

              <div className="progress-step-list">
                {steps.map((item) => (
                  <div className={`progress-step ${item.status}`} key={item.id}>
                    <div className="progress-step__icon" aria-hidden="true">
                      {item.status === 'done' ? (
                        <span className="step-node step-node--done">✓</span>
                      ) : item.status === 'running' ? (
                        <span className="step-node step-node--running" />
                      ) : (
                        <span className="step-node" />
                      )}
                    </div>
                    <div className="progress-step__body">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                    <div className="progress-step__status">{item.label}</div>
                  </div>
                ))}
              </div>

              <div
                className="progress-track"
                role="progressbar"
                aria-label="报告生成进度"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
              >
                <div className="progress-track__fill" style={{ width: `${progress.percent}%` }} />
              </div>

              <div className="progress-meta">
                <span>当前阶段：{activeStep?.title ?? '处理中'}</span>
                <span>{progress.percent}%</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showSuccessToast ? <div className="success-toast">✓ 报告生成成功</div> : null}
    </section>
  )
}
