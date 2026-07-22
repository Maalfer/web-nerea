(function () {
    'use strict';

    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }

    function images(group) {
        return (window.MEDIA || {})[group] || [];
    }

    function videos(group) {
        return (window.MEDIA_VIDEO || {})[group] || [];
    }

    function videoFrame(clip, poster) {
        var frame = el('div', 'video-frame');
        var vid = el('video');
        vid.setAttribute('controls', '');
        vid.setAttribute('preload', 'metadata');
        vid.setAttribute('playsinline', '');
        if (clip.poster || poster) vid.setAttribute('poster', clip.poster || poster);
        var source = el('source');
        source.src = clip.src;
        source.type = 'video/mp4';
        vid.appendChild(source);
        vid.appendChild(document.createTextNode('Tu navegador no puede reproducir este vídeo.'));
        frame.appendChild(vid);
        return frame;
    }

    function galleryImg(entry, caption) {
        var img = el('img');
        img.src = entry.thumb || entry.src;
        img.alt = caption;
        img.setAttribute('data-lightbox', '');
        img.setAttribute('data-full', entry.src);
        img.setAttribute('data-caption', caption);
        return img;
    }

    function embedUrl(url) {
        return url.replace(/\/+$/, '') + '/embed';
    }

    function reelBlock(url) {
        var header = el('div', 'opera-section-header reveal');
        var frame = el('div', 'reel-embed');
        var iframe = document.createElement('iframe');
        iframe.src = embedUrl(url);
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('allowtransparency', 'true');
        iframe.setAttribute('allow', 'encrypted-media');
        iframe.setAttribute('title', 'Reel de Instagram');
        frame.appendChild(iframe);
        header.appendChild(frame);
        return header;
    }

    function project(data, position) {
        var section = el('section', 'opera-project-section');
        section.id = data.id;
        if (window.NG_EDIT) section.setAttribute('data-ng-path', 'pages.teatro.projects.' + position);
        if (window.Styler) window.Styler.apply(section, data);

        if (data.reel && data.reelPosition !== 'bottom') section.appendChild(reelBlock(data.reel));

        var flip = !!data.flip;
        var grid = el('div', 'opera-grid' + (flip ? ' opera-grid--flip' : ''));

        var text = el('div', 'opera-text ' + (flip ? 'reveal-right' : 'reveal-left'));
        text.appendChild(el('h2', 'section-title', data.title || ''));
        if (data.subtitle) text.appendChild(el('h3', 'section-subtitle', data.subtitle));
        text.appendChild(el('hr', 'divider'));
        text.appendChild(el('p', 'project-desc', (data.text || '').replace(/\n/g, '<br>')));
        grid.appendChild(text);

        var media = el('div', 'opera-media ' + (flip ? 'reveal-left' : 'reveal-right'));
        var gallery = images(data.gallery);
        var clips = videos(data.videoGroup);
        var poster = gallery.length ? gallery[0].src : null;

        if (clips.length === 1) {
            media.appendChild(videoFrame(clips[0], poster));
        } else if (clips.length > 1) {
            var row = el('div', 'video-row');
            clips.forEach(function (clip) {
                row.appendChild(videoFrame(clip, poster));
            });
            media.appendChild(row);
        }

        var mainCount = typeof data.mainCount === 'number' ? data.mainCount : gallery.length;
        var caption = (data.title || '') + ' — escenografía';

        if (gallery.length) {
            var mainGrid = el('div', 'gallery-grid');
            gallery.slice(0, mainCount).forEach(function (entry) {
                mainGrid.appendChild(galleryImg(entry, caption));
            });
            media.appendChild(mainGrid);
        }

        grid.appendChild(media);
        section.appendChild(grid);

        var extra = gallery.slice(mainCount);
        if (extra.length) {
            var wrap = el('div', 'wrap opera-extra');
            var extraGrid = el('div', 'gallery-grid gallery-grid--sm');
            extra.forEach(function (entry) {
                extraGrid.appendChild(galleryImg(entry, (data.title || '') + ' — detalle'));
            });
            wrap.appendChild(extraGrid);
            section.appendChild(wrap);
        }

        if (data.reel && data.reelPosition === 'bottom') section.appendChild(reelBlock(data.reel));

        return section;
    }

    function build() {
        var mount = document.getElementById('teatro-app');
        if (!mount) return;

        var data = ((window.CONTENT || {}).pages || {}).teatro;
        if (!data) return;
        if (window.Styler) {
            window.Styler.reset();
            window.Styler.globals((window.CONTENT || {}).site);
        }

        var hero = document.getElementById('teatro-hero');
        if (hero) {
            hero.innerHTML = '';
            if (window.NG_EDIT) hero.setAttribute('data-ng-path', 'pages.teatro');
            var box = el('div');
            box.appendChild(el('h1', null, data.title || 'Teatro'));
            if (data.subtitle) box.appendChild(el('p', null, data.subtitle));
            hero.appendChild(box);
        }
        if (data.title) document.title = data.title + ' — ' + ((window.CONTENT.site || {}).name || '');

        mount.innerHTML = '';
        (data.projects || []).forEach(function (p, position) {
            mount.appendChild(project(p, position));
        });

        if (window.Styler) {
            window.Styler.apply(hero, data);
            window.Styler.flush();
        }
        document.dispatchEvent(new CustomEvent('content:rendered'));
    }

    document.addEventListener('DOMContentLoaded', build);
    window.Teatro = { render: build };
})();
