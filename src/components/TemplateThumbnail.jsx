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

  if (variant === 'neo-brutal-poster') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <rect x="6" y="8" width="76" height="48" fill="#fdf5e3" stroke="#121212" strokeWidth="2.8" />
        <text x="12" y="24" fill="#121212" fontSize="10" fontWeight="800">
          BRUTAL
        </text>
        <rect x="12" y="28" width="40" height="10" fill="#ff5a2f" stroke="#121212" strokeWidth="1.8" />
        <rect x="54" y="28" width="22" height="10" fill="#12a4ff" stroke="#121212" strokeWidth="1.8" />
        <rect x="12" y="41" width="64" height="10" fill="#ffe24c" stroke="#121212" strokeWidth="1.8" />
      </svg>
    )
  }

  if (variant === 'ink-scroll') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <rect x="10" y="10" width="68" height="44" rx="8" fill="#20150c" opacity="0.22" />
        <rect x="14" y="14" width="60" height="36" rx="6" fill="#f5efe4" opacity="0.9" />
        <line x1="22" y1="22" x2="66" y2="22" stroke="#5a4633" strokeWidth="1.6" />
        <line x1="22" y1="30" x2="62" y2="30" stroke="#7a6550" strokeWidth="1.4" />
        <line x1="22" y1="38" x2="58" y2="38" stroke="#9d8468" strokeWidth="1.2" />
        <circle cx="20" cy="47" r="3" fill="#b93838" />
      </svg>
    )
  }

  if (variant === 'cyber-grid') {
    return (
      <svg viewBox="0 0 88 64" className="template-thumb-svg" aria-hidden="true">
        <rect x="8" y="10" width="72" height="44" rx="6" fill="#060912" stroke="#12304a" />
        <path d="M8 24 H80 M8 38 H80 M24 10 V54 M40 10 V54 M56 10 V54 M72 10 V54" stroke="#0b2741" strokeWidth="0.8" />
        <path d="M14 18 H28 M60 46 H74" stroke="#00e5ff" strokeWidth="1.6" />
        <circle cx="20" cy="30" r="2" fill="#00e5ff" />
        <circle cx="34" cy="30" r="2" fill="#00ff8a" />
        <circle cx="48" cy="30" r="2" fill="#ff2ea6" />
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
