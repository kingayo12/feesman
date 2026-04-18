import Owner from "../layouts/Owner";
import Testimonial from "../layouts/testimonial";
import Map from "../layouts/Owner";
import { Link } from "react-router-dom";
const About = () => {
  return (
    <div>
      <div className='breadcrumb-section'>
        <div className='breadcrumb-overlay'>
          <h1>About Us</h1>
          <p>
            <a href='/'>Home</a> <i className='fa fa-caret-right'></i> <span>About</span>
          </p>
        </div>
      </div>

      {/* <Outlet /> */}

      {/* Vision & Mission Section */}
      <section className='vision-mission-section' id='mission-vision'>
        <h1 className='header'>Mission & Vission</h1>
        <div className='boxes_wrap'>
          <div className='wrap'>
            <div className='box'>
              <h4>Our Visions</h4>
              <p>
                We envision a school where every student is empowered to become a confident,
                compassionate, and responsible global citizen. Through innovative teaching
                practices, a comprehensive curriculum, and a supportive community, we aim to foster
                a love for learning and a commitment to excellence.
              </p>
            </div>
            <div className='shapset'>
              <Link to='/' className='link_style link_white'>
                <i className='fa fa-arrow-right'></i> Read More
              </Link>
            </div>
            <div className='small_angle'></div>
          </div>

          <div className='wrap'>
            <div className='box red_bd'>
              <h4 className='red_bg'>Our Visions</h4>
              <p className='values'>
                <ul>
                  <li>
                    <h5>Excellence</h5>
                    <p>
                      Striving for the highest standards in academics, arts, athletics, and
                      character development
                    </p>
                  </li>
                  <li>
                    <h5> Diversity</h5>
                    <p>
                      Celebrating and respecting the unique backgrounds, perspectives, and talents
                      of our students, staff, and community
                    </p>
                  </li>
                  <li>
                    <h5> Integrity</h5>
                    <p>
                      {" "}
                      Encouraging honesty, responsibility, and ethical behavior in all aspects of
                      school life
                    </p>
                  </li>
                  <li>
                    <h5>Community</h5>
                    <p>
                      Building strong, collaborative relationships among students, families, staff,
                      and the broader community
                    </p>
                  </li>
                  <li>
                    <h5>Innovation</h5>
                    <p>
                      Embracing creativity and forward-thinking approaches to education and
                      problem-solving
                    </p>
                  </li>
                </ul>
              </p>
            </div>
            <div className='shapset'>
              <Link to='/' className='link_style link_white red_bg'>
                <i className='fa fa-arrow-right'></i> Read More
              </Link>
            </div>
            <div className='small_angle red_bg-thick'></div>
          </div>
        </div>
      </section>

      <section className='about_owner'></section>

      {/* Video Section */}
      <section className='video-section'>
        <h2>About Our School</h2>
        <p>Discover the benefits our school offers to our students.</p>
        <video controls>
          {/* <source src={AboutVideo} type='video/mp4' /> */}
          Your browser does not support the video tag.
        </video>
      </section>

      <div className='owner_about'>
        <Owner />
      </div>
      <section className='image_g'>
        <Testimonial />
      </section>
      <Map />
    </div>
  );
};

export default About;
