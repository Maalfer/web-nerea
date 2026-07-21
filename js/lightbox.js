(function () {
    'use strict';

    var box, stage, view, caption, items = [], index = 0, lastFocus = null;

    function build() {
        box = document.createElement('div');
        box.className = 'lightbox';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        box.innerHTML =
            '<button class="lightbox-close" aria-label="Cerrar">&times;</button>' +
            '<button class="lightbox-nav prev" aria-label="Anterior"><i class="bi bi-chevron-left"></i></button>' +
            '<div class="lightbox-stage"><img alt=""></div>' +
            '<button class="lightbox-nav next" aria-label="Siguiente"><i class="bi bi-chevron-right"></i></button>' +
            '<p class="lightbox-caption"></p>';
        document.body.appendChild(box);

        stage = box.querySelector('.lightbox-stage');
        view = box.querySelector('.lightbox-stage img');
        caption = box.querySelector('.lightbox-caption');

        box.querySelector('.lightbox-close').addEventListener('click', close);
        box.querySelector('.prev').addEventListener('click', function (e) {
            e.stopPropagation();
            step(-1);
        });
        box.querySelector('.next').addEventListener('click', function (e) {
            e.stopPropagation();
            step(1);
        });
        box.addEventListener('click', function (e) {
            if (e.target === box || e.target === stage) close();
        });

        var startX = null;
        box.addEventListener('touchstart', function (e) {
            startX = e.changedTouches[0].clientX;
        }, { passive: true });
        box.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
            startX = null;
        }, { passive: true });
    }

    function collect() {
        items = Array.prototype.slice.call(
            document.querySelectorAll('[data-lightbox][data-full]'));
    }

    function preload(n) {
        if (!items.length) return;
        var node = items[(n + items.length) % items.length];
        new Image().src = node.getAttribute('data-full');
    }

    function show(n) {
        if (!items.length) return;
        index = (n + items.length) % items.length;
        var node = items[index];
        var next = new Image();
        next.onload = function () {
            view.src = next.src;
            view.alt = node.getAttribute('data-caption') || '';
        };
        next.src = node.getAttribute('data-full');
        if (next.complete) view.src = next.src;
        caption.textContent = (node.getAttribute('data-caption') || '') +
            '  ·  ' + (index + 1) + ' / ' + items.length;
        preload(index + 1);
        preload(index - 1);
    }

    function open(node) {
        collect();
        var n = items.indexOf(node);
        if (n < 0) return;
        lastFocus = document.activeElement;
        box.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        show(n);
        box.querySelector('.lightbox-close').focus();
    }

    function close() {
        box.classList.remove('is-open');
        document.body.style.overflow = '';
        view.removeAttribute('src');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function step(d) {
        show(index + d);
    }

    document.addEventListener('DOMContentLoaded', function () {
        build();

        document.addEventListener('click', function (e) {
            var node = e.target.closest('[data-lightbox][data-full]');
            if (!node) return;
            e.preventDefault();
            open(node);
        });

        document.addEventListener('keydown', function (e) {
            var node = e.target.closest && e.target.closest('[data-lightbox][data-full]');
            if (node && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                open(node);
                return;
            }
            if (!box.classList.contains('is-open')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight') step(1);
            if (e.key === 'ArrowLeft') step(-1);
        });
    });

    window.Lightbox = { open: open, close: close };
})();
