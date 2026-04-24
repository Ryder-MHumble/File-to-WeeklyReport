import { useEffect, useRef, useState } from 'react'
import './index.css'
import './ui-cleanup.css'
import { GenerateSection } from './components/GenerateSection'
import { PreferenceSection } from './components/PreferenceSection'
import { PreviewPane } from './components/PreviewPane'
import { SourceSection } from './components/SourceSection'
import { TemplateBridgePanel } from './components/TemplateBridgePanel'
import { useWorkbenchController } from './hooks/use-workbench-controller'
import brandLogo from '../data/img/logo.png'

export default function App() {
  const {
    audience,
    audienceCatalog,
    canPrimaryAction,
    copiedReady,
    copyReady,
    department,
    departmentCatalog,
    documentData,
    editedHtml,
    errorMessage,
    exportReady,
    fullscreenReady,
    generationMode,
    generationModeCatalog,
    generationProgress,
    handleApplyEdit,
    handleCopyLink,
    handleCancelEdit,
    handleEditChange,
    handleEditStart,
    handleExport,
    handleFullscreen,
    handleGenerateAction,
    handleTemplateSelect,
    iframeKey,
    inputMode,
    isEditMode,
    isGenerating,
    isReportReady,
    manualText,
    onAudienceChange,
    onDepartmentChange,
    onFileRemove,
    onFileSelect,
    onGenerationModeChange,
    onInputModeChange,
    onManualTextChange,
    onSensitiveModeChange,
    onStyleChange,
    previewDevice,
    previewHtml,
    previewFullscreenRef,
    previewStageRef,
    previewState,
    recentReports,
    selectedFiles,
    selectedTemplate,
    sensitiveMode,
    setPreviewDevice,
    showSuccessToast,
    showTemplateBridge,
    styleCatalog,
    stylePreference,
    templateBridgeListRef,
    templateOptionCatalog,
    warnings,
  } = useWorkbenchController()

  const [contactCopyState, setContactCopyState] = useState('idle')
  const copyResetTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current)
      }
    }
  }, [])

  const handleSupportContactClick = async () => {
    if (copyResetTimerRef.current) {
      window.clearTimeout(copyResetTimerRef.current)
    }

    let copied = false
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText('孙铭浩')
        copied = true
      }
    } catch (error) {
      copied = false
    }

    setContactCopyState(copied ? 'copied' : 'failed')
    copyResetTimerRef.current = window.setTimeout(() => {
      setContactCopyState('idle')
    }, copied ? 1800 : 2400)
  }

  return (
    <div className={`app-shell ${isGenerating ? 'is-generating' : ''}`}>
      <header className="app-topbar">
        <div className="brand-lockup">
          <img alt="Docs2Brief Logo" className="brand-logo" src={brandLogo} />
          <div>
            <div className="brand-title font-headline">Docs2Brief</div>
            <div className="brand-subtitle">document to weekly brief</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className={`icon-button topbar-contact-button ${
              contactCopyState === 'copied' ? 'is-copied' : contactCopyState === 'failed' ? 'is-failed' : ''
            }`}
            onClick={handleSupportContactClick}
            type="button"
          >
            <span aria-hidden="true">✦</span>
            <span>
              {contactCopyState === 'copied'
                ? '已复制：孙铭浩'
                : contactCopyState === 'failed'
                  ? '复制失败，请手动复制：孙铭浩'
                  : '需求反馈：孙铭浩'}
            </span>
          </button>
        </div>
      </header>

      <main className={`workspace ${showTemplateBridge ? 'workspace--with-template-bridge' : ''}`}>
        <aside className="control-panel control-panel--refined">
          <PreferenceSection
            audience={audience}
            audiences={audienceCatalog}
            department={department}
            departments={departmentCatalog}
            generationMode={generationMode}
            generationModes={generationModeCatalog}
            onAudienceChange={onAudienceChange}
            onDepartmentChange={onDepartmentChange}
            onGenerationModeChange={onGenerationModeChange}
            onSensitiveModeChange={onSensitiveModeChange}
            onStyleChange={onStyleChange}
            sensitiveMode={sensitiveMode}
            stylePreference={stylePreference}
            styles={styleCatalog}
          />

          <SourceSection
            inputMode={inputMode}
            manualText={manualText}
            onFileRemove={onFileRemove}
            onFileSelect={onFileSelect}
            onInputModeChange={onInputModeChange}
            onManualTextChange={onManualTextChange}
            selectedFiles={selectedFiles}
          />

          <GenerateSection
            disabled={!canPrimaryAction}
            generationMode={generationMode}
            isGenerating={isGenerating}
            isReportReady={isReportReady}
            onGenerateAction={handleGenerateAction}
          />

          {errorMessage ? <div className="status-banner status-banner--error">{errorMessage}</div> : null}
          {warnings.length > 0 ? (
            <details className="status-note-collapsible">
              <summary>生成说明（可选查看）</summary>
              <div className="status-note-collapsible__body">
                {warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            </details>
          ) : null}
        </aside>

        {showTemplateBridge ? (
          <TemplateBridgePanel
            bridgeListRef={templateBridgeListRef}
            onSelectTemplate={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id ?? null}
            templates={templateOptionCatalog}
          />
        ) : null}

        <section className="preview-column">
          <PreviewPane
            copiedReady={copiedReady}
            copyReady={copyReady}
            exportReady={exportReady}
            fullscreenReady={fullscreenReady}
            generationMode={generationMode}
            hasEditedContent={Boolean(editedHtml)}
            iframeHtml={previewHtml}
            iframeKey={iframeKey}
            isEditMode={isEditMode}
            onCopyLink={handleCopyLink}
            onDeviceChange={setPreviewDevice}
            onApplyEdit={handleApplyEdit}
            onCancelEdit={handleCancelEdit}
            onEditChange={handleEditChange}
            onEditStart={handleEditStart}
            onExport={handleExport}
            onFullscreen={handleFullscreen}
            previewDevice={previewDevice}
            fullscreenTargetRef={previewFullscreenRef}
            previewStageRef={previewStageRef}
            previewState={previewState}
            previewTitle={documentData.title}
            progress={generationProgress}
            recentReports={recentReports}
            selectedTemplate={selectedTemplate}
            showSuccessToast={showSuccessToast}
            templates={templateOptionCatalog}
          />
        </section>
      </main>
    </div>
  )
}
