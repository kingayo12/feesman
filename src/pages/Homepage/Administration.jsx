import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { FaEllipsisH, FaFacebook, FaWhatsapp } from "react-icons/fa";
import Image1 from "./imgs/owner.jpg";
import Image2 from "./imgs/owner.jpg";
// import Image3 from "../assets/imgs/admin3.jpg";
// import Image4 from "../assets/imgs/admin4.jpg";
// import Image5 from "../assets/imgs/admin5.jpg";
// import Image6 from "../assets/imgs/admin6.jpg";
import "./css/administration.css";
import Testimonial from "./layouts/testimonial";

const Administration = () => {
  const adminMembers = [
    {
      name: "Adewunmi Janent",
      title: "Principal",
      image: Image1,
      description: "Dr. John Doe has over 20 years of experience in educational leadership...",
      social: {
        instagram: "https://www.instagram.com/janent",
        facebook: "https://www.facebook.com/janent",
        twitter: "https://twitter.com/janent",
        whatsapp: "https://wa.me/1234567890",
        youtube: "https://www.youtube.com/janent",
      },
    },
    {
      name: "Jane Smith",
      title: "Vice Principal",
      image: Image2,
      description: "Ms. Jane Smith is dedicated to maintaining a high standard of education...",
      social: {
        instagram: "https://www.instagram.com/janesmith",
        facebook: "https://www.facebook.com/janesmith",
        twitter: "https://twitter.com/janesmith",
        whatsapp: "https://wa.me/1234567891",
        youtube: "https://www.youtube.com/janesmith",
      },
    },
    {
      name: "Jane Smith",
      title: "Vice Principal",
      image: Image2,
      description: "Ms. Jane Smith is dedicated to maintaining a high standard of education...",
      social: {
        instagram: "https://www.instagram.com/janesmith",
        facebook: "https://www.facebook.com/janesmith",
        twitter: "https://twitter.com/janesmith",
        whatsapp: "https://wa.me/1234567891",
        youtube: "https://www.youtube.com/janesmith",
      },
    },
    {
      name: "Jane Smith",
      title: "Vice Principal",
      image: Image2,
      description: "Ms. Jane Smith is dedicated to maintaining a high standard of education...",
      social: {
        instagram: "https://www.instagram.com/janesmith",
        facebook: "https://www.facebook.com/janesmith",
        twitter: "https://twitter.com/janesmith",
        whatsapp: "https://wa.me/1234567891",
        youtube: "https://www.youtube.com/janesmith",
      },
    },
    {
      name: "Jane Smith",
      title: "Vice Principal",
      image: Image2,
      description: "Ms. Jane Smith is dedicated to maintaining a high standard of education...",
      social: {
        instagram: "https://www.instagram.com/janesmith",
        facebook: "https://www.facebook.com/janesmith",
        twitter: "https://twitter.com/janesmith",
        whatsapp: "https://wa.me/1234567891",
        youtube: "https://www.youtube.com/janesmith",
      },
    },
    {
      name: "Jane Smith",
      title: "Vice Principal",
      image: Image2,
      description: "Ms. Jane Smith is dedicated to maintaining a high standard of education...",
      social: {
        instagram: "https://www.instagram.com/janesmith",
        facebook: "https://www.facebook.com/janesmith",
        twitter: "https://twitter.com/janesmith",
        whatsapp: "https://wa.me/1234567891",
        youtube: "https://www.youtube.com/janesmith",
      },
    },
    {
      name: "Jane Smith",
      title: "Vice Principal",
      image: Image2,
      description: "Ms. Jane Smith is dedicated to maintaining a high standard of education...",
      social: {
        instagram: "https://www.instagram.com/janesmith",
        facebook: "https://www.facebook.com/janesmith",
        twitter: "https://twitter.com/janesmith",
        whatsapp: "https://wa.me/1234567891",
        youtube: "https://www.youtube.com/janesmith",
      },
    },
    {
      name: "Jane Smith",
      title: "Vice Principal",
      image: Image2,
      description: "Ms. Jane Smith is dedicated to maintaining a high standard of education...",
      social: {
        instagram: "https://www.instagram.com/janesmith",
        facebook: "https://www.facebook.com/janesmith",
        twitter: "https://twitter.com/janesmith",
        whatsapp: "https://wa.me/1234567891",
        youtube: "https://www.youtube.com/janesmith",
      },
    },
  ];

  return (
    <div className='admission_container'>
      <div className='breadcrumb-section'>
        <div className='breadcrumb-overlay'>
          <h1>Administration</h1>
          <p>
            <a href='/'>Home</a> <i className='fa fa-caret-right'></i> <span>Administration</span>
          </p>
        </div>
      </div>

      <section className='administration'>
        <div className='administration-header'>
          <h1>Administration</h1>
          <p>Meet the dedicated team that leads our school.</p>
        </div>

        <div className='admin-team'>
          {adminMembers.map((member, index) => (
            <div className='admin-member' key={index}>
              <div className='admin-member_img'>
                <img src={member.image} alt={member.title} />
              </div>
              <div className='admin_article'>
                <h2 className='admin_name'>{member.name}</h2>
                <p className='admin_title'>{member.title}</p>
                <p className='admin_description'>{member.description}</p>
                <div className='member_social_media'>
                  <div className='social-icon'>
                    <a href={member.social.instagram} target='_blank' rel='noopener noreferrer'>
                      <FaInstagram />
                    </a>
                    <a href={member.social.facebook} target='_blank' rel='noopener noreferrer'>
                      <FaFacebook />
                    </a>
                    <a href={member.social.twitter} target='_blank' rel='noopener noreferrer'>
                      <FaXTwitter />
                    </a>
                    <a href={member.social.whatsapp} target='_blank' rel='noopener noreferrer'>
                      <FaWhatsapp />
                    </a>
                    <a href={member.social.youtube} target='_blank' rel='noopener noreferrer'>
                      <FaYoutube />
                    </a>
                    <div>
                      <FaEllipsisH />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='admin-mission'>
          <h2>Our Mission</h2>
          <p>
            Our administration is dedicated to providing a supportive and effective learning
            environment. We strive to empower both students and staff to reach their full potential
            by fostering an atmosphere of excellence, integrity, and innovation.
          </p>
        </div>
        <Testimonial />
      </section>
    </div>
  );
};

export default Administration;
