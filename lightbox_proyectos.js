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
    currentImages = comics[index]; // Cargar el array correspondiente
    currentSlide = 0; // Iniciar en la primera imagen
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    
    lightbox.style.display = 'flex'; // Mostrar el lightbox
    lightboxImg.src = currentImages[currentSlide]; // Establecer la imagen correspondiente

    // Mantener el scroll en la posición actual
    const scrollPosition = window.scrollY;
    lightbox.style.transform = `translateY(-${scrollPosition}px)`;

    // Ajustar el tamaño de la imagen al cargar
    adjustImageSize(lightboxImg);
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none'; // Ocultar el lightbox
}

function changeSlide(direction) {
    currentSlide += direction;

    // Verificar los límites del array
    if (currentSlide < 0) {
        currentSlide = currentImages.length - 1;
    } else if (currentSlide >= currentImages.length) {
        currentSlide = 0;
    }

    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = currentImages[currentSlide]; // Cambiar la imagen
    adjustImageSize(lightboxImg);
}

function adjustImageSize(lightboxImg) {
    // Ajustar el tamaño de la imagen al cargar
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
