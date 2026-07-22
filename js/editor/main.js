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
    var settingsMode = 'content';
    var saveTimer = null;
    var refreshTimer = null;
    var booted = false;
    var version = null;
    var watchTimer = null;
    var conflicted = false;

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

    /** Draws one tab per page, plus the button that creates a new one. */
    function paintTabs() {
        var bar = document.querySelector('.ng-pages');
        if (!bar) return;
        bar.innerHTML = '';

        Object.keys(window.NGSchema.pages).forEach(function (slug) {
            var meta = window.NGSchema.pages[slug];
            var button = el('button', slug === page ? 'is-on' : '', meta.label);
            button.type = 'button';
            button.setAttribute('data-page-btn', slug);
            button.setAttribute('aria-current', slug === page ? 'page' : 'false');
            button.addEventListener('click', function () {
                loadPage(slug);
            });
            bar.appendChild(button);
        });

        var add = el('button', 'ng-page-add', '<i class="bi bi-plus-lg"></i>');
        add.type = 'button';
        add.title = 'Crear una página nueva';
        add.setAttribute('aria-label', 'Crear una página nueva');
        add.addEventListener('click', newPage);
        bar.appendChild(add);
    }

    function newPage() {
        window.NGSettings.openNewPage(function (form) {
            return window.Auth.createPage(form.slug, form.title, form.subtitle, form.menu)
                .then(function (answer) {
                    version = answer.version || version;
                    store.init({
                        draft: answer.draft,
                        published: answer.published,
                        media: store.media()
                    });
                    window.NGSchema.refresh(store.model());
                    loadPage(answer.slug);
                    window.NGMedia.toast('Página «' + form.title + '» creada');
                });
        });
    }

    function removePage(slug) {
        var meta = window.NGSchema.pages[slug];
        if (!meta || meta.builtin) return;
        if (!window.confirm('¿Eliminar la página «' + meta.label + '» y todo su contenido?\n' +
            'Se quitará también del menú. Esta acción se aplica al momento.')) return;

        window.Auth.deletePage(slug).then(function (answer) {
            version = answer.version || version;
            store.init({ draft: answer.draft, published: answer.published, media: store.media() });
            window.NGSchema.refresh(store.model());
            loadPage('home');
            window.NGMedia.toast('Página eliminada');
        }).catch(function (error) {
            window.NGMedia.toast(error.message || 'No se pudo eliminar', true);
        });
    }

    function loadPage(next) {
        if (!window.NGSchema.pages[next]) next = 'home';
        page = next;
        selected = null;
        stash();
        frame.src = window.NGSchema.pages[page].file + '?edit=1';
        paintTabs();
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
            var on = button.getAttribute('data-tab-btn') === tab;
            button.classList.toggle('is-on', on);
            button.setAttribute('aria-selected', on ? 'true' : 'false');
            button.tabIndex = on ? 0 : -1;
        });
        pick('panel-body').setAttribute('aria-labelledby', 'tab-' + tab);
        var host = pick('panel-body');

        if (tab === 'add') return window.NGPanels.palette(host, page, selected);
        if (tab === 'layers') return window.NGPanels.structure(host, page, selected);

        host.innerHTML = '';
        var bar = el('div', 'ng-subtabs');
        [['content', 'Contenido', 'bi-pencil'], ['style', 'Estilo', 'bi-brush']].forEach(function (entry) {
            var button = el('button', settingsMode === entry[0] ? 'is-on' : '',
                '<i class="bi ' + entry[2] + '"></i> ' + entry[1]);
            button.type = 'button';
            button.addEventListener('click', function () {
                settingsMode = entry[0];
                paintPanels();
            });
            bar.appendChild(button);
        });
        host.appendChild(bar);

        var body = el('div', 'ng-subpanel');
        host.appendChild(body);
        if (settingsMode === 'style') window.NGStyle.render(body, selected);
        else window.NGInspector.render(body, selected);
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

    /** Moves a block to any list: another column, or back out to the page. */
    function relocate(fromPath, toList, toIndex) {
        var info = listInfo(fromPath);
        if (!info || !toList) return;

        var at = toIndex;
        if (info.list === toList) {
            if (at != null && at > info.index) at -= 1;
            if (at === info.index) return;
        }

        var landed = at;
        var done = store.mutate(function (model) {
            var from = store.path.get(model, info.list);
            if (!from || !from.length) return false;

            var to = store.path.get(model, toList);
            if (!to) {
                store.path.set(model, toList, []);
                to = store.path.get(model, toList);
            }
            if (!Array.isArray(to)) return false;

            var moved = from.splice(info.index, 1)[0];
            if (moved === undefined) return false;
            if (landed == null || landed > to.length) landed = to.length;
            to.splice(landed, 0, moved);
        });
        if (!done) return;

        var landedPath = toList + '.' + landed;
        setSelected(landedPath, true);
        refreshCanvas();
        if (frameWin && frameWin.NGEdit) frameWin.NGEdit.select(landedPath);
        paintPanels();
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

    /** Puts a fresh block into any list, including the inside of a column. */
    function insert(payload, list, index) {
        var spec = window.NGSchema.blocks[payload.kind] || window.NGSchema.singles[payload.kind];
        if (!spec || !spec.create || !list) return;
        if (payload.kind === 'row' && /\.columns\./.test(list)) {
            return window.NGMedia.toast('No se pueden anidar filas dentro de otra fila', true);
        }

        var groups = Object.keys(media().images || {});
        var fresh = spec.create(groups[0] || '', media());
        var at = index;

        store.mutate(function (model) {
            var rows = store.path.get(model, list) || [];
            store.path.set(model, list, rows);
            if (at == null || at > rows.length) at = rows.length;
            rows.splice(at, 0, fresh);
        });
        setSelected(list + '.' + at, true);
        tab = 'settings';
        settingsMode = 'content';
        refreshCanvas();
        paintPanels();
        window.NGMedia.toast('«' + spec.label + '» añadido');
    }

    function add(payload) {
        var list = payload.list;
        var at = null;

        if (selected) {
            var info = listInfo(selected);
            if (info && (info.list === list || /\.columns\.\d+$/.test(info.list))) {
                list = info.list;
                at = info.index + 1;
            }
        }
        insert(payload, list, at);
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
        if (conflicted) return;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
            window.Auth.putDraft(store.model(), version).then(function (answer) {
                version = answer.version || version;
                store.markSaved();
                status();
            }).catch(function (error) {
                if (error.status === 409) return conflict();
                window.NGMedia.toast(error.message || 'No se pudo guardar el borrador', true);
            });
        }, 900);
    }

    /** Another tab or device saved the draft while this one was editing. */
    function conflict() {
        if (conflicted) return;
        conflicted = true;
        clearTimeout(watchTimer);
        pick('save-state').textContent = 'Conflicto con otra sesión';

        window.NGSettings.openConflict({
            onReload: function () {
                return window.Auth.getState().then(function (state) {
                    store.init(state);
                    version = state.version;
                    conflicted = false;
                    window.NGSchema.refresh(store.model());
                    selected = null;
                    loadPage(page);
                    status();
                    watch();
                    window.NGMedia.toast('Cargados los cambios de la otra sesión');
                });
            },
            onOverwrite: function () {
                return window.Auth.putDraft(store.model()).then(function (answer) {
                    version = answer.version || version;
                    conflicted = false;
                    store.markSaved();
                    status();
                    watch();
                    window.NGMedia.toast('Tus cambios se han guardado encima');
                });
            }
        });
    }

    /** Notices changes made elsewhere even while this tab sits idle. */
    function watch() {
        clearTimeout(watchTimer);
        watchTimer = setTimeout(function () {
            if (conflicted) return;
            window.Auth.draftVersion().then(function (answer) {
                if (version && answer.version && answer.version !== version) {
                    if (store.unsaved()) return conflict();
                    return window.Auth.getState().then(function (state) {
                        store.init(state);
                        version = state.version;
                        window.NGSchema.refresh(store.model());
                        loadPage(page);
                        status();
                        window.NGMedia.toast('Se han cargado cambios hechos en otra sesión');
                    });
                }
            }).catch(function () { }).then(watch);
        }, 25000);
    }

    var AREA_LABELS = {
        site: 'Datos de contacto',
        header: 'Cabecera y menú',
        footer: 'Pie de página',
        home: 'Textos de portada',
        about: 'Sobre mí',
        gates: 'Accesos de portada',
        downloads: 'Tarjetas de descarga',
        references: 'Referencias'
    };

    /** Works out which parts of the site the draft changes. */
    function changedAreas() {
        var draft = store.model();
        var live = store.published() || {};
        var areas = [];

        function differs(a, b) {
            return JSON.stringify(a) !== JSON.stringify(b);
        }

        Object.keys(AREA_LABELS).forEach(function (key) {
            if (differs(draft[key], live[key])) {
                areas.push({ area: key, label: AREA_LABELS[key] });
            }
        });

        var slugs = {};
        Object.keys(draft.pages || {}).forEach(function (slug) {
            slugs[slug] = true;
        });
        Object.keys(live.pages || {}).forEach(function (slug) {
            slugs[slug] = true;
        });
        Object.keys(slugs).forEach(function (slug) {
            if (!differs((draft.pages || {})[slug], (live.pages || {})[slug])) return;
            var meta = window.NGSchema.pages[slug];
            areas.push({ area: 'pages.' + slug, label: 'Página: ' + (meta ? meta.label : slug) });
        });
        return areas;
    }

    function publish() {
        var areas = changedAreas();
        if (!areas.length) return window.NGMedia.toast('No hay nada nuevo que publicar');

        window.NGSettings.openPublish(areas, function (chosen, label) {
            pick('publish').disabled = true;
            return window.Auth.putDraft(store.model(), version)
                .then(function (answer) {
                    version = answer.version || version;
                    store.markSaved();
                    return window.Auth.publish(chosen.length === areas.length ? null : chosen);
                })
                .then(function (answer) {
                    if (answer.published) store.setPublished(answer.published);
                    else store.markPublished();
                    version = answer.version || version;
                    status();
                    window.NGMedia.toast('Cambios publicados');
                    var last = (answer.revisions || [])[0];
                    if (label && last) window.Auth.labelRevision(last.name, label);
                })
                .catch(function (error) {
                    if (error.status === 409) conflict();
                    else window.NGMedia.toast(error.message || 'No se pudo publicar', true);
                    status();
                    throw error;
                });
        });
    }

    function discard() {
        if (!window.confirm('¿Descartar todos los cambios del borrador y volver a lo publicado?')) return;
        window.Auth.discardDraft().then(function (data) {
            version = data.version || version;
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
                var info = el('div', 'ng-doc-info');
                if (item.label) info.appendChild(el('strong', null, item.label));
                info.appendChild(el('span', null, when.toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'long', year: 'numeric'
                }) + ' · ' + when.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })));
                row.appendChild(info);
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
        dropWidget: function (payload, list, index) {
            insert(payload, list, index);
        },

        addBelow: function (path) {
            setSelected(path, true);
            tab = 'add';
            paintPanels();
        },
        move: move,
        relocate: relocate,
        nudge: function (path, delta) {
            var info = listInfo(path);
            if (info) move(path, info.index + delta);
        },
        duplicate: duplicate,
        remove: remove
    };

    var DEVICE_WIDTH = { base: 'full', tablet: '900', mobile: '420' };

    function showDevice(width) {
        document.querySelectorAll('[data-device]').forEach(function (other) {
            var on = other.getAttribute('data-device') === width;
            other.classList.toggle('is-on', on);
            other.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        pick('stage').style.maxWidth = width === 'full' ? '' : width + 'px';
    }

    function devices() {
        document.querySelectorAll('[data-device]').forEach(function (button) {
            button.addEventListener('click', function () {
                var width = button.getAttribute('data-device');
                showDevice(width);
                var key = Object.keys(DEVICE_WIDTH).filter(function (name) {
                    return DEVICE_WIDTH[name] === width;
                })[0];
                if (key) {
                    window.NGStyle.setDevice(key);
                    if (tab === 'settings' && settingsMode === 'style') paintPanels();
                }
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
        window.NGSchema.refresh(store.model());

        store.listen(function (reason, detail) {
            if (reason === 'change') {
                window.NGSchema.refresh(store.model());
                paintTabs();
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
        window.NGPanels.on('onRelocate', relocate);
        window.NGPanels.on('onAdd', add);
        window.NGStyle.on('onEdit', function (path, options) {
            if (options && options.live) scheduleCanvas();
            else {
                refreshCanvas();
                if (frameWin && frameWin.NGEdit) frameWin.NGEdit.select(selected);
            }
        });
        window.NGStyle.on('onDevice', function (key) {
            showDevice(DEVICE_WIDTH[key] || 'full');
        });
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
        pick('help').addEventListener('click', window.NGSettings.openHelp);
        pick('trash').addEventListener('click', function () {
            window.NGSettings.openTrash(function () {
                return window.Auth.getState().then(function (state) {
                    store.init(state);
                    version = state.version;
                    window.NGSchema.refresh(store.model());
                    loadPage(page);
                    status();
                });
            });
        });
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

        document.querySelectorAll('[data-tab-btn]').forEach(function (button) {
            button.addEventListener('click', function () {
                showTab(button.getAttribute('data-tab-btn'));
            });
        });

        devices();
        shortcuts();

        var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab-btn]'));
        tabs.forEach(function (button, index) {
            button.addEventListener('keydown', function (event) {
                var step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                var next = tabs[(index + step + tabs.length) % tabs.length];
                next.focus();
                showTab(next.getAttribute('data-tab-btn'));
            });
        });

        window.addEventListener('beforeunload', function (event) {
            if (store.unsaved()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        booted = true;
        version = state.version || null;
        watch();
        var wanted = (window.location.search.match(/[?&]p=([a-z0-9-]+)/) || [])[1];
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
        removePage: removePage,
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
