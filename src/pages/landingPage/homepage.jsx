import { useState, useEffect } from "react";

// Components
import Nav from "../../components/homepage/Nav";
import Hero from "../../components/homepage/Hero";
import Features from "../../components/homepage/Features";
import Steps from "../../components/homepage/Steps";
import Testimonials from "../../components/homepage/Testimonials";
import Pricing from "../../components/homepage/Pricing";
import Footer from "../../components/homepage/Footer";

// Styles
import "../../styles/landing.css";

/**
 * Viewport width hook — drives responsive layout decisions.
 * Components receive isMobile / isTablet / viewportWidth as props
 * so each section can swap between grid and slider layouts.
 */
function useViewport() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    viewportWidth: w,
    isMobile: w < 640,
    isTablet: w < 1024,
  };
}

export default function Homepage() {
  const viewport = useViewport();

  return (
    <div className='lp-root'>
      <Nav />
      <Hero {...viewport} />
      <Features {...viewport} />
      <Steps {...viewport} />
      <Testimonials />
      <Pricing {...viewport} />
      <Footer />
    </div>
  );
}
