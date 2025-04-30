document.addEventListener('DOMContentLoaded', function () {
    // Efecto de escritura y borrado dinámico
    const textElement = document.getElementById("dynamic-text");
    if (textElement) {
        const texts = [
            "A versatile artist with abilities in illustration, sculpture and design.",
            "Certified Sculpture Artist."
        ];

        let currentTextIndex = 0;
        let index = 0;
        let isDeleting = false;

        function type() {
            const currentText = texts[currentTextIndex];
            const delay = isDeleting ? 50 : 100;

            textElement.innerText = currentText.substring(0, index);

            if (!isDeleting && index < currentText.length) {
                index++;
                setTimeout(type, delay);
            } else if (isDeleting && index > 0) {
                index--;
                setTimeout(type, delay);
            } else {
                isDeleting = !isDeleting;
                if (!isDeleting) {
                    currentTextIndex = (currentTextIndex + 1) % texts.length;
                }
                setTimeout(type, isDeleting ? 1000 : 2000);
            }
        }

        type();
    }

    // Efecto de aparición al hacer scroll para que funcione en móvil
    const observer = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target); 
                }
            });
        },
        {
            threshold: 0.1 // Mejoramos la visibilidad en móviles
        }
    );

    // Observa todos los elementos con animación de scroll
    const elements = document.querySelectorAll(
        ".scroll-fade-in, .scroll-from-right, .scroll-from-left, .scroll-from-bottom"
    );
    elements.forEach((el) => observer.observe(el));
});
