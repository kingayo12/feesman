import SipwerSlider from "./components/Slider/SipwerSlider";
import Aboutus from "./layouts/Aboutus";
import AcademicPrograms from "./layouts/AcademicPrograms";
import Announcement_news from "./layouts/Announcement_news";
import ContactUs from "./layouts/ContactUs";
import FeaturedContents from "./layouts/FeaturedContents";
import Map from "./layouts/Map";
import "./css/index.css";
import "./css/swiperslider.css";
import Testimonial from "./layouts/testimonial";
import Footer from "./layouts/Footer";

const Home = () => {
  return (
    <div className='home_container'>
      <div className='nav_top'></div>
      <div className='home_hero_section'>
        <SipwerSlider />
      </div>
      <div className='home_About_section'>
        <Aboutus />
      </div>
      <div className='home_Anouncement_section'>
        <Announcement_news />
      </div>
      <div className='home_AcademicPrograms_section'>
        <AcademicPrograms />
      </div>
      <div className='home_testimonial_section'>
        <Testimonial />
      </div>
      <div className='home_featured_content_section'>
        <FeaturedContents />
      </div>
      <div className='home_contact_us_section'>
        <ContactUs />
      </div>
      <div className='home_map_section'>
        <Map />
      </div>
      <div className='home_footer_section'>
        <Footer />
      </div>
    </div>
  );
};

export default Home;
