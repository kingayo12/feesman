import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/logo.png";
import { HiMail, HiLockClosed, HiUser, HiEye, HiEyeOff, HiExclamationCircle } from "react-icons/hi";
import { AUTH_STYLES } from "./Login";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(form.email.trim(), form.password, form.name.trim());
      navigate("/dashboard");
    } catch (err) {
      const map = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak. Use at least 6 characters.",
      };
      setError(map[err?.code] || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-page'>
      {/* Brand panel */}
      <div className='auth-brand-panel'>
        <div className='auth-brand-inner'>
          <img src={Logo} alt='Logo' className='auth-brand-logo' />
          <h1 className='auth-brand-title'>School Fee Manager</h1>
          <p className='auth-brand-desc'>
            Set up your admin account and start managing school fees in minutes.
          </p>
          <div className='auth-brand-bullets'>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Multi-family management
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Automated fee calculation
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Offline-ready with caching
            </div>
            <div className='auth-bullet'>
              <span className='auth-bullet-dot' />
              Export to PDF &amp; CSV
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className='auth-form-panel'>
        <div className='auth-card'>
          <div className='auth-logo-wrap'>
            <img src={Logo} alt='Logo' className='auth-logo-sm' />
          </div>

          <h2 className='auth-heading'>Create account</h2>
          <p className='auth-sub'>Set up your school admin account</p>

          {error && (
            <div className='auth-error-box'>
              <HiExclamationCircle className='auth-error-icon' />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className='auth-form'>
            {/* Full name */}
            <div className='auth-field'>
              <label htmlFor='name'>Full name</label>
              <div className='auth-input-wrap'>
                <HiUser className='auth-input-icon' />
                <input
                  id='name'
                  type='text'
                  placeholder='Your name'
                  value={form.name}
                  onChange={set("name")}
                  autoComplete='name'
                />
              </div>
            </div>

            {/* Email */}
            <div className='auth-field'>
              <label htmlFor='reg-email'>Email address</label>
              <div className='auth-input-wrap'>
                <HiMail className='auth-input-icon' />
                <input
                  id='reg-email'
                  type='email'
                  placeholder='admin@school.edu.ng'
                  value={form.email}
                  onChange={set("email")}
                  required
                  autoComplete='email'
                />
              </div>
            </div>

            {/* Password */}
            <div className='auth-field'>
              <label htmlFor='reg-password'>Password</label>
              <div className='auth-input-wrap'>
                <HiLockClosed className='auth-input-icon' />
                <input
                  id='reg-password'
                  type={showPwd ? "text" : "password"}
                  placeholder='Min. 6 characters'
                  value={form.password}
                  onChange={set("password")}
                  required
                  autoComplete='new-password'
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

            {/* Confirm password */}
            <div className='auth-field'>
              <label htmlFor='confirm'>Confirm password</label>
              <div className='auth-input-wrap'>
                <HiLockClosed className='auth-input-icon' />
                <input
                  id='confirm'
                  type={showPwd ? "text" : "password"}
                  placeholder='Repeat password'
                  value={form.confirm}
                  onChange={set("confirm")}
                  required
                  autoComplete='new-password'
                />
              </div>
            </div>

            <button type='submit' className='auth-submit-btn' disabled={loading}>
              {loading && <span className='auth-spinner' />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className='auth-footer-text'>
            Already have an account?{" "}
            <Link to='/login' className='auth-footer-link'>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <style>{AUTH_STYLES}</style>
    </div>
  );
}
