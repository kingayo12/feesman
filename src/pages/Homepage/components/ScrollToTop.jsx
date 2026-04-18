import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  // Access the current location (URL)
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to the top of the page smoothly
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // Use "smooth" if you want a sliding effect
    });
  }, [pathname]); // This runs every time the path changes

  return null;
};

export default ScrollToTop;
