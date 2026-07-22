(function () {
    'use strict';

    // Structural keys that drive layout/rendering — never editable as free text.
    var LOCKED = ['href', 'group', 'icon', 'type', 'id', 'cols', 'from', 'to', 'i',
        'shape', 'variant', 'download', 'index', 'primary', 'tall', 'alt', 'flip',
        'mainCount', 'videoGroup', 'gallery', 'reelPosition', 'w', 'h'];

    var TOP_LABELS = {
        site: 'Datos de contacto y web',
        downloads: 'Descargas (textos)',
        gates: 'Portada — accesos',
        about: 'Sobre mí',
        references: 'Referencias',
        pages: 'Páginas'
    };

    var PAGE_LABELS = {
        ilustracion: 'Ilustración',
        escultura: 'Escultura',
        teatro: 'Teatro'
    };

    function el(tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function pretty(key) {
        return String(key).replace(/[-_/]/g, ' ')
            .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function itemLabel(value, index) {
        if (value && typeof value === 'object') {
            var t = value.title || value.name || value.label || value.eyebrow || value.value || value.id;
            if (t) return String(t);
        }
        return '#' + (index + 1);
    }

    // ---- Content editor -----------------------------------------------------

    function field(parent, key, label) {
        var value = parent[key];
        var wrap = el('div', 'field-edit');
        wrap.appendChild(el('label', null, label));
        var multiline = value.length > 55 || value.indexOf('\n') >= 0;
        var input = document.createElement(multiline ? 'textarea' : 'input');
        input.value = value;
        if (multiline) input.rows = Math.min(8, value.split('\n').length + 1);
        input.addEventListener('input', function () {
            parent[key] = input.value;
            markDirty();
        });
        wrap.appendChild(input);
        return wrap;
    }

    function group(node, label, depth) {
        var body = el('div', 'edit-body');
        var isArray = Array.isArray(node);
        var keys = isArray ? node.map(function (_, i) { return i; }) : Object.keys(node);

        keys.forEach(function (key) {
            var value = node[key];
            var childLabel = isArray ? itemLabel(value, key) : pretty(key);
            if (isArray && PAGE_LABELS[value && value.id]) childLabel = PAGE_LABELS[value.id];
            if (!isArray && PAGE_LABELS[key]) childLabel = PAGE_LABELS[key];

            if (value && typeof value === 'object') {
                var sub = group(value, childLabel, depth + 1);
                if (sub) body.appendChild(sub);
            } else if (typeof value === 'string' && LOCKED.indexOf(String(key)) < 0) {
                body.appendChild(field(node, key, childLabel));
            }
        });

        if (!body.children.length) return null;

        if (depth === 0) {
            var details = el('details', 'edit-group');
            details.appendChild(el('summary', null, label));
            details.appendChild(body);
            return details;
        }
        var box = el('div', 'edit-sub');
        box.appendChild(el('h4', 'edit-sub-title', label));
        box.appendChild(body);
        return box;
    }

    var state = { content: null, dirty: false };

    function markDirty() {
        state.dirty = true;
        var btn = document.getElementById('content-save');
        if (btn) btn.disabled = false;
        var msg = document.getElementById('content-msg');
        if (msg) msg.textContent = '';
    }

    function renderContent(data) {
        state.content = data;
        var root = document.getElementById('content-editor');
        root.innerHTML = '';
        var order = ['site', 'gates', 'downloads', 'about', 'references', 'pages'];
        order.forEach(function (key) {
            if (!data[key]) return;
            var node = group(data[key], TOP_LABELS[key] || pretty(key), 0);
            if (node) root.appendChild(node);
        });
    }

    function saveContent() {
        var btn = document.getElementById('content-save');
        var msg = document.getElementById('content-msg');
        btn.disabled = true;
        msg.className = 'auth-msg';
        msg.textContent = 'Guardando…';
        window.Auth.putContent(state.content).then(function () {
            state.dirty = false;
            msg.className = 'auth-msg is-ok';
            msg.textContent = 'Cambios publicados.';
        }).catch(function (error) {
            btn.disabled = false;
            msg.className = 'auth-msg is-error';
            msg.textContent = error.message || 'No se pudo guardar.';
        });
    }

    // ---- Media browser ------------------------------------------------------

    function replacer(kind, group, index, onDone) {
        var label = el('label', 'btn-bubble media-replace',
            'Reemplazar');
        var extra = document.createElement('span');
        for (var s = 0; s < 4; s++) label.appendChild(document.createElement('span'));
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = kind === 'video' ? 'video/mp4,.mp4' : 'image/*';
        input.hidden = true;
        label.appendChild(input);

        var status = el('span', 'doc-status');

        input.addEventListener('change', function () {
            if (!input.files.length) return;
            status.className = 'doc-status';
            status.textContent = 'Subiendo…';
            var call = kind === 'video'
                ? window.Auth.replaceVideo(group, index, input.files[0])
                : window.Auth.replaceImage(group, index, input.files[0]);
            call.then(function (data) {
                status.className = 'doc-status is-ok';
                status.textContent = 'Actualizado';
                onDone(data.entry);
            }).catch(function (error) {
                status.className = 'doc-status is-error';
                status.textContent = error.message || 'Error';
            });
            input.value = '';
        });

        return { control: label, status: status };
    }

    function imageCard(group, index, entry) {
        var card = el('figure', 'media-item');
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.src = entry.thumb || entry.src;
        img.alt = entry.name || (group + ' ' + (index + 1));
        card.appendChild(img);

        var r = replacer('image', group, index, function (updated) {
            img.src = updated.thumb || updated.src;
        });
        var actions = el('div', 'media-actions');
        actions.appendChild(r.control);
        actions.appendChild(r.status);
        card.appendChild(actions);
        return card;
    }

    function videoCard(group, index, entry) {
        var card = el('figure', 'media-item media-item--video');
        card.appendChild(el('div', 'media-video-icon', '▶'));
        card.appendChild(el('figcaption', 'media-name', (entry.name || 'vídeo') + '.mp4'));
        var r = replacer('video', group, index, function () {});
        var actions = el('div', 'media-actions');
        actions.appendChild(r.control);
        actions.appendChild(r.status);
        card.appendChild(actions);
        return card;
    }

    function renderMedia(data) {
        var root = document.getElementById('media-editor');
        root.innerHTML = '';
        var images = data.images || {};
        var videos = data.videos || {};

        Object.keys(images).forEach(function (group) {
            var block = el('div', 'media-group');
            block.appendChild(el('h4', 'media-group-title', pretty(group)));
            var grid = el('div', 'media-grid');
            images[group].forEach(function (entry, i) {
                grid.appendChild(imageCard(group, i, entry));
            });
            block.appendChild(grid);
            root.appendChild(block);
        });

        if (Object.keys(videos).length) {
            root.appendChild(el('h3', 'media-section-title', 'Vídeos'));
            Object.keys(videos).forEach(function (group) {
                var block = el('div', 'media-group');
                block.appendChild(el('h4', 'media-group-title', pretty(group)));
                var grid = el('div', 'media-grid');
                videos[group].forEach(function (entry, i) {
                    grid.appendChild(videoCard(group, i, entry));
                });
                block.appendChild(grid);
                root.appendChild(block);
            });
        }
    }

    // ---- Init ---------------------------------------------------------------

    document.addEventListener('DOMContentLoaded', function () {
        if (!document.getElementById('content-editor')) return;

        var save = document.getElementById('content-save');
        if (save) save.addEventListener('click', saveContent);

        window.Auth.getContent().then(renderContent).catch(function () {
            document.getElementById('content-editor').innerHTML =
                '<p class="auth-msg is-error">No se pudo cargar el contenido.</p>';
        });

        window.Auth.getMedia().then(renderMedia).catch(function () {
            document.getElementById('media-editor').innerHTML =
                '<p class="auth-msg is-error">No se pudieron cargar las imágenes.</p>';
        });
    });
})();
