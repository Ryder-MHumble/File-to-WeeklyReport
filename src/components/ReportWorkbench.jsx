import { GenerateSection } from './GenerateSection'
import { PreferenceSection } from './PreferenceSection'
import { PreviewPane } from './PreviewPane'
import { SourceSection } from './SourceSection'
import { TemplateBridgePanel } from './TemplateBridgePanel'
import { useWorkbenchController } from '../hooks/use-workbench-controller'

export function ReportWorkbench({ onProductModeChange, productMode, HeaderComponent }) {
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

  return (
    <div className={`app-shell ${isGenerating ? 'is-generating' : ''}`}>
      <HeaderComponent onProductModeChange={onProductModeChange} productMode={productMode} />

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
