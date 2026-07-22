(function () {
    'use strict';

    var observer = null;
    var PENDING = '.reveal:not(.is-visible), .reveal-left:not(.is-visible), .reveal-right:not(.is-visible)';

    function show(node) {
        node.classList.add('is-visible');
        if (observer) observer.unobserve(node);
    }

    /** Safety net: anything the viewport has already reached must be shown.
        Without it a fast scroll skips sections and they stay hidden for good. */
    function sweep() {
        var limit = window.innerHeight;
        document.querySelectorAll(PENDING).forEach(function (n) {
            if (n.getBoundingClientRect().top < limit) show(n);
        });
    }

    function observe(root) {
        var scope = root || document;
        if (!('IntersectionObserver' in window)) {
            scope.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function (n) {
                n.classList.add('is-visible');
            });
            return;
        }
        if (!observer) {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) show(entry.target);
                });
            }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
        }
        scope.querySelectorAll(PENDING).forEach(function (n) {
            observer.observe(n);
        });
        sweep();
    }

    function chrome() {
        var header = document.getElementById('site-header');

        var bar = document.createElement('div');
        bar.className = 'progress-bar';
        document.body.appendChild(bar);

        var top = document.createElement('button');
        top.className = 'to-top';
        top.type = 'button';
        top.setAttribute('aria-label', 'Volver arriba');
        top.innerHTML = '<i class="bi bi-arrow-up"></i>';
        top.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(top);

        var ticking = false;

        function update() {
            var y = window.scrollY || document.documentElement.scrollTop;
            var h = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
            if (header) header.classList.toggle('scrolled', y > 60);
            top.classList.toggle('is-visible', y > 700);
            sweep();
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }, { passive: true });

        update();
    }

    window.NG_REVEAL_READY = true;

    document.addEventListener('DOMContentLoaded', function () {
        chrome();
        observe(document);
    });

    document.addEventListener('content:rendered', function () {
        observe(document);
        setTimeout(sweep, 60);
    });

    window.addEventListener('load', sweep);
    window.addEventListener('resize', sweep, { passive: true });
    window.addEventListener('hashchange', function () {
        setTimeout(sweep, 60);
    });
})();
