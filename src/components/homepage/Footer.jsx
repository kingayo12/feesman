import Logo from "../../assets/logo.svg";

const COLS = [
  { title: "Features", links: ["Dashboards", "Reporting", "Family Portal", "Payments"] },
  { title: "Company", links: ["About Us", "Careers", "Partners", "Contact"] },
  { title: "Support", links: ["Help Center", "API Docs", "System Status", "Community"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Security"] },
];

const SOCIALS = ["𝕏", "in", "◎"];

export default function Footer() {
  return (
    <footer className='ln-footer'>
      <div className='ln-footer__inner'>
        <div className='ln-footer__grid'>
          {/* Brand column */}
          <div>
            <div className='ln-nav__brand'>
              <img src={Logo} alt='feesman logo' />
              <span className='ln-footer__brand-name'>Feesman</span>
            </div>
            <p className='ln-footer__brand-desc'>
              Institutional finance management reimagined for modern schools. Secure, transparent,
              and built for growth.
            </p>
            <div className='ln-footer__socials'>
              {SOCIALS.map((s) => (
                <button key={s} className='ln-footer__social'>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className='ln-footer__col-title'>{col.title}</h4>
              {col.links.map((l) => (
                <a key={l} href='#' className='ln-footer__col-link'>
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className='ln-footer__bottom'>
          <p className='ln-footer__copy'>© 2024 Feesman Inc. All rights reserved.</p>
          <p className='ln-footer__copy'>Empowering 2,500+ schools worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
