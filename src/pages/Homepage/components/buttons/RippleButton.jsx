import { useState } from "react";
import "./RippleButton.css";

const RippleButton = ({ children }) => {
  const [ripples, setRipples] = useState([]);

  const addRipple = (e) => {
    const rect = e.target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = {
      x,
      y,
      size,
      key: new Date().getTime(),
    };

    setRipples([...ripples, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prevRipples) => prevRipples.filter((ripple) => ripple.key !== newRipple.key));
    }, 600);
  };

  return (
    <button className='ripple-button' onClick={addRipple}>
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.key}
          className='ripple'
          style={{
            width: ripple.size,
            height: ripple.size,
            top: ripple.y,
            left: ripple.x,
          }}
        />
      ))}
    </button>
  );
};

export default RippleButton;
