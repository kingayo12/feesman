import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/auth";
import Logo from "../../assets/logo.png";
import { HiMail, HiExclamationCircle, HiCheckCircle, HiArrowLeft } from "react-icons/hi";
import { AUTH_STYLES } from "./Login";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      const map = {
        "auth/user-not-found": "No account found with this email address.",
        "auth/invalid-email": "Please enter a valid email address.",
      };
      setError(map[err?.code] || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-page'>
      {/* Brand panel */}
      <div className='auth-brand-panel' style={{ background: "var(--primary-color)" }}>
        <div className='auth-brand-inner'>
          <svg
            width='52'
            height='52'
            viewBox='0 0 24 24'
            fill='none'
            stroke='rgba(255,255,255,0.9)'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
            style={{ marginBottom: "1.5rem" }}
          >
            <rect x='3' y='11' width='18' height='11' rx='2' />
            <path d='M7 11V7a5 5 0 0 1 10 0v4' />
          </svg>
          <h1 className='auth-brand-title'>Password reset</h1>
          <p className='auth-brand-desc'>
            Enter the email address linked to your account and we'll send you a secure reset link.
          </p>
          <div className='auth-brand-bullets'>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Link expires in 1 hour
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Check your spam folder too
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Contact admin if issues persist
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className='auth-form-panel'>
        <div className='auth-card'>
          <div className='auth-logo-wrap'>
            <div className='fp-lock-badge'>
              <svg
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#92400e'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <rect x='3' y='11' width='18' height='11' rx='2' />
                <path d='M7 11V7a5 5 0 0 1 10 0v4' />
              </svg>
            </div>
          </div>

          <h2 className='auth-heading'>Forgot password?</h2>
          <p className='auth-sub'>
            {sent
              ? "Check your inbox for the reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>

          {error && (
            <div className='auth-error-box'>
              <HiExclamationCircle className='auth-error-icon' />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div>
              <div className='auth-success-box'>
                <HiCheckCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
                <span>
                  A reset link has been sent to <strong>{email}</strong>. Check your inbox and spam
                  folder.
                </span>
              </div>
              <button
                className='auth-submit-btn amber'
                style={{ marginTop: "1rem", width: "100%", border: "none" }}
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Send to a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='auth-form'>
              <div className='auth-field'>
                <label htmlFor='forgot-email'>Email address</label>
                <div className='auth-input-wrap'>
                  <HiMail className='auth-input-icon' />
                  <input
                    id='forgot-email'
                    type='email'
                    placeholder='admin@school.edu.ng'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete='email'
                  />
                </div>
              </div>
              <button
                type='submit'
                className='auth-submit-btn amber'
                disabled={loading}
                style={{ background: "var(--primary-color)" }}
              >
                {loading && <span className='auth-spinner' />}
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <Link to='/login' className='auth-back-link'>
            <HiArrowLeft style={{ width: 14, height: 14 }} />
            Back to sign in
          </Link>
        </div>
      </div>

      <style>{`
        ${AUTH_STYLES}
        .fp-lock-badge {
          width: 52px; height: 52px; border-radius: 12px;
          background: #fef9c3; border: 1px solid #fde68a;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>
    </div>
  );
}
