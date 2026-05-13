import { useState, useEffect } from "react";
import Logo from "../../assets/logo.svg";
import { Link } from "react-router-dom";

const LINKS = ["Features", "Process", "Pricing", "Support"];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav className={`ln-nav${scrolled || open ? " scrolled" : ""}`}>
        <div className='ln-nav__inner'>
          {/* Brand */}
          <a href='#' className='ln-nav__brand'>
            <img src={Logo} alt='feesman logo' />
            <span className='ln-nav__brand-name'>Feesman</span>
          </a>

          {/* Desktop links */}
          <div className='ln-nav__links ln-nav__links--desktop'>
            {LINKS.map((l) => (
              <a key={l} href='#' className='ln-nav__link'>
                {l}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className='ln-nav__actions'>
            <Link to='/login' className='ln-nav__login ln-nav__login--desktop'>
              Log In
            </Link>
            <Link to='./register' className='ln-nav__cta ln-nav__cta--desktop'>
              Get Started
            </Link>

            {/* Hamburger (tablet / mobile) */}
            <button
              className='ln-nav__hamburger ln-nav__hamburger--tablet'
              onClick={() => setOpen((o) => !o)}
              aria-label='Toggle menu'
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className={`ln-nav__bar${open ? ` ln-nav__bar--open-${i}` : ""}`} />
              ))}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className='ln-drawer'>
          {LINKS.map((l) => (
            <a key={l} href='#' className='ln-drawer__link' onClick={() => setOpen(false)}>
              {l}
            </a>
          ))}
          <div className='ln-drawer__btns'>
            <button className='ln-drawer__btn ln-drawer__btn--login'>Log In</button>
            <button className='ln-drawer__btn ln-drawer__btn--cta'>Get Started</button>
          </div>
        </div>
      )}
    </>
  );
}
