(function () {
    'use strict';

    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }

    var docs = [];

    function size(bytes) {
        if (!bytes) return '—';
        var mb = bytes / (1024 * 1024);
        return mb >= 1 ? mb.toFixed(1) + ' MB' : Math.round(bytes / 1024) + ' KB';
    }

    function when(iso) {
        if (!iso) return 'sin archivo';
        var d = new Date(iso);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    function shell(title) {
        var overlay = el('div', 'ng-modal');
        var panel = el('div', 'ng-modal-panel ng-modal-panel--slim');
        var head = el('header', 'ng-modal-head');
        head.appendChild(el('h2', null, title));
        var shut = el('button', 'ng-icon-btn', '<i class="bi bi-x-lg"></i>');
        shut.type = 'button';
        shut.addEventListener('click', function () {
            overlay.remove();
        });
        head.appendChild(shut);
        panel.appendChild(head);

        var body = el('div', 'ng-modal-body ng-modal-body--plain');
        panel.appendChild(body);
        overlay.appendChild(panel);
        overlay.addEventListener('mousedown', function (event) {
            if (event.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
        return { overlay: overlay, body: body };
    }

    function documentsModal() {
        var box = shell('Documentos en PDF');
        box.body.appendChild(el('p', 'ng-hint',
            'Sustituye cualquier PDF de la web. El archivo nuevo se publica al instante ' +
            'y se guarda una copia del anterior.'));

        var list = el('div', 'ng-doc-list');
        box.body.appendChild(list);

        function paint() {
            list.innerHTML = '';
            docs.forEach(function (doc) {
                var row = el('div', 'ng-doc');
                var info = el('div', 'ng-doc-info');
                info.appendChild(el('strong', null, doc.label));
                var meta = el('span', null, doc.filename + ' · ' + size(doc.size) + ' · ' + when(doc.updated));
                info.appendChild(meta);
                row.appendChild(info);

                var tools = el('div', 'ng-doc-tools');
                var view = el('a', 'ng-btn ng-btn--ghost', 'Ver');
                view.href = doc.url;
                view.target = '_blank';
                view.rel = 'noopener';
                tools.appendChild(view);

                var label = el('label', 'ng-btn ng-btn--gold', 'Sustituir');
                var input = el('input');
                input.type = 'file';
                input.accept = 'application/pdf,.pdf';
                input.hidden = true;
                label.appendChild(input);
                input.addEventListener('change', function () {
                    if (!input.files.length) return;
                    meta.textContent = 'Subiendo…';
                    window.Auth.upload(doc.key, input.files[0]).then(function (data) {
                        docs = docs.map(function (item) {
                            return item.key === doc.key ? data.document : item;
                        });
                        paint();
                        window.NGMedia.toast('PDF actualizado');
                    }).catch(function (error) {
                        window.NGMedia.toast(error.message || 'No se pudo subir', true);
                        paint();
                    });
                    input.value = '';
                });
                tools.appendChild(label);
                row.appendChild(tools);
                list.appendChild(row);
            });
        }

        paint();
    }

    function accountModal() {
        var box = shell('Cuenta');
        box.body.appendChild(el('p', 'ng-hint',
            'Cambia tu usuario, tu contraseña o ambos. Necesitas escribir la contraseña actual.'));

        var form = el('form', 'ng-fields');
        var fields = [
            { id: 'ng-current', label: 'Contraseña actual', type: 'password', required: true },
            { id: 'ng-user', label: 'Usuario nuevo', type: 'text' },
            { id: 'ng-pass', label: 'Contraseña nueva', type: 'password', hint: 'Mínimo 6 caracteres' }
        ];
        var inputs = {};

        fields.forEach(function (spec) {
            var wrap = el('div', 'ng-field');
            wrap.appendChild(el('label', null, spec.label));
            var input = el('input');
            input.type = spec.type;
            if (spec.required) input.required = true;
            if (spec.hint) input.placeholder = spec.hint;
            wrap.appendChild(input);
            form.appendChild(wrap);
            inputs[spec.id] = input;
        });

        var message = el('p', 'ng-hint');
        var send = el('button', 'ng-btn ng-btn--gold', 'Guardar');
        send.type = 'submit';
        form.appendChild(send);
        form.appendChild(message);

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            send.disabled = true;
            message.textContent = '';
            window.Auth.account(inputs['ng-current'].value, inputs['ng-user'].value, inputs['ng-pass'].value)
                .then(function (data) {
                    message.textContent = 'Datos actualizados.';
                    var who = document.getElementById('who');
                    if (who) who.textContent = data.username;
                    form.reset();
                })
                .catch(function (error) {
                    message.textContent = error.message || 'No se pudo guardar';
                })
                .then(function () {
                    send.disabled = false;
                });
        });

        box.body.appendChild(form);
    }

    window.NGSettings = {
        load: function () {
            return window.Auth.documents().then(function (data) {
                docs = data.documents || [];
                return docs;
            }).catch(function () {
                return [];
            });
        },
        documents: function () {
            return docs;
        },
        openDocuments: documentsModal,
        openAccount: accountModal
    };
})();
