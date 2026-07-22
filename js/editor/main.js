(function () {
    'use strict';

    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }

    function pick(id) {
        return document.getElementById(id);
    }

    var store = null;
    var frame = null;
    var frameWin = null;
    var page = 'ilustracion';
    var selected = null;
    var tab = 'add';
    var saveTimer = null;
    var refreshTimer = null;
    var booted = false;

    function media() {
        return store.media();
    }

    function stash() {
        try {
            window.sessionStorage.setItem('ng:draft', JSON.stringify(store.model()));
            window.sessionStorage.setItem('ng:media', JSON.stringify(media()));
        } catch (error) {
            window.NGMedia.toast('El borrador es demasiado grande para la vista previa', true);
        }
    }

    function listInfo(path) {
        var cut = path.lastIndexOf('.');
        var head = path.slice(0, cut);
        var index = parseInt(path.slice(cut + 1), 10);
        if (isNaN(index)) return null;
        return { list: head, index: index };
    }

    // ------------------------------------------------------------ the canvas

    function loadPage(next) {
        page = next;
        selected = null;
        stash();
        frame.src = window.NGSchema.pages[page].file + '?edit=1';
        document.querySelectorAll('[data-page-btn]').forEach(function (button) {
            button.classList.toggle('is-on', button.getAttribute('data-page-btn') === page);
        });
        paintPanels();
    }

    function refreshCanvas() {
        stash();
        if (frameWin && frameWin.NGEdit) {
            frameWin.NGEdit.setModel(store.path.clone(store.model()), store.path.clone(media()));
        }
    }

    function scheduleCanvas() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            refreshCanvas();
            if (selected && frameWin && frameWin.NGEdit) frameWin.NGEdit.select(selected);
        }, 350);
    }

    // ------------------------------------------------------------- the panels

    function paintPanels() {
        document.querySelectorAll('[data-tab-btn]').forEach(function (button) {
            button.classList.toggle('is-on', button.getAttribute('data-tab-btn') === tab);
        });
        var host = pick('panel-body');
        if (tab === 'add') window.NGPanels.palette(host, page, selected);
        else if (tab === 'layers') window.NGPanels.structure(host, page, selected);
        else window.NGInspector.render(host, selected);
    }

    function showTab(name) {
        tab = name;
        paintPanels();
    }

    function setSelected(path, quiet) {
        selected = path;
        if (path && tab !== 'settings') tab = 'settings';
        paintPanels();
        if (!quiet && frameWin && frameWin.NGEdit) frameWin.NGEdit.select(path);
    }

    // -------------------------------------------------------------- mutations

    function move(path, to) {
        var info = listInfo(path);
        if (!info) return;
        store.mutate(function (model) {
            var rows = store.path.get(model, info.list);
            if (!rows || to < 0 || to >= rows.length) return false;
            rows.splice(to, 0, rows.splice(info.index, 1)[0]);
        });
        setSelected(info.list + '.' + to, true);
        refreshCanvas();
        if (frameWin && frameWin.NGEdit) frameWin.NGEdit.select(info.list + '.' + to);
    }

    function duplicate(path) {
        var info = listInfo(path);
        if (!info) return;
        store.mutate(function (model) {
            var rows = store.path.get(model, info.list);
            var copy = store.path.clone(rows[info.index]);
            if (copy.id) copy.id = copy.id + '-copia';
            rows.splice(info.index + 1, 0, copy);
        });
        setSelected(info.list + '.' + (info.index + 1), true);
        refreshCanvas();
    }

    function remove(path) {
        var info = listInfo(path);
        if (!info) return;
        var spec = window.NGSchema.describe(path, store.get(path));
        if (!window.confirm('¿Eliminar «' + (spec ? spec.label : 'este bloque') + '»?')) return;
        store.mutate(function (model) {
            store.path.get(model, info.list).splice(info.index, 1);
        });
        setSelected(null, true);
        refreshCanvas();
    }

    function add(payload) {
        var list = payload.list;
        var spec = window.NGSchema.blocks[payload.kind] || window.NGSchema.singles[payload.kind];
        if (!spec || !spec.create) return;

        var groups = Object.keys(media().images || {});
        var fresh = spec.create(groups[0] || '', media());

        var at = null;
        if (selected && selected.indexOf(list + '.') === 0) {
            var info = listInfo(selected);
            if (info) at = info.index + 1;
        }

        store.mutate(function (model) {
            var rows = store.path.get(model, list) || [];
            store.path.set(model, list, rows);
            if (at == null) at = rows.length;
            rows.splice(at, 0, fresh);
        });
        setSelected(list + '.' + at, true);
        tab = 'settings';
        refreshCanvas();
        paintPanels();
        window.NGMedia.toast('«' + spec.label + '» añadido');
    }

    // ------------------------------------------------------- saving & status

    function status() {
        var badge = pick('save-state');
        if (store.unsaved()) badge.textContent = 'Guardando…';
        else if (store.unpublished()) badge.textContent = 'Borrador guardado, sin publicar';
        else badge.textContent = 'Todo publicado';
        badge.classList.toggle('is-pending', store.unpublished());

        pick('undo').disabled = !store.canUndo();
        pick('redo').disabled = !store.canRedo();
        pick('publish').disabled = !store.unpublished();
        pick('discard').disabled = !store.unpublished();
    }

    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
            window.Auth.putDraft(store.model()).then(function () {
                store.markSaved();
                status();
            }).catch(function (error) {
                window.NGMedia.toast(error.message || 'No se pudo guardar el borrador', true);
            });
        }, 900);
    }

    function publish() {
        if (!window.confirm('¿Publicar los cambios? La web pública se actualizará ahora mismo.')) return;
        pick('publish').disabled = true;
        window.Auth.putDraft(store.model())
            .then(function () {
                return window.Auth.publish();
            })
            .then(function () {
                store.markPublished();
                status();
                window.NGMedia.toast('Cambios publicados');
            })
            .catch(function (error) {
                window.NGMedia.toast(error.message || 'No se pudo publicar', true);
                status();
            });
    }

    function discard() {
        if (!window.confirm('¿Descartar todos los cambios del borrador y volver a lo publicado?')) return;
        window.Auth.discardDraft().then(function (data) {
            store.replace(data.draft);
            store.markPublished();
            selected = null;
            refreshCanvas();
            paintPanels();
            status();
            window.NGMedia.toast('Borrador descartado');
        }).catch(function (error) {
            window.NGMedia.toast(error.message || 'No se pudo descartar', true);
        });
    }

    function history() {
        window.Auth.getState().then(function (data) {
            var overlay = el('div', 'ng-modal');
            var panel = el('div', 'ng-modal-panel ng-modal-panel--slim');
            var head = el('header', 'ng-modal-head');
            head.appendChild(el('h2', null, 'Versiones anteriores'));
            var shut = el('button', 'ng-icon-btn', '<i class="bi bi-x-lg"></i>');
            shut.type = 'button';
            shut.addEventListener('click', function () {
                overlay.remove();
            });
            head.appendChild(shut);
            panel.appendChild(head);

            var body = el('div', 'ng-modal-body ng-modal-body--plain');
            if (!data.revisions.length) {
                body.appendChild(el('p', 'ng-empty', 'Todavía no hay versiones guardadas.'));
            }
            data.revisions.forEach(function (item) {
                var row = el('div', 'ng-revision');
                var when = new Date(item.saved);
                row.appendChild(el('span', null, when.toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'long', year: 'numeric'
                }) + ' · ' + when.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })));
                var use = el('button', 'ng-btn ng-btn--ghost', 'Recuperar');
                use.type = 'button';
                use.addEventListener('click', function () {
                    if (!window.confirm('Se cargará esa versión en el borrador. Podrás revisarla antes de publicar.')) return;
                    window.Auth.restoreRevision(item.name).then(function (answer) {
                        store.replace(answer.draft);
                        selected = null;
                        overlay.remove();
                        refreshCanvas();
                        paintPanels();
                        status();
                        window.NGMedia.toast('Versión cargada en el borrador');
                    }).catch(function (error) {
                        window.NGMedia.toast(error.message || 'No se pudo recuperar', true);
                    });
                });
                row.appendChild(use);
                body.appendChild(row);
            });
            panel.appendChild(body);
            overlay.appendChild(panel);
            overlay.addEventListener('mousedown', function (event) {
                if (event.target === overlay) overlay.remove();
            });
            document.body.appendChild(overlay);
        });
    }

    // ------------------------------------------------------- bridge & wiring

    window.NGEditor = {
        ready: function (win) {
            frameWin = win;
            if (selected && win.NGEdit) win.NGEdit.select(selected);
        },
        select: function (path) {
            setSelected(path, true);
        },
        inlineEdit: function (path, field, text) {
            var current = store.get(path + '.' + field);
            if (current === text) return;
            store.setField(path + '.' + field, text, { quiet: true });
            if (tab === 'settings') paintPanels();
        },
        addBelow: function (path) {
            setSelected(path, true);
            tab = 'add';
            paintPanels();
        },
        move: move,
        nudge: function (path, delta) {
            var info = listInfo(path);
            if (info) move(path, info.index + delta);
        },
        duplicate: duplicate,
        remove: remove
    };

    function devices() {
        document.querySelectorAll('[data-device]').forEach(function (button) {
            button.addEventListener('click', function () {
                var width = button.getAttribute('data-device');
                document.querySelectorAll('[data-device]').forEach(function (other) {
                    other.classList.toggle('is-on', other === button);
                });
                var stage = pick('stage');
                stage.style.maxWidth = width === 'full' ? '' : width + 'px';
            });
        });
    }

    function shortcuts() {
        document.addEventListener('keydown', function (event) {
            var meta = event.metaKey || event.ctrlKey;
            if (!meta) return;
            if (event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                if (store.undo()) {
                    refreshCanvas();
                    paintPanels();
                }
            } else if ((event.key === 'z' && event.shiftKey) || event.key === 'y') {
                event.preventDefault();
                if (store.redo()) {
                    refreshCanvas();
                    paintPanels();
                }
            } else if (event.key === 's') {
                event.preventDefault();
                scheduleSave();
            }
        });
    }

    function boot(state) {
        store = window.NGStore;
        store.init(state);

        store.listen(function (reason, detail) {
            if (reason === 'change') {
                status();
                scheduleSave();
                if (!detail.quiet) scheduleCanvas();
                if (tab === 'layers') paintPanels();
            }
            if (reason === 'media' || reason === 'published' || reason === 'saved') status();
        });

        window.NGInspector.on('onEdit', function (path, options) {
            if (options && options.live) scheduleCanvas();
            else {
                refreshCanvas();
                if (frameWin && frameWin.NGEdit) frameWin.NGEdit.select(selected);
                paintPanels();
            }
        });

        window.NGPanels.on('onSelect', function (path) {
            setSelected(path);
        });
        window.NGPanels.on('onHover', function (path) {
            if (frameWin && frameWin.NGEdit) frameWin.NGEdit.highlight(path);
        });
        window.NGPanels.on('onReorder', function (list, from, to) {
            move(list + '.' + from, to);
        });
        window.NGPanels.on('onAdd', add);
        window.NGPanels.on('isVisible', function (path) {
            if (!frameWin || !frameWin.document) return true;
            return !!frameWin.document.querySelector('[data-ng-path="' + path + '"]');
        });

        frame = pick('canvas');
        frame.addEventListener('load', function () {
            frameWin = frame.contentWindow;
        });

        pick('undo').addEventListener('click', function () {
            if (store.undo()) {
                refreshCanvas();
                paintPanels();
            }
        });
        pick('redo').addEventListener('click', function () {
            if (store.redo()) {
                refreshCanvas();
                paintPanels();
            }
        });
        pick('publish').addEventListener('click', publish);
        pick('discard').addEventListener('click', discard);
        pick('history').addEventListener('click', history);
        pick('docs').addEventListener('click', window.NGSettings.openDocuments);
        pick('account').addEventListener('click', window.NGSettings.openAccount);
        pick('preview').addEventListener('click', function () {
            stash();
            try {
                window.localStorage.setItem('ng:preview', JSON.stringify(store.model()));
                window.localStorage.setItem('ng:preview-media', JSON.stringify(media()));
            } catch (error) {
                window.NGMedia.toast('No se pudo preparar la vista previa', true);
                return;
            }
            window.open(window.NGSchema.pages[page].file + '?preview=1', '_blank', 'noopener');
        });
        pick('library').addEventListener('click', function () {
            window.NGMedia.open({
                kind: 'images', mode: 'group',
                title: 'Biblioteca de medios',
                cta: 'Cerrar',
                hint: 'Sube, ordena y elimina archivos. Los cambios en la biblioteca se aplican al momento.',
                onPick: function () { },
                onChange: refreshCanvas
            });
        });

        document.querySelectorAll('[data-page-btn]').forEach(function (button) {
            button.addEventListener('click', function () {
                loadPage(button.getAttribute('data-page-btn'));
            });
        });
        document.querySelectorAll('[data-tab-btn]').forEach(function (button) {
            button.addEventListener('click', function () {
                showTab(button.getAttribute('data-tab-btn'));
            });
        });

        devices();
        shortcuts();

        window.addEventListener('beforeunload', function (event) {
            if (store.unsaved()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        booted = true;
        var wanted = (window.location.search.match(/[?&]p=([a-z]+)/) || [])[1];
        loadPage(window.NGSchema.pages[wanted] ? wanted : 'ilustracion');
        status();
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!pick('editor')) return;
        window.Auth.require().then(function (session) {
            if (!session) return;
            pick('who').textContent = session.username;
            window.NGSettings.load();
            return window.Auth.getState().then(boot);
        }).catch(function (error) {
            pick('panel-body').innerHTML =
                '<p class="ng-empty">No se pudo cargar el editor: ' + (error.message || 'sin conexión') + '</p>';
        });
    });

    window.NGEditorApp = {
        booted: function () {
            return booted;
        },
        reload: function () {
            return window.Auth.getState().then(function (state) {
                store.init(state);
                refreshCanvas();
                paintPanels();
                status();
            });
        }
    };
})();
