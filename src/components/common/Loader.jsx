export default function BoxLoader({ loading }) {
  return (
    <div className={`loader-overlay ${!loading ? "hide" : ""}`}>
      <div className={`box-track ${!loading ? "out" : ""}`}>
        <div className='lbox animate__animated animate__fadeInLeft delay-1'></div>
        <div className='lbox animate__animated animate__fadeInLeft delay-2'></div>
        <div className='lbox animate__animated animate__fadeInLeft delay-3'></div>
      </div>
    </div>
  );
}
