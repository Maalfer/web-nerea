(function () {
    'use strict';

    var BASE = window.API_BASE || null;

    function local() {
        return window.CONTENT || {};
    }

    function request(path, fallback) {
        if (!BASE) return Promise.resolve(fallback());
        return fetch(BASE.replace(/\/$/, '') + path, { headers: { Accept: 'application/json' } })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .catch(function () {
                return fallback();
            });
    }

    window.Api = {
        isRemote: function () {
            return !!BASE;
        },

        getSite: function () {
            return request('/site', function () {
                return local().site || {};
            });
        },

        getPage: function (slug) {
            return request('/pages/' + slug, function () {
                return (local().pages || {})[slug] || null;
            });
        },

        getHome: function () {
            return request('/pages/home', function () {
                var data = local();
                return {
                    site: data.site,
                    home: data.home || {},
                    gates: data.gates || [],
                    downloads: data.downloads || [],
                    about: data.about || null,
                    references: data.references || []
                };
            });
        },

        getMedia: function (group) {
            return request('/media/' + encodeURIComponent(group), function () {
                return (window.MEDIA || {})[group] || [];
            });
        }
    };
})();
