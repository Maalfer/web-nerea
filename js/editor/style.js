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

    var handlers = { onEdit: function () { }, onDevice: function () { } };
    var device = 'base';

    var DEVICE_LABELS = {
        base: 'Escritorio',
        tablet: 'Tableta',
        mobile: 'Móvil'
    };

    var GROUPS = [
        {
            title: 'Espaciado',
            icon: 'bi-arrows-expand',
            fields: [
                { key: 'mt', label: 'Margen arriba', type: 'range', min: -80, max: 200, unit: 'px' },
                { key: 'mb', label: 'Margen abajo', type: 'range', min: -80, max: 200, unit: 'px' },
                { key: 'pt', label: 'Relleno arriba', type: 'range', min: 0, max: 200, unit: 'px' },
                { key: 'pb', label: 'Relleno abajo', type: 'range', min: 0, max: 200, unit: 'px' },
                { key: 'pl', label: 'Relleno izquierda', type: 'range', min: 0, max: 200, unit: 'px' },
                { key: 'pr', label: 'Relleno derecha', type: 'range', min: 0, max: 200, unit: 'px' }
            ]
        },
        {
            title: 'Colocación',
            icon: 'bi-align-center',
            fields: [
                {
                    key: 'align', label: 'Alineación', type: 'choice', options: [
                        { value: 'left', icon: 'bi-text-left', title: 'Izquierda' },
                        { value: 'center', icon: 'bi-text-center', title: 'Centro' },
                        { value: 'right', icon: 'bi-text-right', title: 'Derecha' }
                    ]
                },
                { key: 'maxw', label: 'Ancho máximo', type: 'range', min: 200, max: 1400, unit: 'px' }
            ]
        },
        {
            title: 'Texto',
            icon: 'bi-fonts',
            fields: [
                { key: 'color', label: 'Color', type: 'color' },
                { key: 'size', label: 'Tamaño', type: 'range', min: 10, max: 90, unit: 'px' },
                {
                    key: 'weight', label: 'Grosor', type: 'select', options: [
                        { value: '', label: 'Normal' },
                        { value: '300', label: 'Fino' },
                        { value: '400', label: 'Medio' },
                        { value: '700', label: 'Negrita' }
                    ]
                },
                { key: 'ls', label: 'Espaciado entre letras', type: 'range', min: -2, max: 12, step: 0.5, unit: 'px' },
                { key: 'lh', label: 'Altura de línea', type: 'range', min: 0.9, max: 3, step: 0.05, unit: '' }
            ]
        },
        {
            title: 'Fondo y borde',
            icon: 'bi-palette',
            fields: [
                { key: 'bg', label: 'Color de fondo', type: 'color' },
                { key: 'radius', label: 'Esquinas redondeadas', type: 'range', min: 0, max: 60, unit: 'px' },
                { key: 'bw', label: 'Grosor del borde', type: 'range', min: 0, max: 12, unit: 'px' },
                { key: 'bc', label: 'Color del borde', type: 'color' },
                {
                    key: 'shadow', label: 'Sombra', type: 'select', options: [
                        { value: '', label: 'Sin definir' },
                        { value: 'none', label: 'Ninguna' },
                        { value: 'soft', label: 'Suave' },
                        { value: 'strong', label: 'Marcada' },
                        { value: 'glow', label: 'Resplandor dorado' }
                    ]
                }
            ]
        },
        {
            title: 'Visibilidad',
            icon: 'bi-eye',
            fields: [
                { key: 'hide', label: 'Ocultar en este dispositivo', type: 'toggle' }
            ]
        }
    ];

    function base(path) {
        return path + '.style.' + device + '.';
    }

    function read(path, key) {
        return store().get(base(path) + key);
    }

    function write(path, key, value, live) {
        store().setField(base(path) + key, value, { quiet: !!live });
        handlers.onEdit(path, { live: !!live });
    }

    function inherited(path, key) {
        if (device === 'base') return undefined;
        return store().get(path + '.style.base.' + key);
    }

    function label(spec, path) {
        var box = el('div', 'ng-style-label');
        box.appendChild(el('span', null, spec.label));

        var current = read(path, spec.key);
        if (current !== undefined && current !== '') {
            var clear = el('button', 'ng-icon-btn ng-tiny', '<i class="bi bi-arrow-counterclockwise"></i>');
            clear.type = 'button';
            clear.title = 'Quitar este ajuste';
            clear.addEventListener('click', function () {
                write(path, spec.key, undefined);
            });
            box.appendChild(clear);
        }
        return box;
    }

    function rangeControl(path, spec) {
        var wrap = el('div', 'ng-range');
        var current = read(path, spec.key);
        var fallback = inherited(path, spec.key);
        var shown = current === undefined || current === '' ? fallback : current;

        var slider = el('input');
        slider.type = 'range';
        slider.min = spec.min;
        slider.max = spec.max;
        slider.step = spec.step || 1;
        slider.value = shown === undefined ? (spec.min < 0 ? 0 : spec.min) : shown;

        var number = el('input');
        number.type = 'number';
        number.min = spec.min;
        number.max = spec.max;
        number.step = spec.step || 1;
        number.value = current === undefined || current === '' ? '' : current;
        number.placeholder = fallback === undefined ? 'auto' : String(fallback);

        slider.addEventListener('input', function () {
            number.value = slider.value;
            write(path, spec.key, Number(slider.value), true);
        });
        slider.addEventListener('change', function () {
            write(path, spec.key, Number(slider.value), false);
        });
        number.addEventListener('change', function () {
            if (number.value === '') return write(path, spec.key, undefined);
            slider.value = number.value;
            write(path, spec.key, Number(number.value));
        });

        wrap.appendChild(slider);
        wrap.appendChild(number);
        return wrap;
    }

    function colorControl(path, spec) {
        var wrap = el('div', 'ng-color');
        var current = read(path, spec.key);

        var swatch = el('input');
        swatch.type = 'color';
        swatch.value = /^#[0-9a-f]{6}$/i.test(current || '') ? current : '#f0b700';

        var text = el('input');
        text.type = 'text';
        text.value = current || '';
        text.placeholder = 'sin definir';

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

        wrap.appendChild(swatch);
        wrap.appendChild(text);
        return wrap;
    }

    function choiceControl(path, spec) {
        var wrap = el('div', 'ng-choice');
        var current = read(path, spec.key);
        spec.options.forEach(function (option) {
            var button = el('button', current === option.value ? 'is-on' : '',
                '<i class="bi ' + option.icon + '"></i>');
            button.type = 'button';
            button.title = option.title;
            button.addEventListener('click', function () {
                write(path, spec.key, current === option.value ? undefined : option.value);
            });
            wrap.appendChild(button);
        });
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
            write(path, spec.key, select.value === '' ? undefined : select.value);
        });
        return select;
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

    function control(path, spec) {
        if (spec.type === 'range') return rangeControl(path, spec);
        if (spec.type === 'color') return colorControl(path, spec);
        if (spec.type === 'choice') return choiceControl(path, spec);
        if (spec.type === 'select') return selectControl(path, spec);
        return toggleControl(path, spec);
    }

    function deviceBar(path, host) {
        var bar = el('div', 'ng-style-devices');
        ['base', 'tablet', 'mobile'].forEach(function (key) {
            var button = el('button', device === key ? 'is-on' : '', DEVICE_LABELS[key]);
            button.type = 'button';
            button.addEventListener('click', function () {
                device = key;
                handlers.onDevice(key);
                window.NGStyle.render(host, path);
            });
            bar.appendChild(button);
        });
        return bar;
    }

    function countSet(path) {
        var values = store().get(path + '.style.' + device) || {};
        return Object.keys(values).filter(function (key) {
            return values[key] !== undefined && values[key] !== '';
        }).length;
    }

    window.NGStyle = {
        on: function (name, fn) {
            handlers[name] = fn;
        },

        device: function () {
            return device;
        },

        setDevice: function (key) {
            device = key;
        },

        render: function (host, path) {
            host.innerHTML = '';
            if (!path) {
                host.appendChild(el('p', 'ng-empty', 'Elige un bloque para darle estilo.'));
                return;
            }

            host.appendChild(deviceBar(path, host));
            host.appendChild(el('p', 'ng-panel-note', device === 'base'
                ? 'Estos ajustes valen para todos los tamaños de pantalla.'
                : 'Solo se aplican en ' + DEVICE_LABELS[device].toLowerCase() +
                '. Lo que dejes vacío hereda lo del escritorio.'));

            GROUPS.forEach(function (group) {
                var block = el('details', 'ng-style-group');
                block.open = group.title === 'Espaciado' || countSet(path) > 0;
                var head = el('summary', null,
                    '<i class="bi ' + group.icon + '"></i> ' + group.title);
                block.appendChild(head);

                var body = el('div', 'ng-fields');
                group.fields.forEach(function (spec) {
                    var field = el('div', 'ng-field ng-field--style');
                    field.appendChild(label(spec, path));
                    field.appendChild(control(path, spec));
                    body.appendChild(field);
                });
                block.appendChild(body);
                host.appendChild(block);
            });

            var reset = el('button', 'ng-btn ng-btn--ghost ng-style-reset',
                '<i class="bi bi-eraser"></i> Quitar todo el estilo de ' + DEVICE_LABELS[device].toLowerCase());
            reset.type = 'button';
            reset.addEventListener('click', function () {
                store().setField(path + '.style.' + device, undefined);
                handlers.onEdit(path, {});
                window.NGStyle.render(host, path);
            });
            host.appendChild(reset);
        }
    };
})();
