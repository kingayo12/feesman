import { useState, useRef } from "react";

const TESTIMONIALS = [
  {
    quote:
      "Feesman has completely transformed how we handle our semesterly intake. What used to take three accountants two weeks now takes a single staff member three days. The clarity on our cash flow is unprecedented.",
    name: "Sarah Jenkins",
    role: "Administrator, St. Jude's International",
    initials: "SJ",
  },
  {
    quote:
      "We used to lose track of partial payments across siblings. Feesman's family ledger view gave us instant clarity. Our finance team now closes each month 5 days faster.",
    name: "Adaeze Nwosu",
    role: "Bursar, Greenfield Academy",
    initials: "AN",
  },
  {
    quote:
      "The offline-first feature alone was worth switching. Our rural campuses now capture every payment even without internet, and it all syncs seamlessly.",
    name: "Michael Oladele",
    role: "Director of Finance, Horizon Schools",
    initials: "MO",
  },
];

export default function Testimonials() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const startX = useRef(null);

  const go = (n) => {
    const next = Math.max(0, Math.min(TESTIMONIALS.length - 1, n));
    if (next === idx) return;
    setFading(true);
    setTimeout(() => {
      setIdx(next);
      setFading(false);
    }, 250);
  };

  const t = TESTIMONIALS[idx];

  return (
    <section
      className='ln-testimonials'
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = startX.current - e.changedTouches[0].clientX;
        if (Math.abs(dx) > 40) go(dx > 0 ? idx + 1 : idx - 1);
        startX.current = null;
      }}
    >
      <div className='ln-testimonials__inner'>
        <div className='ln-testimonials__quote-mark'>"</div>

        <blockquote
          className={`ln-testimonials__blockquote${fading ? " ln-testimonials__blockquote--fading" : ""}`}
        >
          {t.quote}
        </blockquote>

        <div
          className={`ln-testimonials__author${fading ? " ln-testimonials__author--fading" : ""}`}
        >
          <div className='ln-testimonials__avatar'>{t.initials}</div>
          <div className='ln-testimonials__name'>{t.name}</div>
          <div className='ln-testimonials__role'>{t.role}</div>
        </div>

        {/* Navigation */}
        <div className='ln-testimonials__nav'>
          <button
            className='ln-testimonials__arrow'
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
          >
            ←
          </button>

          <div className='ln-testimonials__dots'>
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`ln-testimonials__dot${i === idx ? " ln-testimonials__dot--active" : ""}`}
              />
            ))}
          </div>

          <button
            className='ln-testimonials__arrow'
            onClick={() => go(idx + 1)}
            disabled={idx === TESTIMONIALS.length - 1}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
