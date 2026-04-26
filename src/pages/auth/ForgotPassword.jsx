import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/auth";
import Logo from "../../assets/logo.svg";
import { HiMail, HiExclamationCircle, HiCheckCircle, HiArrowLeft } from "react-icons/hi";

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
      <div
        className='auth-brand-panel bg-gradient'
        style={{ background: "var(--primary-gradient)" }}
      >
        <div className='auth-brand-inner'>
          <img src={Logo} alt='Logo' className='auth-brand-logo' />
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
            <img src={Logo} alt='Logo' className='auth-brand-logo' />
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
                className='btn-primary'
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
                className='btn-primary'
                disabled={loading}
                style={{ background: "var(--primary-color)" }}
              >
                {loading && <span className='auth-spinner' />}
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <Link to='/' className='auth-back-link'>
            <HiArrowLeft style={{ width: 14, height: 14 }} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
