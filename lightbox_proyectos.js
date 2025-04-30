const comics = {
    0: [
        'images/comics/Scars/cover.webp',
        'images/comics/Scars/p7_inside_cover.webp',
        'images/comics/Scars/P1_comic.webp',
        'images/comics/Scars/P2_comic.webp',
        'images/comics/Scars/P5_comic.webp',
        'images/comics/Scars/P6_comic.webp',        
        'images/comics/Scars/p2_inside_cover.webp'
    ],
    1: [
        'images/comics/Devil-reign/P21.webp',
        'images/comics/Devil-reign/P20.webp',
        'images/comics/Devil-reign/P19.webp',
        'images/comics/Devil-reign/P18.webp'
    ],
    2: [
        'images/comics/The-blind/portada.jpg',
        'images/comics/The-blind/1.jpg',
        'images/comics/The-blind/3i.jpg',
    ]
};

let currentSlide = 0;
let currentImages = [];

function openLightbox(index) {
    currentImages = comics[index];
    currentSlide = 0;

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    lightbox.style.display = 'flex';
    lightboxImg.style.opacity = 0;
    setTimeout(() => {
        lightboxImg.src = currentImages[currentSlide];
        lightboxImg.style.opacity = 1;
        adjustImageSize(lightboxImg);
    }, 100);

    const scrollPosition = window.scrollY;
    lightbox.style.transform = `translateY(-${scrollPosition}px)`;
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none';
}

function changeSlide(direction) {
    currentSlide += direction;

    if (currentSlide < 0) {
        currentSlide = currentImages.length - 1;
    } else if (currentSlide >= currentImages.length) {
        currentSlide = 0;
    }

    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.style.opacity = 0;

    setTimeout(() => {
        lightboxImg.src = currentImages[currentSlide];
        adjustImageSize(lightboxImg);
        lightboxImg.style.opacity = 1;
    }, 200);
}

function adjustImageSize(lightboxImg) {
    lightboxImg.onload = () => {
        const imgAspectRatio = lightboxImg.naturalWidth / lightboxImg.naturalHeight;
        const containerAspectRatio = window.innerWidth / window.innerHeight;

        if (imgAspectRatio > containerAspectRatio) {
            lightboxImg.style.maxWidth = '90%';
            lightboxImg.style.maxHeight = 'auto';
        } else {
            lightboxImg.style.maxHeight = '80vh';
            lightboxImg.style.maxWidth = 'auto';
        }
    };
}

// Cerrar con tecla Esc
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
});

document.getElementById('lightbox').addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    if (e.target === this) {
        const half = rect.width / 2;
        if (clickX > half) {
            changeSlide(1); // lado derecho → siguiente
        } else {
            changeSlide(-1); // lado izquierdo → anterior
        }
    }
});
