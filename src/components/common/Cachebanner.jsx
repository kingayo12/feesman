/**
 * CacheBanner.jsx
 * Shows a consent banner on first visit and an update-ready toast
 * whenever a new service worker version is available.
 *
 * Place in: src/components/common/CacheBanner.jsx
 *
 * Usage in App.jsx:
 *   import { useCacheConsent } from "./hooks/useCacheConsent";
 *   import CacheBanner from "./components/common/CacheBanner";
 *
 *   function App() {
 *     const cache = useCacheConsent();
 *     return (
 *       <AuthProvider>
 *         <AppRoutes />
 *         <CacheBanner {...cache} />
 *       </AuthProvider>
 *     );
 *   }
 */

export default function CacheBanner({
  showBanner,
  updateReady,
  acceptCache,
  declineCache,
  applyUpdate,
}) {
  return (
    <>
      {/* ── Consent banner ─────────────────────────────────────────────── */}
      {showBanner && (
        <div className='cb-overlay'>
          <div className='cb-banner' role='dialog' aria-label='Cache consent'>
            <div className='cb-icon'>
              <svg
                width='22'
                height='22'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
              </svg>
            </div>
            <div className='cb-body'>
              <p className='cb-title'>Enable offline mode</p>
              <p className='cb-desc'>
                This app can cache data so it works faster and stays usable when your internet
                connection is slow or unavailable. No personal data is stored outside your device.
              </p>
              <div className='cb-actions'>
                <button className='cb-btn cb-accept' onClick={acceptCache}>
                  Accept &amp; enable
                </button>
                <button className='cb-btn cb-decline' onClick={declineCache}>
                  No thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Update-ready toast ──────────────────────────────────────────── */}
      {updateReady && (
        <div className='cb-update-toast' role='alert'>
          <div className='cb-update-icon'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <polyline points='23 4 23 10 17 10' />
              <path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10' />
            </svg>
          </div>
          <span>A new version is available.</span>
          <button className='cb-update-btn' onClick={applyUpdate}>
            Refresh now
          </button>
          <button className='cb-update-dismiss' onClick={() => {}} aria-label='Dismiss'>
            ×
          </button>
        </div>
      )}

      <style>{`
        /* ── Consent banner ─────────────────────────────────────── */
        .cb-overlay {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          padding: 0 1rem 1.25rem;
          pointer-events: none;
        }

        .cb-banner {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-light, #e2e8f0);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          max-width: 520px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          pointer-events: all;
          animation: cb-slide-up 0.3s ease;
        }

        [data-theme="dark"] .cb-banner {
          background: #1e293b;
          border-color: #334155;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        @keyframes cb-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .cb-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: #eff6ff;
          color: #1d4ed8;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        [data-theme="dark"] .cb-icon { background: #1e3a5f; color: #93c5fd; }

        .cb-body { flex: 1; }

        .cb-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          margin: 0 0 6px;
        }
        [data-theme="dark"] .cb-title { color: #f1f5f9; }

        .cb-desc {
          font-size: 13px;
          color: var(--text-secondary, #64748b);
          margin: 0 0 1rem;
          line-height: 1.55;
        }
        [data-theme="dark"] .cb-desc { color: #94a3b8; }

        .cb-actions {
          display: flex;
          gap: 0.625rem;
          flex-wrap: wrap;
        }

        .cb-btn {
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s, filter 0.15s;
        }
        .cb-btn:hover { filter: brightness(0.92); }

        .cb-accept {
          background: #4f46e5;
          color: #fff;
        }

        .cb-decline {
          background: var(--bg-secondary, #f1f5f9);
          color: var(--text-secondary, #64748b);
          border: 1px solid var(--border-light, #e2e8f0);
        }
        [data-theme="dark"] .cb-decline {
          background: #0f172a;
          color: #94a3b8;
          border-color: #334155;
        }

        /* ── Update toast ─────────────────────────────────────── */
        .cb-update-toast {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0f172a;
          color: #f1f5f9;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.25);
          animation: cb-drop-in 0.3s ease;
          white-space: nowrap;
        }

        @keyframes cb-drop-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .cb-update-icon { display: flex; align-items: center; color: #60a5fa; }

        .cb-update-btn {
          padding: 5px 12px;
          border-radius: 6px;
          background: #4f46e5;
          color: #fff;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .cb-update-btn:hover { background: #4338ca; }

        .cb-update-dismiss {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
          padding: 0 2px;
        }
        .cb-update-dismiss:hover { color: #f1f5f9; }

        @media (max-width: 480px) {
          .cb-banner { flex-direction: column; }
          .cb-update-toast { white-space: normal; max-width: 90vw; }
        }

        @media print {
          .cb-overlay, .cb-update-toast { display: none !important; }
        }
      `}</style>
    </>
  );
}
