const BARS = [38, 52, 44, 80, 72, 90, 75, 50];
const ACTIVE = new Set([3, 4, 5, 6]);

const TX = [
  { name: "Adebayo Family · JSS2", amount: "₦125,000", status: "Paid", cls: "paid" },
  { name: "Okafor · Primary 5", amount: "₦98,500", status: "Pending", cls: "pending" },
  { name: "Ibrahim Siblings (×3)", amount: "₦310,000", status: "Paid", cls: "paid" },
];

const KPIS = [
  ["₦48.2M", "Total Revenue"],
  ["1,240", "Students"],
  ["96%", "Collection"],
];

export default function DashboardMockup({ compact = false }) {
  return (
    <div className={`ln-mockup${compact ? " ln-mockup--compact" : ""}`}>
      <div className='ln-mockup__card'>
        {/* Header */}
        <div className='ln-mockup__header'>
          <div className='ln-mockup__header-brand'>
            <svg width='14' height='14' viewBox='0 0 18 18' fill='none'>
              <path d='M11 3L5 10h4l-2 5 7-8h-4l2-4z' fill='white' />
            </svg>
            <span className='ln-mockup__header-name'>Feesman</span>
          </div>
          <span className='ln-mockup__header-tag'>Dashboard</span>
        </div>

        {/* Body */}
        <div className='ln-mockup__body'>
          <div className='ln-mockup__section-label'>Financial Overview — Q1 2024</div>

          {/* KPIs */}
          <div className='ln-mockup__kpis'>
            {KPIS.map(([v, l]) => (
              <div key={l} className='ln-mockup__kpi'>
                <div className='ln-mockup__kpi-value'>{v}</div>
                <div className='ln-mockup__kpi-label'>{l}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className='ln-mockup__chart'>
            <div className='ln-mockup__chart-label'>Monthly Collections</div>
            <div className='ln-mockup__bars'>
              {BARS.map((h, i) => (
                <div
                  key={i}
                  className={`ln-mockup__bar${ACTIVE.has(i) ? " ln-mockup__bar--active" : ""}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div className='ln-mockup__tx-label'>Recent Transactions</div>
          {TX.map(({ name, amount, status, cls }) => (
            <div key={name} className='ln-mockup__tx'>
              <span className='ln-mockup__tx-name'>{name}</span>
              <div className='ln-mockup__tx-right'>
                <span className='ln-mockup__tx-amount'>{amount}</span>
                <span className={`ln-mockup__tx-status ln-mockup__tx-status--${cls}`}>
                  {status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating sync pill */}
      {!compact && (
        <div className='ln-mockup__sync'>
          <div className='ln-mockup__sync-icon'>✓</div>
          <div>
            <div className='ln-mockup__sync-title'>Payment Synced</div>
            <div className='ln-mockup__sync-sub'>Offline record updated</div>
          </div>
        </div>
      )}
    </div>
  );
}
