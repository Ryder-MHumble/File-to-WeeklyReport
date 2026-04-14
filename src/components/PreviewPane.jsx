import { useEffect, useRef, useState } from 'react'

const desktopMinFrameHeight = 960
const mobileMinFrameHeight = 760
const mobileFrameWidth = 390

function buildGenerationSteps(activeStep, generationMode) {
  const steps = [
    { id: 'extract', title: '步骤 1', description: '解析文档内容' },
    { id: 'analyze', title: '步骤 2', description: 'AI 分析并提取结构' },
    { id: 'render', title: '步骤 3', description: generationMode === 'llm-html' ? '生成 HTML 页面' : '渲染可视化报告' },
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

function extractIframeHtml(iframeElement) {
  const documentElement = iframeElement?.contentDocument?.documentElement
  if (!documentElement) {
    return ''
  }
  return `<!doctype html>\n${documentElement.outerHTML}`
}

function toggleIframeEditing(iframeElement, enabled) {
  const doc = iframeElement?.contentDocument
  if (!doc?.body) {
    return
  }

  const styleId = '__docs2brief_inline_edit_style__'
  const existingStyle = doc.getElementById(styleId)

  if (enabled) {
    doc.designMode = 'on'
    doc.body.setAttribute('contenteditable', 'true')

    if (!existingStyle) {
      const style = doc.createElement('style')
      style.id = styleId
      style.textContent = `
html {
  scroll-behavior: smooth;
}

body[contenteditable="true"] {
  caret-color: #0ea5e9;
  outline: 3px solid rgba(14, 165, 233, 0.2);
  outline-offset: -6px;
}

body[contenteditable="true"] *:focus {
  outline: 2px dashed rgba(14, 165, 233, 0.42);
  outline-offset: 3px;
}

body[contenteditable="true"] ::selection {
  background: rgba(14, 165, 233, 0.2);
}
`
      doc.head.append(style)
    }

    return
  }

  doc.designMode = 'off'
  doc.body.removeAttribute('contenteditable')
  existingStyle?.remove()
}

export function PreviewPane({
  generationMode,
  copiedReady,
  copyReady,
  exportReady,
  fullscreenTargetRef,
  fullscreenReady,
  hasEditedContent,
  iframeHtml,
  iframeKey,
  isEditMode,
  onApplyEdit,
  onCancelEdit,
  onCopyLink,
  onDeviceChange,
  onEditChange,
  onEditStart,
  onExport,
  onFullscreen,
  previewDevice,
  previewStageRef,
  previewState,
  previewTitle,
  recentReports = [],
  selectedTemplate = null,
  showSuccessToast = false,
  templates = [],
  progress,
}) {
  const [frameHeight, setFrameHeight] = useState(desktopMinFrameHeight)
  const [frameReady, setFrameReady] = useState(false)
  const iframeRef = useRef(null)
  const boundDocumentRef = useRef(null)
  const boundInputHandlerRef = useRef(null)
  const measureTimersRef = useRef([])

  const clearMeasureTimers = () => {
    measureTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    measureTimersRef.current = []
  }

  const getFallbackFrameHeight = () => (previewDevice === 'mobile' ? mobileMinFrameHeight : desktopMinFrameHeight)

  const syncFrameLayout = () => {
    const iframeElement = iframeRef.current
    const doc = iframeElement?.contentDocument
    const root = doc?.documentElement
    const body = doc?.body

    if (!root || !body) {
      return
    }

    const nextHeight = Math.max(
      root.scrollHeight,
      body.scrollHeight,
      root.offsetHeight,
      body.offsetHeight,
      getFallbackFrameHeight(),
    )

    setFrameHeight((prev) => (Math.abs(prev - nextHeight) > 2 ? nextHeight : prev))
    setFrameReady(true)
  }

  const scheduleFrameMeasurement = () => {
    clearMeasureTimers()

    const runMeasurement = () => {
      window.requestAnimationFrame(() => {
        syncFrameLayout()
      })
    }

    runMeasurement()
    measureTimersRef.current = [80, 240, 520].map((delay) => window.setTimeout(runMeasurement, delay))
  }

  const detachInputListener = () => {
    if (boundDocumentRef.current && boundInputHandlerRef.current) {
      boundDocumentRef.current.removeEventListener('input', boundInputHandlerRef.current, true)
    }
    boundDocumentRef.current = null
    boundInputHandlerRef.current = null
  }

  const syncEditorMode = () => {
    const iframeElement = iframeRef.current
    const doc = iframeElement?.contentDocument
    if (!doc?.body) {
      return
    }

    detachInputListener()
    toggleIframeEditing(iframeElement, isEditMode)

    if (!isEditMode) {
      scheduleFrameMeasurement()
      return
    }

    const handleInput = () => {
      onEditChange({ htmlLength: extractIframeHtml(iframeElement).length })
      scheduleFrameMeasurement()
    }

    doc.addEventListener('input', handleInput, true)
    boundDocumentRef.current = doc
    boundInputHandlerRef.current = handleInput
    scheduleFrameMeasurement()
  }

  const captureCurrentHtml = () => extractIframeHtml(iframeRef.current)

  const handleEditToggle = () => {
    onEditStart()
  }

  const handleApplyClick = () => {
    const currentHtml = captureCurrentHtml()
    if (!currentHtml) {
      return
    }
    onApplyEdit(currentHtml, { trigger: 'toolbar-save' })
  }

  const handleCancelClick = () => {
    onCancelEdit()
  }

  const handleExportClick = () => {
    onExport()
  }

  const handleCopyClick = () => {
    void onCopyLink()
  }

  const handleFrameLoad = () => {
    setFrameReady(false)
    syncEditorMode()
    scheduleFrameMeasurement()
  }

  const shouldShowFrame = previewState === 'template' || previewState === 'done'

  useEffect(() => {
    if (!shouldShowFrame) {
      setFrameReady(false)
      setFrameHeight(getFallbackFrameHeight())
      return undefined
    }

    setFrameReady(false)
    setFrameHeight(getFallbackFrameHeight())

    const frameRequest = window.requestAnimationFrame(() => {
      scheduleFrameMeasurement()
    })

    return () => {
      window.cancelAnimationFrame(frameRequest)
    }
  }, [iframeHtml, iframeKey, previewDevice, shouldShowFrame])

  useEffect(() => {
    if (!shouldShowFrame) {
      detachInputListener()
      clearMeasureTimers()
      return undefined
    }

    syncEditorMode()
    return () => {
      detachInputListener()
      clearMeasureTimers()
    }
  }, [iframeHtml, iframeKey, isEditMode, shouldShowFrame])

  useEffect(() => {
    if (!shouldShowFrame) {
      return undefined
    }

    const handleResize = () => {
      scheduleFrameMeasurement()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [iframeHtml, iframeKey, previewDevice, shouldShowFrame])

  const canEdit = previewState === 'done' && Boolean(iframeHtml)
  const frameSource = iframeHtml || '<!doctype html><html><head><meta charset="utf-8" /></head><body></body></html>'
  const steps = buildGenerationSteps(progress?.step, generationMode)
  const activeStep = steps.find((item) => item.status === 'running') ?? steps[steps.length - 1]
  const showTemplateRail = generationMode === 'structured-template' && Boolean(selectedTemplate)
  const progressPercent = Math.max(0, Math.min(100, Number(progress?.percent || 0)))

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
              网页视图
            </button>
            <button
              className={previewDevice === 'mobile' ? 'is-active' : ''}
              onClick={() => onDeviceChange('mobile')}
              type="button"
            >
              手机视图
            </button>
          </div>

          {!isEditMode ? (
            <button className="toolbar-button toolbar-button--ghost" disabled={!canEdit} onClick={handleEditToggle} type="button">
              <span className="toolbar-button__icon" aria-hidden="true">
                ✎
              </span>
              <span>{hasEditedContent ? '继续润色' : '编辑内容'}</span>
            </button>
          ) : (
            <>
              <button className="toolbar-button toolbar-button--primary" onClick={handleApplyClick} type="button">
                <span className="toolbar-button__icon" aria-hidden="true">
                  ✓
                </span>
                <span>应用修改</span>
              </button>
              <button className="toolbar-button toolbar-button--ghost" onClick={handleCancelClick} type="button">
                <span className="toolbar-button__icon" aria-hidden="true">
                  ↺
                </span>
                <span>取消编辑</span>
              </button>
            </>
          )}
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
            disabled={!copyReady || isEditMode}
            onClick={handleCopyClick}
            type="button"
          >
            <span className="toolbar-button__icon" aria-hidden="true">
              ⧉
            </span>
            <span>{copiedReady ? '已复制' : '复制链接'}</span>
          </button>
          <button className="toolbar-button toolbar-button--primary" disabled={!exportReady || isEditMode} onClick={handleExportClick} type="button">
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
            <div className="idle-state__main">
              <div className="idle-state__intro">
                <span className="idle-state__eyebrow">预览待命</span>
                <strong>{generationMode === 'llm-html' ? 'LLM 生成模式已就绪' : '模板生成模式已就绪'}</strong>
                <p>{generationMode === 'llm-html' ? '上传文件或输入正文后，系统将直接生成完整 HTML 报告。' : '选择模板后上传文件或输入正文，系统将先结构化再渲染报告。'}</p>
              </div>

              <div className="idle-state__steps">
                <div className="idle-state-step">
                  <div className="idle-state-step__index">01</div>
                  <div className="idle-state-step__body">
                    <strong>准备输入内容</strong>
                    <p>上传 Word/PDF/TXT，或直接输入正文。</p>
                  </div>
                </div>
                <div className="idle-state-step">
                  <div className="idle-state-step__index">02</div>
                  <div className="idle-state-step__body">
                    <strong>启动智能生成</strong>
                    <p>系统执行抽取、推理与模板/HTML 渲染。</p>
                  </div>
                </div>
                <div className="idle-state-step">
                  <div className="idle-state-step__index">03</div>
                  <div className="idle-state-step__body">
                    <strong>完成后展示报告</strong>
                    <p>右侧自动切换为可编辑、可导出的预览页面。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="idle-state__aside">
              <div className="idle-state__placeholder">
                <strong>右侧预览区域</strong>
                <p>当前为待机状态。点击“{generationMode === 'llm-html' ? '生成 LLM 报告' : '生成可视化报告'}”后将切换为全区域加载动画。</p>
                {showTemplateRail && templates.length > 0 ? (
                  <p className="idle-template-hint">已接入 {templates.length} 个内置模板，可先在中间卡片列切换。</p>
                ) : null}
              </div>

              {recentReports.length > 0 ? (
                <div className="recent-reports recent-reports--panel">
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
            </div>
          </div>
        ) : null}

        {shouldShowFrame ? (
          <div
            className={`preview-stage-frame ${previewDevice === 'mobile' ? 'is-mobile' : ''} ${isEditMode ? 'is-editing' : ''}`}
            ref={fullscreenTargetRef}
          >
            <div className={`iframe-shell ${previewDevice === 'mobile' ? 'is-mobile' : ''} ${isEditMode ? 'is-editing' : ''}`}>
              <iframe
                key={iframeKey}
                className={`preview-frame ${previewDevice === 'mobile' ? 'is-mobile' : ''} ${frameReady ? '' : 'is-measuring'}`}
                onLoad={handleFrameLoad}
                ref={iframeRef}
                srcDoc={frameSource}
                style={{
                  height: `${frameHeight}px`,
                  width: previewDevice === 'mobile' ? `${mobileFrameWidth}px` : '100%',
                }}
                title={previewTitle || 'Docs2Brief Preview'}
              />
            </div>
          </div>
        ) : null}

        {previewState === 'generating' ? (
          <div className="preview-stage-body generating-state">
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
                <div className="progress-percent-chip">{progressPercent}%</div>
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
                aria-valuenow={progressPercent}
              >
                <div className="progress-track__fill" style={{ width: `${Math.max(progressPercent, 6)}%` }} />
              </div>

              <div className="progress-meta">
                <span>当前阶段：{activeStep?.description ?? '处理中'}</span>
                <span>{progressPercent}%</span>
              </div>
            </div>

            <aside aria-hidden="true" className="preview-placeholder-panel glass-panel">
              <div className="preview-placeholder-panel__header">
                <span>实时预览准备中</span>
                <strong>生成完成后自动切换报告页</strong>
              </div>
              <div className="preview-placeholder-device">
                <div className="preview-placeholder-document" />
              </div>
              <div className="progress-activity">
                <strong>系统活动</strong>
                <div className="progress-activity__item">模型调用与结果校验</div>
                <div className="progress-activity__item">结构化数据合成</div>
                <div className="progress-activity__item">页面渲染与可编辑态注入</div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>

      {showSuccessToast ? <div className="success-toast">✓ 报告生成成功</div> : null}
    </section>
  )
}
