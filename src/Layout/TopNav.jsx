import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAllStudents } from "../pages/students/studentService";
import { getFamilies } from "../pages/families/familyService";
import { FaBell } from "react-icons/fa";
import {
  HiSearch,
  HiX,
  HiAcademicCap,
  HiOutlineUsers,
  HiArrowRight,
  HiExclamationCircle,
} from "react-icons/hi";

import { LuMoon, LuSun } from "react-icons/lu";

// ── Debounce hook ──────────────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Theme helper ───────────────────────────────────────────────────────────
function getInitialTheme() {
  try {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ students: [], families: [] });
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [allStudents, setAllStudents] = useState(null); // cached
  const [allFamilies, setAllFamilies] = useState(null); // cached
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Pre-load data once when modal opens so subsequent searches are instant
  const loadData = useCallback(async () => {
    if (allStudents && allFamilies) return; // already loaded
    setSearching(true);
    setSearchError(null);
    try {
      const [s, f] = await Promise.all([getAllStudents(), getFamilies()]);
      setAllStudents(s || []);
      setAllFamilies(f || []);
    } catch (err) {
      setSearchError("Failed to load data. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [allStudents, allFamilies]);

  // Open modal
  const openSearch = () => {
    setSearchOpen(true);
    loadData();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Close + reset
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setResults({ students: [], families: [] });
  };

  // Run search whenever debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || !allStudents || !allFamilies) {
      setResults({ students: [], families: [] });
      return;
    }

    const q = debouncedQuery.toLowerCase().trim();

    const matchedStudents = allStudents.filter((s) =>
      [s.firstName, s.lastName, s.admissionNo, s.id, s.session]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );

    const matchedFamilies = allFamilies.filter((f) =>
      [f.familyName, f.phone, f.email, f.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );

    setResults({ students: matchedStudents.slice(0, 8), families: matchedFamilies.slice(0, 5) });
  }, [debouncedQuery, allStudents, allFamilies]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ctrl/Cmd + K → open search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      // Escape → close search
      if (e.key === "Escape" && searchOpen) closeSearch();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

  // Navigate to result
  const goTo = (path) => {
    closeSearch();
    navigate(path);
  };

  const totalResults = results.students.length + results.families.length;
  const hasQuery = debouncedQuery.trim().length > 0;

  // ── Avatar ───────────────────────────────────────────────────────────────
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className='top-nav'>
        <h1 className='app-title'>School Fees System</h1>

        <div className='top-nav-actions'>
          {/* Search trigger */}
          <button className='nav-search-btn' onClick={openSearch} title='Search  (Ctrl+K)'>
            <HiSearch />
            <span className='nav-search-label'>Search…</span>
            <kbd className='nav-search-kbd'>⌘K</kbd>
          </button>

          {/* Theme toggle */}
          <button
            className='theme-toggle-btn'
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <LuSun className='icon-color' size={18} />
            ) : (
              <LuMoon className='icon-color' size={18} />
            )}
          </button>

          {/* Notifications */}
          <button className='notification-btn icon-btn'>
            <FaBell />
            <span className='notification-badge' />
          </button>

          {/* User */}
          <div className='user-profile'>
            <div className='user-info'>
              <p className='user-name'>{user?.displayName || user?.name || "User"}</p>
              <p className='user-role'>{user?.role || "Staff"}</p>
            </div>
            <div className='avatar'>
              {user?.photoURL ? (
                <img src={user.photoURL} alt='Profile' className='avatar-img' />
              ) : (
                <span className='avatar-initials'>
                  {getInitials(user?.displayName || user?.email)}
                </span>
              )}
            </div>
            <button onClick={logout} className='logout-btn'>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Search modal ─────────────────────────────────────────────────── */}
      {searchOpen && (
        <div className='search-overlay' onClick={closeSearch}>
          <div
            className='search-modal'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-label='Search'
          >
            {/* Input row */}
            <div className='search-input-row'>
              <HiSearch className='search-modal-icon' />
              <input
                ref={inputRef}
                className='search-modal-input'
                type='text'
                placeholder='Search by name, admission no, family…'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete='off'
              />
              {query && (
                <button className='search-clear-btn' onClick={() => setQuery("")}>
                  <HiX />
                </button>
              )}
              <button className='search-close-btn' onClick={closeSearch}>
                <kbd>Esc</kbd>
              </button>
            </div>

            {/* Body */}
            <div className='search-modal-body'>
              {/* Loading */}
              {searching && (
                <div className='search-state'>
                  <div className='search-spinner' />
                  <p>Loading records…</p>
                </div>
              )}

              {/* Error */}
              {searchError && !searching && (
                <div className='search-state error'>
                  <HiExclamationCircle />
                  <p>{searchError}</p>
                </div>
              )}

              {/* Empty query hint */}
              {!searching && !searchError && !hasQuery && (
                <div className='search-hints'>
                  <p className='search-hint-title'>Quick search</p>
                  <div className='search-hint-list'>
                    <span className='search-hint-chip'>Student name</span>
                    <span className='search-hint-chip'>Admission no</span>
                    <span className='search-hint-chip'>Family name</span>
                    <span className='search-hint-chip'>Phone number</span>
                  </div>
                  <p className='search-hint-tip'>
                    Tip: Press <kbd>Ctrl+K</kbd> anywhere to open search
                  </p>
                </div>
              )}

              {/* No results */}
              {!searching && !searchError && hasQuery && totalResults === 0 && (
                <div className='search-state'>
                  <p>
                    No results for "<strong>{debouncedQuery}</strong>"
                  </p>
                </div>
              )}

              {/* Results */}
              {!searching && !searchError && totalResults > 0 && (
                <div className='search-results'>
                  {/* Students */}
                  {results.students.length > 0 && (
                    <div className='search-group'>
                      <p className='search-group-label'>
                        <HiAcademicCap /> Students ({results.students.length})
                      </p>
                      {results.students.map((s) => (
                        <button
                          key={s.id}
                          className='search-result-item'
                          onClick={() => goTo(`/students/${s.id}`)}
                        >
                          <div className='result-avatar student-avatar-sm'>
                            {s.firstName?.[0]}
                            {s.lastName?.[0]}
                          </div>
                          <div className='result-info'>
                            <span className='result-name'>
                              {s.firstName} {s.otherName ? s.otherName + " " : ""}
                              {s.lastName}
                            </span>
                            <span className='result-meta'>
                              {s.admissionNo && <span>No. {s.admissionNo}</span>}
                              {s.session && <span>{s.session}</span>}
                            </span>
                          </div>
                          <HiArrowRight className='result-arrow' />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Families */}
                  {results.families.length > 0 && (
                    <div className='search-group'>
                      <p className='search-group-label'>
                        <HiOutlineUsers /> Families ({results.families.length})
                      </p>
                      {results.families.map((f) => (
                        <button
                          key={f.id}
                          className='search-result-item'
                          onClick={() => goTo(`/families/${f.id}`)}
                        >
                          <div className='result-avatar family-avatar-sm'>{f.familyName?.[0]}</div>
                          <div className='result-info'>
                            <span className='result-name'>{f.familyName} Family</span>
                            <span className='result-meta'>
                              {f.phone && <span>{f.phone}</span>}
                              {f.email && <span>{f.email}</span>}
                            </span>
                          </div>
                          <HiArrowRight className='result-arrow' />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {totalResults > 0 && (
              <div className='search-modal-footer'>
                <span>
                  {totalResults} result{totalResults !== 1 ? "s" : ""}
                </span>
                <span>↑↓ navigate · Enter select · Esc close</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Styles ───────────────────────────────────────────────────────── */}
      <style>{`
        /* ── Dark mode variables ───────────────────────────────── */
        :root {
          --bg-primary:   #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary:  #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-tertiary:  #94a3b8;
          --border-color: #e2e8f0;
          --border-light: #f1f5f9;
          --nav-bg:       #ffffff;
          --shadow-sm:    0 1px 3px rgba(0,0,0,0.07);
          --shadow-md:    0 4px 20px rgba(0,0,0,0.08);
          --shadow-lg:    0 20px 60px rgba(0,0,0,0.12);
          --accent:       #4f46e5;
          --accent-light: #eef2ff;
          --overlay:      rgba(15,23,42,0.6);
          --modal-bg:     #ffffff;
        }

        [data-theme="dark"] {
          --bg-primary:   #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary:  #1e293b;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-tertiary:  #64748b;
          --border-color: #334155;
          --border-light: #1e293b;
          --nav-bg:       #0f172a;
          --shadow-sm:    0 1px 3px rgba(0,0,0,0.3);
          --shadow-md:    0 4px 20px rgba(0,0,0,0.4);
          --shadow-lg:    0 20px 60px rgba(0,0,0,0.5);
          --accent:       #818cf8;
          --accent-light: #1e1b4b;
          --overlay:      rgba(0,0,0,0.75);
          --modal-bg:     #1e293b;
        }

        /* Apply variables to all elements */
        [data-theme="dark"] body,
        [data-theme="dark"] main,
        [data-theme="dark"] aside,
        [data-theme="dark"] .top-nav,
        [data-theme="dark"] .table-card,
        [data-theme="dark"] .finance-card,
        [data-theme="dark"] .profile-hero,
        [data-theme="dark"] .content-card,
        [data-theme="dark"] .billing-card,
        [data-theme="dark"] .history-card,
        [data-theme="dark"] .form-container,
        [data-theme="dark"] .stat-card,
        [data-theme="dark"] .insight-card,
        [data-theme="dark"] .recent-activity,
        [data-theme="dark"] .data-table th,
        [data-theme="dark"] .settings-content,
        [data-theme="dark"] .info-card,
        [data-theme="dark"] .modal-content {
          background-color: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
        }

        [data-theme="dark"] body { background: var(--bg-primary); color: var(--text-primary); }

        [data-theme="dark"] .top-nav {
          border-bottom-color: var(--border-color) !important;
        }

       

        [data-theme="dark"] .data-table th,
        [data-theme="dark"] .card-header,
        [data-theme="dark"] .ledger-table th,
        [data-theme="dark"] .table-card { background: var(--bg-secondary) !important; }

        [data-theme="dark"] .data-table td,
        [data-theme="dark"] .ledger-table td,
        [data-theme="dark"] .mini-table td { border-color: var(--border-color) !important; color: var(--text-primary) !important; }

        [data-theme="dark"] .input-wrapper input,
        [data-theme="dark"] .input-wrapper select,
        [data-theme="dark"] .input-wrapper textarea {
          background: var(--bg-primary) !important;
          border-color: var(--border-color) !important;
          color: var(--text-primary) !important;
        }

        [data-theme="dark"] h1,[data-theme="dark"] h2,[data-theme="dark"] h3,
        [data-theme="dark"] h4,[data-theme="dark"] h5,[data-theme="dark"] p,
        [data-theme="dark"] span,[data-theme="dark"] label,[data-theme="dark"] td,
        [data-theme="dark"] th { color: var(--text-primary); }

        [data-theme="dark"] .text-secondary,
        [data-theme="dark"] .stat-label,
        [data-theme="dark"] .sub-info,
        [data-theme="dark"] .user-role,
        [data-theme="dark"] .id-sub   { color: var(--text-secondary) !important; }

        [data-theme="dark"] .class-tag,
        [data-theme="dark"] .section-badge,
        [data-theme="dark"] .count-badge,
        [data-theme="dark"] .method-tag { background: var(--bg-primary) !important; color: var(--text-secondary) !important; }

        [data-theme="dark"] .term-tab         { color: var(--text-secondary); }
        [data-theme="dark"] .term-tab.active  { background: var(--bg-primary); color: var(--accent); }
        [data-theme="dark"] .term-selector-tabs { background: var(--bg-primary); }

        [data-theme="dark"] .search-box input,
        [data-theme="dark"] .filter-btn       { background: var(--bg-primary) !important; border-color: var(--border-color) !important; color: var(--text-primary) !important; }

        [data-theme="dark"] .logout-btn       { background: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary); }
        [data-theme="dark"] .back-btn,
        [data-theme="dark"] .back-link        { color: var(--text-secondary); }
        [data-theme="dark"] .pill             { background: var(--bg-primary); color: var(--text-secondary); }
        [data-theme="dark"] .summary-item     { border-color: var(--border-color); }
        [data-theme="dark"] .summary-item label { color: var(--text-secondary); }
        [data-theme="dark"] .toggle-row       { border-color: var(--border-color); }
        [data-theme="dark"] .section-divider  { border-color: var(--border-color); }
        [data-theme="dark"] .academic-status-card { border-color: var(--border-color); }
        [data-theme="dark"] .academic-status-divider { background: var(--border-color); }
        [data-theme="dark"] .settings-nav     { border-color: var(--border-color); }
        [data-theme="dark"] .settings-nav-item { color: var(--text-secondary); }
        [data-theme="dark"] .settings-nav-item:hover { background: var(--bg-primary); }
        [data-theme="dark"] .outline-btn      { border-color: var(--border-color); color: var(--text-primary); }
        [data-theme="dark"] .data-action-card { border-color: var(--border-color); }
        [data-theme="dark"] .logo-upload-area { border-color: var(--border-color); }
        [data-theme="dark"] .upload-btn       { background: var(--bg-primary); border-color: var(--border-color); color: var(--text-primary); }
        [data-theme="dark"] .total-row td     { background: var(--bg-primary) !important; }
        [data-theme="dark"] .student-item:hover { background: var(--bg-primary); }

        /* ── Nav search button ─────────────────────────────────── */
        .nav-search-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 14px; border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-secondary, #f8fafc);
          color: var(--text-secondary, #64748b);
          font-size: 13px; cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .nav-search-btn:hover { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
        .nav-search-label { display: none; }
        .nav-search-kbd   { display: none; }
        @media (min-width: 640px) {
          .nav-search-label { display: inline; }
          .nav-search-kbd   { display: inline; font-size: 10px; padding: 2px 5px; background: var(--border-color, #e2e8f0); border-radius: 4px; }
        }

        /* ── Icon buttons ──────────────────────────────────────── */
        .icon-btn {
           display: flex; align-items: center; padding:5px;
          justify-content: center; border-radius: 8px; border: none;
          background: transparent; cursor: pointer; font-size: 18px;
          color: var(--text-secondary, #64748b); transition: background 0.15s, color 0.15s;
        }
        .icon-btn:hover { background: var(--bg-tertiary, #f1f5f9); color: var(--text-primary, #1e293b); }
        [data-theme="dark"] .icon-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }

        /* ── Search overlay ────────────────────────────────────── */
        .search-overlay {
          position: fixed; inset: 0; z-index: 9000;
          background: var(--overlay, rgba(15,23,42,0.6));
          backdrop-filter: blur(4px);
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 80px;
          animation: overlayIn 0.15s ease;
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

        /* ── Search modal ──────────────────────────────────────── */
        .search-modal {
          width: 100%; max-width: 580px; margin: 0 1rem;
          background: var(--modal-bg, #ffffff);
          border-radius: 16px; overflow: hidden;
          box-shadow: var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.2));
          border: 1px solid var(--border-color, #e2e8f0);
          animation: modalIn 0.18s ease;
          max-height: calc(100vh - 120px); display: flex; flex-direction: column;
        }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.97) translateY(-8px); } to { opacity: 1; transform: none; } }

        [data-theme="dark"] .search-modal {
          background: var(--modal-bg) !important;
          border-color: var(--border-color) !important;
        }

        /* Input row */
        .search-input-row {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        .search-modal-icon { font-size: 20px; color: var(--text-secondary, #64748b); flex-shrink: 0; }
        .search-modal-input {
          flex: 1; border: none; outline: none; font-size: 15px;
          background: transparent; color: var(--text-primary, #1e293b);
        }
        .search-modal-input::placeholder { color: var(--text-tertiary, #94a3b8); }
        .search-clear-btn, .search-close-btn {
          background: none; border: none; cursor: pointer; padding: 4px;
          color: var(--text-tertiary, #94a3b8); display: flex; align-items: center;
          border-radius: 4px; font-size: 13px;
        }
        .search-clear-btn svg { width: 16px; height: 16px; }
        .search-close-btn kbd {
          font-size: 11px; padding: 2px 6px;
          background: var(--bg-tertiary, #f1f5f9);
          border-radius: 4px; color: var(--text-secondary, #64748b);
        }
        [data-theme="dark"] .search-close-btn kbd { background: var(--bg-primary); }

        /* Body */
        .search-modal-body { flex: 1; overflow-y: auto; }

        /* States */
        .search-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px; padding: 3rem 1.5rem;
          color: var(--text-secondary, #64748b); font-size: 14px; text-align: center;
        }
        .search-state svg { font-size: 28px; }
        .search-state.error { color: #dc2626; }
        .search-spinner {
          width: 28px; height: 28px; border: 3px solid var(--border-color, #e2e8f0);
          border-top-color: #4f46e5; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Hints */
        .search-hints { padding: 1.5rem; }
        .search-hint-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary, #94a3b8); margin: 0 0 0.75rem; }
        .search-hint-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem; }
        .search-hint-chip { font-size: 12px; padding: 4px 10px; background: var(--bg-tertiary, #f1f5f9); border-radius: 99px; color: var(--text-secondary, #64748b); }
        [data-theme="dark"] .search-hint-chip { background: var(--bg-primary); }
        .search-hint-tip { font-size: 12px; color: var(--text-tertiary, #94a3b8); margin: 0; }
        .search-hint-tip kbd { font-size: 11px; padding: 2px 5px; background: var(--bg-tertiary, #f1f5f9); border-radius: 4px; }

        /* Results */
        .search-results { padding: 8px 0; }
        .search-group { padding: 0 8px 8px; }
        .search-group-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-tertiary, #94a3b8);
          padding: 8px 8px 6px; margin: 0;
        }
        .search-group-label svg { width: 14px; height: 14px; }

        .search-result-item {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 10px 8px; border-radius: 8px; border: none;
          background: transparent; cursor: pointer; text-align: left;
          transition: background 0.12s;
        }
        .search-result-item:hover { background: var(--bg-secondary, #f8fafc); }
        [data-theme="dark"] .search-result-item:hover { background: var(--bg-primary); }

        .result-avatar {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 13px;
        }
        .student-avatar-sm { background: #eef2ff; color: #4f46e5; }
        .family-avatar-sm  { background: #ecfdf5; color: #059669; }
        [data-theme="dark"] .student-avatar-sm { background: #1e1b4b; color: #818cf8; }
        [data-theme="dark"] .family-avatar-sm  { background: #052e16; color: #4ade80; }

        .result-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .result-name { font-size: 14px; font-weight: 600; color: var(--text-primary, #1e293b); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .result-meta { display: flex; gap: 8px; margin-top: 2px; }
        .result-meta span { font-size: 12px; color: var(--text-secondary, #64748b); }
        .result-arrow { width: 16px; height: 16px; color: var(--text-tertiary, #94a3b8); flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
        .search-result-item:hover .result-arrow { opacity: 1; }

        /* Footer */
        .search-modal-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 16px; border-top: 1px solid var(--border-color, #e2e8f0);
          font-size: 11px; color: var(--text-tertiary, #94a3b8);
        }

        /* ── TopNav dark mode extras ─────────────────────────── */
        [data-theme="dark"] .app-title { color: var(--accent) !important; }
        [data-theme="dark"] .nav-search-btn {
          background: var(--bg-secondary) !important;
          border-color: var(--border-color) !important;
          color: var(--text-secondary) !important;
        }
        [data-theme="dark"] .notification-btn { color: var(--text-secondary) !important; }
        [data-theme="dark"] .user-name { color: var(--text-primary) !important; }
        [data-theme="dark"] .user-profile { border-color: var(--border-color) !important; }
        [data-theme="dark"] .avatar { background: var(--accent-light) !important; color: var(--accent) !important; }
      `}</style>
    </>
  );
}
