import TopNav from "./TopNav";
import SideNav from "./SideNav";

export default function MasterLayout({ children }) {
  return (
    <div className='row'>
      <SideNav />

      <div className='main_wrapper'>
        <TopNav />

        <main className='p-6 flex-1 overflow-y-auto'>{children}</main>
      </div>
    </div>
  );
}
