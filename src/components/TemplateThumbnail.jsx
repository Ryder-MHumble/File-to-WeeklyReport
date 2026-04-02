export function TemplateThumbnail({ variant }) {
  if (variant === 'dark-tech') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <defs>
          <linearGradient id="thumb-dark-tech" x1="0" x2="1">
            <stop offset="0%" stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#thumb-dark-tech)" strokeWidth="1.4">
          <path d="M8 47 L26 34 L40 38 L57 20 L80 15" />
          <path d="M10 54 C20 42, 32 28, 46 34 S66 46, 80 24" opacity="0.55" />
        </g>
        <g fill="#00D4FF">
          <circle cx="12" cy="18" r="2.2" />
          <circle cx="28" cy="24" r="1.8" />
          <circle cx="43" cy="14" r="1.6" />
          <circle cx="63" cy="28" r="2" />
          <circle cx="76" cy="19" r="2.2" />
        </g>
      </svg>
    )
  }

  if (variant === 'business-pro') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <rect x="10" y="16" width="12" height="34" rx="3" fill="#6C63FF" opacity="0.9" />
        <rect x="27" y="24" width="12" height="26" rx="3" fill="#00D4FF" opacity="0.75" />
        <rect x="44" y="12" width="12" height="38" rx="3" fill="#00E676" opacity="0.75" />
        <g stroke="#8BA3BC" strokeWidth="1.4">
          <path d="M64 18 H79" />
          <path d="M64 28 H79" />
          <path d="M64 38 H79" />
          <path d="M64 48 H74" />
        </g>
      </svg>
    )
  }

  if (variant === 'data-insight') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <text x="10" y="36" fill="#E2E4F6" fontSize="24" fontWeight="700">
          91
        </text>
        <g transform="translate(58 16)">
          <circle cx="12" cy="12" r="11" fill="none" stroke="#273040" strokeWidth="5" />
          <path d="M12 1 A11 11 0 1 1 4 21" fill="none" stroke="#00D4FF" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
    )
  }

  if (variant === 'project-pulse') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <rect x="8" y="10" width="22" height="44" rx="6" fill="#141928" stroke="#00D4FF" strokeOpacity="0.5" />
        <rect x="33" y="18" width="22" height="36" rx="6" fill="#141928" stroke="#6C63FF" strokeOpacity="0.5" />
        <rect x="58" y="14" width="22" height="40" rx="6" fill="#141928" stroke="#00E676" strokeOpacity="0.5" />
      </svg>
    )
  }

  if (variant === 'minimal-brief') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <g stroke="#E2E4F6" strokeWidth="1.4">
          <path d="M10 18 H74" />
          <path d="M10 26 H80" opacity="0.82" />
          <path d="M10 34 H66" opacity="0.72" />
          <path d="M10 42 H70" opacity="0.6" />
          <path d="M10 50 H54" opacity="0.48" />
        </g>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
      <rect x="10" y="12" width="18" height="18" rx="6" fill="#6C63FF" />
      <rect x="35" y="12" width="18" height="18" rx="6" fill="#00D4FF" />
      <rect x="60" y="12" width="18" height="18" rx="6" fill="#00E676" />
      <text x="10" y="53" fill="#E2E4F6" fontSize="18" fontWeight="700">
        120
      </text>
      <text x="50" y="53" fill="#8BA3BC" fontSize="10">
        exec
      </text>
    </svg>
  )
}
