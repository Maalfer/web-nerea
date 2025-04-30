const escultura = {
    0: [
        'images/escultura_new/pitufos/jetpack.webp',
        'images/escultura_new/pitufos/pitufito.webp',
        'images/escultura_new/pitufos/jetpack2.webp',
        'images/escultura_new/pitufos/gruñon.webp',
        'images/escultura_new/pitufos/diapper.webp',
        'images/escultura_new/pitufos/diapper-daddy.webp',
        'images/escultura_new/pitufos/armani_3drender.webp',
        'images/escultura_new/pitufos/5_1armani.webp',
        'images/escultura_new/pitufos/pitufos_armani.webp'
    ],
    1: [
        'images/escultura_new/diorama/final_project_sculp.webp',
        'images/escultura_new/diorama/sin-titulo.webp',
        'images/escultura_new/diorama/diorama7.webp',
        'images/escultura_new/diorama/diorama6.webp',
        'images/escultura_new/diorama/diorama5.webp',
        'images/escultura_new/diorama/diorama4.webp',
        'images/escultura_new/diorama/diorama3.webp',
        'images/escultura_new/diorama/diorama2.webp',
        'images/escultura_new/diorama/diorama1.webp',
        'images/escultura_new/diorama/45.webp',
    ],
    2: [
        'images/escultura_new/paw-patrol/zuma3.webp',
        'images/escultura_new/paw-patrol/pawpatrol.webp',
        'images/escultura_new/paw-patrol/paw_patrol_chase.webp'
    ],
    3: [
        'images/escultura_new/mold-making/4.webp',
        'images/escultura_new/mold-making/3.webp',
        'images/escultura_new/mold-making/p8.webp',
        'images/escultura_new/mold-making/relieve.webp',
        'images/escultura_new/mold-making/10.webp',
        'images/escultura_new/mold-making/p2.webp',
        'images/escultura_new/mold-making/muñeco.webp',
        'images/escultura_new/mold-making/muñeco_sketch.webp',
        'images/escultura_new/mold-making/mold.webp',
        'images/escultura_new/mold-making/5.webp',
    ],
    4: [
        'images/escultura_new/bertys/toro2.webp',
        'images/escultura_new/bertys/toro.webp'
    ],
    5: [
        'images/other-projects/0_PORTADA_other projects.webp',
        'images/other-projects/1_head1.webp',
        'images/other-projects/2_head.webp',
        'images/other-projects/3_mascara1.webp',
        'images/other-projects/4_mascara2.webp',
        'images/other-projects/5_mascara3.webp',
        'images/other-projects/6_pez_cartel.webp',
        'images/other-projects/7_policromia.webp',
    ],
};

let currentSlide2 = 0;
let currentImages2 = [];

function openLightbox2(index) {
    currentImages2 = escultura[index];
    currentSlide2 = 0;

    const lightbox = document.getElementById('lightbox2');
    const lightboxImg = document.getElementById('lightbox-img2');

    lightbox.style.display = 'flex';
    lightboxImg.style.opacity = 0;

    setTimeout(() => {
        lightboxImg.onload = () => {
            adjustImageSize(lightboxImg);
            lightboxImg.style.opacity = 1;
        };
        lightboxImg.src = currentImages2[currentSlide2];
    }, 100);

    const scrollPosition = window.scrollY;
    lightbox.style.transform = `translateY(-${scrollPosition}px)`;
}

function closeLightbox2() {
    document.getElementById('lightbox2').style.display = 'none';
}

function changeSlide2(direction) {
    currentSlide2 += direction;

    if (currentSlide2 < 0) {
        currentSlide2 = currentImages2.length - 1;
    } else if (currentSlide2 >= currentImages2.length) {
        currentSlide2 = 0;
    }

    const lightboxImg = document.getElementById('lightbox-img2');
    lightboxImg.style.opacity = 0;

    setTimeout(() => {
        lightboxImg.onload = () => {
            adjustImageSize(lightboxImg);
            lightboxImg.style.opacity = 1;
        };
        lightboxImg.src = currentImages2[currentSlide2];
    }, 200); // Mismo tiempo que en comics
}

function adjustImageSize(img) {
    img.onload = null; // Evitar acumulación de listeners
    const imgAspectRatio = img.naturalWidth / img.naturalHeight;
    const containerAspectRatio = window.innerWidth / window.innerHeight;

    if (imgAspectRatio > containerAspectRatio) {
        img.style.maxWidth = '90%';
        img.style.maxHeight = 'auto';
    } else {
        img.style.maxHeight = '80vh';
        img.style.maxWidth = 'auto';
    }
}

// Navegación por clic lateral
document.getElementById('lightbox2').addEventListener('click', function (e) {
    const rect = this.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    if (e.target === this) {
        const half = rect.width / 2;
        if (clickX > half) {
            changeSlide2(1);
        } else {
            changeSlide2(-1);
        }
    }
});

// Cerrar con tecla Esc
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox2();
});
