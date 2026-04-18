import "./css/curriculum.css";
import PrimaryEducation from "./imgs/student1.jpeg";
import SecondaryEducation from "./imgs/student1.jpeg";
import Extracurricular from "./imgs/student1.jpeg";

const Curriculum = () => {
  return (
    <div className='curriculum-container'>
      <div className='breadcrumb-section'>
        <div className='breadcrumb-overlay'>
          <h1>Curriculum</h1>
          <p>
            <a href='/'>Home</a> <i className='fa fa-caret-right'></i> <span>Curriculum</span>
          </p>
        </div>
      </div>

      <section className='curriculum-intro'>
        <h2>Our Curriculum</h2>
        <p>
          At Golden Light International School Ota, we offer a broad and balanced curriculum that is
          designed to cater to the diverse needs and talents of our students. Our curriculum is
          aligned with international standards, ensuring that our students are well-prepared for
          further education and their future careers.
        </p>
      </section>

      <section className='curriculum-structure'>
        <h2>Curriculum Structure</h2>
        <div className='structure-content'>
          <div className='structure-item'>
            <img src={PrimaryEducation} alt='Primary Education' />
            <h3>Primary Education</h3>
            <p>
              Our Primary Education curriculum focuses on building a strong foundation in literacy,
              numeracy, and critical thinking. Students are encouraged to explore and discover
              through hands-on learning experiences.
            </p>
          </div>

          <div className='structure-item'>
            <img src={SecondaryEducation} alt='Secondary Education' />
            <h3>Secondary Education</h3>
            <p>
              The Secondary Education curriculum is designed to deepen students' understanding of
              key subjects while preparing them for national and international examinations. We
              offer a wide range of subjects including sciences, arts, and humanities.
            </p>
          </div>

          <div className='structure-item'>
            <img src={Extracurricular} alt='Extracurricular Activities' />
            <h3>Extracurricular Activities</h3>
            <p>
              We believe in holistic education. Our extracurricular activities include sports, arts,
              music, and various clubs that help in the overall development of our students.
            </p>
          </div>
        </div>
      </section>

      <section className='key-subjects'>
        <h2 className='text-center'>Key Subjects</h2>
        <ul>
          <li>
            <strong>Mathematics:</strong> Building problem-solving skills and logical reasoning.
          </li>
          <li>
            <strong>Science:</strong> Encouraging inquiry and experimentation through hands-on
            learning.
          </li>
          <li>
            <strong>English Language:</strong> Enhancing communication skills and literary
            appreciation.
          </li>
          <li>
            <strong>Social Studies:</strong> Understanding history, geography, and societal
            dynamics.
          </li>
          <li>
            <strong>Information Technology:</strong> Preparing students for the digital world.
          </li>
          <li>
            <strong>Languages:</strong> Offering French, Spanish, and other languages to broaden
            global perspectives.
          </li>
        </ul>
      </section>

      <section className='special-programs'>
        <h2>Special Programs</h2>
        <p>
          In addition to our core curriculum, we offer special programs such as Gifted and Talented
          Education (GATE), Special Education Needs (SEN), and Advanced Placement (AP) courses to
          cater to the unique needs of our students.
        </p>
      </section>

      <section className='curriculum-summary'>
        <h2>Curriculum Summary</h2>
        <p>
          Our curriculum is designed to nurture every student's intellectual, emotional, and social
          growth. We are committed to providing a supportive environment where students can thrive
          and reach their full potential.
        </p>
      </section>
    </div>
  );
};

export default Curriculum;
