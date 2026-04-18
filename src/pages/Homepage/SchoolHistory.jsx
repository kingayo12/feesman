import "./css/schoolHistory.css";
import HistoryImage from "./imgs/owner.jpg";
import Owner from "./layouts/Owner";
import Testimonial from "./layouts/testimonial";

const SchoolHistory = () => {
  return (
    <div className='schoolHistory_container'>
      <div className='breadcrumb-section'>
        <div className='breadcrumb-overlay'>
          <h1>School History</h1>
          <p>
            <a href='/'>Home</a> <i className='fa fa-caret-right'></i> <span>School History</span>
          </p>
        </div>
      </div>

      <section className='history-intro'>
        <div className='intro-image_cont'>
          <div className='intro-image'>
            <img src={HistoryImage} alt='School Building' />
          </div>
        </div>
        <div className='intro-text'>
          <h2>Our Journey</h2>
          <p>
            Established in [Year], Golden Light International School Ota has been committed to
            delivering quality education for over [Number] years. Our journey started with a vision
            to create an institution that fosters academic excellence, character development, and
            holistic growth in every student.
          </p>
          <p>
            From humble beginnings, we have grown into a well-respected educational institution,
            recognized for our innovative teaching methods, diverse curriculum, and strong community
            ties.
          </p>
        </div>
      </section>

      <div className='founders-vision'>
        <h2>Founder&apos;s Vision</h2>
        <div className='founders-content'>
          <Owner />
        </div>
      </div>

      <section className='milestones'>
        <h2>Milestones</h2>
        <ul>
          <li>
            <strong>2008</strong> <br /> The school was established with an initial cohort of 134
            students.
          </li>
          <li>
            <strong>2015</strong> <br /> Introduction of advanced STEM programs.
          </li>
          <li>
            <strong>2020</strong> <br />
            Expansion to a new state-of-the-art campus.
          </li>
          <li>
            <strong>2024</strong>
            <br /> Recognized as a top educational institution in the region.
          </li>
        </ul>
      </section>

      <section className='community-impact'>
        <h2>Community Impact</h2>
        <p>
          Golden Light International School Ota has always been deeply connected with the community.
          Our outreach programs, scholarships, and partnerships with local organizations have made a
          significant impact on the lives of many. We believe in giving back and fostering a spirit
          of service among our students.
        </p>
        <button>Explore More</button>
      </section>
      <Testimonial />
    </div>
  );
};

export default SchoolHistory;
