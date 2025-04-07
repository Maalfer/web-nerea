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
    currentImages2 = escultura[index]; // Cargar el array correspondiente
    currentSlide2 = 0; // Iniciar en la primera imagen
    const lightbox2 = document.getElementById('lightbox2');
    const lightboxImg2 = document.getElementById('lightbox-img2');
    
    lightbox2.style.display = 'flex'; // Mostrar el lightbox
    lightboxImg2.src = currentImages2[currentSlide2]; // Establecer la imagen correspondiente

    // Mantener el scroll en la posición actual
    const scrollPosition2 = window.scrollY;
    lightbox2.style.transform = `translateY(-${scrollPosition2}px)`;

    // Ajustar el tamaño de la imagen al cargar
    adjustImageSize2(lightboxImg2);
}

function closeLightbox2() {
    const lightbox2 = document.getElementById('lightbox2');
    lightbox2.style.display = 'none'; // Ocultar el lightbox
}

function changeSlide2(direction2) {
    currentSlide2 += direction2;

    // Verificar los límites del array
    if (currentSlide2 < 0) {
        currentSlide2 = currentImages2.length - 1; // Cambiar al último si es menor que 0
    } else if (currentSlide2 >= currentImages2.length) {
        currentSlide2 = 0; // Cambiar al primero si excede el límite
    }

    const lightboxImg2 = document.getElementById('lightbox-img2');
    lightboxImg2.src = currentImages2[currentSlide2]; // Cambiar la imagen
    adjustImageSize2(lightboxImg2);
}

function adjustImageSize2(lightboxImg2) {
    // Ajustar el tamaño de la imagen al cargar
    lightboxImg2.onload = () => {
        const imgAspectRatio2 = lightboxImg2.naturalWidth / lightboxImg2.naturalHeight;
        const containerAspectRatio2 = window.innerWidth / window.innerHeight;

        if (imgAspectRatio2 > containerAspectRatio2) {
            lightboxImg2.style.maxWidth = '90%';
            lightboxImg2.style.maxHeight = 'auto';
        } else {
            lightboxImg2.style.maxHeight = '80vh';
            lightboxImg2.style.maxWidth = 'auto';
        }
    };
}