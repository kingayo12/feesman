import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/logo.svg";
import { HiMail, HiLockClosed, HiEye, HiEyeOff, HiExclamationCircle } from "react-icons/hi";

export default function Login() {
  const { login, loginWithGoogle, user, loading: authLoading } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // 🔁 redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, from, navigate]);

  // 🔐 email login
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
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

  // 🔵 Google login
  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className='auth-page'>
      {/* LEFT PANEL */}
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
              Family & student records
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              PDF receipts & reports
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Discount & balance management
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className='auth-form-panel'>
        <div className='auth-card'>
          <div className='auth-logo-wrap'>
            <img src={Logo} alt='Logo' className='auth-logo-sm' />
          </div>

          <h2 className='auth-heading'>Welcome back</h2>
          <p className='auth-sub'>Sign in to continue to the application</p>

          {/* ERROR */}
          {error && (
            <div className='auth-error-box'>
              <HiExclamationCircle className='auth-error-icon' />
              <span>{error}</span>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className='auth-form'>
            {/* EMAIL */}
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
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className='auth-field'>
              <label htmlFor='password'>Password</label>
              <div className='auth-input-wrap'>
                <HiLockClosed className='auth-input-icon' />
                <input
                  id='password'
                  type={showPwd ? "text" : "password"}
                  placeholder='........'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button type='button' className='auth-eye-btn' onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <HiEyeOff /> : <HiEye />}
                </button>
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button type='submit' className='auth-submit-btn' disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* GOOGLE LOGIN */}
          <button
            type='button'
            className='auth-google-btn'
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          {/* FORGOT PASSWORD */}
          <p className='auth-footer-text'>
            <Link to='/forgot-password' className='auth-footer-link'>
              Forgot password?
            </Link>
          </p>

          {/* REGISTER */}
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
