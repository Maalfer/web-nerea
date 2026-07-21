(function () {
    'use strict';

    function el(tag, cls, html) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (html != null) node.innerHTML = html;
        return node;
    }

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

    function card(doc, onUpload) {
        var box = el('article', 'doc-card');
        box.appendChild(el('h3', null, doc.label));
        var meta = el('p', 'doc-meta', doc.filename + ' · ' + size(doc.size) + ' · ' + when(doc.updated));
        box.appendChild(meta);

        var actions = el('div', 'doc-actions');

        var view = el('a', 'btn-ghost', 'Ver');
        view.href = doc.url;
        view.target = '_blank';
        view.rel = 'noopener';
        actions.appendChild(view);

        var label = el('label', 'btn-bubble doc-upload',
            'Sustituir<span></span><span></span><span></span><span></span>');
        var input = el('input');
        input.type = 'file';
        input.accept = 'application/pdf,.pdf';
        input.hidden = true;
        label.appendChild(input);
        actions.appendChild(label);

        var status = el('span', 'doc-status');
        actions.appendChild(status);
        box.appendChild(actions);

        input.addEventListener('change', function () {
            if (!input.files.length) return;
            status.textContent = 'Subiendo…';
            status.className = 'doc-status';
            onUpload(doc.key, input.files[0], meta, status);
            input.value = '';
        });

        return box;
    }

    function renderDocuments(list) {
        var box = document.getElementById('documents');
        box.innerHTML = '';

        list.forEach(function (doc) {
            box.appendChild(card(doc, function (key, file, meta, status) {
                window.Auth.upload(key, file).then(function (data) {
                    var updated = data.document;
                    meta.textContent = updated.filename + ' · ' + size(updated.size) + ' · ' + when(updated.updated);
                    status.textContent = 'Actualizado';
                    status.className = 'doc-status is-ok';
                }).catch(function (error) {
                    status.textContent = error.message || 'No se pudo subir';
                    status.className = 'doc-status is-error';
                });
            }));
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!document.getElementById('documents')) return;

        window.Auth.require().then(function (session) {
            if (!session) return;
            document.getElementById('panel-user').textContent = session.username;
            document.getElementById('new-username').placeholder = session.username;
            return window.Auth.documents().then(function (data) {
                renderDocuments(data.documents);
            });
        }).catch(function () {
            document.getElementById('documents').innerHTML =
                '<p class="auth-msg is-error">No se pudo conectar con el servidor.</p>';
        });

        document.getElementById('logout').addEventListener('click', function () {
            window.Auth.logout().then(function () {
                window.location.href = 'index.html';
            });
        });

        var form = document.getElementById('account-form');
        var message = document.getElementById('account-msg');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var button = form.querySelector('button[type="submit"]');
            message.textContent = '';
            message.classList.remove('is-error');
            button.disabled = true;

            window.Auth.account(
                document.getElementById('current-password').value,
                document.getElementById('new-username').value,
                document.getElementById('new-password').value
            ).then(function (data) {
                message.textContent = 'Datos actualizados.';
                document.getElementById('panel-user').textContent = data.username;
                document.getElementById('new-username').placeholder = data.username;
                form.reset();
            }).catch(function (error) {
                message.textContent = error.message || 'No se pudo guardar';
                message.classList.add('is-error');
            }).then(function () {
                button.disabled = false;
            });
        });
    });
})();
