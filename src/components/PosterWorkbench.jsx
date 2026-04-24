import { GenerateSection } from './GenerateSection'
import { PosterPreferenceSection } from './PosterPreferenceSection'
import { PosterPreviewPane } from './PosterPreviewPane'
import { SourceSection } from './SourceSection'
import { usePosterWorkbenchController } from '../hooks/use-poster-workbench-controller'

export function PosterWorkbench({ onProductModeChange, productMode, HeaderComponent }) {
  const {
    aspectRatio,
    aspectRatioCatalog,
    canPrimaryAction,
    department,
    departmentCatalog,
    downloadReady,
    errorMessage,
    generationProgress,
    handleDownload,
    handleGenerateAction,
    imageSize,
    imageSizeCatalog,
    inputMode,
    isGenerating,
    isPosterReady,
    manualText,
    onAspectRatioChange,
    onDepartmentChange,
    onFileRemove,
    onFileSelect,
    onImageSizeChange,
    onInputModeChange,
    onManualTextChange,
    onPosterSceneChange,
    onPosterStyleChange,
    onSensitiveModeChange,
    posterData,
    posterScene,
    posterSceneCatalog,
    posterStyle,
    posterStyleCatalog,
    recentPosters,
    selectedFiles,
    sensitiveMode,
    warnings,
  } = usePosterWorkbenchController()

  return (
    <div className={`app-shell ${isGenerating ? 'is-generating' : ''}`}>
      <HeaderComponent onProductModeChange={onProductModeChange} productMode={productMode} />

      <main className="workspace workspace--poster-mode">
        <aside className="control-panel control-panel--refined">
          <PosterPreferenceSection
            aspectRatio={aspectRatio}
            aspectRatios={aspectRatioCatalog}
            department={department}
            departments={departmentCatalog}
            imageSize={imageSize}
            imageSizes={imageSizeCatalog}
            onAspectRatioChange={onAspectRatioChange}
            onDepartmentChange={onDepartmentChange}
            onImageSizeChange={onImageSizeChange}
            onPosterSceneChange={onPosterSceneChange}
            onPosterStyleChange={onPosterStyleChange}
            onSensitiveModeChange={onSensitiveModeChange}
            posterScene={posterScene}
            posterScenes={posterSceneCatalog}
            posterStyle={posterStyle}
            posterStyles={posterStyleCatalog}
            sensitiveMode={sensitiveMode}
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
            generationMode="poster"
            isGenerating={isGenerating}
            isReportReady={isPosterReady}
            loadingLabel="海报生成中..."
            idleLabel="生成海报"
            onGenerateAction={handleGenerateAction}
            resetLabel="清空海报结果"
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

        <section className="preview-column">
          <PosterPreviewPane
            downloadReady={downloadReady}
            imageDataUrl={posterData.imageDataUrl}
            isGenerating={isGenerating}
            isPosterReady={isPosterReady}
            modelUsed={posterData.modelUsed}
            onDownload={handleDownload}
            posterBrief={posterData.brief}
            posterScene={posterScene}
            posterStyle={posterStyle}
            progress={generationProgress}
            recentPosters={recentPosters}
            title={posterData.title}
          />
        </section>
      </main>
    </div>
  )
}
