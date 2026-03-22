import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth } from "../../firebase/auth";
import { db } from "../../firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      // 🔐 CREATE USER RECORD
      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        email,
        role: "admin", // ⚠️ first user only
        createdAt: new Date(),
      });

      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-md mx-auto mt-20'>
      <h2 className='text-xl font-bold mb-4'>Create Admin Account</h2>

      <form onSubmit={handleRegister} className='space-y-4'>
        <input
          type='email'
          placeholder='Email'
          className='input'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type='password'
          placeholder='Password'
          className='input'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button disabled={loading} className='btn-primary w-full'>
          {loading ? "Creating..." : "Register"}
        </button>
      </form>
    </div>
  );
}
