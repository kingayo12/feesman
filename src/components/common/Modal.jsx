// src/components/common/Modal.jsx
import { useEffect, useRef } from "react";
import { HiX, HiCheckCircle, HiHeart, HiSparkles } from "react-icons/hi";
import CustomButton from "./CustomButton";

// ── Shared overlay ──────────────────────────────────────────────────────────
function ModalOverlay({ onClose, children, maxWidth = "500px", noPadding = false }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className='modal-overlay'
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
      style={{ zIndex: 2000 }}
    >
      <div
        className='modal-content'
        style={{
          background: "var(--modal-bg)",
          borderRadius: "var(--border-radius-xl)",
          width: "95%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: noPadding ? 0 : "2rem",
          position: "relative",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border-muted)",
          animation: "cdSlideIn 0.2s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Close button ────────────────────────────────────────────────────────────
function CloseBtn({ onClose }) {
  return (
    <CustomButton
      type='button'
      onClick={onClose}
      variant='primary'
      otherClass='close-modal'
      icon={<HiX />}
      aria-label='Close'
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORM MODAL — wraps any form component
// Usage: <FormModal title="Add Student" onClose={...}><StudentForm .../></FormModal>
// ─────────────────────────────────────────────────────────────────────────────
export function FormModal({ title, subtitle, onClose, children, maxWidth = "560px" }) {
  return (
    <ModalOverlay onClose={onClose} maxWidth={maxWidth} noPadding>
      <div style={{ padding: "1.5rem 1.5rem 0", borderBottom: "1px solid var(--border-muted)" }}>
        <div style={{ paddingRight: "2rem" }}>
          <h3
            style={{
              margin: "0 0 0.2rem",
              fontSize: "var(--font-size-lg)",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "var(--font-size-xs)",
                color: "var(--text-secondary)",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <CloseBtn onClose={onClose} />
      </div>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUCCESS MODAL — registration complete, payment saved, etc.
// Usage: <SuccessModal title="Student Registered!" message="..." onClose={...} onAction={...} actionLabel="View Student" />
// ─────────────────────────────────────────────────────────────────────────────
export function SuccessModal({
  title,
  message,
  onClose,
  onAction,
  actionLabel = "Continue",
  icon,
}) {
  return (
    <ModalOverlay onClose={onClose} maxWidth='420px'>
      <CloseBtn onClose={onClose} />
      <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--bg-success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            fontSize: "2rem",
            color: "var(--text-success)",
          }}
        >
          {icon || <HiCheckCircle />}
        </div>
        <h3
          style={{
            margin: "0 0 0.6rem",
            fontSize: "var(--font-size-xl)",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h3>
        {message && (
          <p
            style={{
              margin: "0 0 1.75rem",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className='btn btn-secondary' onClick={onClose}>
            Close
          </button>
          {onAction && (
            <button className='btn btn-primary' onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. THANK YOU MODAL — after payment, donation, form submission
// Usage: <ThankYouModal name="Adewumi Family" onClose={...} onAction={...} actionLabel="View Receipt" />
// ─────────────────────────────────────────────────────────────────────────────
export function ThankYouModal({ name, note, onClose, onAction, actionLabel = "View Receipt" }) {
  return (
    <ModalOverlay onClose={onClose} maxWidth='420px'>
      <CloseBtn onClose={onClose} />
      <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--accent-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            fontSize: "2rem",
            color: "var(--accent)",
          }}
        >
          <HiHeart />
        </div>
        <p
          style={{
            margin: "0 0 0.25rem",
            fontSize: "var(--font-size-xxs)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          Thank You
        </p>
        <h3
          style={{
            margin: "0 0 0.6rem",
            fontSize: "var(--font-size-xl)",
            color: "var(--text-primary)",
          }}
        >
          {name ? `Thank you, ${name}!` : "Payment Received!"}
        </h3>
        <p
          style={{
            margin: "0 0 1.75rem",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {note ||
            "Your payment has been recorded and your account is up to date. We appreciate your commitment."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className='btn btn-secondary' onClick={onClose}>
            Done
          </button>
          {onAction && (
            <button className='btn btn-primary' onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONFIRM MODAL — delete, promote, irreversible actions
// Usage: <ConfirmModal title="Delete Student?" message="..." onClose={...} onConfirm={...} danger />
// ─────────────────────────────────────────────────────────────────────────────
export function ConfirmModal({
  title,
  message,
  entityName, // 👈 NEW
  onClose,
  onConfirm,
  confirmLabel = "Delete",
  loading = false,
  danger = true,
}) {
  const defaultMessage = entityName
    ? `Are you sure you want to delete this ${entityName}? This action cannot be undone.`
    : "Are you sure? This action cannot be undone.";

  return (
    <ModalOverlay onClose={onClose} maxWidth='400px'>
      <CloseBtn onClose={onClose} />

      <div style={{ textAlign: "center", padding: "0.5rem 0 0.75rem" }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "var(--bg-danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            fontSize: "1.6rem",
            color: "var(--text-danger)",
          }}
        >
          ⚠
        </div>

        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "var(--font-size-lg)",
            color: "var(--text-primary)",
          }}
        >
          {title || "Confirm Delete"}
        </h3>

        <p
          style={{
            margin: "0 0 1.5rem",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {message || defaultMessage}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className='btn btn-secondary' onClick={onClose} disabled={loading}>
            Cancel
          </button>

          <button className='btn btn-danger' onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
