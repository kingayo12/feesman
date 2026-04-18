import React from "react";

import { Outlet } from "react-router-dom";
import Footer from "./layouts/Footer";
const Academics = () => {
  return (
    <div className='academics-page'>
      <Outlet />
      <Footer />
    </div>
  );
};

export default Academics;
