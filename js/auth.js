(function () {
    'use strict';

    var BASE = (window.API_BASE || '/api').replace(/\/$/, '');

    function request(path, options) {
        var opts = options || {};
        opts.credentials = 'same-origin';
        return fetch(BASE + path, opts).then(function (res) {
            if (res.status === 204) return null;
            return res.json().catch(function () {
                return {};
            }).then(function (body) {
                if (!res.ok) {
                    var error = new Error(body.detail || 'Error ' + res.status);
                    error.status = res.status;
                    throw error;
                }
                return body;
            });
        });
    }

    var Auth = {
        base: BASE,

        session: function () {
            return request('/session').catch(function () {
                return { authenticated: false };
            });
        },

        login: function (username, password) {
            var body = new FormData();
            body.append('username', username);
            body.append('password', password);
            return request('/login', { method: 'POST', body: body });
        },

        logout: function () {
            return request('/logout', { method: 'POST' });
        },

        documents: function () {
            return request('/documents');
        },

        upload: function (key, file) {
            var body = new FormData();
            body.append('file', file);
            return request('/documents/' + key, { method: 'POST', body: body });
        },

        getContent: function () {
            return request('/admin/content');
        },

        putContent: function (data) {
            return request('/admin/content', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },

        getMedia: function () {
            return request('/admin/media');
        },

        replaceImage: function (group, index, file) {
            var body = new FormData();
            body.append('group', group);
            body.append('index', index);
            body.append('file', file);
            return request('/admin/media/image', { method: 'POST', body: body });
        },

        replaceVideo: function (group, index, file) {
            var body = new FormData();
            body.append('group', group);
            body.append('index', index);
            body.append('file', file);
            return request('/admin/media/video', { method: 'POST', body: body });
        },

        getState: function () {
            return request('/admin/state');
        },

        putDraft: function (data, base) {
            return request('/admin/draft' + (base ? '?base=' + encodeURIComponent(base) : ''), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },

        draftVersion: function () {
            return request('/admin/draft/version');
        },

        publish: function (areas) {
            var body = new FormData();
            if (areas && areas.length) body.append('areas', JSON.stringify(areas));
            return request('/admin/publish', { method: 'POST', body: body });
        },

        trash: function () {
            return request('/admin/trash');
        },

        restoreTrash: function (item) {
            var body = new FormData();
            body.append('item', item);
            return request('/admin/trash/restore', { method: 'POST', body: body });
        },

        labelRevision: function (name, label) {
            var body = new FormData();
            body.append('name', name);
            body.append('label', label || '');
            return request('/admin/revisions/label', { method: 'POST', body: body });
        },

        discardDraft: function () {
            return request('/admin/discard', { method: 'POST' });
        },

        restoreRevision: function (name) {
            var body = new FormData();
            body.append('name', name);
            return request('/admin/revisions/restore', { method: 'POST', body: body });
        },

        createPage: function (slug, title, subtitle, menu) {
            var body = new FormData();
            body.append('slug', slug);
            body.append('title', title);
            body.append('subtitle', subtitle || '');
            body.append('menu', menu ? '1' : '');
            return request('/admin/pages', { method: 'POST', body: body });
        },

        deletePage: function (slug) {
            var body = new FormData();
            body.append('slug', slug);
            return request('/admin/pages/delete', { method: 'POST', body: body });
        },

        createGroup: function (kind, group) {
            var body = new FormData();
            body.append('kind', kind);
            body.append('group', group);
            return request('/admin/media/group', { method: 'POST', body: body });
        },

        addImage: function (group, file) {
            var body = new FormData();
            body.append('group', group);
            body.append('file', file);
            return request('/admin/media/image/new', { method: 'POST', body: body });
        },

        addVideo: function (group, file) {
            var body = new FormData();
            body.append('group', group);
            body.append('file', file);
            return request('/admin/media/video/new', { method: 'POST', body: body });
        },

        deleteMedia: function (kind, group, index) {
            var body = new FormData();
            body.append('kind', kind);
            body.append('group', group);
            body.append('index', index);
            return request('/admin/media/delete', { method: 'POST', body: body });
        },

        reorderMedia: function (kind, group, order) {
            var body = new FormData();
            body.append('kind', kind);
            body.append('group', group);
            body.append('order', JSON.stringify(order));
            return request('/admin/media/reorder', { method: 'POST', body: body });
        },

        account: function (currentPassword, username, password) {
            var body = new FormData();
            body.append('current_password', currentPassword);
            body.append('username', username || '');
            body.append('password', password || '');
            return request('/account', { method: 'POST', body: body });
        },

        require: function () {
            return Auth.session().then(function (data) {
                if (!data.authenticated) {
                    window.location.replace('login.html');
                    return null;
                }
                return data;
            });
        }
    };

    window.Auth = Auth;

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('login-form');
        if (!form) return;

        var message = document.getElementById('login-msg');

        Auth.session().then(function (data) {
            if (data.authenticated) window.location.replace('dashboard.html');
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var button = form.querySelector('button[type="submit"]');
            message.textContent = '';
            message.classList.remove('is-error');
            button.disabled = true;

            Auth.login(document.getElementById('username').value,
                document.getElementById('password').value)
                .then(function () {
                    window.location.href = 'dashboard.html';
                })
                .catch(function (error) {
                    message.textContent = error.status ? error.message : 'No se pudo conectar con el servidor.';
                    message.classList.add('is-error');
                    button.disabled = false;
                });
        });
    });
})();
