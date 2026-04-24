import { useState } from 'react'
import { formatBytes } from '../lib/ui-helpers'

export function SourceSection({
  inputMode,
  onInputModeChange,
  selectedFiles,
  onFileSelect,
  onFileRemove,
  manualText,
  onManualTextChange,
}) {
  const [dragActive, setDragActive] = useState(false)
  const uploadedFiles = Array.isArray(selectedFiles) ? selectedFiles : []
  const totalFileSize = uploadedFiles.reduce((sum, file) => sum + (file?.size || 0), 0)

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    const files = Array.from(event.dataTransfer.files || [])
    if (files.length > 0) {
      onFileSelect(files)
    }
  }

  return (
    <section className="control-section glass-panel">
      <div className="section-header section-header--compact">
        <div>
          <h2 className="font-headline">内容来源</h2>
          <p>上传一个或多个文档，或直接输入正文，AI 会自动提取结构。</p>
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
        <div className="uploaded-file-stack">
          {uploadedFiles.length > 0 ? (
            <>
              <div className="uploaded-file-summary">
                <strong>已添加 {uploadedFiles.length} 个文件</strong>
                <span>总大小 {formatBytes(totalFileSize)}</span>
              </div>
              <div className="uploaded-file-list">
                {uploadedFiles.map((file, index) => (
                  <div className="uploaded-file-card" key={`${file.name}-${file.size}-${file.lastModified}-${index}`}>
                    <div>
                      <strong>{file.name}</strong>
                      <span>{formatBytes(file.size)}</span>
                    </div>
                    <button onClick={() => onFileRemove(index)} type="button">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <label
            className={`upload-dropzone ${dragActive ? 'is-drag-active' : ''} ${
              uploadedFiles.length > 0 ? 'upload-dropzone--compact' : ''
            }`}
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
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files || [])
                if (files.length > 0) {
                  onFileSelect(files)
                }
                event.target.value = ''
              }}
            />
            <div className="upload-icon" aria-hidden="true">
              ☁
            </div>
            <strong>{uploadedFiles.length > 0 ? '继续添加文件' : '拖拽文件至此处'}</strong>
            <p>支持 Word · PDF · TXT · Markdown，多文件将按添加顺序合并生成</p>
            <span>{uploadedFiles.length > 0 ? '点击追加文件' : '点击选择多个文件'}</span>
          </label>
        </div>
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
