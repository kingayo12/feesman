import { Swiper, SwiperSlide } from "swiper/react";
import { Link } from "react-router-dom";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

import { Autoplay, Pagination, Navigation, EffectFade } from "swiper/modules";

const slides = [
  {
    video: "/videos/hero1.mp4",
    title: "Celebrating Our Cultural Heritage",
    subtitle: "Honoring the traditions, stories, and people that shape our community",
    text: "We celebrate the values and diversity that make every learner feel seen, respected, and inspired to belong.",
  },
  {
    video: "/videos/hero2.mp4",
    title: "Striving for Academic Excellence",
    subtitle: "Fostering a passion for learning and meaningful achievement",
    text: "Our classrooms challenge students with practical, high-quality learning that builds confidence for real-world success.",
  },
  {
    video: "/videos/hero3.mp4",
    title: "Empowering Skills for the Future",
    subtitle: "Equipping students with tools they need to thrive",
    text: "From collaboration to critical thinking, we prepare learners with skills that matter beyond school.",
  },
];

const SipwerSlider = () => {
  return (
    <div className='topnav'>
      <Swiper
        effect='fade'
        fadeEffect={{ crossFade: true }}
        speed={1100}
        spaceBetween={0}
        centeredSlides={true}
        autoplay={{
          delay: 5200,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
        }}
        modules={[Autoplay, Pagination, EffectFade]}
        className='mySwiper'
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.title}>
            <div className='img_container'>
              <video src={slide.video} autoPlay muted loop playsInline className='hero_video' />
            </div>

            <div className='hero_overlay' />

            <article className='hero_copy'>
              <span className='hero_kicker'>Golden Light Schools</span>
              <h1 className='title'>{slide.title}</h1>
              <h4 className='subtitle'>{slide.subtitle}</h4>
              <p>{slide.text}</p>
              <div className='hero_cta_row'>
                <Link to='/admissions' className='hero_cta hero_cta_primary'>
                  Apply Now
                </Link>
                <Link to='/login' className='hero_cta hero_cta_ghost'>
                  Login to Feesman
                </Link>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default SipwerSlider;
