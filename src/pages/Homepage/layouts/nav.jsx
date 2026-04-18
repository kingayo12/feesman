import "../css/nav.css";
import Logo from "../logo/logog.svg";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

const Nav = () => {
  const location = useLocation();
  const [dropdownState, setDropdownState] = useState({
    about: false,
    academic: false,
    admission: false,
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 1200);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDropdownToggle = (name) => {
    if (!isMobileView || !name) return;
    setDropdownState((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navLinks = [
    {
      name: "Home",
      href: "/",
      isActive: location.pathname === "/",
    },
    {
      name: "About Us",
      href: "/about-us/about",
      dropdownName: "about",
      hasDropdown: true,
      isActive: location.pathname.startsWith("/about-us"),
      dropdownLinks: [
        { name: "About", href: "/about-us/about" },
        { name: "Mission & Vision", href: "/about-us/about#mission-vision" },
        { name: "School History", href: "/about-us/school-history" },
        { name: "Administration", href: "/about-us/administration" },
        { name: "School Policies", href: "/about-us/school-policies" },
      ],
    },
    {
      name: "Academics",
      href: "/academics/curriculum",
      dropdownName: "academic",
      hasDropdown: true,
      isActive: location.pathname.startsWith("/academics"),
      dropdownLinks: [
        { name: "Curriculum", href: "/academics/curriculum" },
        { name: "Departments", href: "#" },
        { name: "Class Schedules", href: "#" },
        { name: "Academic Calendar", href: "#" },
      ],
    },
    {
      name: "Admissions",
      href: "/admissions",
      dropdownName: "admission",
      hasDropdown: true,
      isActive: location.pathname.startsWith("/admissions"),
      dropdownLinks: [
        { name: "Admission Process", href: "#" },
        { name: "Requirements", href: "#" },
        { name: "Application Forms", href: "#" },
        { name: "Tuition & Fees", href: "#" },
      ],
    },
    {
      name: "Students",
      hasDropdown: true,
      dropdownLinks: [
        { name: "Student Portal", href: "#" },
        { name: "Library", href: "#" },
        { name: "Counseling", href: "#" },
        { name: "Extracurricular Activities", href: "#" },
        { name: "Health Services", href: "#" },
      ],
    },
    {
      name: "Parents",
      hasDropdown: true,
      dropdownLinks: [
        { name: "Parent Portal", href: "#" },
        { name: "PTA", href: "#" },
        { name: "Volunteer Opportunities", href: "#" },
        { name: "Newsletters", href: "#" },
      ],
    },
    {
      name: "Staff",
      hasDropdown: true,
      dropdownLinks: [
        { name: "Staff Portal", href: "#" },
        { name: "Faculty Directory", href: "#" },
        { name: "Job Openings", href: "#" },
      ],
    },
    {
      name: "Contact Us",
      href: "/contact-us",
    },
    {
      name: "Login to Feesman",
      href: "/login",
      isActive: location.pathname === "/login",
    },
    {
      name: "Media",
      hasDropdown: true,
      dropdownLinks: [
        { name: "Photo Gallery", href: "#" },
        { name: "Videos", href: "#" },
        { name: "Virtual Tour", href: "#" },
      ],
    },
    {
      name: "Policies",
      hasDropdown: true,
      dropdownLinks: [
        { name: "Handbooks", href: "#" },
        { name: "Forms", href: "#" },
        { name: "Policies", href: "#" },
      ],
    },
    {
      name: "News & Updates",
      hasDropdown: true,
      dropdownLinks: [
        { name: "Blog", href: "#" },
        { name: "Press Releases", href: "#" },
      ],
    },
  ];

  return (
    <div className={`nav ${isMobileMenuOpen ? "mobile-open" : ""}`}>
      <div className='nav_logo'>
        <div className='nav_logo_img'>
          <img src={Logo} alt='School Logo' />
        </div>
      </div>
      <div className='nav_contents'>
        <div className='nav_social_media'>
          <div className='school_name text-bold'>Golden Light Schools</div>
          <div className='social_media'>
            <a href='http://'>
              <i className='fa-brands fa-facebook'></i>
            </a>
            <a href='http://'>
              <i className='fa-brands fa-twitter'></i>
            </a>
            <a href='http://'>
              <i className='fa-brands fa-instagram'></i>
            </a>
            <a href='http://'>
              <i className='fa-brands fa-tiktok'></i>
            </a>
          </div>
        </div>
        <div className={`nav_links ${isMobileMenuOpen ? "show" : ""}`}>
          <ul>
            {navLinks.map((link, index) => (
              <li
                key={index}
                className={`nav_link ${link.isActive ? "active" : ""}`}
                onClick={
                  link.hasDropdown && isMobileView
                    ? () => handleDropdownToggle(link.dropdownName)
                    : null
                }
              >
                <Link
                  to={link.href || "#"}
                  onClick={() => !link.hasDropdown && setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>

                {link.hasDropdown && link.dropdownLinks && (
                  <div className={`dropdown ${dropdownState[link.dropdownName] ? "open" : ""}`}>
                    <ul>
                      {link.dropdownLinks.map((dropdownLink, dropdownIndex) => (
                        <li key={dropdownIndex}>
                          <Link to={dropdownLink.href} onClick={() => setIsMobileMenuOpen(false)}>
                            {dropdownLink.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className='action'>
            <div className='notification'>
              <i className='fa fa-bell'></i>
            </div>
            <div className='mobile_menu' onClick={handleMobileMenuToggle}>
              <i className='fa fa-bars'></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nav;
