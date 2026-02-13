
/**
 * Shared Header and Footer Components
 * Implements "inheritance" by rendering the same HTML on all pages.
 */

document.addEventListener("DOMContentLoaded", function () {
    // Determine which page we are on to highlight the correct link
    const path = window.location.pathname;
    let activePage = '';
    if (path.includes('teatro.html')) {
        activePage = 'teatro';
    } else {
        activePage = 'home';
    }

    renderHeader(activePage);
    renderFooter();
    // initScrollHeader(); // Disabled for non-sticky header
});

function renderHeader(activePage) {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    // Link paths - simplified since both files are in root
    const homeLink = "index.html";
    const teatroLink = "teatro.html";

    // Helper to determine active class
    const isActive = (page) => activePage === page ? 'active' : '';
    const getStyle = (page) => activePage === page ? 'color: #f0b700;' : '';

    const headerHTML = `
    <header id="absolute-header" class="absolute-header" style="position: absolute !important; top: 0; left: 0; width: 100%; z-index: 1000; background: transparent;">
        <nav style="position: relative; padding: 0 20px;">
            <button class="menu-toggle" aria-label="Abrir menú" style="display: none; background: none; border: none; color: #f0b700; font-size: 2rem; cursor: pointer; position: absolute; top: 5px; right: 20px; z-index: 2000; pointer-events: auto;">☰</button>
            <ul class="nav-list">
                <li class="nav-item"><a href="${homeLink}#sobre-mi" class="nav-link">About me</a></li>
                <li class="nav-item"><a href="${homeLink}#projects" class="nav-link">Comic Projects</a></li>
                <li class="nav-item"><a href="${homeLink}#sculpture" class="nav-link">Sculpture Works</a></li>
                <li class="nav-item"><a href="${teatroLink}" class="nav-link ${isActive('teatro')}" ${activePage === 'teatro' ? 'data-active="true"' : ''}>Teatro</a></li>
                <li class="nav-item"><a href="${homeLink}#referencias-alumnos" class="nav-link">Referencias</a></li>
                <li class="nav-item"><a href="${homeLink}#contact" class="nav-link">Contact</a></li>
            </ul>
        </nav>
    </header>
    `;

    headerContainer.innerHTML = headerHTML;

    // Initialize mobile menu functionality using Event Delegation
    // This is more robust for dynamically injected content
    document.addEventListener('click', function (event) {
        const toggleBtn = event.target.closest('.menu-toggle');
        const navList = document.querySelector('.nav-list');
        const headerLink = event.target.closest('.nav-link');

        // Handle Toggle Click
        if (toggleBtn && navList) {
            event.preventDefault(); // Prevent default if it's a button
            navList.classList.toggle('active');
            toggleBtn.innerHTML = navList.classList.contains('active') ? '✕' : '☰';
        }

        // Handle Close on Link Click
        if (headerLink && navList && navList.classList.contains('active')) {
            navList.classList.remove('active');
            const btn = document.querySelector('.menu-toggle');
            if (btn) btn.innerHTML = '☰';
        }
    });
}

function renderFooter() {
    const footerContainer = document.getElementById('footer-container');
    if (!footerContainer) return;

    const footerHTML = `
    <footer class="footer" style="position: relative; background-image: url('fondo-footer.jpg'); background-size: cover; background-position: center; color: #fff; padding: 60px 20px 30px; font-family: 'Segoe UI', sans-serif;">
      <div class="footer-overlay" style="position: absolute; inset: 0; background-color: rgba(0, 0, 0, 0.8); z-index: 1;"></div>
  
      <div class="container footer-grid" style="position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; max-width: 1200px; margin: 0 auto;">
          <div class="footer-col about">
              <h3 style="border-bottom: 2px solid #f0db4f; display: inline-block; padding-bottom: 5px; margin-bottom: 20px;">SOBRE MÍ</h3>
              <p style="line-height: 1.6;">Mi nombre es Nerea González, artista y diseñadora especializada en escultura. NereaArt es el reflejo de mi pasión por crecer como profesional en el mundo del arte y el diseño.</p>
          </div>
  
          <div class="footer-col">
              <h3 style="border-bottom: 2px solid #f0db4f; display: inline-block; padding-bottom: 5px; margin-bottom: 20px;">PORTFOLIO</h3>
              <ul style="list-style: none; padding: 0;">
                  <li style="margin-bottom: 10px;"><a href="index.html#projects2" style="color: #fff; text-decoration: none;">Escultura</a></li>
                  <li style="margin-bottom: 10px;"><a href="index.html#projects" style="color: #fff; text-decoration: none;">Cómic</a></li>
                  <li style="margin-bottom: 10px;"><a href="index.html#illustrations" style="color: #fff; text-decoration: none;">Ilustración</a></li>
                  <li style="margin-bottom: 10px;"><a href="teatro.html" style="color: #fff; text-decoration: none;">Teatro</a></li>
              </ul>
          </div>
  
          <div class="footer-col">
              <h3 style="border-bottom: 2px solid #f0db4f; display: inline-block; padding-bottom: 5px; margin-bottom: 20px;">¿CONTACTAMOS?</h3>
              <p>Déjame tu correo o teléfono y me pondré en contacto contigo:</p>
              <form onsubmit="event.preventDefault(); alert('Mensaje enviado :)')" style="display: flex; gap: 10px; margin-top: 10px;">
                  <input type="text" placeholder="Correo o Teléfono" required style="flex: 1; padding: 10px; background: transparent; border: none; border-bottom: 2px solid #f0b700; color: #fff; outline: none; font-family: 'Fira Code', monospace;">
                  <button type="submit" style="padding: 10px 20px; background-color: #f0db4f; border: none; font-weight: bold; border-radius: 5px; cursor: pointer;">Enviar</button>
              </form>
          </div>
      </div>
  
      <div class="footer-bottom" style="position: relative; z-index: 2; text-align: center; margin-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 20px;">
          <p>&copy; 2026 - Todos los derechos reservados. Diseñado por 
              <a href="https://www.linkedin.com/in/maalfer1" target="_blank" style="color: #f0db4f; text-decoration: none;">El Pingüino de Mario</a>
          </p>
      </div>
    </footer>
    `;

    footerContainer.innerHTML = footerHTML;
}


