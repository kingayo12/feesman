import React from "react";

const Admissions = () => {
  return (
    <div className='admission_container'>
      <div className='nav_top'></div>
      <div className='breadcrumb-section'>
        <div className='breadcrumb-overlay'>
          <h1>Administrarion</h1>
          <p>
            <a href='/'>Home</a> <i className='fa fa-caret-right'></i> <span>Administration</span>
          </p>
        </div>
      </div>
      <section className='admission-process'>
        <h2>Admission Process</h2>
        <ol>
          <li>Fill out the online application form.</li>
          <li>Submit required documents.</li>
          <li>Attend an interview with the admissions team.</li>
          <li>Receive your acceptance letter.</li>
        </ol>
      </section>

      {/* Admission Requirements */}
      <section className='admission-requirements'>
        <h2>Admission Requirements</h2>
        <ul>
          <li>Completed application form</li>
          <li>Copy of birth certificate</li>
          <li>Previous school records</li>
          <li>Passport-sized photographs</li>
        </ul>
      </section>

      {/* Tuition & Fees */}
      <section className='tuition-fees'>
        <h2>Tuition & Fees</h2>
        <p>Our tuition is competitive and offers great value.</p>
        <p>Please refer to our fee schedule for detailed information.</p>
      </section>

      {/* Important Dates */}
      <section className='important-dates'>
        <h2>Important Dates</h2>
        <ul>
          <li>Application Deadline: July 31st</li>
          <li>Interview Dates: August 1st - August 15th</li>
          <li>First Day of School: September 5th</li>
        </ul>
      </section>

      {/* Contact Information */}
      <section className='contact-info'>
        <h2>Contact Us</h2>
        <p>Admissions Office</p>
        <p>Email: admissions@school.edu</p>
        <p>Phone: (123) 456-7890</p>
        <p>Office Hours: Mon - Fri, 9 AM - 5 PM</p>
      </section>
    </div>
  );
};

export default Admissions;
