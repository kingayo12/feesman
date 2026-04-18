import { useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = ({ message, type = "success", duration = 3000 }) => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const ToastComponent = () => {
    toast && <div className={`toast ${toast.type}`}>{toast.message}</div>;
  };

  return { showToast, ToastComponent };
}
