import AppRoutes from "./Routes";
import { useCacheConsent } from "./hooks/Usecacheconsent";
import CacheBanner from "./components/common/Cachebanner";
function App() {
  const cache = useCacheConsent();
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
