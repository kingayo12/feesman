/**
 * CacheBanner.jsx
 * Shows a consent banner on first visit and an update-ready toast.
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
    </>
  );
}
