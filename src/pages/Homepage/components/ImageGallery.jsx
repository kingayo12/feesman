import React, { useState } from "react";
import "../css/imageGallery.css";

const images = [
  {
    src: "https://thumbs.dreamstime.com/b/academic-academic-apprentice-college-degree-education-educational-institution-establishment-111559495.jpg",
    alt: "Image 1",
  },
  {
    src: "https://cdn.pixabay.com/photo/2019/04/18/19/44/graduation-4137887_1280.jpg",
    alt: "Image 2",
  },
  {
    src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPI-gWsWKn8_dDoHQjKD3O3Hj-KHuQKiEMAA&s",
    alt: "Image 3",
  },
  {
    src: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSu_s-7IGcl9nHniKNQFhJZozwf5G7bwG_Q9w&s",
    alt: "Image 4",
  },
  { src: "https://via.placeholder.com/150", alt: "Image 5" },
  { src: "https://via.placeholder.com/150", alt: "Image 6" },
];

const ImageGallery = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className='image-gallery'>
      <div className='gallery-grid'>
        {images.map((image, index) => (
          <div className='gallery-item' key={index} onClick={() => handleImageClick(image)}>
            <img src={image.src} alt={image.alt} />
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className='modal' onClick={handleCloseModal}>
          <div className='modal-content'>
            <span className='close-btn' onClick={handleCloseModal}>
              &times;
            </span>
            <img src={selectedImage.src} alt={selectedImage.alt} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
