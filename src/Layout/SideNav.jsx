import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaUserGraduate,
  FaSchool,
  FaMoneyCheckAlt,
  FaCreditCard,
  FaPercent,
  FaToolbox,
  FaHistory,
  FaChartBar,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import Logo from "../assets/logo.png";

const ALL_NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt /> },
  { label: "Families", path: "/families", icon: <FaUsers /> },
  { label: "Students", path: "/students", icon: <FaUserGraduate /> },
  { label: "Classes", path: "/classes", icon: <FaSchool /> },
  // ── everything below is hidden until expanded ──
  { label: "Fees", path: "/fees", icon: <FaMoneyCheckAlt /> },
  { label: "Payment History", path: "/payment-history", icon: <FaHistory /> },
  { label: "Reports", path: "/reports", icon: <FaChartBar /> },
  { label: "Balance", path: "/balance", icon: <FaCreditCard /> },
  { label: "Discount", path: "/discount", icon: <FaPercent /> },
  { label: "Settings", path: "/settings", icon: <FaToolbox /> },
];

// How many items are always visible before the "More" button
const ALWAYS_VISIBLE = 7;

export default function SideNav() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const hiddenItems = ALL_NAV_ITEMS.slice(ALWAYS_VISIBLE);
  const hiddenCount = hiddenItems.length;

  // If the current page is a hidden item, auto-expand so it stays highlighted
  const isOnHiddenPage = hiddenItems.some((item) => location.pathname.startsWith(item.path));

  const shouldShow = expanded || isOnHiddenPage;

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const visibleItems = shouldShow ? ALL_NAV_ITEMS : ALL_NAV_ITEMS.slice(0, ALWAYS_VISIBLE);

  return (
    <aside className='side-nav'>
      <div className='logo'>
        <img src={Logo} alt='Logo' />
      </div>
      <div className='scroll_wrapper'>
        <ul className='nav-list'>
          {/* Always-visible items */}
          {visibleItems.map((item) => (
            <li key={item.path}>
              <Link to={item.path} className={isActive(item.path) ? "nav-link active" : "nav-link"}>
                <span className='icon'>{item.icon}</span>
                <span className='label'>{item.label}</span>
              </Link>
            </li>
          ))}

          {/* Divider before toggle button */}
          <li className='nav-divider' />

          {/* More / Less toggle */}
          <li>
            <button
              className={`nav-link nav-toggle-btn ${shouldShow ? "toggle-open" : ""}`}
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={shouldShow}
              aria-label={shouldShow ? "Show fewer items" : `Show ${hiddenCount} more items`}
            >
              <span className='icon toggle-icon'>
                {shouldShow ? <FaChevronUp /> : <FaChevronDown />}
                {/* Badge — only shown when collapsed and not on a hidden page */}
                {!shouldShow && <span className='more-badge'>{hiddenCount}</span>}
              </span>
              <span className='label'>{shouldShow ? "Less" : "More"}</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
