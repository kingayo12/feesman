// src/utils/lazyLoad.js
// Optional: Use this utility to wrap route components with lazy loading
// This reduces initial bundle size by splitting code at route boundaries

import { lazy, Suspense } from "react";
import Loader from "../components/common/Loader";

/**
 * Wraps a route component with lazy loading and loading fallback
 * @param {Function} importFn - Dynamic import function: () => import('./path/to/Component')
 * @param {string} componentName - Name of the component (for debugging)
 * @returns {Object} - Object with Component and Fallback
 */
export function lazyLoadRoute(importFn, componentName = "Component") {
  const LazyComponent = lazy(importFn);

  return {
    Component: LazyComponent,
    Fallback: ({ message = `Loading ${componentName}...` }) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
          gap: "1rem",
        }}
      >
        <Loader />
        <p style={{ color: "#666", fontSize: "0.875rem" }}>{message}</p>
      </div>
    ),
    Suspense: ({ children, fallback }) => (
      <Suspense fallback={fallback || <Loader />}>{children}</Suspense>
    ),
  };
}

/**
 * Helper to suspend a component with centered loader
 */
export const withSuspense =
  (Component, fallback = null) =>
  () => (
    <Suspense
      fallback={
        fallback || (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100vh",
            }}
          >
            <Loader />
          </div>
        )
      }
    >
      <Component />
    </Suspense>
  );

// Example usage in Routes.jsx:
/*
import { lazyLoadRoute, withSuspense } from './utils/lazyLoad';

// Method 1: Using lazyLoadRoute helper
const dashboardRoute = lazyLoadRoute(
  () => import('./pages/dashboard/Dashboard'),
  'Dashboard'
);

// In your route definition:
<Route 
  path="/dashboard" 
  element={
    <Suspense fallback={<dashboardRoute.Fallback />}>
      <dashboardRoute.Component />
    </Suspense>
  } 
/>

// Method 2: Using withSuspense helper (simpler)
const StudentList = withSuspense(() => 
  import('./pages/students/StudentList').then(m => m.default)
);

<Route path="/students" element={<StudentList />} />
*/
