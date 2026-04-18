import React from "react";
import { Link } from "react-router-dom";
import Logo from "../logo/logog.png";
import Img1 from "../imgs/bg1.jpg";
import Img2 from "../imgs/bgtings.jpg";
import Img3 from "../imgs/owner.jpg";
import "../css/footer.css"; // Include your CSS file

const Footer = () => {
  const quickLinks = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Admissions", path: "/admissions" },
    { name: "Academics", path: "/academics" },
    { name: "Student Portal", path: "/student-portal" },
    { name: "Parent Portal", path: "/parent-portal" },
    { name: "Library", path: "/library-resources" },
    { name: "Contact Us", path: "/contact" },
    { name: "News & Updates", path: "/news" },
    { name: "Photo Gallery", path: "/gallery" },
    { name: "Videos", path: "/videos" },
    { name: "Virtual Tour", path: "/virtual-tour" },
    { name: "Forms & Policies", path: "/policies" },
    { name: "Career Opportunities", path: "/careers" },
  ];

  const galleryImages = [Img1, Img2, Img3];

  return (
    <footer className='footer'>
      <div className='footer-container'>
        <div className='footer-logo'>
          <img src={Logo} alt='Golden Light International School' />
        </div>

        <div className='footer-links'>
          <h3>Quick Links</h3>
          <ul>
            {quickLinks.map((link, index) => (
              <li key={index}>
                <Link to={link.path}>{link.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className='footer-gallery'>
          <h3>Gallery</h3>
          <div className='gallery-images'>
            {galleryImages.map((img, index) => (
              <div className='footer_gallery' key={index}>
                <img src={img} alt={`Gallery ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='footer-bottom'>
        <p>&copy; 2024 Golden Light International School Ota. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
