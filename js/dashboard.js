(function () {
    'use strict';

    function pick(id) {
        return document.getElementById(id);
    }

    function when(iso) {
        if (!iso) return '';
        var moment = new Date(iso);
        return moment.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' }) + ' a las ' +
            moment.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var note = pick('draft-note');
        if (!note) return;

        window.Auth.require().then(function (session) {
            if (!session) return;
            pick('panel-user').textContent = session.username;
            return window.Auth.getState();
        }).then(function (state) {
            if (!state) return;
            if (state.dirty) {
                note.className = 'panel-draft is-pending';
                note.innerHTML = '<i class="bi bi-pencil"></i> Tienes cambios guardados en el borrador ' +
                    'que todavía no se ven en la web. Ábrelos en el editor y pulsa «Publicar» cuando estés lista.';
            } else {
                note.className = 'panel-draft';
                note.innerHTML = '<i class="bi bi-check2-circle"></i> Todo lo editado está publicado' +
                    (state.publishedAt ? ' — última publicación el ' + when(state.publishedAt) : '') + '.';
            }
        }).catch(function () {
            note.className = 'panel-draft is-error';
            note.textContent = 'No se pudo conectar con el servidor.';
        });

        pick('logout').addEventListener('click', function () {
            window.Auth.logout().then(function () {
                window.location.href = 'index.html';
            });
        });
    });
})();
