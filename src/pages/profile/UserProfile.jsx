import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase/auth";
import { db } from "../../firebase/firestore";

function resolveThemePreference(themePreference) {
  if (themePreference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return themePreference === "dark" ? "dark" : "light";
}

function applyTheme(themePreference) {
  const resolved = resolveThemePreference(themePreference);
  document.documentElement.setAttribute("data-theme", resolved);
  try {
    localStorage.setItem("themePreference", themePreference);
    localStorage.setItem("theme", resolved);
  } catch {}
  window.dispatchEvent(
    new CustomEvent("feesman-theme-change", {
      detail: { theme: themePreference, resolvedTheme: resolved },
    }),
  );
}

const TABS = ["profile", "password", "theme"];

export default function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get("tab") || "profile";
  const activeTab = TABS.includes(requestedTab) ? requestedTab : "profile";

  const [fullName, setFullName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [nameErr, setNameErr] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  const [themePreference, setThemePreference] = useState(() => {
    try {
      return localStorage.getItem("themePreference") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    setFullName(user?.displayName || user?.name || "");
  }, [user]);

  const emailLabel = useMemo(() => user?.email || "No email", [user]);

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const onSaveName = async (e) => {
    e.preventDefault();
    setNameErr("");
    setNameMsg("");

    const nextName = fullName.trim();
    if (!nextName) {
      setNameErr("Name is required.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setNameErr("You are not signed in. Please login again.");
      return;
    }

    setNameSaving(true);
    try {
      await updateProfile(currentUser, { displayName: nextName });
      await setDoc(
        doc(db, "users", currentUser.uid),
        { displayName: nextName, updatedAt: serverTimestamp() },
        { merge: true },
      );
      setNameMsg("Profile updated successfully.");
    } catch {
      setNameErr("Could not update profile now. Please try again.");
    } finally {
      setNameSaving(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    setPwdErr("");
    setPwdMsg("");

    if (newPassword.length < 6) {
      setPwdErr("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr("New password and confirmation do not match.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      setPwdErr("Unable to verify account. Please login again.");
      return;
    }

    setPwdSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMsg("Password changed successfully.");
    } catch (err) {
      if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        setPwdErr("Current password is incorrect.");
      } else {
        setPwdErr("Could not change password now. Please try again.");
      }
    } finally {
      setPwdSaving(false);
    }
  };

  const onSelectTheme = (next) => {
    setThemePreference(next);
    applyTheme(next);
  };

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className='profile-page'>
      <div className='profile-header'>
        <h2>User Profile</h2>
        <p>Manage your account details, password, and theme preferences.</p>
      </div>

      <div className='profile-tabs'>
        <button
          className={`profile-tab-btn ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>
        <button
          className={`profile-tab-btn ${activeTab === "password" ? "active" : ""}`}
          onClick={() => setTab("password")}
        >
          Change Password
        </button>
        <button
          className={`profile-tab-btn ${activeTab === "theme" ? "active" : ""}`}
          onClick={() => setTab("theme")}
        >
          Select Theme
        </button>
      </div>

      {activeTab === "profile" && (
        <section className='profile-card'>
          <h3>Profile Details</h3>
          <form className='profile-form' onSubmit={onSaveName}>
            <label>Email</label>
            <input type='email' value={emailLabel} disabled />

            <label>Full name</label>
            <input
              type='text'
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder='Your full name'
            />

            {nameErr && <p className='profile-error'>{nameErr}</p>}
            {nameMsg && <p className='profile-success'>{nameMsg}</p>}

            <button type='submit' className='profile-save-btn' disabled={nameSaving}>
              {nameSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </section>
      )}

      {activeTab === "password" && (
        <section className='profile-card'>
          <h3>Change Password</h3>
          <form className='profile-form' onSubmit={onChangePassword}>
            <label>Current password</label>
            <input
              type='password'
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <label>New password</label>
            <input
              type='password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <label>Confirm new password</label>
            <input
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {pwdErr && <p className='profile-error'>{pwdErr}</p>}
            {pwdMsg && <p className='profile-success'>{pwdMsg}</p>}

            <button type='submit' className='profile-save-btn' disabled={pwdSaving}>
              {pwdSaving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>
      )}

      {activeTab === "theme" && (
        <section className='profile-card'>
          <h3>Select Theme</h3>
          <p className='profile-subtle'>Choose how the app should look on your device.</p>
          <div className='theme-choice-grid'>
            <button
              className={`theme-choice ${themePreference === "light" ? "active" : ""}`}
              onClick={() => onSelectTheme("light")}
            >
              Light
            </button>
            <button
              className={`theme-choice ${themePreference === "dark" ? "active" : ""}`}
              onClick={() => onSelectTheme("dark")}
            >
              Dark
            </button>
            <button
              className={`theme-choice ${themePreference === "system" ? "active" : ""}`}
              onClick={() => onSelectTheme("system")}
            >
              System
            </button>
          </div>
        </section>
      )}

      <section className='profile-card profile-danger'>
        <h3>Session</h3>
        <p className='profile-subtle'>Sign out of your account on this device.</p>
        <button className='profile-logout-btn' onClick={onLogout}>
          Logout
        </button>
      </section>
    </div>
  );
}
