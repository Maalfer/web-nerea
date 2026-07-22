(function () {
    'use strict';

    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }

    var overlay = null;
    var session = null;

    function media() {
        return window.NGStore.media();
    }

    function bucket(kind) {
        return media()[kind] || {};
    }

    function groupNames(kind) {
        return Object.keys(bucket(kind)).sort();
    }

    function entries(kind, group) {
        return bucket(kind)[group] || [];
    }

    function prettyGroup(name) {
        return name.replace(/[/-]/g, ' › ').replace(/\b\w/g, function (c) {
            return c.toUpperCase();
        });
    }

    function close() {
        if (overlay) overlay.remove();
        overlay = null;
        session = null;
        document.removeEventListener('keydown', onKey);
    }

    function onKey(event) {
        if (event.key === 'Escape') close();
    }

    function toast(message, bad) {
        var note = el('div', 'ng-toast' + (bad ? ' is-bad' : ''), message);
        document.body.appendChild(note);
        setTimeout(function () {
            note.classList.add('is-out');
            setTimeout(function () {
                note.remove();
            }, 400);
        }, 2600);
    }

    function refreshState() {
        return window.Auth.getState().then(function (data) {
            window.NGStore.setMedia(data.media);
        });
    }

    function thumbFor(entry) {
        return entry.thumb || entry.poster || entry.src || '';
    }

    // ------------------------------------------------------------ the modal

    function build() {
        overlay = el('div', 'ng-modal');
        var panel = el('div', 'ng-modal-panel');

        var head = el('header', 'ng-modal-head');
        head.appendChild(el('h2', null, session.title || 'Biblioteca de medios'));
        var shut = el('button', 'ng-icon-btn', '<i class="bi bi-x-lg"></i>');
        shut.type = 'button';
        shut.title = 'Cerrar';
        shut.addEventListener('click', close);
        head.appendChild(shut);
        panel.appendChild(head);

        var body = el('div', 'ng-modal-body');
        var aside = el('aside', 'ng-modal-groups');
        var main = el('div', 'ng-modal-main');
        body.appendChild(aside);
        body.appendChild(main);
        panel.appendChild(body);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        overlay.addEventListener('mousedown', function (event) {
            if (event.target === overlay) close();
        });
        document.addEventListener('keydown', onKey);

        renderGroups(aside, main);
        renderItems(main);
    }

    function renderGroups(aside, main) {
        aside.innerHTML = '';
        var kind = session.kind;

        var add = el('button', 'ng-new-group', '<i class="bi bi-plus-lg"></i> Álbum nuevo');
        add.type = 'button';
        add.addEventListener('click', function () {
            var name = window.prompt('Nombre del álbum nuevo (por ejemplo: teatro/otelo)');
            if (!name) return;
            var clean = name.trim().toLowerCase().replace(/[^a-z0-9/]+/g, '-').replace(/^-|-$/g, '');
            window.Auth.createGroup(kind, clean).then(function () {
                return refreshState();
            }).then(function () {
                session.group = clean;
                renderGroups(aside, main);
                renderItems(main);
            }).catch(function (error) {
                toast(error.message || 'No se pudo crear el álbum', true);
            });
        });
        aside.appendChild(add);

        var list = el('div', 'ng-group-list');
        groupNames(kind).forEach(function (name) {
            var count = entries(kind, name).length;
            var row = el('button', 'ng-group' + (name === session.group ? ' is-on' : ''));
            row.type = 'button';
            row.innerHTML = '<span>' + prettyGroup(name) + '</span><em>' + count + '</em>';
            row.addEventListener('click', function () {
                session.group = name;
                if (session.mode === 'group') session.items = null;
                renderGroups(aside, main);
                renderItems(main);
            });
            list.appendChild(row);
        });
        aside.appendChild(list);
    }

    function renderItems(main) {
        main.innerHTML = '';
        var kind = session.kind;
        var group = session.group;

        if (!group) {
            main.appendChild(el('p', 'ng-empty', 'Elige un álbum de la izquierda.'));
            return;
        }

        var bar = el('div', 'ng-modal-bar');
        bar.appendChild(el('div', 'ng-modal-title', prettyGroup(group)));

        var upload = el('label', 'ng-btn ng-btn--gold');
        upload.innerHTML = '<i class="bi bi-upload"></i> ' +
            (kind === 'videos' ? 'Subir vídeo' : 'Subir imágenes');
        var input = el('input');
        input.type = 'file';
        input.hidden = true;
        input.multiple = kind !== 'videos';
        input.accept = kind === 'videos' ? 'video/mp4,video/quicktime,video/*' : 'image/*';
        upload.appendChild(input);
        bar.appendChild(upload);
        main.appendChild(bar);

        var progress = el('p', 'ng-progress');
        progress.hidden = true;
        main.appendChild(progress);

        input.addEventListener('change', function () {
            var files = Array.prototype.slice.call(input.files);
            input.value = '';
            if (!files.length) return;
            progress.hidden = false;

            var done = 0;
            function step() {
                if (!files.length) {
                    progress.hidden = true;
                    return refreshState().then(function () {
                        renderItems(main);
                        if (session.onChange) session.onChange();
                    });
                }
                var file = files.shift();
                progress.textContent = 'Subiendo ' + file.name + ' (' + (done + 1) + ' de ' +
                    (done + 1 + files.length) + ')…';
                var send = kind === 'videos' ? window.Auth.addVideo : window.Auth.addImage;
                return send(group, file).then(function () {
                    done += 1;
                    return step();
                }).catch(function (error) {
                    progress.hidden = true;
                    toast(error.message || 'No se pudo subir ' + file.name, true);
                    return refreshState().then(function () {
                        renderItems(main);
                    });
                });
            }
            step();
        });

        var items = entries(kind, group);
        if (!items.length) {
            main.appendChild(el('p', 'ng-empty', 'Este álbum está vacío. Sube el primer archivo.'));
        }

        var grid = el('div', 'ng-media-grid');
        items.forEach(function (entry, index) {
            grid.appendChild(mediaCard(entry, index, main));
        });
        main.appendChild(grid);

        var foot = el('div', 'ng-modal-foot');
        var hint = el('p', 'ng-hint', session.hint || '');
        foot.appendChild(hint);

        var accept = el('button', 'ng-btn ng-btn--gold', session.cta || 'Usar este álbum');
        accept.type = 'button';
        accept.addEventListener('click', commit);
        foot.appendChild(accept);
        main.appendChild(foot);
    }

    function mediaCard(entry, index, main) {
        var kind = session.kind;
        var card = el('figure', 'ng-media-card');
        card.setAttribute('data-index', index);

        var picked = session.mode === 'items'
            ? (session.items || []).indexOf(index) !== -1
            : session.mode === 'index' && session.value === index;
        if (picked) card.classList.add('is-picked');

        var shot = el('img');
        shot.src = thumbFor(entry);
        shot.alt = entry.name || '';
        shot.loading = 'lazy';
        card.appendChild(shot);

        if (session.mode === 'items') {
            var order = (session.items || []).indexOf(index);
            if (order !== -1) card.appendChild(el('span', 'ng-media-order', String(order + 1)));
        }

        var tools = el('div', 'ng-media-tools');
        var left = el('button', 'ng-icon-btn', '<i class="bi bi-chevron-left"></i>');
        left.type = 'button';
        left.title = 'Mover antes';
        left.addEventListener('click', function (event) {
            event.stopPropagation();
            shift(index, -1, main);
        });
        var right = el('button', 'ng-icon-btn', '<i class="bi bi-chevron-right"></i>');
        right.type = 'button';
        right.title = 'Mover después';
        right.addEventListener('click', function (event) {
            event.stopPropagation();
            shift(index, 1, main);
        });
        var drop = el('button', 'ng-icon-btn ng-danger', '<i class="bi bi-trash"></i>');
        drop.type = 'button';
        drop.title = 'Eliminar';
        drop.addEventListener('click', function (event) {
            event.stopPropagation();
            if (!window.confirm('¿Eliminar este archivo? Se moverá a la papelera del servidor.')) return;
            window.Auth.deleteMedia(kind, session.group, index).then(function () {
                return window.Auth.getState();
            }).then(function (data) {
                window.NGStore.setMedia(data.media);
                window.NGStore.replace(data.draft);
                renderItems(main);
                if (session.onChange) session.onChange();
            }).catch(function (error) {
                toast(error.message || 'No se pudo eliminar', true);
            });
        });
        tools.appendChild(left);
        tools.appendChild(right);
        tools.appendChild(drop);
        card.appendChild(tools);

        card.appendChild(el('figcaption', null, entry.name || ('Archivo ' + (index + 1))));

        card.addEventListener('click', function () {
            if (session.mode === 'index') {
                session.value = index;
            } else if (session.mode === 'items') {
                session.items = session.items || [];
                var at = session.items.indexOf(index);
                if (at === -1) session.items.push(index);
                else session.items.splice(at, 1);
            } else {
                return;
            }
            renderItems(main);
        });

        return card;
    }

    function shift(index, delta, main) {
        var kind = session.kind;
        var items = entries(kind, session.group);
        var to = index + delta;
        if (to < 0 || to >= items.length) return;

        var order = items.map(function (unused, n) {
            return n;
        });
        order.splice(to, 0, order.splice(index, 1)[0]);

        window.Auth.reorderMedia(kind, session.group, order).then(function () {
            return window.Auth.getState();
        }).then(function (data) {
            window.NGStore.setMedia(data.media);
            window.NGStore.replace(data.draft);
            renderItems(main);
            if (session.onChange) session.onChange();
        }).catch(function (error) {
            toast(error.message || 'No se pudo reordenar', true);
        });
    }

    function commit() {
        var pick = session.onPick;
        var answer;
        if (session.mode === 'index') answer = { group: session.group, index: session.value || 0 };
        else if (session.mode === 'items') answer = { group: session.group, items: (session.items || []).slice() };
        else answer = { group: session.group };
        close();
        if (pick) pick(answer);
    }

    window.NGMedia = {
        open: function (options) {
            close();
            session = {
                kind: options.kind || 'images',
                mode: options.mode || 'group',
                group: options.group || null,
                value: options.value,
                items: options.items ? options.items.slice() : [],
                title: options.title,
                hint: options.hint,
                cta: options.cta,
                onPick: options.onPick,
                onChange: options.onChange
            };
            if (!session.group) session.group = groupNames(session.kind)[0] || null;
            build();
        },
        close: close,
        toast: toast,
        prettyGroup: prettyGroup
    };
})();
