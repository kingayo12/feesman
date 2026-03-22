import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid login credentials");
    }
  };

  return (
    <div className='d-flex r-container'>
      <div className='right flex1 d-flex justify-center align-center'>1jahfdhfshflsdhf</div>
      <div className='left col gap-1 flex1 d-flex flex-column justify-center align-center'>
        <div className='logo'>
          <img src={Logo} alt='' width={100} />
        </div>
        <h2>Sign In</h2>
        <p>Sign in to continue to the application</p>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <form className='col gap-2' onSubmit={handleSubmit}>
          <input
            type='email'
            placeholder='Email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type='password'
            placeholder='Password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type='submit'>Login</button>
        </form>
      </div>
    </div>
  );
}
