import DashboardMockup from "./DashboardMockup";

const STATS = [
  ["2,500+", "Schools worldwide"],
  ["99.9%", "Uptime"],
  ["$2.4B+", "Fees processed"],
];

export default function Hero() {
  return (
    <section className='ln-hero'>
      <div className='ln-hero__bg' />
      <div className='ln-hero__glow-1' />
      <div className='ln-hero__glow-2' />

      <div className='ln-hero__inner'>
        {/* Left — copy */}
        <div className='ln-hero__content'>
          <div className='ln-hero__badge'>
            <span className='ln-hero__badge-dot' />
            <span className='ln-hero__badge-text'>Institutional Finance Platform</span>
          </div>

          <h1 className='ln-hero__title'>
            Empower Your School's <span className='ln-hero__title-accent'>Financial Future</span>
          </h1>

          <p className='ln-hero__desc'>
            Streamline tuition collection, track diverse payment methods, and manage family accounts
            with institutional precision. The executive dashboard designed for modern school
            administrators.
          </p>

          <div className='ln-hero__btns'>
            <button className='ln-btn ln-btn--primary'>Get Started</button>
            <button className='ln-btn ln-btn--outline'>▶ Watch Demo</button>
          </div>

          <div className='ln-hero__stats'>
            {STATS.map(([v, l]) => (
              <div key={l}>
                <span className='ln-hero__stat-value'>{v}</span>
                <span className='ln-hero__stat-label'>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — mockup */}
        <div className='ln-hero__visual'>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
