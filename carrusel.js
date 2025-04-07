let currentSlide5 = 0;

function moveSlide5(direction) {
    const slides5 = document.querySelectorAll('.carousel-item');
    const totalSlides5 = slides5.length;

    // Oculta el slide actual
    slides5[currentSlide5].style.display = 'none';
    
    // Cambia el índice del slide actual
    currentSlide5 = (currentSlide5 + direction + totalSlides5) % totalSlides5;
    
    // Muestra el nuevo slide
    slides5[currentSlide5].style.display = 'block';

    // Actualiza la miniatura seleccionada
    updateThumbnailSelection5();
}

function selectSlide5(index) {
    const slides5 = document.querySelectorAll('.carousel-item');

    // Oculta el slide actual
    slides5[currentSlide5].style.display = 'none';
    
    // Establece el índice de la imagen seleccionada
    currentSlide5 = index;

    // Muestra el nuevo slide
    slides5[currentSlide5].style.display = 'block';

    // Actualiza la miniatura seleccionada
    updateThumbnailSelection5();
}

// Función para actualizar el estilo de la miniatura seleccionada
function updateThumbnailSelection5() {
    const thumbnails = document.querySelectorAll('.thumbnail');

    thumbnails.forEach((thumb, index) => {
        if (index === currentSlide5) {
            thumb.style.borderColor = '#007bff'; // Color del borde para la miniatura activa
        } else {
            thumb.style.borderColor = 'transparent'; // Sin borde para las miniaturas no activas
        }
    });
}

// Inicializa mostrando solo el primer slide y actualiza las miniaturas
document.addEventListener("DOMContentLoaded", () => {
    const slides5 = document.querySelectorAll('.carousel-item');

    slides5.forEach((slide, index) => {
        slide.style.display = index === 0 ? 'block' : 'none'; // Muestra solo el primer slide
    });

    // Actualiza la selección de miniaturas
    updateThumbnailSelection5();
});