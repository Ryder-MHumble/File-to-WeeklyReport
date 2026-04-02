export function GenerateSection({ disabled, isGenerating, onGenerate, generationMode }) {
  return (
    <button
      aria-busy={isGenerating}
      className={`generate-action-button ${isGenerating ? 'is-generating' : ''}`}
      disabled={disabled}
      onClick={onGenerate}
      type="button"
    >
      <span aria-hidden="true" className="generate-action-button__glow" />
      {isGenerating ? (
        <>
          <span className="button-spinner" />
          <span>AI 深度分析中...</span>
        </>
      ) : (
        <span>{generationMode === 'llm-html' ? '生成 LLM 报告' : '生成可视化报告'}</span>
      )}
    </button>
  )
}
