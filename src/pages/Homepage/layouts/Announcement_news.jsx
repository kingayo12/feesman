import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import RippleButton from "../components/buttons/RippleButton";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import "../css/Announcement_news.css";

const Announcement_news = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const data = [
      {
        title: "New School Year Begins",
        summary:
          "The new school year is starting with excitement and anticipation. Students and staff are ready to embrace new challenges and opportunities.",
        date: "13-August-2024",
        time: "11:40 AM",
        link: "#",
      },
      {
        title: "Science Fair Winners Announced",
        summary:
          "Congratulations to the winners of the annual science fair! Their innovative projects impressed the judges and showcased remarkable talent.",
        date: "10-August-2024",
        time: "09:30 AM",
        link: "#",
      },
      {
        title: "Upcoming Parent-Teacher Conferences",
        summary:
          "Parent-teacher conferences are scheduled for next week. This is a great opportunity for parents to discuss their child's progress with teachers.",
        date: "15-August-2024",
        time: "02:00 PM",
        link: "#",
      },
      {
        title: "New After-School Programs",
        summary:
          "We are introducing new after-school programs this semester, including robotics, drama club, and foreign language classes. Enroll now!",
        link: "#",
        date: "10-August-2024",
        time: "09:30 AM",
      },
    ];
    setNews(data);
  }, []);

  // const { ref, inView } = useInView({
  //   triggerOnce: false,
  //   threshold: 0.1,
  // });

  return (
    <div>
      <div className='announcement_cont'>
        <h1>Announcement & News</h1>
        <div className='announcement_boxes'>
          {news.length > 0 ? (
            news.map((article, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25, margin: "0px 0px -80px 0px" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className='announcement_box'
              >
                <div className='announement_image'>
                  <i className='fa-solid fa-megaphone'></i>
                </div>
                <div className='announcement_content'>
                  <div className='date_time_cont'>
                    <div className='date'>{article.date}</div>
                    <div className='time'>{article.time}</div>
                  </div>
                  <article>
                    <h4>{article.title}</h4>
                    <p>{article.summary}</p>
                  </article>
                  <Link to={article.link} rel='noopener noreferrer' className='anLink'>
                    Read More
                  </Link>
                </div>
              </motion.div>
            ))
          ) : (
            <p>Loading</p>
          )}
        </div>

        <Link to='#' className='anlinks'>
          <RippleButton>Explore</RippleButton>
        </Link>
      </div>
    </div>
  );
};

export default Announcement_news;
