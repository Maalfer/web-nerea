(function () {
    'use strict';

    var SINGLE_MAX = 820;

    function el(tag, cls) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        return node;
    }

    function init(root, opts) {
        var pages = opts.pages || [];
        if (!pages.length) return;

        var prevBtn = opts.prev;
        var nextBtn = opts.next;
        var counter = opts.counter;
        var mode = window.innerWidth <= SINGLE_MAX ? 'single' : 'spread';
        var state = 0;
        var leaves = [];
        var sideL, sideR, inner, single;

        function setImg(img, entry) {
            if (!img || !entry) return;
            if (img.getAttribute('data-src') === entry.src) return;
            img.setAttribute('data-src', entry.src);
            img.src = entry.src;
        }

        function buildSpread() {
            root.className = 'book';
            root.innerHTML = '';
            inner = el('div', 'book-inner');

            sideL = el('div', 'book-side left');
            sideL.appendChild(el('img'));
            sideR = el('div', 'book-side right');
            sideR.appendChild(el('img'));
            inner.appendChild(sideL);
            inner.appendChild(sideR);

            leaves = [];
            var total = Math.ceil(pages.length / 2);
            for (var k = 0; k < total; k++) {
                var leaf = el('div', 'book-leaf');
                var front = el('div', 'leaf-face front');
                front.appendChild(el('img'));
                var back = el('div', 'leaf-face back');
                back.appendChild(el('img'));
                leaf.appendChild(front);
                leaf.appendChild(back);
                leaf.addEventListener('click', function (e) {
                    e.stopPropagation();
                    go(this.classList.contains('is-flipped') ? state - 1 : state + 1);
                });
                inner.appendChild(leaf);
                leaves.push(leaf);
            }

            inner.appendChild(el('div', 'book-spine'));
            root.appendChild(inner);

            var hint = el('div', 'book-cover-hint');
            var label = document.createElement('span');
            label.textContent = 'Abrir el libro';
            hint.appendChild(label);
            root.appendChild(hint);
        }

        function buildSingle() {
            root.className = 'book book--single';
            root.innerHTML = '';
            inner = el('div', 'book-inner');
            var page = el('div', 'book-page');
            single = el('img');
            page.appendChild(single);
            inner.appendChild(page);
            root.appendChild(inner);
        }

        function maxState() {
            return mode === 'single' ? pages.length - 1 : leaves.length;
        }

        function paintSpread() {
            root.classList.toggle('is-open', state > 0);

            leaves.forEach(function (leaf, k) {
                var flipped = k < state;
                leaf.classList.toggle('is-flipped', flipped);
                leaf.style.zIndex = flipped ? String(k + 1) : String(leaves.length - k + 1);
                if (Math.abs(k - state) <= 2) {
                    setImg(leaf.querySelector('.front img'), pages[2 * k]);
                    setImg(leaf.querySelector('.back img'), pages[2 * k + 1]);
                }
            });

            setImg(sideL.querySelector('img'), pages[2 * state - 1]);
            setImg(sideR.querySelector('img'), pages[2 * state]);
            sideL.style.visibility = state > 0 ? 'visible' : 'hidden';
            sideR.style.visibility = pages[2 * state] ? 'visible' : 'hidden';

            counter.textContent = state === 0
                ? 'Portada · ' + pages.length + ' páginas'
                : Math.min(2 * state, pages.length) + '–' +
                Math.min(2 * state + 1, pages.length) + ' de ' + pages.length;
        }

        function paintSingle() {
            setImg(single, pages[state]);
            counter.textContent = (state + 1) + ' de ' + pages.length;
        }

        function go(n) {
            state = Math.max(0, Math.min(maxState(), n));
            if (mode === 'single') paintSingle();
            else paintSpread();
            prevBtn.disabled = state <= 0;
            nextBtn.disabled = state >= maxState();
        }

        function build() {
            if (mode === 'single') buildSingle();
            else buildSpread();
            go(Math.min(state, maxState()));
        }

        prevBtn.addEventListener('click', function () {
            go(state - 1);
        });
        nextBtn.addEventListener('click', function () {
            go(state + 1);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            if (document.querySelector('.lightbox.is-open')) return;
            var box = root.getBoundingClientRect();
            if (box.top > window.innerHeight * 0.8 || box.bottom < window.innerHeight * 0.2) return;
            e.preventDefault();
            go(state + (e.key === 'ArrowRight' ? 1 : -1));
        });

        var startX = null;
        root.addEventListener('touchstart', function (e) {
            startX = e.changedTouches[0].clientX;
        }, { passive: true });
        root.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 45) go(state + (dx < 0 ? 1 : -1));
            startX = null;
        }, { passive: true });

        root.addEventListener('click', function (e) {
            if (mode === 'single' && !e.target.closest('button')) go(state + 1);
        });

        var timer;
        window.addEventListener('resize', function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                var next = window.innerWidth <= SINGLE_MAX ? 'single' : 'spread';
                if (next === mode) return;
                state = next === 'single' ? Math.max(0, 2 * state - 1) : Math.ceil(state / 2);
                mode = next;
                build();
            }, 220);
        });

        build();
    }

    window.Flipbook = { init: init };
})();
