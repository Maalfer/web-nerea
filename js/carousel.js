(function () {
    'use strict';

    function init(root, thumbsBox) {
        var viewport = root.querySelector('.carousel-viewport');
        var track = root.querySelector('.carousel-track');
        var slides = track.querySelectorAll('.carousel-slide');
        var counter = root.querySelector('.carousel-counter');
        var thumbs = thumbsBox ? thumbsBox.querySelectorAll('.thumb') : [];
        var i = 0;

        if (slides.length <= 1) {
            Array.prototype.forEach.call(root.querySelectorAll('.carousel-btn'), function (b) {
                b.style.display = 'none';
            });
        }

        function fit() {
            var h = slides[i].scrollHeight;
            if (h > 40) viewport.style.height = h + 'px';
        }

        function go(n) {
            i = (n + slides.length) % slides.length;
            track.style.transform = 'translateX(' + (-100 * i) + '%)';
            fit();
            if (counter) counter.textContent = (i + 1) + ' / ' + slides.length;
            Array.prototype.forEach.call(thumbs, function (t, k) {
                t.classList.toggle('is-active', k === i);
            });
            var next = slides[(i + 1) % slides.length].querySelector('img');
            if (next) next.loading = 'eager';
        }

        root.querySelector('.carousel-btn.prev').addEventListener('click', function () {
            go(i - 1);
        });
        root.querySelector('.carousel-btn.next').addEventListener('click', function () {
            go(i + 1);
        });

        Array.prototype.forEach.call(thumbs, function (t, k) {
            t.addEventListener('click', function () {
                go(k);
            });
        });

        var startX = null;
        root.addEventListener('touchstart', function (e) {
            startX = e.changedTouches[0].clientX;
        }, { passive: true });
        root.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1));
            startX = null;
        }, { passive: true });

        root.setAttribute('tabindex', '0');
        root.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                go(i + 1);
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go(i - 1);
            }
        });

        Array.prototype.forEach.call(root.querySelectorAll('img'), function (im) {
            if (!im.complete) im.addEventListener('load', fit);
        });

        var timer;
        window.addEventListener('resize', function () {
            clearTimeout(timer);
            timer = setTimeout(fit, 180);
        });

        go(0);
    }

    window.Carousel = { init: init };
})();
