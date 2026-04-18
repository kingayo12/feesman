import { Link } from "react-router-dom";
import "../css/contactus.css";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaInstagram,
} from "react-icons/fa";

const ContactUs = () => {
  return (
    <section className='contact-us'>
      <div className='contact_wrapper'>
        <div className='contact-info'>
          <h2>Contact Information</h2>
          <p>
            <FaPhoneAlt className='contact-icon' /> <strong>Phone:</strong> +1 (123) 456-7890
          </p>
          <p>
            <FaEnvelope className='contact-icon' /> <strong>Email:</strong> info@school.com
          </p>
          <p>
            <FaMapMarkerAlt className='contact-icon' /> <strong>Address:</strong> 123 School St,
            City, Country
          </p>
          <p>
            <FaClock className='contact-icon' /> <strong>Office Hours:</strong> Mon - Fri, 8:00 AM -
            5:00 PM
          </p>
        </div>

        <div className='social-media'>
          <h2>Connect with Us</h2>
          <ul>
            <li>
              <Link to='https://www.facebook.com' target='_blank' rel='noopener noreferrer'>
                <FaFacebook className='social-icon' /> Facebook
              </Link>
            </li>
            <li>
              <Link to='https://www.twitter.com' target='_blank' rel='noopener noreferrer'>
                <FaTwitter className='social-icon' /> Twitter
              </Link>
            </li>
            <li>
              <Link to='https://www.linkedin.com' target='_blank' rel='noopener noreferrer'>
                <FaLinkedin className='social-icon' /> LinkedIn
              </Link>
            </li>
            <li>
              <Link to='https://www.instagram.com' target='_blank' rel='noopener noreferrer'>
                <FaInstagram className='social-icon' /> Instagram
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className='contact-form'>
        <h2>Get in Touch</h2>
        <form>
          <div className='row'>
            <div className='form-group'>
              <label htmlFor='firstname'>First Name</label>
              <input type='text' id='firstname' name='firstname' required placeholder='' />
            </div>
            <div className='form-group'>
              <label htmlFor='lastname'>Last Name</label>
              <input type='text' id='lastname' name='lastname' required placeholder='' />
            </div>
          </div>

          <div className='row'>
            <div className='form-group'>
              <label htmlFor='email'>Email</label>
              <input type='email' id='email' name='email' required placeholder='' />
            </div>
            <div className='form-group'>
              <label htmlFor='phone'>Phone</label>
              <input type='tel' id='phone' name='phone' required placeholder='' />
            </div>
          </div>

          <div className='form-group'>
            <label htmlFor='subject'>Subject</label>
            <input type='text' id='subject' name='subject' required placeholder='' />
          </div>
          <div className='form-group'>
            <label htmlFor='message'>Message</label>
            <textarea id='message' name='message' rows='5' required placeholder=''></textarea>
          </div>
          <div className='form-group'>
            <button type='submit' className='submit-btn'>
              Submit
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ContactUs;
