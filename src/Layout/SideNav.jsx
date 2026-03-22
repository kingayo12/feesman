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
} from "react-icons/fa";
import Logo from "../assets/logo.png"; // Import your CSS

export default function SideNav() {
  const location = useLocation(); // to highlight active link

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt /> },
    { label: "Families", path: "/families", icon: <FaUsers /> },
    { label: "Students", path: "/students", icon: <FaUserGraduate /> },
    { label: "Classes", path: "/classes", icon: <FaSchool /> },
    { label: "Fees", path: "/fees", icon: <FaMoneyCheckAlt /> },
    { label: "Balance", path: "/balance", icon: <FaCreditCard /> },
    { label: "Discount", path: "/discount", icon: <FaPercent /> },
    { label: "Settings", path: "/settings", icon: <FaToolbox /> },
  ];

  return (
    <aside className='side-nav'>
      <div className='logo'>
        <img src={Logo} alt='Logo' />
      </div>

      <ul className='nav-list'>
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={location.pathname === item.path ? "nav-link active" : "nav-link"}
            >
              <span className='icon'>{item.icon}</span>
              <span className='label'>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
