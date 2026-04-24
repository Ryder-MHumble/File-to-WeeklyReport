import { useEffect, useRef, useState } from 'react'
import { productModeCatalog } from '../config/poster'
import brandLogo from '../../data/img/logo.png'

export function AppHeader({ productMode, onProductModeChange }) {
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
    } catch {
      copied = false
    }

    setContactCopyState(copied ? 'copied' : 'failed')
    copyResetTimerRef.current = window.setTimeout(() => {
      setContactCopyState('idle')
    }, copied ? 1800 : 2400)
  }

  return (
    <header className="app-topbar">
      <div className="brand-lockup">
        <img alt="Docs2Brief Logo" className="brand-logo" src={brandLogo} />
        <div>
          <div className="brand-title font-headline">Docs2Brief</div>
          <div className="brand-subtitle">document to weekly brief & poster</div>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="product-mode-switch" role="tablist" aria-label="业务模式切换">
          {productModeCatalog.map((item) => (
            <button
              key={item.id}
              aria-selected={productMode === item.id}
              className={productMode === item.id ? 'is-active' : ''}
              onClick={() => onProductModeChange(item.id)}
              role="tab"
              type="button"
            >
              {item.name}
            </button>
          ))}
        </div>

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
  )
}
