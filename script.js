document.addEventListener('DOMContentLoaded', function() {
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
            
            if (isDeleting) {
                // Borrado de texto
                textElement.innerHTML = currentText.substring(0, index - 1);
                index--;

                if (index === 0) {
                    isDeleting = false;
                    currentTextIndex = (currentTextIndex + 1) % texts.length;
                    setTimeout(type, 500); // Pausa antes de comenzar a escribir el nuevo texto
                } else {
                    setTimeout(type, 50); // Velocidad de borrado
                }
            } else {
                // Escritura de texto
                textElement.innerHTML = currentText.substring(0, index);
                index++;

                if (index === currentText.length) {
                    isDeleting = true;
                    setTimeout(type, 2000); // Pausa antes de comenzar a borrar
                } else {
                    setTimeout(type, 50); // Velocidad de escritura
                }
            }
        }

        type();
    }
});



