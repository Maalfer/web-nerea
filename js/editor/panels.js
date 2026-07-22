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
        onAdd: function () { },
        isVisible: function () {
            return true;
        }
    };

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

    function rowFor(listPath, value, index, selected) {
        var path = listPath + '.' + index;
        var spec = window.NGSchema.describe(path, value);
        var row = el('div', 'ng-layer' + (path === selected ? ' is-on' : '') +
            (value && value.type === 'section' ? ' is-head' : ''));
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

        row.addEventListener('click', function () {
            handlers.onSelect(path);
        });
        row.addEventListener('mouseenter', function () {
            handlers.onHover(path);
        });
        row.addEventListener('mouseleave', function () {
            handlers.onHover(null);
        });
        return row;
    }

    function sortable(list, listPath, host) {
        var dragging = null;

        host.querySelectorAll('.ng-layer').forEach(function (row) {
            var index = parseInt(row.getAttribute('data-index'), 10);

            row.addEventListener('dragstart', function (event) {
                dragging = index;
                row.classList.add('is-dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
            });
            row.addEventListener('dragend', function () {
                dragging = null;
                host.querySelectorAll('.ng-layer').forEach(function (node) {
                    node.classList.remove('is-dragging', 'is-over', 'is-under');
                });
            });
            row.addEventListener('dragover', function (event) {
                event.preventDefault();
                if (dragging === null || dragging === index) return;
                row.classList.toggle('is-over', index < dragging);
                row.classList.toggle('is-under', index > dragging);
            });
            row.addEventListener('dragleave', function () {
                row.classList.remove('is-over', 'is-under');
            });
            row.addEventListener('drop', function (event) {
                event.preventDefault();
                row.classList.remove('is-over', 'is-under');
                if (dragging === null || dragging === index) return;
                handlers.onReorder(listPath, dragging, index);
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
                box.appendChild(rowFor(entry.path, value, index, selected));
            });
            host.appendChild(box);
            sortable(rows, entry.path, box);
        });

        host.appendChild(el('h4', 'ng-panel-title', 'Elementos generales'));
        var quick = el('div', 'ng-quick');
        var extras = [
            { path: 'site.theme', label: 'Diseño global', icon: 'bi-palette2' },
            { path: 'site', label: 'Datos de contacto', icon: 'bi-envelope' }
        ];
        if (page === 'home') extras.push({ path: 'about', label: 'Sobre mí', icon: 'bi-person' });
        else extras.unshift({ path: 'pages.' + page, label: 'Ajustes de la página', icon: 'bi-sliders' });

        extras.forEach(function (entry) {
            var row = el('div', 'ng-layer' + (entry.path === selected ? ' is-on' : ''),
                '<i class="bi ' + entry.icon + '"></i><span>' + entry.label + '</span>');
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
