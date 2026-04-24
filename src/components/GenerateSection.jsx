export function GenerateSection({
  disabled,
  isGenerating,
  onGenerateAction,
  generationMode,
  isReportReady,
  idleLabel = '',
  loadingLabel = 'AI 深度分析中...',
  resetLabel = '清空报告页面',
}) {
  const inResetMode = isReportReady && !isGenerating
  const resolvedIdleLabel =
    idleLabel || (generationMode === 'llm-html' ? '生成 LLM 报告' : generationMode === 'poster' ? '生成海报' : '生成可视化报告')
  return (
    <button
      aria-busy={isGenerating}
      className={`generate-action-button ${isGenerating ? 'is-generating' : ''} ${inResetMode ? 'is-reset' : ''}`}
      disabled={disabled}
      onClick={onGenerateAction}
      type="button"
    >
      <span aria-hidden="true" className="generate-action-button__glow" />
      {isGenerating ? (
        <>
          <span className="button-spinner" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <span>{inResetMode ? resetLabel : resolvedIdleLabel}</span>
      )}
    </button>
  )
}
