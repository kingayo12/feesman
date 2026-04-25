import { useEffect } from "react";
import AppRoutes from "./Routes";
import { useCacheConsent } from "./hooks/Usecacheconsent";
import CacheBanner from "./components/common/Cachebanner";
import { initializeBackgroundSync } from "./utils/backgroundSync";

function App() {
  const cache = useCacheConsent();

  useEffect(() => {
    // Initialize background sync on app startup
    initializeBackgroundSync();
  }, []);

  return (
    <>
      <AppRoutes />
      <CacheBanner
        showBanner={cache.showBanner}
        updateReady={cache.updateReady}
        acceptCache={cache.acceptCache}
        declineCache={cache.declineCache}
        applyUpdate={cache.applyUpdate}
      />
    </>
  );
}
export default App;
