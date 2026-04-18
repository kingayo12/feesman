import { Outlet } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop";
import Nav from "./nav";
import "../css/index.css";

export default function PublicLayout() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <Outlet />
    </>
  );
}
