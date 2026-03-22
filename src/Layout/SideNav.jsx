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
} from "react-icons/fa";
import Logo from "../assets/logo.png";

export default function SideNav() {
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt /> },
    { label: "Families", path: "/families", icon: <FaUsers /> },
    { label: "Students", path: "/students", icon: <FaUserGraduate /> },
    { label: "Classes", path: "/classes", icon: <FaSchool /> },
    { label: "Fees", path: "/fees", icon: <FaMoneyCheckAlt /> },
    { label: "Payment History", path: "/payment-history", icon: <FaHistory /> },
    { label: "Reports", path: "/reports", icon: <FaChartBar /> },
    { label: "Balance", path: "/balance", icon: <FaCreditCard /> },
    { label: "Discount", path: "/discount", icon: <FaPercent /> },
    { label: "Settings", path: "/settings", icon: <FaToolbox /> },
  ];

  // Exact match for dashboard, prefix match for everything else
  // so /families/123 keeps "Families" highlighted
  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className='side-nav'>
      <div className='logo'>
        <img src={Logo} alt='Logo' />
      </div>

      <ul className='nav-list'>
        {navItems.map((item) => (
          <li key={item.path}>
            <Link to={item.path} className={isActive(item.path) ? "nav-link active" : "nav-link"}>
              <span className='icon'>{item.icon}</span>
              <span className='label'>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
