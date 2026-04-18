import "./css/about.css";
import { Outlet } from "react-router-dom";
// import Owner from "../Layouts/Owner";
// import Testimonial from "../Layouts/testimonial";
// import Map from "../Layouts/Map";
import Footer from "./layouts/Footer";
const About = () => {
  return (
    <div className='about-us-page'>
      <div className='nav_top'></div>

      <Outlet />
      <Footer />
    </div>
  );
};

export default About;
