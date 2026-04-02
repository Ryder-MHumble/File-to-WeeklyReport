import './index.css'
import { GenerateSection } from './components/GenerateSection'
import { PreferenceSection } from './components/PreferenceSection'
import { PreviewPane } from './components/PreviewPane'
import { SourceSection } from './components/SourceSection'
import { TemplateBridgePanel } from './components/TemplateBridgePanel'
import { useWorkbenchController } from './hooks/use-workbench-controller'

export default function App() {
  const {
    audience,
    audienceCatalog,
    canGenerate,
    copiedReady,
    copyReady,
    department,
    departmentCatalog,
    documentData,
    errorMessage,
    exportReady,
    fullscreenReady,
    generationMode,
    generationModeCatalog,
    generationProgress,
    handleCopyLink,
    handleExport,
    handleFullscreen,
    handleGenerate,
    handleTemplateSelect,
    iframeKey,
    inputMode,
    isGenerating,
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
    previewStageRef,
    previewState,
    recentReports,
    selectedFile,
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
            selectedFile={selectedFile}
          />

          <GenerateSection disabled={!canGenerate} generationMode={generationMode} isGenerating={isGenerating} onGenerate={handleGenerate} />

          {errorMessage ? <div className="status-banner status-banner--error">{errorMessage}</div> : null}
          {warnings.length > 0 ? (
            <div className="status-banner status-banner--warning">
              {warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
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
            iframeHtml={previewHtml}
            iframeKey={iframeKey}
            onCopyLink={handleCopyLink}
            onDeviceChange={setPreviewDevice}
            onExport={handleExport}
            onFullscreen={handleFullscreen}
            previewDevice={previewDevice}
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
