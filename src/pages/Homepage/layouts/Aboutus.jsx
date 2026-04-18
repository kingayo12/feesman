import React from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Cardswiper from "../components/Slider/cardswiper";
import { Link } from "react-router-dom";
import "../css/aboutus.css";

const Aboutus = () => {
  const { ref: imgRef, inView: imgInView } = useInView({ triggerOnce: true, threshold: 0.2 });
  const { ref: textRef, inView: textInView } = useInView({ triggerOnce: true, threshold: 0.2 });
  const { ref: boxesRef, inView: boxesInView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className='about_container element'>
      <motion.div
        className='about_img'
        ref={imgRef}
        initial={{ opacity: 0, x: -50 }}
        animate={imgInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Cardswiper />
      </motion.div>

      <motion.div
        className='about_content'
        ref={textRef}
        initial={{ opacity: 0, y: 50 }}
        animate={textInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className='text-content'>
          <h1>About Us</h1>
          <h3 className='text-spacing'>Inspiring Excellence, Embracing Diversity</h3>
          <p className='text-width'>
            At Golden Light International Schools Ota, we are dedicated to providing a nurturing and
            challenging educational environment that inspires students to achieve their fullest
            potential. Our mission is to cultivate lifelong learners who are equipped with the
            skills, knowledge, and values necessary to thrive in a diverse and dynamic world.
          </p>
          <motion.div
            className='boxes_wrap'
            ref={boxesRef}
            initial={{ opacity: 0, y: 50 }}
            animate={boxesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className='wrap'>
              <div className='box'>
                <h4>Our Visions</h4>
                <p>
                  We envision a school where every student is empowered to become a confident,
                  compassionate, and responsible global citizen. Through innovative teaching
                  practices, a comprehensive curriculum, and a supportive community, we aim to
                  foster a love for learning and a commitment to excellence.
                </p>
              </div>
              <div className='shapset'>
                <Link to='/' className='link_style link_white'>
                  <i className='fa fa-arrow-right'></i> Read More
                </Link>
              </div>
              <div className='small_angle'></div>
            </div>

            <div className='wrap' id='mission-vision'>
              <div className='box red_bd'>
                <h4 className='red_bg'>Our Values</h4>
                <div className='values'>
                  <ul>
                    <li>
                      <h5>Excellence</h5>
                      <span>Striving for the highest standards ...</span>
                    </li>
                    <li>
                      <h5>Diversity</h5>
                      <span>Celebrating and respecting the unique...</span>
                    </li>
                    <li>
                      <h5>Integrity</h5>
                      <span>Encouraging honesty, responsibility, and ethical behavior ...</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className='shapset'>
                <Link to='/' className='link_style link_white red_bg'>
                  <i className='fa fa-arrow-right'></i> Read More
                </Link>
              </div>
              <div className='small_angle red_bg-thick'></div>
            </div>

            <div className='wrap'>
              <div className='box'>
                <h4>Our Programs</h4>
                <p>
                  Offering a rigorous and balanced curriculum that challenges students to think
                  critically and creatively. Our dedicated teachers and staff work tirelessly to
                  ensure that each student receives personalized attention and guidance, helping
                  them to achieve their academic and personal goals
                </p>
              </div>
              <div className='shapset'>
                <Link to='/' className='link_style link_white'>
                  <i className='fa fa-arrow-right'></i> Read More
                </Link>
              </div>
              <div className='small_angle'></div>
            </div>
            <div className='join_us'>
              <p>
                Become part of a community that values excellence, embraces diversity, and is
                committed to the success of every student.
              </p>
              <div className='action_button'>
                <button>Join us now</button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Aboutus;
