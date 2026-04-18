import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const Map = () => {
  return (
    <div>
      <div className='map'>
        <div className='max-w-6xl mx-auto px-4 text-center mb-8'>
          <h2 className='text-3xl font-bold mb-3'>Our Location</h2>
          <p className='text-gray-600 max-w-2xl mx-auto'>
            Golden Light International Schools is conveniently located in a serene and accessible
            area, providing a conducive environment for learning. We look forward to welcoming you.
          </p>
        </div>
        <MapContainer
          center={[6.677248279891382, 3.2261783640885904]}
          zoom={10}
          scrollWheelZoom={false}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
          <Marker position={[6.677248279891382, 3.2261783640885904]}>
            <Popup>
              Golden Light Schools Ota <br /> No.1, Alhaji Adewale Adeola Street, Okeola Afobaje
              Ota, Ogun State.
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;
