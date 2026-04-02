export function GenerateSection({ disabled, isGenerating, onGenerateAction, generationMode, isReportReady }) {
  const inResetMode = isReportReady && !isGenerating
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
          <span>AI 深度分析中...</span>
        </>
      ) : (
        <span>{inResetMode ? '清空报告页面' : generationMode === 'llm-html' ? '生成 LLM 报告' : '生成可视化报告'}</span>
      )}
    </button>
  )
}
