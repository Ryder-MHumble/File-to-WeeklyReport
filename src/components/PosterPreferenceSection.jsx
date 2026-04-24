import { ModernSelect } from './ModernSelect'

export function PosterPreferenceSection({
  aspectRatio,
  aspectRatios,
  department,
  departments,
  imageSize,
  imageSizes,
  onAspectRatioChange,
  onDepartmentChange,
  onImageSizeChange,
  onPosterSceneChange,
  onPosterStyleChange,
  onSensitiveModeChange,
  posterScene,
  posterScenes,
  posterStyle,
  posterStyles,
  sensitiveMode,
}) {
  return (
    <section className="control-section control-section--compact glass-panel">
      <div className="section-header section-header--compact">
        <div>
          <h2 className="font-headline">海报控制台</h2>
          <p>从文档提炼宣传要点，输出研究院内宣或外宣海报。</p>
        </div>
      </div>

      <div className="poster-style-lead">
        <strong>{posterStyle.name}</strong>
        <span>{posterScene.name}</span>
        <p>{posterStyle.description}</p>
      </div>

      <div className="compact-select-grid compact-select-grid--poster">
        <ModernSelect label="海报场景" options={posterScenes} value={posterScene.id} onValueChange={onPosterSceneChange} menuMode="wide" />
        <ModernSelect label="视觉风格" options={posterStyles} value={posterStyle.id} onValueChange={onPosterStyleChange} menuMode="wide" />
        <ModernSelect label="部门" options={departments} value={department} onValueChange={onDepartmentChange} menuMode="wide" />
        <ModernSelect label="输出比例" options={aspectRatios} value={aspectRatio} onValueChange={onAspectRatioChange} />
        <ModernSelect label="图像尺寸" options={imageSizes} value={imageSize} onValueChange={onImageSizeChange} />
      </div>

      <button className={`compact-toggle ${sensitiveMode ? 'is-active' : ''}`} onClick={onSensitiveModeChange} type="button">
        <div>
          <strong>敏感表达模式</strong>
          <span>偏正式、克制，适合院内通知与研究成果传播。</span>
        </div>
        <i />
      </button>
    </section>
  )
}
