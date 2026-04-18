import "../css/owner.css";
import Image from "../imgs/owner.jpg";
import Logo from "../logo/logog.png";
import { Link } from "react-router-dom";

const Owner = () => {
  const featuredContents = [
    {
      icon: "fa-solid fa-user-graduate",
      title: "Student Portal",
      description: "Access your grades, assignments, and more.",
      link: "/student-portal",
      btnText: "Go to Portal",
    },
    {
      icon: "fa-solid fa-users",
      title: "Parent Portal",
      description: "Stay updated on your child’s progress.",
      link: "/parent-portal",
      btnText: "Go to Portal",
    },
    {
      icon: "fa-solid fa-book",
      title: "Library Resources",
      description: "Explore our digital library for research and reading.",
      link: "/library-resources",
      btnText: "Visit Library",
    },
    {
      icon: "fa-solid fa-download",
      title: "Downloads",
      description: "Get important forms, handbooks, and documents.",
      link: "/downloads",
      btnText: "View Downloads",
    },
  ];
  return (
    <div className='owner_container'>
      <section className='owner_wrapper'>
        <div className='owner_img_cont'>
          <div className='owner_img'>
            <div className='f_image'>
              <img src={Image} alt='' />
              <div className='ds_img'>
                <div className='object1'>
                  <p>Province</p>
                </div>
              </div>

              <div className='ds_img1'>
                <div className='object1'>
                  <p>OF</p>
                </div>
              </div>

              <div className='ds_img2'>
                <div className='object1'>
                  <p>Knowledge</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='owner_cont_article'>
          <div className='text-content'>
            <h4 className='text-spacing'>Inspiring Excellence, Embracing Diversity</h4>
            <p className='text-width'>
              At Golden Light International Schools Ota, we are dedicated to providing a nurturing
              and challenging educational environment that inspires students to achieve their
              fullest potential. Our mission is to cultivate lifelong learners who are equipped with
              the skills, knowledge, and values necessary to thrive in a diverse and dynamic world.
            </p>
          </div>
          <div className='featured-grid'>
            {featuredContents.map((content, index) => (
              <div className='featured-item' key={index}>
                <div className='featured-item_header'>
                  <div className='icon-container'>
                    <i className={content.icon}></i>
                  </div>
                  <div className='logo_3d'>
                    <img src={Logo} alt='my logo' />
                  </div>
                </div>

                <p>{content.description}</p>
                <Link to={content.link} className='link-btn'>
                  {content.btnText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Owner;
