import { useState, useEffect } from 'react'

export default function CookieConsent({ onNavigate }) {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: true,
    analytics: false,
  })

  useEffect(() => {
    try {
      const consent = localStorage.getItem('ati_cookie_consent')
      if (!consent) {
        // Show with small delay so page loads smoothly first
        const timer = setTimeout(() => setIsVisible(true), 400)
        return () => clearTimeout(timer)
      }
    } catch {
      // In case localStorage is blocked in private browsing
    }
  }, [])

  // Listen for consent updates from the CookiePolicy page
  useEffect(() => {
    const handleConsentUpdate = () => {
      try {
        const consent = localStorage.getItem('ati_cookie_consent')
        if (consent) {
          setIsVisible(false)
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('ati_cookie_consent_updated', handleConsentUpdate)
    return () => window.removeEventListener('ati_cookie_consent_updated', handleConsentUpdate)
  }, [])

  const saveConsent = (prefs) => {
    try {
      localStorage.setItem('ati_cookie_consent', JSON.stringify({
        ...prefs,
        updatedAt: new Date().toISOString(),
      }))
      window.dispatchEvent(new Event('ati_cookie_consent_updated'))
    } catch {
      // ignore
    }
    setIsVisible(false)
  }

  const handleAcceptAll = () => {
    saveConsent({ essential: true, functional: true, analytics: true })
  }

  const handleRejectNonEssential = () => {
    saveConsent({ essential: true, functional: false, analytics: false })
  }

  const handleSaveCustom = () => {
    saveConsent(preferences)
  }

  const handleOpenPolicy = () => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate('Cookie Policy')
    }
  }

  const handleOpenPrivacy = () => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate('Privacy Policy')
    }
  }

  if (!isVisible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-lg z-[60] animate-fadeInUp"
    >
      <div className="bg-white border-2 border-blue-100 rounded-2xl shadow-2xl p-5 sm:p-6 text-[#191c1e] relative overflow-hidden">
        {/* Subtle top decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#005691] via-blue-500 to-[#005691]" />

        {/* Close button */}
        <button
          onClick={handleRejectNonEssential}
          className="absolute top-3 right-3 text-[#505f76] hover:text-[#191c1e] p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Close cookie banner"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#005691] flex items-center justify-center flex-shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-2xl">cookie</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#005691] uppercase tracking-wider block">
              Privacy &amp; Transparency
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#191c1e] leading-snug">
              We Value Your Privacy &amp; Cookies
            </h2>
          </div>
        </div>

        {/* Body */}
        <p className="text-xs sm:text-sm text-[#505f76] leading-relaxed mb-4">
          AT International uses cookies and local storage to ensure secure navigation, maintain quotation drafts, and optimize your sourcing experience. Review our{' '}
          <button
            onClick={handleOpenPolicy}
            className="text-[#005691] font-semibold underline hover:text-[#003e69] cursor-pointer"
          >
            Cookie Policy
          </button>{' '}
          and{' '}
          <button
            onClick={handleOpenPrivacy}
            className="text-[#005691] font-semibold underline hover:text-[#003e69] cursor-pointer"
          >
            Privacy Policy
          </button>{' '}
          for complete details.
        </p>

        {/* Expandable Quick Preferences */}
        {showDetails && (
          <div className="mb-4 p-3.5 bg-[#f7f9fb] border border-[#c5c6cd] rounded-xl space-y-2.5 text-xs animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#191c1e] block">Strictly Necessary</span>
                <span className="text-[#505f76] text-[11px]">Required for website security and core routing</span>
              </div>
              <span className="text-[10px] font-bold text-[#005691] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                Always Active
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#c5c6cd]/40">
              <div>
                <span className="font-bold text-[#191c1e] block">Functional Cookies</span>
                <span className="text-[#505f76] text-[11px]">Saves quote drafts &amp; inquiry selections</span>
              </div>
              <button
                type="button"
                onClick={() => setPreferences(p => ({ ...p, functional: !p.functional }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  preferences.functional ? 'bg-[#005691]' : 'bg-gray-300'
                }`}
                aria-label="Toggle Functional Cookies"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    preferences.functional ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#c5c6cd]/40">
              <div>
                <span className="font-bold text-[#191c1e] block">Analytics Cookies</span>
                <span className="text-[#505f76] text-[11px]">Anonymous metrics on catalog navigation</span>
              </div>
              <button
                type="button"
                onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  preferences.analytics ? 'bg-[#005691]' : 'bg-gray-300'
                }`}
                aria-label="Toggle Analytics Cookies"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    preferences.analytics ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleAcceptAll}
            className="flex-1 bg-[#005691] text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl hover:brightness-110 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">check</span>
            Accept All
          </button>

          {showDetails ? (
            <button
              onClick={handleSaveCustom}
              className="bg-blue-50 text-[#005691] border border-blue-200 text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
            >
              Save Choice
            </button>
          ) : (
            <button
              onClick={handleRejectNonEssential}
              className="bg-[#f2f4f6] text-[#505f76] hover:text-[#191c1e] text-xs sm:text-sm font-semibold py-2.5 px-3.5 rounded-xl hover:bg-[#e6e8eb] transition-all cursor-pointer"
            >
              Reject Non-Essential
            </button>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold text-[#005691] hover:underline px-2 py-2 cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>{showDetails ? 'Fewer Options' : 'Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
