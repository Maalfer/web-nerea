(function () {
    'use strict';

    var NAV = [
        { label: 'Inicio', href: 'index.html', key: 'home' },
        { label: 'Ilustración', href: 'ilustracion.html', key: 'ilustracion' },
        { label: 'Escultura', href: 'escultura.html', key: 'escultura' },
        { label: 'Teatro', href: 'teatro.html', key: 'teatro' },
        { label: 'Sobre mí', href: 'index.html#sobre-mi', key: '' },
        { label: 'Descargas', href: 'index.html#descargas', key: '' },
        { label: 'Contacto', href: 'index.html#contacto', key: '' },
        { label: 'Acceder', href: 'login.html', key: 'login', id: 'nav-account' }
    ];

    function currentKey() {
        var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (file.indexOf('ilustracion') === 0) return 'ilustracion';
        if (file.indexOf('escultura') === 0) return 'escultura';
        if (file.indexOf('teatro') === 0) return 'teatro';
        if (file.indexOf('login') === 0 || file.indexOf('dashboard') === 0) return 'login';
        return 'home';
    }

    function header() {
        var active = currentKey();
        var links = NAV.map(function (item) {
            var cls = 'nav-link' + (item.key && item.key === active ? ' active' : '');
            var id = item.id ? ' id="' + item.id + '"' : '';
            return '<li><a class="' + cls + '"' + id + ' href="' + item.href + '">' + item.label + '</a></li>';
        }).join('');

        return '' +
            '<header class="site-header" id="site-header">' +
            '  <nav aria-label="Navegación principal">' +
            '    <a class="brand" href="index.html">Nerea González <span>López</span></a>' +
            '    <button class="menu-toggle" aria-label="Abrir menú" aria-expanded="false">☰</button>' +
            '    <ul class="nav-list" id="nav-list">' + links + '</ul>' +
            '  </nav>' +
            '</header>';
    }

    function footer(site) {
        return '' +
            '<footer class="footer">' +
            '  <div class="footer-overlay"></div>' +
            '  <div class="footer-grid">' +
            '    <div class="footer-col">' +
            '      <h3>SOBRE MÍ</h3>' +
            '      <p>Soy Nerea González López, artista y diseñadora especializada en ilustración y escultura. Este portfolio reúne mi trabajo en las tres disciplinas que me definen.</p>' +
            '    </div>' +
            '    <div class="footer-col">' +
            '      <h3>PORTFOLIO</h3>' +
            '      <ul>' +
            '        <li><a href="ilustracion.html">Ilustración</a></li>' +
            '        <li><a href="escultura.html">Escultura</a></li>' +
            '        <li><a href="teatro.html">Teatro</a></li>' +
            '        <li><a href="index.html#descargas">CV y portfolios en PDF</a></li>' +
            '      </ul>' +
            '    </div>' +
            '    <div class="footer-col">' +
            '      <h3>CONTACTO</h3>' +
            '      <ul>' +
            '        <li><a href="mailto:' + site.email + '">' + site.email + '</a></li>' +
            '        <li><a href="tel:+34689040797">+34 689 040 797</a></li>' +
            '        <li><a href="' + site.instagram + '" target="_blank" rel="noopener">@ren_d_vincent</a></li>' +
            '        <li><a href="' + site.linkedin + '" target="_blank" rel="noopener">LinkedIn</a></li>' +
            '      </ul>' +
            '    </div>' +
            '  </div>' +
            '  <div class="footer-bottom">' +
            '    <p>&copy; ' + new Date().getFullYear() + ' Nerea González López — Todos los derechos reservados. ' +
            '    Diseñado por <a href="https://www.linkedin.com/in/maalfer1" target="_blank" rel="noopener">Mario Álvarez</a>' +
            '    &amp; <a href="' + site.linkedin + '" target="_blank" rel="noopener">Nerea González</a></p>' +
            '  </div>' +
            '</footer>';
    }

    function mount() {
        var site = (window.CONTENT && window.CONTENT.site) || {};
        var top = document.getElementById('header-container');
        var bottom = document.getElementById('footer-container');
        if (top) top.innerHTML = header();
        if (bottom) bottom.innerHTML = footer(site);

        var button = document.querySelector('.menu-toggle');
        var list = document.getElementById('nav-list');
        if (!button || !list) return;

        button.addEventListener('click', function () {
            var open = list.classList.toggle('is-open');
            button.innerHTML = open ? '✕' : '☰';
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        list.addEventListener('click', function (e) {
            if (e.target.closest('a') && list.classList.contains('is-open')) {
                list.classList.remove('is-open');
                button.innerHTML = '☰';
                button.setAttribute('aria-expanded', 'false');
            }
        });

        var account = document.getElementById('nav-account');
        if (account && window.Auth) {
            window.Auth.session().then(function (data) {
                if (!data.authenticated) return;
                account.textContent = 'Panel';
                account.href = 'dashboard.html';
            });
        }
    }

    document.addEventListener('DOMContentLoaded', mount);
})();
