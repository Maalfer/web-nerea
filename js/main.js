(function () {
    'use strict';

    var observer = null;

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
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        }
        scope.querySelectorAll('.reveal:not(.is-visible), .reveal-left:not(.is-visible), .reveal-right:not(.is-visible)')
            .forEach(function (n) {
                observer.observe(n);
            });
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
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }, { passive: true });

        update();
    }

    document.addEventListener('DOMContentLoaded', function () {
        chrome();
        observe(document);
    });

    document.addEventListener('content:rendered', function () {
        observe(document);
    });
})();
