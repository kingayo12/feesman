import TestimonialSlider from "../components/Slider/TestimonialSlider";
import "../css/testimonial.css";

const Testimonial = () => {
  return (
    <section className='testimonial_container'>
      <div className='testimonial'>
        <div className='title'>
          <p>what people say about us</p>
          <h2>Testimonial</h2>

          <small>
            At Golden Light Schools Ota, we believe in nurturing the minds of tomorrow by providing
            a holistic and dynamic educational experience.
          </small>
        </div>
        <div className='testimonial_slider_container'>
          <TestimonialSlider />
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
