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

    var ICONS = ['bi-brush', 'bi-hammer', 'bi-mask', 'bi-image', 'bi-book', 'bi-download',
        'bi-palette', 'bi-scissors', 'bi-camera', 'bi-star', 'bi-file-earmark-pdf'];

    var handlers = { onEdit: function () { } };

    function full(path, key) {
        return path + '.' + key;
    }

    function read(path, key) {
        return store().get(full(path, key));
    }

    function write(path, key, value, live) {
        store().setField(full(path, key), value, { quiet: !!live });
        handlers.onEdit(path, { live: !!live });
    }

    function field(label, control, hint) {
        var box = el('div', 'ng-field');
        if (label) box.appendChild(el('label', null, label));
        box.appendChild(control);
        if (hint) box.appendChild(el('p', 'ng-field-hint', hint));
        return box;
    }

    // ------------------------------------------------------------- controls

    function textControl(path, spec, multiline) {
        var input = el(multiline ? 'textarea' : 'input');
        if (!multiline) input.type = 'text';
        if (spec.placeholder) input.placeholder = spec.placeholder;
        input.value = read(path, spec.key) == null ? '' : read(path, spec.key);
        if (multiline) input.rows = Math.min(10, Math.max(3, String(input.value).length / 60 + 2));

        input.addEventListener('input', function () {
            write(path, spec.key, input.value, true);
        });
        input.addEventListener('change', function () {
            write(path, spec.key, input.value, false);
        });
        return input;
    }

    function numberControl(path, spec) {
        var input = el('input');
        input.type = 'number';
        if (spec.min != null) input.min = spec.min;
        if (spec.max != null) input.max = spec.max;
        var current = read(path, spec.key);
        input.value = current == null ? '' : current;
        input.addEventListener('change', function () {
            write(path, spec.key, input.value === '' ? undefined : Number(input.value));
        });
        return input;
    }

    function toggleControl(path, spec) {
        var wrap = el('label', 'ng-switch');
        var input = el('input');
        input.type = 'checkbox';
        input.checked = !!read(path, spec.key);
        input.addEventListener('change', function () {
            write(path, spec.key, input.checked ? true : undefined);
        });
        wrap.appendChild(input);
        wrap.appendChild(el('span', 'ng-switch-track'));
        return wrap;
    }

    function selectControl(path, spec) {
        var select = el('select');
        var current = read(path, spec.key);
        spec.options.forEach(function (option) {
            var node = el('option', null, option.label);
            node.value = option.value;
            if (String(option.value) === String(current == null ? '' : current)) node.selected = true;
            select.appendChild(node);
        });
        select.addEventListener('change', function () {
            var raw = select.value;
            var match = spec.options.filter(function (o) {
                return String(o.value) === raw;
            })[0];
            var value = match ? match.value : raw;
            write(path, spec.key, value === '' ? undefined : value);
        });
        return select;
    }

    function iconControl(path, spec) {
        var select = el('select');
        var current = read(path, spec.key);
        ICONS.forEach(function (name) {
            var node = el('option', null, name.replace('bi-', ''));
            node.value = name;
            if (name === current) node.selected = true;
            select.appendChild(node);
        });
        select.addEventListener('change', function () {
            write(path, spec.key, select.value);
        });
        return select;
    }

    function pdfControl(path, spec) {
        var wrap = el('div', 'ng-picker');
        var input = el('input');
        input.type = 'text';
        input.value = read(path, spec.key) || '';
        input.placeholder = 'assets/pdf/…';
        input.setAttribute('list', 'ng-pdf-list');
        input.addEventListener('change', function () {
            write(path, spec.key, input.value || undefined);
        });
        wrap.appendChild(input);

        if (!document.getElementById('ng-pdf-list')) {
            var data = el('datalist');
            data.id = 'ng-pdf-list';
            document.body.appendChild(data);
        }
        var box = document.getElementById('ng-pdf-list');
        box.innerHTML = '';
        (window.NGSettings ? window.NGSettings.documents() : []).forEach(function (doc) {
            var option = el('option');
            option.value = doc.url.replace(/^\//, '');
            option.label = doc.label;
            box.appendChild(option);
        });
        return wrap;
    }

    function colorFieldControl(path, spec) {
        var wrap = el('div', 'ng-color');
        var current = read(path, spec.key);

        var swatch = el('input');
        swatch.type = 'color';
        swatch.value = /^#[0-9a-f]{6}$/i.test(current || '') ? current : '#f0b700';

        var text = el('input');
        text.type = 'text';
        text.value = current || '';
        text.placeholder = 'por defecto';

        swatch.addEventListener('input', function () {
            text.value = swatch.value;
            write(path, spec.key, swatch.value, true);
        });
        swatch.addEventListener('change', function () {
            write(path, spec.key, swatch.value, false);
        });
        text.addEventListener('change', function () {
            write(path, spec.key, text.value || undefined);
        });

        var clear = el('button', 'ng-icon-btn ng-tiny', '<i class="bi bi-arrow-counterclockwise"></i>');
        clear.type = 'button';
        clear.title = 'Volver al color original';
        clear.addEventListener('click', function () {
            write(path, spec.key, undefined);
        });

        wrap.appendChild(swatch);
        wrap.appendChild(text);
        wrap.appendChild(clear);
        return wrap;
    }

    function groupOf(path, spec) {
        return read(path, spec.groupKey || 'group');
    }

    function groupControl(path, spec, kind) {
        var wrap = el('div', 'ng-picker');
        var current = read(path, spec.key);
        var count = current ? ((store().media()[kind] || {})[current] || []).length : 0;

        var button = el('button', 'ng-picker-btn');
        button.type = 'button';
        button.innerHTML = current
            ? '<i class="bi bi-collection"></i><span>' + window.NGMedia.prettyGroup(current) +
            '</span><em>' + count + '</em>'
            : '<i class="bi bi-collection"></i><span>Elegir álbum</span>';
        button.addEventListener('click', function () {
            window.NGMedia.open({
                kind: kind,
                mode: 'group',
                group: current,
                title: 'Elegir álbum',
                cta: 'Usar este álbum',
                hint: 'Selecciona el álbum del que tira este bloque. Aquí también subes, ordenas y borras archivos.',
                onPick: function (answer) {
                    write(path, spec.key, answer.group);
                },
                onChange: function () {
                    handlers.onEdit(path, {});
                }
            });
        });
        wrap.appendChild(button);
        return wrap;
    }

    function indexControl(path, spec) {
        var group = groupOf(path, spec);
        var items = (store().media().images || {})[group] || [];
        var current = read(path, spec.key) || 0;
        var wrap = el('div', 'ng-picker');

        var button = el('button', 'ng-picker-btn ng-picker-btn--image');
        button.type = 'button';
        var entry = items[current];
        if (entry) {
            var shot = el('img');
            shot.src = entry.thumb || entry.src;
            button.appendChild(shot);
        }
        button.appendChild(el('span', null, entry ? (entry.name || 'Imagen ' + (current + 1)) : 'Elegir imagen'));
        button.addEventListener('click', function () {
            if (!group) return window.NGMedia.toast('Primero elige un álbum', true);
            window.NGMedia.open({
                kind: 'images',
                mode: 'index',
                group: group,
                value: current,
                title: 'Elegir imagen',
                cta: 'Usar esta imagen',
                hint: 'Pulsa sobre la imagen que quieras y confirma.',
                onPick: function (answer) {
                    write(path, spec.key, answer.index);
                },
                onChange: function () {
                    handlers.onEdit(path, {});
                }
            });
        });
        wrap.appendChild(button);
        return wrap;
    }

    function itemsControl(path, spec) {
        var group = groupOf(path, spec);
        var items = (store().media().images || {})[group] || [];
        var chosen = read(path, spec.key);
        var wrap = el('div', 'ng-picker');

        var summary = chosen && chosen.length
            ? chosen.length + ' imágenes elegidas'
            : 'Todas las del álbum (' + items.length + ')';

        var button = el('button', 'ng-picker-btn');
        button.type = 'button';
        button.innerHTML = '<i class="bi bi-images"></i><span>' + summary + '</span>';
        button.addEventListener('click', function () {
            if (!group) return window.NGMedia.toast('Primero elige un álbum', true);
            window.NGMedia.open({
                kind: 'images',
                mode: 'items',
                group: group,
                items: chosen || [],
                title: 'Elegir imágenes',
                cta: 'Usar esta selección',
                hint: 'Pulsa las imágenes en el orden en que quieras que aparezcan. Sin selección se muestran todas.',
                onPick: function (answer) {
                    write(path, spec.key, answer.items.length ? answer.items : undefined);
                },
                onChange: function () {
                    handlers.onEdit(path, {});
                }
            });
        });
        wrap.appendChild(button);

        if (chosen && chosen.length) {
            var clear = el('button', 'ng-link-btn', 'Mostrar todas');
            clear.type = 'button';
            clear.addEventListener('click', function () {
                write(path, spec.key, undefined);
            });
            wrap.appendChild(clear);
        }
        return wrap;
    }

    function heroControl(path, spec) {
        var hero = read(path, spec.key) || {};
        var wrap = el('div', 'ng-hero');

        if (hero.slides) {
            hero.slides.forEach(function (slide, index) {
                var row = el('div', 'ng-repeat-row');
                var head = el('div', 'ng-repeat-head');
                head.appendChild(el('span', null, 'Imagen ' + (index + 1)));
                var kill = el('button', 'ng-icon-btn ng-danger', '<i class="bi bi-trash"></i>');
                kill.type = 'button';
                kill.addEventListener('click', function () {
                    var next = hero.slides.slice();
                    next.splice(index, 1);
                    write(path, spec.key + '.slides', next.length ? next : undefined);
                });
                head.appendChild(kill);
                row.appendChild(head);

                var base = spec.key + '.slides.' + index;
                row.appendChild(field('Álbum', groupControl(path, { key: base + '.group' }, 'images')));
                row.appendChild(field('Imagen', indexControl(path, {
                    key: base + '.i', groupKey: base + '.group'
                })));
                wrap.appendChild(row);
            });

            var more = el('button', 'ng-btn ng-btn--ghost', '<i class="bi bi-plus-lg"></i> Añadir imagen');
            more.type = 'button';
            more.addEventListener('click', function () {
                var first = hero.slides[0] || {};
                write(path, spec.key + '.slides', hero.slides.concat([{ group: first.group, i: 0 }]));
            });
            wrap.appendChild(more);
            return wrap;
        }

        wrap.appendChild(field('Álbum', groupControl(path, { key: spec.key + '.group' }, 'images')));
        wrap.appendChild(field('Imagen', indexControl(path, {
            key: spec.key + '.i', groupKey: spec.key + '.group'
        })));

        var convert = el('button', 'ng-link-btn', 'Convertir en pase de varias imágenes');
        convert.type = 'button';
        convert.addEventListener('click', function () {
            write(path, spec.key, { slides: [{ group: hero.group, i: hero.i || 0 }] });
        });
        wrap.appendChild(convert);
        return wrap;
    }

    // ------------------------------------------------------------ repeaters

    function repeater(path, spec, columns, blank) {
        var box = el('div', 'ng-repeat');
        var rows = read(path, spec.key) || [];

        rows.forEach(function (row, index) {
            var line = el('div', 'ng-repeat-row');
            var head = el('div', 'ng-repeat-head');
            head.appendChild(el('span', null, '#' + (index + 1)));

            var tools = el('div', 'ng-repeat-tools');
            [['bi-arrow-up', -1], ['bi-arrow-down', 1]].forEach(function (pair) {
                var move = el('button', 'ng-icon-btn', '<i class="bi ' + pair[0] + '"></i>');
                move.type = 'button';
                move.addEventListener('click', function () {
                    var next = rows.slice();
                    var to = index + pair[1];
                    if (to < 0 || to >= next.length) return;
                    next.splice(to, 0, next.splice(index, 1)[0]);
                    write(path, spec.key, next);
                });
                tools.appendChild(move);
            });
            var kill = el('button', 'ng-icon-btn ng-danger', '<i class="bi bi-trash"></i>');
            kill.type = 'button';
            kill.addEventListener('click', function () {
                var next = rows.slice();
                next.splice(index, 1);
                write(path, spec.key, next);
            });
            tools.appendChild(kill);
            head.appendChild(tools);
            line.appendChild(head);

            columns.forEach(function (column) {
                var control;
                if (column.type === 'toggle') {
                    control = el('label', 'ng-switch');
                    var check = el('input');
                    check.type = 'checkbox';
                    check.checked = !!row[column.key];
                    check.addEventListener('change', function () {
                        var next = store().path.clone(rows);
                        if (check.checked) next[index][column.key] = true;
                        else delete next[index][column.key];
                        write(path, spec.key, next);
                    });
                    control.appendChild(check);
                    control.appendChild(el('span', 'ng-switch-track'));
                } else {
                    control = el(column.type === 'textarea' ? 'textarea' : 'input');
                    if (column.type !== 'textarea') control.type = 'text';
                    if (column.type === 'textarea') control.rows = 3;
                    control.value = (column.self ? row : row[column.key]) || '';
                    control.placeholder = column.placeholder || '';
                    control.addEventListener('change', function () {
                        var next = store().path.clone(rows);
                        if (column.self) next[index] = control.value;
                        else next[index][column.key] = control.value;
                        write(path, spec.key, next);
                    });
                }
                line.appendChild(field(column.label, control));
            });

            box.appendChild(line);
        });

        var add = el('button', 'ng-btn ng-btn--ghost', '<i class="bi bi-plus-lg"></i> Añadir');
        add.type = 'button';
        add.addEventListener('click', function () {
            write(path, spec.key, rows.concat([store().path.clone(blank)]));
        });
        box.appendChild(add);
        return box;
    }

    var REPEATERS = {
        links: {
            columns: [
                { key: 'label', label: 'Texto', type: 'text' },
                { key: 'href', label: 'Enlace', type: 'text', placeholder: 'assets/pdf/…' },
                { key: 'download', label: 'Nombre al descargar', type: 'text' },
                { key: 'primary', label: 'Botón destacado', type: 'toggle' }
            ],
            blank: { label: 'Nuevo botón', href: '#' }
        },
        list: {
            columns: [{ self: true, label: 'Texto', type: 'textarea' }],
            blank: ''
        },
        facts: {
            columns: [
                { key: 'value', label: 'Dato', type: 'text' },
                { key: 'label', label: 'Descripción', type: 'text' }
            ],
            blank: { value: '', label: '' }
        },
        pageIndex: {
            columns: [
                { key: 'label', label: 'Texto', type: 'text' },
                { key: 'href', label: 'Ancla', type: 'text', placeholder: '#comics' }
            ],
            blank: { label: '', href: '#' }
        }
    };

    // --------------------------------------------------------------- render

    function control(path, spec) {
        if (spec.type === 'textarea') return textControl(path, spec, true);
        if (spec.type === 'number') return numberControl(path, spec);
        if (spec.type === 'toggle') return toggleControl(path, spec);
        if (spec.type === 'select') return selectControl(path, spec);
        if (spec.type === 'icon') return iconControl(path, spec);
        if (spec.type === 'imageGroup') return groupControl(path, spec, 'images');
        if (spec.type === 'videoGroup') return groupControl(path, spec, 'videos');
        if (spec.type === 'imageIndex') return indexControl(path, spec);
        if (spec.type === 'imageItems') return itemsControl(path, spec);
        if (spec.type === 'hero') return heroControl(path, spec);
        if (spec.type === 'pdf') return pdfControl(path, spec);
        if (spec.type === 'colorField') return colorFieldControl(path, spec);
        if (REPEATERS[spec.type]) {
            return repeater(path, spec, REPEATERS[spec.type].columns, REPEATERS[spec.type].blank);
        }
        return textControl(path, spec, false);
    }

    window.NGInspector = {
        on: function (name, fn) {
            handlers[name] = fn;
        },

        render: function (host, path) {
            host.innerHTML = '';
            if (!path) {
                host.appendChild(el('p', 'ng-empty',
                    'Pulsa cualquier bloque de la página para editarlo, o añade uno nuevo desde «Añadir».'));
                return;
            }

            var value = store().get(path);
            var spec = window.NGSchema.describe(path, value);
            if (!spec) {
                host.appendChild(el('p', 'ng-empty', 'Este elemento no se puede editar.'));
                return;
            }

            var head = el('div', 'ng-inspector-head');
            head.innerHTML = '<i class="bi ' + (spec.icon || 'bi-square') + '"></i><h3>' + spec.label + '</h3>';
            host.appendChild(head);
            if (spec.hint) host.appendChild(el('p', 'ng-inspector-hint', spec.hint));

            var basic = el('div', 'ng-fields');
            var advanced = el('div', 'ng-fields');

            spec.fields.forEach(function (item) {
                if (item.when && !item.when(value, path)) return;
                var node = field(item.label, control(path, item), item.hint);
                (item.advanced ? advanced : basic).appendChild(node);
            });
            host.appendChild(basic);

            if (advanced.childNodes.length) {
                var more = el('details', 'ng-advanced');
                more.appendChild(el('summary', null, 'Opciones avanzadas'));
                more.appendChild(advanced);
                host.appendChild(more);
            }
        }
    };
})();
