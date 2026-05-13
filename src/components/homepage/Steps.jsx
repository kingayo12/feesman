import Slider from "./Slider";

const STEPS = [
  {
    num: "01",
    title: "Setup Fees",
    desc: "Configure tuition cycles, lab fees, and transport costs for different student grades and categories.",
    icon: (
      <svg
        viewBox='0 0 24 24'
        width='24'
        height='24'
        fill='none'
        stroke='white'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M12 2L2 7l10 5 10-5-10-5z' />
        <path d='M2 17l10 5 10-5M2 12l10 5 10-5' />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Record Payments",
    desc: "Enter payments via cash, bank transfer, or card. Our system splits payments across installments automatically.",
    icon: (
      <svg
        viewBox='0 0 24 24'
        width='24'
        height='24'
        fill='none'
        stroke='white'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <rect x='1' y='4' width='22' height='16' rx='2' />
        <path d='M1 10h22' />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Generate Reports",
    desc: "View executive summaries of school health and send automated SMS reminders to parents with balances.",
    icon: (
      <svg
        viewBox='0 0 24 24'
        width='24'
        height='24'
        fill='none'
        stroke='white'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M18 20V10M12 20V4M6 20v-6' />
      </svg>
    ),
  },
];

function StepCard({ num, title, desc, icon }) {
  return (
    <div className='ln-step'>
      <div className='ln-step__num'>{num}</div>
      <div className='ln-step__icon'>{icon}</div>
      <div className='ln-step__title'>{title}</div>
      <p className='ln-step__desc'>{desc}</p>
    </div>
  );
}

export default function Steps({ isTablet, isMobile, viewportWidth }) {
  const itemWidth = isMobile ? Math.min(viewportWidth - 56, 280) : 320;

  return (
    <section className='ln-steps'>
      <div className='ln-steps__inner'>
        <div className='ln-steps__head'>
          <div className='ln-eyebrow'>How It Works</div>
          <h2 className='ln-steps__title'>Financial Clarity in 3 Steps</h2>
          <p className='ln-steps__desc'>
            We've refined the tuition workflow to eliminate manual errors and administrative
            fatigue.
          </p>
        </div>

        {isTablet ? (
          <Slider
            items={STEPS}
            renderItem={(item, i) => <StepCard key={i} {...item} />}
            itemWidth={itemWidth}
          />
        ) : (
          <div className='ln-steps__grid'>
            {STEPS.map((s, i) => (
              <StepCard key={i} {...s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
