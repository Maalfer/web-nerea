(function () {
    'use strict';

    var NAV = [
        { label: 'Inicio', href: 'index.html', key: 'home' },
        { label: 'Ilustración', href: 'ilustracion.html', key: 'ilustracion' },
        { label: 'Escultura', href: 'escultura.html', key: 'escultura' },
        { label: 'Teatro', href: 'teatro.html', key: 'teatro' },
        { label: 'Sobre mí', href: 'index.html#sobre-mi', key: '' },
        { label: 'Descargas', href: 'index.html#descargas', key: '' },
        { label: 'Contacto', href: 'index.html#contacto', key: '' }
    ];

    var FOOTER = {
        aboutTitle: 'SOBRE MÍ',
        about: 'Soy Nerea González López, artista y diseñadora especializada en ilustración y ' +
            'escultura. Este portfolio reúne mi trabajo en las tres disciplinas que me definen.',
        portfolioTitle: 'PORTFOLIO',
        portfolio: [
            { label: 'Ilustración', href: 'ilustracion.html' },
            { label: 'Escultura', href: 'escultura.html' },
            { label: 'Teatro', href: 'teatro.html' },
            { label: 'CV y portfolios en PDF', href: 'index.html#descargas' }
        ],
        contactTitle: 'CONTACTO',
        rights: 'Todos los derechos reservados.'
    };

    function handleOf(url) {
        var name = String(url || '').replace(/\/+$/, '').split('/').pop();
        return name ? '@' + name : '';
    }

    function escape(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function settings(key, fallback) {
        var value = (window.CONTENT || {})[key];
        return value && typeof value === 'object' ? value : fallback;
    }

    function stamp(path) {
        return window.NG_EDIT ? ' data-ng-path="' + path + '"' : '';
    }

    function stemOf(file) {
        var name = String(file || '').split('#')[0].split('?')[0].split('/').pop().toLowerCase();
        name = name.replace(/\.html$/, '');
        if (!name || name === 'index') return 'home';
        if (name === 'dashboard' || name === 'editor') return 'login';
        return name;
    }

    function currentKey() {
        return stemOf(location.pathname.split('/').pop() || 'index.html');
    }

    function header() {
        var active = currentKey();
        var config = settings('header', {});
        var items = Array.isArray(config.links) && config.links.length ? config.links : NAV;

        var links = items.map(function (item) {
            var key = item.key != null ? item.key : keyForHref(item.href);
            var cls = 'nav-link' + (key && key === active ? ' active' : '');
            return '<li><a class="' + cls + '" href="' + escape(item.href) + '">' +
                escape(item.label) + '</a></li>';
        }).join('');

        links += '<li><a class="nav-link' + (active === 'login' ? ' active' : '') +
            '" id="nav-account" href="login.html">Acceder</a></li>';

        var brand = config.brand != null ? config.brand : 'Nerea González';
        var accent = config.accent != null ? config.accent : 'López';

        return '' +
            '<header class="site-header" id="site-header"' + stamp('header') + '>' +
            '  <nav aria-label="Navegación principal">' +
            '    <a class="brand" href="index.html">' + escape(brand) +
            ' <span>' + escape(accent) + '</span></a>' +
            '    <button class="menu-toggle" aria-label="Abrir menú" aria-expanded="false">☰</button>' +
            '    <ul class="nav-list" id="nav-list">' + links + '</ul>' +
            '  </nav>' +
            '</header>';
    }

    function keyForHref(href) {
        if (String(href || '').indexOf('#') !== -1) return '';
        return stemOf(href);
    }

    function footer(site) {
        var config = settings('footer', {});
        var about = config.about != null ? config.about : FOOTER.about;
        var links = Array.isArray(config.portfolio) && config.portfolio.length
            ? config.portfolio : FOOTER.portfolio;
        var rights = config.rights != null ? config.rights : FOOTER.rights;

        var portfolio = links.map(function (item) {
            return '<li><a href="' + escape(item.href) + '">' + escape(item.label) + '</a></li>';
        }).join('');

        return '' +
            '<footer class="footer"' + stamp('footer') + '>' +
            '  <div class="footer-overlay"></div>' +
            '  <div class="footer-grid">' +
            '    <div class="footer-col">' +
            '      <h2>' + escape(config.aboutTitle != null ? config.aboutTitle : FOOTER.aboutTitle) + '</h2>' +
            '      <p>' + escape(about) + '</p>' +
            '    </div>' +
            '    <div class="footer-col">' +
            '      <h2>' + escape(config.portfolioTitle != null ? config.portfolioTitle : FOOTER.portfolioTitle) + '</h2>' +
            '      <ul>' + portfolio + '</ul>' +
            '    </div>' +
            '    <div class="footer-col">' +
            '      <h2>' + escape(config.contactTitle != null ? config.contactTitle : FOOTER.contactTitle) + '</h2>' +
            '      <ul>' +
            '        <li><a href="mailto:' + escape(site.email) + '">' + escape(site.email) + '</a></li>' +
            '        <li><a href="tel:' + escape(String(site.phone || '').replace(/\s+/g, '')) + '">' +
            escape(site.phone) + '</a></li>' +
            '        <li><a href="' + escape(site.instagram) + '" target="_blank" rel="noopener">' +
            escape(handleOf(site.instagram)) + '</a></li>' +
            '        <li><a href="' + escape(site.linkedin) + '" target="_blank" rel="noopener">LinkedIn</a></li>' +
            '      </ul>' +
            '    </div>' +
            '  </div>' +
            '  <div class="footer-bottom">' +
            '    <p>&copy; ' + new Date().getFullYear() + ' ' + escape(site.name) + ' — ' + escape(rights) + ' ' +
            '    Diseñado por <a href="https://www.linkedin.com/in/maalfer1" target="_blank" rel="noopener">Mario Álvarez</a>' +
            '    &amp; <a href="' + escape(site.linkedin) + '" target="_blank" rel="noopener">Nerea González</a></p>' +
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
    window.Components = { mount: mount };
})();
