import { useState, useRef } from "react";

export default function Slider({ items, renderItem, itemWidth, gap = 16 }) {
  const [idx, setIdx] = useState(0);
  const startX = useRef(null);
  const total = items.length;

  const go = (n) => setIdx(Math.max(0, Math.min(total - 1, n)));

  return (
    <div>
      <div
        className='ln-slider'
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
        <div
          className='ln-slider__track'
          style={{
            gap,
            transform: `translateX(calc(-${idx} * (${itemWidth}px + ${gap}px)))`,
          }}
        >
          {items.map((item, i) => (
            <div key={i} style={{ flex: `0 0 ${itemWidth}px`, width: itemWidth }}>
              {renderItem(item, i)}
            </div>
          ))}
        </div>
      </div>

      <div className='ln-slider__dots'>
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`ln-slider__dot${i === idx ? " ln-slider__dot--active" : ""}`}
          />
        ))}
      </div>

      <div className='ln-slider__arrows'>
        {["←", "→"].map((arrow, ai) => (
          <button
            key={arrow}
            onClick={() => go(ai === 0 ? idx - 1 : idx + 1)}
            disabled={ai === 0 ? idx === 0 : idx === total - 1}
            className='ln-slider__arrow'
          >
            {arrow}
          </button>
        ))}
      </div>
    </div>
  );
}
