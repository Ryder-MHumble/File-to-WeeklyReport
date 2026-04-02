import * as Select from '@radix-ui/react-select'

export function ModernSelect({ label, options, value, onValueChange }) {
  return (
    <div className="compact-field">
      <span>{label}</span>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger className="radix-select-trigger" aria-label={label}>
          <Select.Value />
          <Select.Icon className="radix-select-icon">⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="radix-select-content" position="popper" sideOffset={8}>
            <Select.Viewport className="radix-select-viewport">
              {options.map((item) => (
                <Select.Item className="radix-select-item" key={item.id} value={item.id}>
                  <Select.ItemText>{item.name}</Select.ItemText>
                  <Select.ItemIndicator className="radix-select-item-indicator">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
