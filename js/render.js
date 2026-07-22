(function () {
    'use strict';

    var MEDIUM_WIDTH = 1100;
    var FULL_WIDTH = 1600;

    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }

    function stamp(node, path) {
        if (node && window.NG_EDIT) node.setAttribute('data-ng-path', path);
        return node;
    }

    function styled(node, block) {
        return window.Styler ? window.Styler.apply(node, block) : node;
    }

    function media(group) {
        return (window.MEDIA || {})[group] || [];
    }

    function videos(group) {
        return (window.MEDIA_VIDEO || {})[group] || [];
    }

    function pickOne(group, i) {
        return media(group)[i || 0] || null;
    }

    function pickList(block) {
        var all = media(block.group);
        if (block.items) {
            return block.items.map(function (i) {
                return all[i];
            }).filter(Boolean);
        }
        return all.slice(block.from || 0, block.to == null ? all.length : block.to);
    }

    function imgEl(entry, size, alt, sizes) {
        var im = el('img');
        var medium = entry.medium || entry.src;

        if (size === 'thumb') {
            im.src = entry.thumb;
        } else if (size === 'full') {
            im.src = entry.src;
        } else {
            im.src = medium;
            if (medium !== entry.src) {
                im.srcset = medium + ' ' + MEDIUM_WIDTH + 'w, ' + entry.src + ' ' + FULL_WIDTH + 'w';
                im.sizes = sizes || '(max-width: 900px) 100vw, 900px';
            }
        }

        im.alt = alt || '';
        im.loading = 'lazy';
        im.decoding = 'async';
        if (entry.w) im.width = entry.w;
        if (entry.h) im.height = entry.h;
        return im;
    }

    function zoomable(node, entry, caption) {
        node.setAttribute('data-lightbox', '');
        node.setAttribute('data-full', entry.src);
        if (caption) node.setAttribute('data-caption', caption);
        node.setAttribute('tabindex', '0');
        node.setAttribute('role', 'button');
        node.setAttribute('aria-label', 'Ampliar imagen' + (caption ? ': ' + caption : ''));
        return node;
    }

    function tile(entry, alt, shape, label) {
        var fig = el('figure', 'tile' + (shape ? ' tile--' + shape : ''));
        fig.appendChild(imgEl(entry, 'thumb', alt));
        fig.appendChild(el('span', 'tile-zoom', '<i class="bi bi-arrows-angle-expand"></i>'));
        if (label) fig.appendChild(el('figcaption', 'tile-label', label));
        return zoomable(fig, entry, label || alt);
    }

    function childNode(child, meta, column, position) {
        var build = blocks[child.type];
        if (!build) return null;
        var data = child.alt ? child : Object.assign({}, child, {
            alt: child.caption || (meta && meta.context) || ''
        });
        var path = meta && meta.path
            ? meta.path + '.columns.' + column + '.' + position
            : null;
        var node = build(data, { path: path, context: meta && meta.context });
        if (!node) return null;
        if (path) stamp(node, path);
        return styled(node, child);
    }

    var blocks = {

        feature: function (b) {
            var entry = pickOne(b.group, b.i);
            if (!entry) return null;
            var fig = el('figure', 'feature reveal' + (b.tall ? ' feature--tall' : ''));
            var im = imgEl(entry, 'medium', b.caption || '');
            if (b.eager) im.loading = 'eager';
            fig.appendChild(im);
            if (b.caption) fig.appendChild(el('figcaption', 'feature-caption', b.caption));
            return zoomable(fig, entry, b.caption);
        },

        strip: function (b) {
            var items = pickList(b);
            if (!items.length) return null;
            var wrap = el('div', 'reveal');
            if (b.note) wrap.appendChild(el('p', 'project-note', b.note));
            var strip = el('div', 'strip' + (b.cols ? ' strip--' + b.cols : ''));
            items.forEach(function (entry, n) {
                strip.appendChild(tile(entry, b.alt + ' ' + (n + 1), b.shape || 'auto'));
            });
            wrap.appendChild(strip);
            return wrap;
        },

        grid: function (b) {
            var items = pickList(b);
            if (!items.length) return null;
            var grid = el('div', 'grid reveal' + (b.variant ? ' grid--' + b.variant : ''));
            items.forEach(function (entry, n) {
                grid.appendChild(tile(entry, b.alt + ' ' + (n + 1), b.shape));
            });
            return grid;
        },

        mosaic: function (b) {
            var items = pickList(b);
            if (!items.length) return null;
            var wrap = el('div', 'mosaic reveal');
            items.forEach(function (entry, n) {
                wrap.appendChild(tile(entry, b.alt + ' ' + (n + 1)));
            });
            return wrap;
        },

        carousel: function (b) {
            var items = pickList(b);
            if (!items.length) return null;

            var wrap = el('div', 'reveal');
            var carousel = el('div', 'carousel');
            var viewport = el('div', 'carousel-viewport');
            var track = el('div', 'carousel-track');

            items.forEach(function (entry, n) {
                var slide = el('div', 'carousel-slide');
                slide.appendChild(imgEl(entry, 'medium', b.alt + ' ' + (n + 1)));
                zoomable(slide, entry, b.caption);
                track.appendChild(slide);
            });

            viewport.appendChild(track);
            carousel.appendChild(viewport);
            carousel.appendChild(el('button', 'carousel-btn prev',
                '<i class="bi bi-chevron-left"></i>')).setAttribute('aria-label', 'Anterior');
            carousel.appendChild(el('button', 'carousel-btn next',
                '<i class="bi bi-chevron-right"></i>')).setAttribute('aria-label', 'Siguiente');
            carousel.appendChild(el('span', 'carousel-counter', '1 / ' + items.length));

            var thumbs = el('div', 'thumbs');
            items.forEach(function (entry, n) {
                var thumb = el('button', 'thumb' + (n === 0 ? ' is-active' : ''));
                thumb.type = 'button';
                thumb.setAttribute('aria-label', 'Ir a la imagen ' + (n + 1));
                thumb.appendChild(imgEl(entry, 'thumb', ''));
                thumbs.appendChild(thumb);
            });

            wrap.appendChild(carousel);
            wrap.appendChild(thumbs);
            if (window.Carousel) window.Carousel.init(carousel, thumbs);
            return wrap;
        },

        video: function (b) {
            var list = videos(b.group);
            if (!list.length) return null;
            var wrap = el('div', 'reveal');
            if (b.note) wrap.appendChild(el('p', 'project-note', b.note));
            var box = el('div', 'video-block');
            list.forEach(function (item) {
                var frame = el('div', 'video-frame');
                var video = el('video');
                video.controls = true;
                video.preload = 'metadata';
                video.playsInline = true;
                if (item.poster) video.poster = item.poster;
                var source = el('source');
                source.src = item.src;
                source.type = 'video/mp4';
                video.appendChild(source);
                video.appendChild(document.createTextNode('Tu navegador no puede reproducir este vídeo.'));
                frame.appendChild(video);
                box.appendChild(frame);
            });
            wrap.appendChild(box);
            return wrap;
        },

        links: function (b) {
            var box = el('div', 'dl-links reveal');
            (b.items || []).forEach(function (link) {
                var a = el('a', link.primary ? 'btn-bubble' : 'btn-ghost', link.label);
                a.href = link.href;
                if (link.download) {
                    a.setAttribute('download', link.download);
                } else {
                    a.target = '_blank';
                    a.rel = 'noopener';
                }
                if (link.primary) {
                    a.innerHTML = link.label + '<span></span><span></span><span></span><span></span>';
                }
                box.appendChild(a);
            });
            return box;
        },

        sub: function (b) {
            var head = el('div', 'section-head section-head--sub reveal');
            head.appendChild(el('h3', null, b.title));
            if (b.text) head.appendChild(el('p', null, b.text));
            return head;
        },

        split: function (b) {
            var wrap = el('div', 'split reveal' + (b.side === 'right' ? ' split--flip' : ''));
            if (b.id) wrap.id = b.id;

            var text = el('div', 'split-text');
            text.appendChild(el('h3', null, b.title));
            if (b.sub) text.appendChild(el('p', 'sub', b.sub));
            text.appendChild(el('hr', 'divider'));
            if (b.text) text.appendChild(el('p', null, b.text));
            wrap.appendChild(text);

            var box = el('div', 'split-media');
            var inner = b.media && blocks[b.media.type] ? blocks[b.media.type](b.media) : null;
            if (inner) {
                inner.classList.remove('reveal');
                box.appendChild(inner);
            }
            wrap.appendChild(box);
            return wrap;
        },

        row: function (b, meta) {
            var count = b.cols === 3 ? 3 : 2;
            var wrap = el('div', 'ng-row ng-row--' + count +
                (b.ratio ? ' is-' + b.ratio : '') +
                (b.middle ? ' is-middle' : ''));
            if (b.gap != null) wrap.style.gap = b.gap + 'px';

            for (var index = 0; index < count; index++) {
                var cell = el('div', 'ng-col');
                var children = (b.columns && b.columns[index]) || [];
                children.forEach(function (child, position) {
                    var node = childNode(child, meta, index, position);
                    if (node) cell.appendChild(node);
                });
                if (!children.length) cell.appendChild(el('div', 'ng-col-empty'));
                wrap.appendChild(cell);
            }
            return wrap;
        },

        heading: function (b) {
            var level = b.level || 'h2';
            var node = el(level, 'ng-heading', b.text || '');
            return node;
        },

        text: function (b) {
            var box = el('div', 'ng-text');
            String(b.text || '').split(/\n{2,}/).forEach(function (chunk) {
                box.appendChild(el('p', null, chunk.replace(/\n/g, '<br>')));
            });
            return box;
        },

        button: function (b) {
            var box = el('div', 'ng-button-row');
            var a = el('a', b.variant === 'ghost' ? 'btn-ghost' : 'btn-bubble', b.label || 'Botón');
            a.href = b.href || '#';
            if (b.download) a.setAttribute('download', b.download);
            else if (b.blank) {
                a.target = '_blank';
                a.rel = 'noopener';
            }
            if (b.variant !== 'ghost') {
                a.innerHTML = (b.label || 'Botón') + '<span></span><span></span><span></span><span></span>';
            }
            box.appendChild(a);
            return box;
        },

        spacer: function (b) {
            var box = el('div', 'ng-spacer');
            box.style.height = (b.height || 40) + 'px';
            return box;
        },

        divider: function (b) {
            var box = el('div', 'ng-divider-wrap');
            var line = el('hr', 'ng-divider');
            if (b.width) line.style.width = b.width + '%';
            box.appendChild(line);
            return box;
        },

        html: function (b) {
            if (!b.code) return null;
            var box = el('div', 'ng-html');
            box.innerHTML = b.code;
            return box;
        },

        flipbook: function (b) {
            var wrap = el('div', 'reveal');
            if (b.id) wrap.id = b.id;

            var head = el('div', 'section-head section-head--sub');
            head.appendChild(el('h3', null, b.title));
            if (b.text) head.appendChild(el('p', null, b.text));
            wrap.appendChild(head);

            var box = el('div', 'book-wrap');
            var book = el('div', 'book');
            box.appendChild(book);

            var controls = el('div', 'book-controls');
            var prev = el('button', null, '<i class="bi bi-chevron-left"></i>');
            prev.type = 'button';
            prev.setAttribute('aria-label', 'Página anterior');
            var counter = el('span', 'book-page-num', '');
            var next = el('button', null, '<i class="bi bi-chevron-right"></i>');
            next.type = 'button';
            next.setAttribute('aria-label', 'Página siguiente');
            controls.appendChild(prev);
            controls.appendChild(counter);
            controls.appendChild(next);
            box.appendChild(controls);
            wrap.appendChild(box);

            if (b.pdf) {
                wrap.appendChild(blocks.links({
                    items: [{
                        label: 'Descargar la memoria en PDF', href: b.pdf, primary: true,
                        download: 'Memoria del diorama - Nerea Gonzalez Lopez.pdf'
                    }]
                }));
            }

            if (window.Flipbook) {
                window.Flipbook.init(book, {
                    pages: media(b.group),
                    prev: prev,
                    next: next,
                    counter: counter
                });
            }
            return wrap;
        }
    };

    function renderHero(page, mount, base) {
        var hero = el('header', 'page-hero');
        stamp(hero, base);
        var box = el('div', 'page-hero-media');
        var slides = [];

        if (page.hero && page.hero.slides) {
            slides = page.hero.slides.map(function (s) {
                return pickOne(s.group, s.i);
            });
        } else if (page.hero && page.hero.group) {
            slides = [pickOne(page.hero.group, page.hero.i || 0)];
        }
        slides = slides.filter(Boolean);

        slides.forEach(function (entry, n) {
            var im = imgEl(entry, 'medium', '', '100vw');
            im.removeAttribute('width');
            im.removeAttribute('height');
            if (n === 0) {
                im.className = 'is-active';
                im.loading = 'eager';
                im.fetchPriority = 'high';
            }
            box.appendChild(im);
        });
        hero.appendChild(box);

        var body = el('div', 'page-hero-body');
        body.appendChild(el('h1', null, page.title));
        if (page.subtitle) body.appendChild(el('p', null, page.subtitle));
        hero.appendChild(body);
        mount.appendChild(hero);

        if (slides.length > 1) {
            var images = box.querySelectorAll('img');
            var current = 0;
            setInterval(function () {
                images[current].classList.remove('is-active');
                current = (current + 1) % images.length;
                images[current].classList.add('is-active');
            }, 6500);
        }
    }

    function renderIndex(page, mount) {
        if (!page.index || !page.index.length) return;
        var nav = el('nav', 'page-index');
        nav.setAttribute('aria-label', 'Índice de la página');
        page.index.forEach(function (item) {
            var a = el('a', null, item.label);
            a.href = item.href;
            nav.appendChild(a);
        });
        mount.appendChild(nav);
    }

    function renderPage(page, mount, base) {
        base = base || 'pages.' + (mount.getAttribute('data-page') || '');
        if (window.Styler) window.Styler.globals((window.CONTENT || {}).site);
        renderHero(page, mount, base);
        styled(mount.querySelector('.page-hero'), page);
        renderIndex(page, mount);

        var current = null;
        var context = page.title;

        function ensureSection() {
            if (current) return current;
            var section = el('section', 'project');
            var wrap = el('div', 'wrap');
            section.appendChild(wrap);
            mount.appendChild(section);
            current = wrap;
            return wrap;
        }

        (page.blocks || []).forEach(function (b, position) {
            var path = base + '.blocks.' + position;

            if (b.type === 'section') {
                var section = el('section', 'project' + (b.alt ? ' project--alt' : ''));
                if (b.id) section.id = b.id;
                var wrap = el('div', 'wrap');
                var head = el('div', 'section-head reveal');
                if (b.eyebrow) head.appendChild(el('span', 'eyebrow', b.eyebrow));
                head.appendChild(el('h2', null, b.title));
                head.appendChild(el('hr', 'divider'));
                if (b.text) head.appendChild(el('p', null, b.text));
                wrap.appendChild(head);
                section.appendChild(wrap);
                mount.appendChild(section);
                stamp(head, path);
                styled(section, b);
                current = wrap;
                context = b.title;
                return;
            }

            if (b.type === 'sub' || b.type === 'split') context = b.title;

            var build = blocks[b.type];
            if (!build) return;

            var data = b.alt ? b : Object.assign({}, b, { alt: b.caption || context });
            var node = build(data, { path: path, context: context });
            if (node) ensureSection().appendChild(styled(stamp(node, path), b));
        });
    }

    /** Turns an Instagram profile URL into its @handle. */
    function handleOf(url) {
        var name = String(url || '').replace(/\/+$/, '').split('/').pop();
        return name ? '@' + name : '';
    }

    function fillHead(box, config, path) {
        if (!box || !config) return;
        var eyebrow = box.querySelector('.eyebrow');
        var title = box.querySelector('h1, h2');
        var text = box.querySelector('p');
        if (eyebrow && config.eyebrow != null) eyebrow.textContent = config.eyebrow;
        if (title && config.title != null) title.textContent = config.title;
        if (text && config.text != null) text.textContent = config.text;
        stamp(box, path);
    }

    function renderHomeChrome(data, root) {
        var home = data.home || {};
        var site = data.site || {};

        var hero = root.querySelector('#home-hero');
        if (hero) {
            var heading = hero.querySelector('h1');
            if (heading) {
                heading.innerHTML = '';
                heading.appendChild(document.createTextNode(
                    (home.title != null ? home.title : site.name || '') + ' '));
                if (home.accent) heading.appendChild(el('em', null, home.accent));
            }
            var tagline = hero.querySelector('p');
            if (tagline) tagline.textContent = home.tagline != null ? home.tagline : (site.tagline || '');
            stamp(hero, 'home');
        }

        fillHead(root.querySelector('#home-downloads-head'), home.downloads, 'home.downloads');
        fillHead(root.querySelector('#home-references-head'), home.references, 'home.references');

        var contact = root.querySelector('#home-contact');
        if (contact) {
            fillHead(contact, home.contact, 'home.contact');
            var list = contact.querySelector('.contact-list');
            if (list) {
                list.innerHTML = '';
                var rows = [
                    ['bi-envelope-fill', site.email, 'mailto:' + site.email],
                    ['bi-telephone-fill', site.phone, 'tel:' + String(site.phone || '').replace(/\s+/g, '')],
                    ['bi-geo-alt-fill', site.location, null],
                    ['bi-instagram', handleOf(site.instagram), site.instagram]
                ];
                rows.forEach(function (row) {
                    if (!row[1]) return;
                    var item = el('li');
                    item.appendChild(el('i', 'bi ' + row[0]));
                    if (row[2]) {
                        var link = el('a', null, row[1]);
                        link.href = row[2];
                        if (row[2].indexOf('http') === 0) {
                            link.target = '_blank';
                            link.rel = 'noopener';
                        }
                        item.appendChild(link);
                    } else {
                        item.appendChild(el('span', null, row[1]));
                    }
                    list.appendChild(item);
                });
            }
        }
    }

    function renderHome(data, root) {
        renderHomeChrome(data, root);
        var panels = root.querySelector('#gate-panels');
        if (panels) {
            (data.gates || []).forEach(function (gate, position) {
                var entry = pickOne(gate.group, gate.index);
                var link = el('a', 'gate-panel reveal');
                stamp(link, 'gates.' + position);
                styled(link, gate);
                link.href = gate.href;
                if (entry) {
                    var im = imgEl(entry, 'medium', gate.title, '(max-width: 900px) 100vw, 34vw');
                    im.removeAttribute('width');
                    im.removeAttribute('height');
                    im.loading = 'eager';
                    link.appendChild(im);
                }
                var body = el('div', 'gate-panel-body');
                body.appendChild(el('span', 'gate-panel-num', gate.num));
                body.appendChild(el('h2', null, gate.title));
                body.appendChild(el('p', null, gate.text));
                body.appendChild(el('span', 'gate-panel-cta',
                    'Ver apartado <i class="bi bi-arrow-right"></i>'));
                link.appendChild(body);
                panels.appendChild(link);
            });
        }

        var downloads = root.querySelector('#downloads');
        if (downloads) {
            (data.downloads || []).forEach(function (item, position) {
                var card = el('article', 'dl-card reveal');
                stamp(card, 'downloads.' + position);
                styled(card, item);
                card.appendChild(el('div', 'icon', '<i class="bi ' + item.icon + '"></i>'));
                card.appendChild(el('h3', null, item.title));
                card.appendChild(el('p', null, item.text));
                card.appendChild(blocks.links({ items: item.links }));
                downloads.appendChild(card);
            });
        }

        var about = root.querySelector('#about-body');
        if (about && data.about) {
            var info = data.about;
            var entry = pickOne(info.group, 0);
            var photo = el('div', 'about-photo reveal-left');
            if (entry) photo.appendChild(imgEl(entry, 'medium', 'Nerea González López', '(max-width: 980px) 100vw, 460px'));

            var text = el('div', 'about-text reveal-right');
            stamp(text, 'about');
            styled(text, info);
            text.appendChild(el('span', 'eyebrow', 'Quién soy'));
            text.appendChild(el('h2', null, info.title));
            (info.paragraphs || []).forEach(function (p) {
                text.appendChild(el('p', null, p));
            });

            if (info.education && info.education.length) {
                text.appendChild(el('h3', null, 'Formación'));
                var list = el('ul', 'contact-list');
                info.education.forEach(function (line) {
                    list.appendChild(el('li', null,
                        '<i class="bi bi-mortarboard"></i><span>' + line + '</span>'));
                });
                text.appendChild(list);
            }

            if (info.facts && info.facts.length) {
                var facts = el('div', 'facts');
                info.facts.forEach(function (fact) {
                    facts.appendChild(el('div', 'fact',
                        '<strong>' + fact.value + '</strong><span>' + fact.label + '</span>'));
                });
                text.appendChild(facts);
            }

            about.appendChild(photo);
            about.appendChild(text);
        }

        var refs = root.querySelector('#refs');
        if (refs) {
            (data.references || []).forEach(function (ref, position) {
                var entry = pickOne(ref.group, ref.index);
                var card = el('a', 'ref reveal');
                stamp(card, 'references.' + position);
                styled(card, ref);
                card.href = ref.href;
                card.target = '_blank';
                card.rel = 'noopener';
                if (entry) card.appendChild(imgEl(entry, 'thumb', ref.name));
                card.appendChild(el('h3', null, ref.name));
                card.appendChild(el('p', null, ref.text));
                refs.appendChild(card);
            });
        }
    }

    var HOME_MOUNTS = ['#gate-panels', '#downloads', '#about-body', '#refs'];

    function build() {
        var mount = document.getElementById('app');
        var slug = mount && mount.getAttribute('data-page');
        if (!slug) return;
        if (window.Styler) window.Styler.reset();

        if (slug === 'home') {
            HOME_MOUNTS.forEach(function (selector) {
                var box = document.querySelector(selector);
                if (box) box.innerHTML = '';
            });
            window.Api.getHome().then(function (data) {
                if (window.Styler) window.Styler.globals(data.site);
                renderHome(data, document);
                if (window.Styler) window.Styler.flush();
                document.dispatchEvent(new CustomEvent('content:rendered'));
            });
            return;
        }

        window.Api.getPage(slug).then(function (page) {
            if (!page) return;
            document.title = page.title + ' — ' + window.CONTENT.site.name;
            mount.innerHTML = '';
            renderPage(page, mount);
            if (window.Styler) window.Styler.flush();
            document.dispatchEvent(new CustomEvent('content:rendered'));
        });
    }

    document.addEventListener('DOMContentLoaded', build);

    window.Render = {
        blocks: blocks,
        renderPage: renderPage,
        renderHome: renderHome,
        renderHero: renderHero,
        renderIndex: renderIndex,
        render: build
    };
})();
