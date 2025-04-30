let currentSlide3 = 0;

function moveSlide(direction) {
  const slides = document.querySelectorAll('.carousel-item2');
  const totalSlides = slides.length;
  slides[currentSlide3].style.display = 'none';
  currentSlide3 = (currentSlide3 + direction + totalSlides) % totalSlides;
  slides[currentSlide3].style.display = 'block';
  updateThumbnailSelection();
}

function selectSlide(index) {
  const slides = document.querySelectorAll('.carousel-item2');
  slides[currentSlide3].style.display = 'none';
  currentSlide3 = index;
  slides[currentSlide3].style.display = 'block';
  updateThumbnailSelection();
}

function updateThumbnailSelection() {
  const thumbnails = document.querySelectorAll('.thumbnail2');
  thumbnails.forEach((thumb, index) => {
    thumb.classList.toggle('selected', index === currentSlide3);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll('.carousel-item2');
  slides.forEach((slide, index) => {
    slide.style.display = index === 0 ? 'block' : 'none';
  });
  updateThumbnailSelection();
});
