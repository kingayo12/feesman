import { Link } from "react-router-dom";
import "../css/featuredContents.css";
import Logo from "../logo/logog.png";
// import ImageGallery from "../components/ImageGallery";
import Image1 from "../imgs/bgtings.jpg";
const FeaturedContents = () => {
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
    <section className='featured-contents'>
      <h2>Explore Our Resources</h2>
      <div className='featuered_wrapper'>
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
              <h3>{content.title}</h3>
              <p>{content.description}</p>
              <Link to={content.link} className='link-btn'>
                {content.btnText}
              </Link>
            </div>
          ))}
        </div>

        <div className='featured_img'>
          <div className='f_image'>
            <img src={Image1} alt='' />
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
    </section>
  );
};

export default FeaturedContents;
