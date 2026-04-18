import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/scrollbar";

import { Pagination, Navigation, Autoplay } from "swiper/modules";

import "../../css/testimonialslider.css";

const TestimonialSlider = () => {
  const testimonials = [
    {
      name: "Aina",
      role: "Parent",
      image:
        "https://img.freepik.com/premium-photo/african-american-student-carrying-backpack-with-books_1162745-1520.jpg?w=360",
      content:
        "This school has provided my child with an excellent education, and the community is warm and welcoming. We couldn't be happier.",
    },
    {
      name: "Bola",
      role: "Student",
      image:
        "https://img.freepik.com/premium-photo/african-american-student-carrying-backpack-with-books_1162745-1520.jpg?w=360",
      content:
        "The teachers here are truly invested in their students' success. I've grown academically and personally in ways I never expected.",
    },
    {
      name: "Chidi",
      role: "Alumnus",
      image:
        "https://img.freepik.com/premium-photo/african-american-student-carrying-backpack-with-books_1162745-1520.jpg?w=360",
      content:
        "As an alumnus, I am proud to have attended this school. The values I learned here have guided me throughout my career.",
    },
    {
      name: "Ngozi",
      role: "Parent",
      image:
        "https://img.freepik.com/premium-photo/african-american-student-carrying-backpack-with-books_1162745-1520.jpg?w=360",
      content:
        "The school's focus on holistic education has helped my child develop not just academically, but socially and emotionally as well.",
    },
  ];

  return (
    <div>
      <Swiper
        slidesPerView={3}
        centeredSlides={false}
        loop={true}
        spaceBetween={30}
        pagination={{ clickable: false }}
        navigation={true}
        autoplay={{ delay: 5000 }}
        modules={[Pagination, Navigation, Autoplay]}
        breakpoints={{
          320: {
            slidesPerView: 1,
            spaceBetween: 10,
          },
          640: {
            slidesPerView: 1,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 1,
            spaceBetween: 30,
          },
          1024: {
            slidesPerView: 2,
            spaceBetween: 30,
          },
        }}
        className='testimonial-cards mySwiper'
      >
        {testimonials.map((testimonial, index) => (
          <SwiperSlide key={index}>
            <div className='testimonial-card'>
              <div className='testimonial_img_container'>
                <img src={testimonial.image} alt={testimonial.name} className='testimonial-image' />
              </div>
              <div className='testimonial_content'>
                <div className='testimonial_role'>{testimonial.role}</div>
                <hr />
                <div className='testimonial_article'>
                  <p>{testimonial.content}</p>
                </div>
                <hr />
                <div className='testimonial_name'>
                  <h4>{testimonial.name}</h4>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default TestimonialSlider;
