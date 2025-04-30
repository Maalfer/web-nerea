let currentSlide5 = 0;

function moveSlide5(direction) {
  const slides5 = document.querySelectorAll('.carousel-item');
  const totalSlides5 = slides5.length;
  slides5[currentSlide5].style.display = 'none';
  currentSlide5 = (currentSlide5 + direction + totalSlides5) % totalSlides5;
  slides5[currentSlide5].style.display = 'block';
  updateThumbnailSelection5();
}

function selectSlide5(index) {
  const slides5 = document.querySelectorAll('.carousel-item');
  slides5[currentSlide5].style.display = 'none';
  currentSlide5 = index;
  slides5[currentSlide5].style.display = 'block';
  updateThumbnailSelection5();
}

function updateThumbnailSelection5() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach((thumb, index) => {
    thumb.classList.toggle('selected', index === currentSlide5);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const slides5 = document.querySelectorAll('.carousel-item');
  slides5.forEach((slide, index) => {
    slide.style.display = index === 0 ? 'block' : 'none';
  });
  updateThumbnailSelection5();
});
