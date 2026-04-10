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
      <div className='auth-brand-panel'>
        <div className='auth-brand-inner'>
          <img src={Logo} alt='Logo' className='auth-brand-logo' />
          <h1 className='auth-brand-title'>School Fee Manager</h1>
          <p className='auth-brand-desc'>
            Manage tuition, track payments, and generate receipts - all in one place.
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
                  placeholder='........'
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
              {loading ? "Signing in..." : "Sign in"}
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
    </div>
  );
}
