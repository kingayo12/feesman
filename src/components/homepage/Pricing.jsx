import Slider from "./Slider";

const PLANS = [
  {
    name: "Starter",
    tagline: "For small private schools & daycares",
    price: "$49",
    period: "/month",
    features: ["Up to 100 students", "Core payment recording", "Basic PDF reports"],
    cta: "Start Free Trial",
    solid: false,
    popular: false,
  },
  {
    name: "Professional",
    tagline: "Comprehensive management for growing institutions",
    price: "$129",
    period: "/month",
    features: [
      "Up to 500 students",
      "Family/Sibling ledgers",
      "Automated SMS reminders",
      "Advanced Excel exports",
    ],
    cta: "Get Started Now",
    solid: true,
    popular: true,
  },
  {
    name: "Enterprise",
    tagline: "For multi-campus school groups",
    price: "Custom",
    period: "",
    features: [
      "Unlimited students",
      "Multi-campus dashboard",
      "Custom API integration",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    solid: false,
    popular: false,
  },
];

function PlanCard({ plan }) {
  return (
    <div className={`ln-plan${plan.popular ? " ln-plan--popular" : ""}`}>
      {plan.popular && <div className='ln-plan__badge'>Most Popular</div>}

      <div className='ln-plan__name'>{plan.name}</div>
      <p className='ln-plan__tagline'>{plan.tagline}</p>

      <div className='ln-plan__price-row'>
        <span className='ln-plan__price'>{plan.price}</span>
        {plan.period && <span className='ln-plan__period'>{plan.period}</span>}
      </div>
      <p className='ln-plan__billing'>Billed annually</p>

      <ul className='ln-plan__features'>
        {plan.features.map((f) => (
          <li key={f} className='ln-plan__feature'>
            <span className='ln-plan__check'>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        className={`ln-plan__btn${plan.solid ? " ln-plan__btn--solid" : " ln-plan__btn--outline"}`}
      >
        {plan.cta}
      </button>
    </div>
  );
}

export default function Pricing({ isTablet, isMobile, viewportWidth }) {
  const itemWidth = isMobile ? Math.min(viewportWidth - 56, 300) : 340;

  return (
    <section className='ln-pricing'>
      <div className='ln-pricing__inner'>
        <div className='ln-pricing__head'>
          <div className='ln-eyebrow'>Pricing</div>
          <h2 className='ln-pricing__title'>Scalable Plans for Every School</h2>
          <p className='ln-pricing__desc'>
            Choose a plan that fits your student body size and reporting needs.
          </p>
        </div>

        {isTablet ? (
          <Slider
            items={PLANS}
            renderItem={(plan, i) => <PlanCard key={i} plan={plan} />}
            itemWidth={itemWidth}
          />
        ) : (
          <div className='ln-pricing__grid'>
            {PLANS.map((p, i) => (
              <PlanCard key={i} plan={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
