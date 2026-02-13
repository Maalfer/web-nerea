/* --- Carousel 1 Logic (Comic Projects) --- */
let currentSlide5 = 0;

function moveSlide5(direction) {
    const slides5 = document.querySelectorAll('.carousel-item');
    if (!slides5.length) return;
    const totalSlides5 = slides5.length;
    slides5[currentSlide5].style.display = 'none';
    currentSlide5 = (currentSlide5 + direction + totalSlides5) % totalSlides5;
    slides5[currentSlide5].style.display = 'block';
    updateThumbnailSelection5();
}

function selectSlide5(index) {
    const slides5 = document.querySelectorAll('.carousel-item');
    if (!slides5.length) return;
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

/* --- Carousel 2 Logic (Sculpture Works) --- */
let currentSlide3 = 0;

function moveSlide(direction) {
    const slides = document.querySelectorAll('.carousel-item2');
    if (!slides.length) return;
    const totalSlides = slides.length;
    slides[currentSlide3].style.display = 'none';
    currentSlide3 = (currentSlide3 + direction + totalSlides) % totalSlides;
    slides[currentSlide3].style.display = 'block';
    updateThumbnailSelection();
}

function selectSlide(index) {
    const slides = document.querySelectorAll('.carousel-item2');
    if (!slides.length) return;
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

/* --- Initialization --- */
document.addEventListener("DOMContentLoaded", () => {
    // Init Carousel 1
    const slides5 = document.querySelectorAll('.carousel-item');
    if (slides5.length > 0) {
        slides5.forEach((slide, index) => {
            slide.style.display = index === 0 ? 'block' : 'none';
        });
        updateThumbnailSelection5();
    }

    // Init Carousel 2
    const slides2 = document.querySelectorAll('.carousel-item2');
    if (slides2.length > 0) {
        slides2.forEach((slide, index) => {
            slide.style.display = index === 0 ? 'block' : 'none';
        });
        updateThumbnailSelection();
    }
});
