(function () {
    'use strict';

    var framed = window.parent !== window;
    var editing = /(?:^|[?&])edit=1(?:&|$)/.test(window.location.search);
    var previewing = /(?:^|[?&])preview=1(?:&|$)/.test(window.location.search);
    if (!editing && !previewing) return;

    function stored(key, box) {
        try {
            var raw = (box || window.sessionStorage).getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    var draft = previewing
        ? stored('ng:preview', window.localStorage) || stored('ng:draft')
        : stored('ng:draft');
    var mediaDraft = previewing
        ? stored('ng:preview-media', window.localStorage) || stored('ng:media')
        : stored('ng:media');
    if (draft) window.CONTENT = draft;
    if (mediaDraft) {
        window.MEDIA = mediaDraft.images || window.MEDIA;
        window.MEDIA_VIDEO = mediaDraft.videos || window.MEDIA_VIDEO;
    }

    if (previewing || !framed) {
        document.addEventListener('DOMContentLoaded', function () {
            var flag = document.createElement('div');
            flag.textContent = 'Vista previa del borrador — todavía sin publicar';
            flag.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;' +
                'background:#e0a83a;color:#141414;font:600 12px/1 "Fira Code",monospace;padding:10px 18px;' +
                'border-radius:8px;box-shadow:0 10px 26px rgba(0,0,0,.5)';
            document.body.appendChild(flag);
        });
        return;
    }

    window.NG_EDIT = true;

    var host = null;
    try {
        host = window.parent.NGEditor || null;
    } catch (error) {
        return;
    }

    var STYLE = [
        '[data-ng-path]{position:relative;outline:1px dashed rgba(224,168,58,.34);outline-offset:3px;transition:outline-color .15s}',
        '[data-ng-path]:hover{outline:1px solid rgba(224,168,58,.75)}',
        '[data-ng-path].ng-active{outline:2px solid #e0a83a;outline-offset:4px}',
        '.ng-tag{position:absolute;z-index:2147483000;transform:translateY(-100%);background:#e0a83a;color:#141414;',
        'font:600 11px/1 "Fira Code",monospace;letter-spacing:.06em;text-transform:uppercase;padding:5px 8px;',
        'border-radius:5px 5px 0 0;pointer-events:none;white-space:nowrap}',
        '.ng-bar{position:absolute;z-index:2147483001;transform:translateY(-100%);display:flex;gap:1px;',
        'background:#e0a83a;border-radius:5px 5px 0 0;overflow:hidden;font-family:inherit}',
        '.ng-bar button{border:0;background:#e0a83a;color:#141414;padding:5px 8px;font-size:13px;line-height:1;',
        'cursor:pointer;display:flex;align-items:center}',
        '.ng-bar button:hover{background:#f0c266}',
        '.ng-bar button.ng-grab{cursor:grab}',
        '.ng-drop{position:absolute;z-index:2147483002;height:3px;background:#e0a83a;border-radius:3px;',
        'box-shadow:0 0 0 3px rgba(224,168,58,.28);pointer-events:none}',
        '.ng-ghost{position:fixed;z-index:2147483003;background:#e0a83a;color:#141414;font:600 12px/1 "Fira Code",monospace;',
        'padding:7px 11px;border-radius:5px;pointer-events:none;box-shadow:0 8px 22px rgba(0,0,0,.45)}',
        '[contenteditable="true"]{outline:1px dashed rgba(224,168,58,.5);outline-offset:2px;cursor:text;min-height:1em}',
        '[contenteditable="true"]:focus,[contenteditable="true"]:focus-visible{outline:2px solid #e0a83a !important;',
        'outline-offset:2px !important;background:rgba(224,168,58,.08)}',
        '.ng-dragging{opacity:.4}',
        'body.ng-drag-active{cursor:grabbing !important;user-select:none}',
        '.ng-bar button:focus-visible{outline:2px solid #141414;outline-offset:-3px}',
        '@media (prefers-reduced-motion: reduce){[data-ng-path]{transition:none}}'
    ].join('');

    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    var layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2147482000';
    var tag = null;
    var bar = null;
    var indicator = null;
    var ghost = null;
    var selected = null;
    var pending = null;

    function schema() {
        try {
            return window.parent.NGSchema;
        } catch (error) {
            return null;
        }
    }

    function nodes() {
        return Array.prototype.slice.call(document.querySelectorAll('[data-ng-path]'));
    }

    function nodeFor(path) {
        return document.querySelector('[data-ng-path="' + path + '"]');
    }

    function valueAt(path) {
        var parts = path.split('.');
        var cursor = window.CONTENT;
        for (var n = 0; n < parts.length; n++) {
            if (cursor == null) return null;
            cursor = cursor[parts[n]];
        }
        return cursor;
    }

    function listOf(path) {
        var cut = path.lastIndexOf('.');
        var head = path.slice(0, cut);
        var index = parseInt(path.slice(cut + 1), 10);
        if (isNaN(index)) return null;
        return { prefix: head + '.', index: index };
    }

    function place(node, element) {
        var box = node.getBoundingClientRect();
        element.style.top = Math.max(22, box.top + window.scrollY) + 'px';
        element.style.left = (box.left + window.scrollX) + 'px';
    }

    function showChrome(node) {
        if (!tag) {
            tag = document.createElement('div');
            tag.className = 'ng-tag';
            layer.appendChild(tag);
        }
        var spec = schema() ? schema().describe(node.getAttribute('data-ng-path'),
            valueAt(node.getAttribute('data-ng-path'))) : null;
        tag.textContent = spec ? spec.label : 'Bloque';
        tag.style.display = 'block';
        place(node, tag);
    }

    function hideChrome() {
        if (tag) tag.style.display = 'none';
    }

    function buildBar() {
        bar = document.createElement('div');
        bar.className = 'ng-bar';
        bar.style.pointerEvents = 'auto';

        var actions = [
            { key: 'grab', icon: 'bi-grip-vertical', title: 'Arrastrar para mover' },
            { key: 'up', icon: 'bi-arrow-up', title: 'Subir' },
            { key: 'down', icon: 'bi-arrow-down', title: 'Bajar' },
            { key: 'copy', icon: 'bi-files', title: 'Duplicar' },
            { key: 'plus', icon: 'bi-plus-lg', title: 'Añadir un bloque debajo' },
            { key: 'remove', icon: 'bi-trash', title: 'Eliminar' }
        ];

        actions.forEach(function (action) {
            var button = document.createElement('button');
            button.type = 'button';
            button.title = action.title;
            button.innerHTML = '<i class="bi ' + action.icon + '"></i>';
            if (action.key === 'grab') button.className = 'ng-grab';
            button.addEventListener('mousedown', function (event) {
                if (action.key === 'grab') startDrag(event);
            });
            button.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (!selected || !host) return;
                if (action.key === 'up') host.nudge(selected, -1);
                if (action.key === 'down') host.nudge(selected, 1);
                if (action.key === 'copy') host.duplicate(selected);
                if (action.key === 'plus') host.addBelow(selected);
                if (action.key === 'remove') host.remove(selected);
            });
            bar.appendChild(button);
        });

        layer.appendChild(bar);
    }

    function positionBar() {
        var node = selected && nodeFor(selected);
        if (!bar || !node) return;
        bar.style.display = 'flex';
        var box = node.getBoundingClientRect();
        bar.style.top = Math.max(22, box.top + window.scrollY) + 'px';
        bar.style.left = (box.right + window.scrollX - bar.offsetWidth) + 'px';
    }

    function markSelected() {
        nodes().forEach(function (node) {
            node.classList.toggle('ng-active', node.getAttribute('data-ng-path') === selected);
        });
        if (!bar) buildBar();
        var node = selected && nodeFor(selected);
        if (!node) {
            if (bar) bar.style.display = 'none';
            return;
        }
        if (schema() && schema().singleton(selected)) {
            bar.style.display = 'none';
            return;
        }
        positionBar();
    }

    // ------------------------------------------------------------------ drag

    function startDrag(event) {
        if (!selected) return;
        event.preventDefault();
        event.stopPropagation();

        var origin = listOf(selected);
        if (!origin) return;

        var siblings = nodes().filter(function (node) {
            var path = node.getAttribute('data-ng-path');
            return path.indexOf(origin.prefix) === 0 &&
                path.slice(origin.prefix.length).indexOf('.') === -1;
        }).sort(function (a, b) {
            return parseInt(a.getAttribute('data-ng-path').slice(origin.prefix.length), 10) -
                parseInt(b.getAttribute('data-ng-path').slice(origin.prefix.length), 10);
        });
        if (siblings.length < 2) return;

        var moving = nodeFor(selected);
        moving.classList.add('ng-dragging');
        document.body.classList.add('ng-drag-active');
        if (bar) bar.style.display = 'none';
        hideChrome();

        ghost = document.createElement('div');
        ghost.className = 'ng-ghost';
        var spec = schema() && schema().describe(selected, valueAt(selected));
        ghost.textContent = spec ? spec.label : 'Bloque';
        document.body.appendChild(ghost);

        indicator = document.createElement('div');
        indicator.className = 'ng-drop';
        layer.appendChild(indicator);

        var target = origin.index;

        function measure(pointerY) {
            var best = siblings.length;
            for (var n = 0; n < siblings.length; n++) {
                var box = siblings[n].getBoundingClientRect();
                if (pointerY < box.top + box.height / 2) {
                    best = n;
                    break;
                }
            }
            return best;
        }

        function draw(slot) {
            var reference = siblings[Math.min(slot, siblings.length - 1)];
            var box = reference.getBoundingClientRect();
            var below = slot >= siblings.length;
            indicator.style.top = (below ? box.bottom : box.top) + window.scrollY - 2 + 'px';
            indicator.style.left = box.left + window.scrollX + 'px';
            indicator.style.width = box.width + 'px';
        }

        function onMove(move) {
            ghost.style.left = (move.clientX + 14) + 'px';
            ghost.style.top = (move.clientY + 14) + 'px';
            var slot = measure(move.clientY);
            target = slot > origin.index ? slot - 1 : slot;
            draw(slot);

            var edge = 90;
            if (move.clientY < edge) window.scrollBy(0, -18);
            else if (move.clientY > window.innerHeight - edge) window.scrollBy(0, 18);
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
            moving.classList.remove('ng-dragging');
            document.body.classList.remove('ng-drag-active');
            if (ghost) ghost.remove();
            if (indicator) indicator.remove();
            ghost = indicator = null;
            if (host && target !== origin.index) host.move(selected, target);
            else markSelected();
        }

        draw(origin.index);
        ghost.style.left = (event.clientX + 14) + 'px';
        ghost.style.top = (event.clientY + 14) + 'px';
        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup', onUp, true);
    }

    // -------------------------------------------------------- inline editing

    function wireInline(node) {
        var path = node.getAttribute('data-ng-path');
        var value = valueAt(path);
        var spec = schema() && schema().describe(path, value);
        if (!spec || !spec.inline) return;

        Object.keys(spec.inline).forEach(function (field) {
            var selector = spec.inline[field];
            var target;
            try {
                target = selector === ':self' ? node : node.querySelector(selector);
            } catch (error) {
                return;
            }
            if (!target || target.querySelector('[data-ng-path]')) return;
            target.setAttribute('contenteditable', 'plaintext-only');
            target.setAttribute('data-ng-field', field);
            target.spellcheck = false;

            target.addEventListener('focus', function () {
                pick(path, true);
            });
            target.addEventListener('input', function () {
                if (!host) return;
                clearTimeout(pending);
                var text = target.innerText.replace(/ /g, ' ').replace(/\n+$/, '');
                pending = setTimeout(function () {
                    host.inlineEdit(path, field, text);
                }, 220);
            });
            target.addEventListener('blur', function () {
                clearTimeout(pending);
                if (host) host.inlineEdit(path, field, target.innerText.replace(/ /g, ' ').replace(/\n+$/, ''));
            });
            target.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') target.blur();
                event.stopPropagation();
            });
        });
    }

    // ------------------------------------------------------------- selection

    function pick(path, quiet) {
        selected = path;
        markSelected();
        if (host && !quiet) host.select(path);
        if (host && quiet) host.select(path, true);
    }

    function onClick(event) {
        if (closestOf(event.target, '.ng-bar')) return;
        var link = closestOf(event.target, 'a, button');
        if (link) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (closestOf(event.target, '[contenteditable="true"]')) return;

        var node = closestOf(event.target, '[data-ng-path]');
        if (!node) {
            selected = null;
            markSelected();
            if (host) host.select(null);
            return;
        }
        event.stopPropagation();
        pick(node.getAttribute('data-ng-path'));
    }

    function onOver(event) {
        var node = closestOf(event.target, '[data-ng-path]');
        if (node) showChrome(node);
        else hideChrome();
    }

    // -------------------------------------------------- soltar widgets nuevos

    function inOrder(list) {
        return list.sort(function (a, b) {
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
    }

    function rootList() {
        var first = nodes().filter(function (node) {
            return /^pages\..+\.(blocks|projects)\.\d+$/.test(node.getAttribute('data-ng-path'));
        })[0];
        if (!first) return null;
        var path = first.getAttribute('data-ng-path');
        return path.slice(0, path.lastIndexOf('.') + 1);
    }

    function childrenOf(prefix) {
        return inOrder(nodes().filter(function (node) {
            var path = node.getAttribute('data-ng-path');
            return path.indexOf(prefix) === 0 && path.slice(prefix.length).indexOf('.') === -1;
        }));
    }

    function siblingNodes() {
        var prefix = rootList();
        return prefix ? childrenOf(prefix) : [];
    }

    /** Works out which list a dragged widget would land in, and where. */
    function dropContext(pointerX, pointerY) {
        var over = document.elementFromPoint(pointerX, pointerY);
        var column = closestOf(over, '.ng-col');
        var prefix = null;

        if (column && column.parentElement) {
            var row = closestOf(column.parentElement, '[data-ng-path]');
            if (row) {
                var cells = Array.prototype.slice.call(column.parentElement.children);
                prefix = row.getAttribute('data-ng-path') + '.columns.' + cells.indexOf(column) + '.';
            }
        }
        if (!prefix) prefix = rootList();
        if (!prefix) return null;

        var siblings = childrenOf(prefix);
        var slot = siblings.length;
        for (var n = 0; n < siblings.length; n++) {
            var box = siblings[n].getBoundingClientRect();
            if (pointerY < box.top + box.height / 2) {
                slot = n;
                break;
            }
        }
        return { list: prefix.slice(0, -1), index: slot, siblings: siblings, box: column };
    }

    function showDropLine(context) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'ng-drop';
            layer.appendChild(indicator);
        }
        var siblings = context.siblings;
        var reference = siblings.length
            ? siblings[Math.min(context.index, siblings.length - 1)]
            : context.box;
        if (!reference) {
            indicator.style.display = 'none';
            return;
        }
        var box = reference.getBoundingClientRect();
        var below = siblings.length && context.index >= siblings.length;
        indicator.style.display = 'block';
        indicator.style.top = (below || !siblings.length ? box.bottom : box.top) +
            window.scrollY - 2 + 'px';
        indicator.style.left = box.left + window.scrollX + 'px';
        indicator.style.width = box.width + 'px';
    }

    function clearDropLine() {
        if (indicator) {
            indicator.remove();
            indicator = null;
        }
    }

    var dropTarget = null;

    document.addEventListener('dragover', function (event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        dropTarget = dropContext(event.clientX, event.clientY);
        if (dropTarget) showDropLine(dropTarget);

        var edge = 90;
        if (event.clientY < edge) window.scrollBy(0, -16);
        else if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 16);
    });

    document.addEventListener('dragleave', function (event) {
        if (event.relatedTarget) return;
        clearDropLine();
    });

    document.addEventListener('drop', function (event) {
        event.preventDefault();
        clearDropLine();
        var raw = event.dataTransfer.getData('text/plain') || '';
        if (raw.indexOf('ng-widget:') !== 0 || !host || !dropTarget) return;
        try {
            host.dropWidget(JSON.parse(raw.slice(10)), dropTarget.list, dropTarget.index);
        } catch (error) {
            return;
        }
    });

    function emptyState() {
        var mount = document.getElementById('app') || document.getElementById('teatro-app');
        if (!mount) return;
        var existing = document.getElementById('ng-empty-drop');
        if (siblingNodes().length) {
            if (existing) existing.remove();
            return;
        }
        if (existing) return;
        var box = document.createElement('div');
        box.id = 'ng-empty-drop';
        box.textContent = 'Esta página está vacía. Arrastra aquí un bloque del catálogo.';
        box.style.cssText = 'margin:120px auto;max-width:640px;padding:60px 30px;text-align:center;' +
            'border:2px dashed rgba(224,168,58,.5);border-radius:14px;color:#e0a83a;' +
            'font:600 14px/1.6 "Fira Code",monospace';
        mount.appendChild(box);
    }

    function decorate() {
        if (!layer.parentNode) document.body.appendChild(layer);
        nodes().forEach(function (node) {
            try {
                wireInline(node);
            } catch (error) {
                return;
            }
        });
        emptyState();
        markSelected();
    }

    function closestOf(target, selector) {
        return target && target.closest ? target.closest(selector) : null;
    }

    document.addEventListener('keydown', function (event) {
        if (closestOf(event.target, '[contenteditable="true"]')) return;
        if (!selected || !host) return;
        if (event.key === 'Escape') {
            selected = null;
            markSelected();
            host.select(null);
        }
        if ((event.key === 'Delete' || event.key === 'Backspace') &&
            schema() && !schema().singleton(selected)) {
            event.preventDefault();
            host.remove(selected);
        }
    });

    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('content:rendered', function () {
        setTimeout(decorate, 0);
    });
    window.addEventListener('scroll', function () {
        if (selected) positionBar();
        hideChrome();
    }, true);
    window.addEventListener('resize', function () {
        if (selected) positionBar();
    });

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('a[href]').forEach(function (link) {
            link.setAttribute('data-ng-href', link.getAttribute('href'));
        });
        if (host) host.ready(window);
    });

    window.NGEdit = {
        setModel: function (content, media) {
            if (content) window.CONTENT = content;
            if (media) {
                window.MEDIA = media.images || window.MEDIA;
                window.MEDIA_VIDEO = media.videos || window.MEDIA_VIDEO;
            }
            this.rerender();
        },

        rerender: function () {
            if (window.Components) window.Components.mount();
            if (window.Teatro) window.Teatro.render();
            else if (window.Render) window.Render.render();
        },

        select: function (path) {
            selected = path;
            markSelected();
            var node = path && nodeFor(path);
            if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        highlight: function (path) {
            var node = path && nodeFor(path);
            if (node) showChrome(node);
            else hideChrome();
        },

        current: function () {
            return selected;
        }
    };
})();
