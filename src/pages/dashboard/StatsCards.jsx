import { HiUsers, HiCurrencyDollar, HiCreditCard, HiExclamationCircle } from "react-icons/hi2";

export default function StatsCards({ stats }) {
  const cards = [
    {
      label: "Enrolled Students",
      value: stats.totalStudents,
      icon: <HiUsers />,
      type: "students",
      desc: "Active this term",
    },
    {
      label: "Expected Revenue",
      value: `₦${stats.totalFees?.toLocaleString()}`,
      icon: <HiCurrencyDollar />,
      type: "fees",
      desc: "Total billed items",
    },
    {
      label: "Collections",
      value: `₦${stats.totalPayments?.toLocaleString()}`,
      icon: <HiCreditCard />,
      type: "payments",
      desc: "Actually received",
    },
    {
      label: "Outstanding Debt",
      value: `₦${stats.outstanding?.toLocaleString()}`,
      icon: <HiExclamationCircle />,
      type: "outstanding",
      desc: "Unpaid balance",
    },
  ];

  return (
    <div className='stats-grid'>
      {cards.map((c) => (
        <div key={c.label} className={`stat-card ${c.type}`}>
          <div className='stat-card-inner'>
            <div className='stat-content'>
              <p className='stat-label'>{c.label}</p>
              <h2 className='stat-value'>{c.value || 0}</h2>
              <span className='stat-desc'>{c.desc}</span>
            </div>
            <div className={`stat-icon-wrapper ${c.type}`}>{c.icon}</div>
          </div>
          {/* Progress bar to show collection percentage */}
          {c.type === "payments" && (
            <div className='stat-progress-bg'>
              <div
                className='stat-progress-fill'
                style={{ width: `${(stats.totalPayments / stats.totalFees) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
