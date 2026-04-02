import { useState } from 'react'
import { formatBytes } from '../lib/ui-helpers'

export function SourceSection({
  inputMode,
  onInputModeChange,
  selectedFile,
  onFileSelect,
  onFileRemove,
  manualText,
  onManualTextChange,
}) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0] ?? null
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <section className="control-section glass-panel">
      <div className="section-header section-header--compact">
        <span className="section-index">内容来源</span>
        <div>
          <h2 className="font-headline">内容来源</h2>
          <p>上传文档或直接输入正文，AI 会自动提取结构。</p>
        </div>
      </div>

      <div className="mode-tabs">
        <button className={inputMode === 'file' ? 'is-active' : ''} onClick={() => onInputModeChange('file')} type="button">
          上传文件
        </button>
        <button className={inputMode === 'text' ? 'is-active' : ''} onClick={() => onInputModeChange('text')} type="button">
          文字输入
        </button>
      </div>

      {inputMode === 'file' ? (
        selectedFile ? (
          <div className="uploaded-file-card">
            <div>
              <strong>{selectedFile.name}</strong>
              <span>{formatBytes(selectedFile.size)}</span>
            </div>
            <button onClick={onFileRemove} type="button">
              ×
            </button>
          </div>
        ) : (
          <label
            className={`upload-dropzone ${dragActive ? 'is-drag-active' : ''}`}
            htmlFor="source-upload"
            onDragEnter={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setDragActive(false)
            }}
            onDrop={handleDrop}
          >
            <input
              className="hidden-input"
              id="source-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (file) {
                  onFileSelect(file)
                }
              }}
            />
            <div className="upload-icon" aria-hidden="true">
              ☁
            </div>
            <strong>拖拽文件至此处</strong>
            <p>支持 Word · PDF · TXT · Markdown</p>
            <span>点击选择文件</span>
          </label>
        )
      ) : (
        <label className="text-input-panel">
          <textarea
            placeholder="将周报内容粘贴到此处，AI 将自动提取结构..."
            value={manualText}
            onChange={(event) => onManualTextChange(event.target.value)}
          />
          <div className="char-counter">{manualText.trim().length} 字</div>
        </label>
      )}
    </section>
  )
}
