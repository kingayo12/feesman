# Feesman

Feesman is a React + Vite application for school fee management, built with Firebase authentication and React Context for app state.

## Project structure

- `public/`
  - static files, browser manifest, service worker, and icons
- `src/`
  - `App.jsx` - root component with global app behavior
  - `main.jsx` - app entry point; wraps `App` with `AuthProvider`
  - `Routes.jsx` - app routing configuration
  - `components/` - reusable UI components, common layout components, forms, and widgets
  - `context/`
    - `AuthContext.jsx` - React Context state provider for authentication and user data
    - `AppContext.jsx` - reserved for app-level context (currently not populated)
  - `firebase/` - Firebase initialization, auth, Firestore, and storage helpers
  - `hooks/` - custom hooks for auth, responsive breakpoints, caching consent, Firestore access, receipts, roles, settings, and more
  - `pages/` - feature pages for auth, dashboard, classes, fees, families, students, settings, profiles, reports, and other app areas
  - `styles/` - global and theme CSS files
  - `utils/` - helper utilities for background sync, exports, validation, offline support, and other shared logic

## State management

This project uses React Context API to manage authentication and user state:

- `src/context/AuthContext.jsx`
  - creates an `AuthProvider` and `AuthContext`
  - listens for Firebase auth state changes with `onAuthStateChanged`
  - exposes `user`, `loading`, `login`, `register`, `logout`, `loginWithGoogle`, and `registerWithGoogle`
  - persists user profile data in Firestore
- `src/hooks/useAuth.js` and the `useAuth()` hook from `AuthContext.jsx` allow components to read auth state and call auth actions
- `src/main.jsx` wraps `<App />` with `<AuthProvider>` so all child components can access auth state

### Using auth state in components

In any component, you can consume auth state like this:

```jsx
import { useAuth } from "./context/AuthContext";

function MyComponent() {
  const { user, loading, logout } = useAuth();

  if (loading) return <p>Loading...</p>;
  return (
    <div>
      <p>Hello, {user?.displayName}</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}
```

## Run the app

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run tests:

```bash
npm run test
npm run test:ui
npm run test:coverage
```

Lint the project:

```bash
npm run lint
```

## Notes

- This project uses Vite for development and build tooling.
- Firebase is used for authentication and Firestore user profile data.
- React Router manages navigation between app pages.
- The app includes offline support, caching consent, and background sync utilities.
