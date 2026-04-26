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
  FaUserShield,
  FaEnvelopeOpenText,
} from "react-icons/fa";
import Logo from "../assets/logo.svg";
import { useRole } from "../hooks/useRole";
import { PERMISSIONS } from "../config/permissions";

// All possible nav items with the permission needed to see them
const NAV_CONFIG = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <FaTachometerAlt />,
    permission: PERMISSIONS.VIEW_DASHBOARD,
  },
  {
    label: "Families",
    path: "/families",
    icon: <FaUsers />,
    permission: PERMISSIONS.VIEW_FAMILIES,
  },
  {
    label: "Students",
    path: "/students",
    icon: <FaUserGraduate />,
    permission: PERMISSIONS.VIEW_STUDENTS,
  },
  { label: "Classes", path: "/classes", icon: <FaSchool />, permission: PERMISSIONS.VIEW_CLASSES },
  // ── hidden until expanded ──
  { label: "Fees", path: "/fees", icon: <FaMoneyCheckAlt />, permission: PERMISSIONS.VIEW_FEES },
  {
    label: "Payment History",
    path: "/payment-history",
    icon: <FaHistory />,
    permission: PERMISSIONS.VIEW_PAYMENTS,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: <FaChartBar />,
    permission: PERMISSIONS.VIEW_REPORTS,
  },
  {
    label: "Letters",
    path: "/letters",
    icon: <FaEnvelopeOpenText />,
    permission: PERMISSIONS.VIEW_LETTERS,
  },
  {
    label: "Balance",
    path: "/balance",
    icon: <FaCreditCard />,
    permission: PERMISSIONS.VIEW_BALANCES,
  },
  {
    label: "Discount",
    path: "/discount",
    icon: <FaPercent />,
    permission: PERMISSIONS.VIEW_DISCOUNTS,
  },
  { label: "Roles", path: "/roles", icon: <FaUserShield />, permission: PERMISSIONS.VIEW_ROLES },
  {
    label: "Settings",
    path: "/settings",
    icon: <FaToolbox />,
    permission: PERMISSIONS.VIEW_SETTINGS,
  },
];

const ALWAYS_VISIBLE = 8; // how many items show before the More button

export default function SideNav() {
  const location = useLocation();
  const { can, loading } = useRole();
  const [expanded, setExpanded] = useState(false);

  // Filter to only items the current user can see
  const allowed = loading ? [] : NAV_CONFIG.filter((item) => can(item.permission));

  const visibleBase = allowed.slice(0, ALWAYS_VISIBLE);
  const hidden = allowed.slice(ALWAYS_VISIBLE);
  const hiddenCount = hidden.length;

  // Auto-expand if current page is in the hidden list
  const isOnHidden = hidden.some((item) => location.pathname.startsWith(item.path));
  const shouldExpand = expanded || isOnHidden;
  const visible = shouldExpand ? allowed : visibleBase;

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className='side-nav'>
      <div className='logo'>
        <img src={Logo} alt='Logo' />
      </div>
      <div className='scroll_wrapper'>
        <ul className='nav-list'>
          {visible.map((item) => (
            <li key={item.path}>
              <Link to={item.path} className={isActive(item.path) ? "nav-link active" : "nav-link"}>
                <span className='icon'>{item.icon}</span>
                <span className='label'>{item.label}</span>
              </Link>
            </li>
          ))}

          {/* Only show More button if there are hidden items */}
          {hiddenCount > 0 && (
            <>
              <li className='nav-divider' />
              <li>
                <button
                  className={`nav-link nav-toggle-btn ${shouldExpand ? "toggle-open" : ""}`}
                  onClick={() => setExpanded((p) => !p)}
                  aria-expanded={shouldExpand}
                >
                  <span className='icon toggle-icon'>
                    {shouldExpand ? <FaChevronUp /> : <FaChevronDown />}
                    {!shouldExpand && <span className='more-badge'>{hiddenCount}</span>}
                  </span>
                  <span className='label'>{shouldExpand ? "Less" : "More"}</span>
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </aside>
  );
}
