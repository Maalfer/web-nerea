(function () {
    'use strict';

    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }

    function store() {
        return window.NGStore;
    }

    var handlers = {
        onSelect: function () { },
        onHover: function () { },
        onReorder: function () { },
        onRelocate: function () { },
        onAdd: function () { },
        isVisible: function () {
            return true;
        }
    };

    /** Shared across every list so a block can be dragged from one column to another. */
    var dragState = null;

    function clearMarks() {
        document.querySelectorAll('.ng-layer, .ng-subtree-head').forEach(function (node) {
            node.classList.remove('is-dragging', 'is-over', 'is-under', 'is-target');
        });
    }

    function canDrop(listPath) {
        if (!dragState) return false;
        if (dragState.type === 'row' && listPath.indexOf('.columns.') !== -1) return false;
        return listPath.indexOf(dragState.path + '.') !== 0;
    }

    var HOME_LISTS = [
        { path: 'gates', label: 'Accesos de portada' },
        { path: 'downloads', label: 'Tarjetas de descarga' },
        { path: 'references', label: 'Referencias' }
    ];

    function titleOf(value, spec) {
        var text = value && (value.title || value.name || value.label || value.eyebrow);
        if (!text && value && value.group) text = window.NGMedia.prettyGroup(value.group);
        if (!text) text = spec ? spec.label : 'Bloque';
        return String(text).slice(0, 46);
    }

    function listsFor(page) {
        var meta = window.NGSchema.pages[page];
        if (meta.list) return [{ path: meta.list, label: null }];
        return HOME_LISTS;
    }

    // ------------------------------------------------------------ structure

    function rowFor(listPath, value, index, selected, depth) {
        var path = listPath + '.' + index;
        var spec = window.NGSchema.describe(path, value);
        var row = el('div', 'ng-layer' + (path === selected ? ' is-on' : '') +
            (value && value.type === 'section' ? ' is-head' : '') +
            (depth ? ' is-nested' : ''));
        row.draggable = true;
        row.setAttribute('data-index', index);
        row.innerHTML = '<i class="bi ' + (spec ? spec.icon : 'bi-square') + '"></i>' +
            '<span>' + titleOf(value, spec) + '</span>' +
            '<em>' + (spec ? spec.label : '') + '</em>';

        if (!handlers.isVisible(path)) {
            row.classList.add('is-hidden');
            row.title = 'Este bloque no se ve en la página: le falta contenido (por ejemplo, un álbum con fotos).';
            row.querySelector('em').textContent = 'sin contenido';
        }

        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.addEventListener('click', function () {
            handlers.onSelect(path);
        });
        row.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handlers.onSelect(path);
            }
        });
        row.addEventListener('mouseenter', function () {
            handlers.onHover(path);
        });
        row.addEventListener('mouseleave', function () {
            handlers.onHover(null);
        });
        return row;
    }

    function columnTree(rowPath, value, selected) {
        var wrap = el('div', 'ng-subtree');
        var count = value.cols === 3 ? 3 : 2;

        for (var column = 0; column < count; column++) {
            var listPath = rowPath + '.columns.' + column;
            var children = (value.columns && value.columns[column]) || [];
            var head = el('div', 'ng-subtree-head', 'Columna ' + (column + 1) +
                (children.length ? '' : ' · vacía'));

            (function (target, total) {
                head.addEventListener('dragover', function (event) {
                    if (!canDrop(target)) return;
                    event.preventDefault();
                    head.classList.add('is-target');
                });
                head.addEventListener('dragleave', function () {
                    head.classList.remove('is-target');
                });
                head.addEventListener('drop', function (event) {
                    event.preventDefault();
                    head.classList.remove('is-target');
                    if (!canDrop(target)) return;
                    handlers.onRelocate(dragState.path, target, total);
                    dragState = null;
                });
            })(listPath, children.length);

            wrap.appendChild(head);

            if (!children.length) continue;
            var box = el('div', 'ng-layers');
            children.forEach(function (child, index) {
                box.appendChild(rowFor(listPath, child, index, selected, 1));
            });
            wrap.appendChild(box);
            sortable(children, listPath, box);
        }
        return wrap;
    }

    function sortable(list, listPath, host) {
        host.querySelectorAll(':scope > .ng-layer').forEach(function (row) {
            var index = parseInt(row.getAttribute('data-index'), 10);

            row.addEventListener('dragstart', function (event) {
                var value = list[index] || {};
                dragState = { list: listPath, index: index, type: value.type, path: listPath + '.' + index };
                row.classList.add('is-dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', dragState.path);
            });
            row.addEventListener('dragend', function () {
                dragState = null;
                clearMarks();
            });
            row.addEventListener('dragover', function (event) {
                if (!canDrop(listPath)) return;
                event.preventDefault();
                if (dragState.list === listPath && dragState.index === index) return;
                var arriba = dragState.list !== listPath || index < dragState.index;
                row.classList.toggle('is-over', arriba);
                row.classList.toggle('is-under', !arriba);
            });
            row.addEventListener('dragleave', function () {
                row.classList.remove('is-over', 'is-under');
            });
            row.addEventListener('drop', function (event) {
                event.preventDefault();
                row.classList.remove('is-over', 'is-under');
                if (!canDrop(listPath)) return;
                if (dragState.list === listPath) {
                    if (dragState.index === index) return;
                    handlers.onReorder(listPath, dragState.index, index);
                } else {
                    handlers.onRelocate(dragState.path, listPath, index);
                }
                dragState = null;
            });
        });
    }

    function structure(host, page, selected) {
        host.innerHTML = '';

        listsFor(page).forEach(function (entry) {
            var rows = store().get(entry.path) || [];
            if (entry.label) {
                host.appendChild(el('h4', 'ng-panel-title', entry.label));
            }
            if (!rows.length) {
                host.appendChild(el('p', 'ng-panel-note', 'Todavía no hay nada aquí.'));
                return;
            }
            var box = el('div', 'ng-layers');
            rows.forEach(function (value, index) {
                box.appendChild(rowFor(entry.path, value, index, selected, 0));
                if (value && value.type === 'row') {
                    box.appendChild(columnTree(entry.path + '.' + index, value, selected));
                }
            });
            host.appendChild(box);
            sortable(rows, entry.path, box);
        });

        host.appendChild(el('h4', 'ng-panel-title', 'Elementos generales'));
        var quick = el('div', 'ng-quick');
        var extras = [
            { path: 'header', label: 'Cabecera y menú', icon: 'bi-menu-button-wide' },
            { path: 'footer', label: 'Pie de página', icon: 'bi-layout-text-window-reverse' },
            { path: 'site.theme', label: 'Diseño global', icon: 'bi-palette2' },
            { path: 'site', label: 'Datos de contacto', icon: 'bi-envelope' }
        ];
        if (page === 'home') {
            extras.unshift({ path: 'home', label: 'Titular de portada', icon: 'bi-house' });
            extras.push({ path: 'about', label: 'Sobre mí', icon: 'bi-person' });
        } else {
            extras.unshift({ path: 'pages.' + page, label: 'Ajustes de la página', icon: 'bi-sliders' });
        }

        extras.forEach(function (entry) {
            var row = el('button', 'ng-layer' + (entry.path === selected ? ' is-on' : ''),
                '<i class="bi ' + entry.icon + '"></i><span>' + entry.label + '</span>');
            row.type = 'button';
            row.addEventListener('click', function () {
                handlers.onSelect(entry.path);
            });
            quick.appendChild(row);
        });
        host.appendChild(quick);
    }

    // -------------------------------------------------------------- palette

    function palette(host, page, selected) {
        host.innerHTML = '';
        var meta = window.NGSchema.pages[page];
        var grid = el('div', 'ng-palette');
        var items;

        if (!meta.list) {
            host.appendChild(el('p', 'ng-panel-note',
                'La portada se compone de accesos, tarjetas de descarga y referencias. ' +
                'Añade los que necesites y ordénalos desde «Estructura».'));
            items = window.NGSchema.palette.home.map(function (entry) {
                return {
                    spec: window.NGSchema.singles[entry.kind],
                    payload: { kind: entry.kind, list: entry.list }
                };
            });
        } else {
            var where = selected && selected.indexOf(meta.list + '.') === 0
                ? 'Se añadirá justo debajo del bloque seleccionado.'
                : 'Se añadirá al final de la página.';
            host.appendChild(el('p', 'ng-panel-note', where));

            var names = page === 'teatro'
                ? window.NGSchema.palette.projects
                : window.NGSchema.palette.blocks;
            items = names.map(function (name) {
                return {
                    spec: window.NGSchema.blocks[name],
                    payload: { kind: name, list: meta.list }
                };
            });
        }

        items.forEach(function (item) {
            var card = el('button', 'ng-widget');
            card.type = 'button';
            card.draggable = true;
            card.innerHTML = '<i class="bi ' + item.spec.icon + '"></i><strong>' + item.spec.label +
                '</strong><span>' + (item.spec.hint || '') + '</span>';
            card.addEventListener('click', function () {
                handlers.onAdd(item.payload);
            });
            card.addEventListener('dragstart', function (event) {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('text/plain', 'ng-widget:' + JSON.stringify(item.payload));
                card.classList.add('is-dragging');
            });
            card.addEventListener('dragend', function () {
                card.classList.remove('is-dragging');
            });
            grid.appendChild(card);
        });

        host.appendChild(grid);
    }

    window.NGPanels = {
        on: function (name, fn) {
            handlers[name] = fn;
        },
        structure: structure,
        palette: palette
    };
})();
