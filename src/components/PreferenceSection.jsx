import { ModernSelect } from './ModernSelect'

export function PreferenceSection({
  generationMode,
  generationModes,
  onGenerationModeChange,
  stylePreference,
  styles,
  onStyleChange,
  department,
  departments,
  onDepartmentChange,
  audience,
  audiences,
  onAudienceChange,
  sensitiveMode,
  onSensitiveModeChange,
}) {
  return (
    <section className="control-section control-section--compact glass-panel">
      <div className="section-header section-header--compact">
        <span className="section-index">生成配置</span>
        <div>
          <h2 className="font-headline">控制台</h2>
          <p>先配置生成模式和上下文；模板生成模式可在中间模板卡片列切换模板。</p>
        </div>
      </div>

      <div className="compact-mode-switch">
        {generationModes.map((item) => (
          <button
            key={item.id}
            className={generationMode === item.id ? 'is-active' : ''}
            onClick={() => onGenerationModeChange(item.id)}
            type="button"
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="compact-select-grid">
        <ModernSelect label="风格" options={styles} value={stylePreference} onValueChange={onStyleChange} />
        <ModernSelect label="部门" options={departments} value={department} onValueChange={onDepartmentChange} />
        <ModernSelect label="受众" options={audiences} value={audience} onValueChange={onAudienceChange} />
      </div>

      <button className={`compact-toggle ${sensitiveMode ? 'is-active' : ''}`} onClick={onSensitiveModeChange} type="button">
        <div>
          <strong>敏感表达模式</strong>
          <span>自动降低措辞强度，适合正式汇报。</span>
        </div>
        <i />
      </button>
    </section>
  )
}
