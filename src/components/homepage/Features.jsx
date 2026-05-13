import { useState } from "react";
import Slider from "./Slider";

const FEATURES = [
  {
    icon: (
      <svg
        viewBox='0 0 24 24'
        width='22'
        height='22'
        fill='none'
        stroke='var(--primary-color)'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <rect x='2' y='3' width='20' height='14' rx='2' />
        <path d='M8 21h8M12 17v4' />
      </svg>
    ),
    title: "Real-time Finance Visibility",
    desc: "Live tracking of total revenue, outstanding debts, and upcoming payment schedules with high-density executive reporting.",
  },
  {
    icon: (
      <svg
        viewBox='0 0 24 24'
        width='22'
        height='22'
        fill='none'
        stroke='var(--primary-color)'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
        <circle cx='9' cy='7' r='4' />
        <path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' />
      </svg>
    ),
    title: "Family-Centric Management",
    desc: "Manage sibling discounts and multi-student ledgers under a single parent account with ease.",
  },
  {
    icon: (
      <svg
        viewBox='0 0 24 24'
        width='22'
        height='22'
        fill='none'
        stroke='var(--primary-color)'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M1 6l11 13L23 6' />
        <path d='M1 6h22' />
      </svg>
    ),
    title: "Offline-First Capability",
    desc: "Record payments without internet. Data syncs automatically when connection returns — no disruption to operations.",
  },
];

function FeatureCard({ icon, title, desc }) {
  return (
    <div className='ln-feat-card'>
      <div className='ln-feat-card__accent' />
      <div className='ln-feat-card__icon-wrap'>{icon}</div>
      <div className='ln-feat-card__title'>{title}</div>
      <p className='ln-feat-card__desc'>{desc}</p>
      <a href='#' className='ln-feat-card__link'>
        Learn more →
      </a>
    </div>
  );
}

export default function Features({ isTablet, isMobile, viewportWidth }) {
  const itemWidth = isMobile ? Math.min(viewportWidth - 56, 300) : 340;

  return (
    <section className='ln-features'>
      <div className='ln-features__inner'>
        {/* Heading */}
        <div className='ln-features__head'>
          <div className='ln-eyebrow'>Why Feesman</div>
          <h2 className='ln-features__title'>Precision Engineering for Schools</h2>
          <p className='ln-features__desc'>
            Feesman simplifies complex financial hierarchies into clear, actionable data flows.
          </p>
        </div>

        {/* Grid (desktop) / Slider (tablet + mobile) */}
        {isTablet ? (
          <Slider
            items={FEATURES}
            renderItem={(item, i) => <FeatureCard key={i} {...item} />}
            itemWidth={itemWidth}
          />
        ) : (
          <div className='ln-features__grid'>
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        )}

        {/* CTA banner */}
        <div className='ln-features__cta' style={{ marginTop: isTablet ? "1.5rem" : 0 }}>
          <div>
            <div className='ln-features__cta-title'>Automated Reporting</div>
            <p className='ln-features__cta-desc'>
              Generate end-of-month reconciliations, student account statements, and tax receipts
              with a single click. Compliance-ready and exportable.
            </p>
          </div>
          <button className='ln-btn ln-btn--white' style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
            Explore Reports →
          </button>
        </div>
      </div>
    </section>
  );
}
