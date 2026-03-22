import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/logo.png";
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiExclamationCircle } from "react-icons/hi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      const map = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/invalid-credential": "Invalid email or password.",
      };
      setError(map[err?.code] || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-page'>
      {/* ── Left panel — branding ───────────────────────────── */}
      <div className='auth-brand-panel'>
        <div className='auth-brand-inner'>
          <img src={Logo} alt='Logo' className='auth-brand-logo' />
          <h1 className='auth-brand-title'>School Fee Manager</h1>
          <p className='auth-brand-desc'>
            Manage tuition, track payments, and generate receipts — all in one place.
          </p>
          <div className='auth-brand-bullets'>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Real-time payment tracking
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Family &amp; student records
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              PDF receipts &amp; reports
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Discount &amp; balance management
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div className='auth-form-panel'>
        <div className='auth-card'>
          <div className='auth-logo-wrap'>
            <img src={Logo} alt='Logo' className='auth-logo-sm' />
          </div>

          <h2 className='auth-heading'>Welcome back</h2>
          <p className='auth-sub'>Sign in to continue to the application</p>

          {error && (
            <div className='auth-error-box'>
              <HiExclamationCircle className='auth-error-icon' />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className='auth-form'>
            {/* Email */}
            <div className='auth-field'>
              <label htmlFor='email'>Email address</label>
              <div className='auth-input-wrap'>
                <HiMail className='auth-input-icon' />
                <input
                  id='email'
                  type='email'
                  placeholder='admin@school.edu.ng'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete='email'
                />
              </div>
            </div>

            {/* Password */}
            <div className='auth-field'>
              <div className='auth-label-row'>
                <label htmlFor='password'>Password</label>
                <Link to='/forgot-password' className='auth-forgot-link'>
                  Forgot password?
                </Link>
              </div>
              <div className='auth-input-wrap'>
                <HiLockClosed className='auth-input-icon' />
                <input
                  id='password'
                  type={showPwd ? "text" : "password"}
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  className='auth-eye-btn'
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                >
                  {showPwd ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>
            </div>

            <button type='submit' className='auth-submit-btn' disabled={loading}>
              {loading && <span className='auth-spinner' />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className='auth-footer-text'>
            Don't have an account?{" "}
            <Link to='/register' className='auth-footer-link'>
              Create one
            </Link>
          </p>
        </div>
      </div>

      <style>{AUTH_STYLES}</style>
    </div>
  );
}

// Shared styles imported by all three auth pages via the AUTH_STYLES constant
export const AUTH_STYLES = `
  .auth-page {
    min-height: 100vh;
    display: flex;
  }

  /* ── Brand panel ──────────────────────────────────────── */
  .auth-brand-panel {
    flex: 1;
    background: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 2.5rem;
  }
  @media (max-width: 768px) { .auth-brand-panel { display: none; } }

  .auth-brand-inner { max-width: 360px; }

  .auth-brand-logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
    border-radius: 16px;
    background: rgba(255,255,255,0.15);
    padding: 8px;
    margin-bottom: 1.5rem;
    display: block;
  }

  .auth-brand-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: #fff;
    margin-bottom: 0.75rem;
  }

  .auth-brand-desc {
    font-size: 15px;
    color: rgba(255,255,255,0.75);
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .auth-brand-bullets { display: flex; flex-direction: column; gap: 12px; }

  .auth-bullet {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: rgba(255,255,255,0.85);
  }

  .auth-bullet-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.5);
    flex-shrink: 0;
  }

  /* ── Form panel ───────────────────────────────────────── */
  .auth-form-panel {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    padding: 2rem 1.5rem;
  }
  [data-theme="dark"] .auth-form-panel { background: #0f172a; }

  .auth-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 2.5rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  }
  [data-theme="dark"] .auth-card { background: #1e293b; border-color: #334155; }

  .auth-logo-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .auth-logo-sm {
    width: 52px;
    height: 52px;
    object-fit: contain;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 6px;
    background: #fff;
  }
  [data-theme="dark"] .auth-logo-sm { background: #0f172a; border-color: #334155; }

  .auth-heading {
    font-size: 1.4rem;
    font-weight: 800;
    text-align: center;
    color: #0f172a;
    margin-bottom: 6px;
  }
  [data-theme="dark"] .auth-heading { color: #f1f5f9; }

  .auth-sub {
    font-size: 13px;
    color: #64748b;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  /* ── Error box ────────────────────────────────────────── */
  .auth-error-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #991b1b;
    margin-bottom: 1.25rem;
  }
  [data-theme="dark"] .auth-error-box { background: #3f0000; border-color: #7f1d1d; color: #f87171; }

  .auth-error-icon { width: 16px; height: 16px; flex-shrink: 0; }

  /* ── Success box ──────────────────────────────────────── */
  .auth-success-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #166534;
    margin-bottom: 1.25rem;
  }
  [data-theme="dark"] .auth-success-box { background: #052e16; border-color: #14532d; color: #4ade80; }

  /* ── Form ─────────────────────────────────────────────── */
  .auth-form { display: flex; flex-direction: column; gap: 1.1rem; }

  .auth-field { display: flex; flex-direction: column; gap: 6px; }

  .auth-field label,
  .auth-label-row label {
    font-size: 13px;
    font-weight: 700;
    color: #1e293b;
  }
  [data-theme="dark"] .auth-field label,
  [data-theme="dark"] .auth-label-row label { color: #f1f5f9; }

  .auth-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .auth-forgot-link {
    font-size: 12px;
    color: #4f46e5;
    font-weight: 600;
    text-decoration: none;
  }
  .auth-forgot-link:hover { text-decoration: underline; }

  .auth-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .auth-input-icon {
    position: absolute;
    left: 13px;
    width: 16px;
    height: 16px;
    color: #94a3b8;
    pointer-events: none;
    flex-shrink: 0;
  }

  .auth-input-wrap input {
    width: 100%;
    height: 44px;
    padding: 0 42px 0 40px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    background: #fff;
    color: #0f172a;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .auth-input-wrap input:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79,70,229,0.12);
  }
  [data-theme="dark"] .auth-input-wrap input {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
  }
  [data-theme="dark"] .auth-input-wrap input:focus {
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(129,140,248,0.15);
  }

  .auth-eye-btn {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s;
  }
  .auth-eye-btn:hover { color: #475569; }
  .auth-eye-btn svg { width: 16px; height: 16px; }

  /* ── Submit button ─────────────────────────────────────── */
  .auth-submit-btn {
    height: 46px;
    border-radius: 10px;
    background: #4f46e5;
    color: #fff;
    border: none;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 0.375rem;
    transition: background 0.15s, opacity 0.15s;
    letter-spacing: 0.01em;
  }
  .auth-submit-btn:hover:not(:disabled) { background: #4338ca; }
  .auth-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

  /* Variant for forgot password (amber) */
  .auth-submit-btn.amber { background: #b45309; }
  .auth-submit-btn.amber:hover:not(:disabled) { background: #92400e; }

  /* ── Spinner ──────────────────────────────────────────── */
  .auth-spinner {
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    animation: auth-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes auth-spin { to { transform: rotate(360deg); } }

  /* ── Footer link ──────────────────────────────────────── */
  .auth-footer-text {
    font-size: 13px;
    color: #64748b;
    text-align: center;
    margin-top: 1.25rem;
  }

  .auth-footer-link {
    color: #4f46e5;
    font-weight: 700;
    text-decoration: none;
  }
  .auth-footer-link:hover { text-decoration: underline; }

  /* ── Back link ────────────────────────────────────────── */
  .auth-back-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #4f46e5;
    font-weight: 600;
    text-decoration: none;
    margin-top: 1.25rem;
    justify-content: center;
    width: 100%;
  }
  .auth-back-link:hover { text-decoration: underline; }

  @media (max-width: 480px) {
    .auth-card { padding: 1.75rem 1.25rem; }
    .auth-heading { font-size: 1.2rem; }
  }
`;
