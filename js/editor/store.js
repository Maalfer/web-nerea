(function () {
    'use strict';

    var LIMIT = 80;

    var state = {
        model: null,
        media: { images: {}, videos: {} },
        published: null,
        past: [],
        future: [],
        saved: null,
        listeners: []
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function same(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function parts(path) {
        return String(path).split('.');
    }

    function get(root, path) {
        var keys = parts(path);
        var cursor = root;
        for (var n = 0; n < keys.length; n++) {
            if (cursor == null) return undefined;
            cursor = cursor[keys[n]];
        }
        return cursor;
    }

    function set(root, path, value) {
        var keys = parts(path);
        var cursor = root;
        for (var n = 0; n < keys.length - 1; n++) {
            var key = keys[n];
            if (cursor[key] == null) cursor[key] = /^\d+$/.test(keys[n + 1]) ? [] : {};
            cursor = cursor[key];
        }
        var last = keys[keys.length - 1];
        if (value === undefined) delete cursor[last];
        else cursor[last] = value;
        return root;
    }

    function announce(reason, detail) {
        state.listeners.forEach(function (fn) {
            fn(reason, detail || {});
        });
    }

    var Store = {
        init: function (payload) {
            state.model = payload.draft;
            state.published = payload.published;
            state.media = payload.media || { images: {}, videos: {} };
            state.saved = clone(payload.draft);
            state.past = [];
            state.future = [];
            announce('init');
        },

        model: function () {
            return state.model;
        },

        media: function () {
            return state.media;
        },

        setMedia: function (media) {
            state.media = media;
            announce('media');
        },

        published: function () {
            return state.published;
        },

        setPublished: function (data) {
            state.published = clone(data);
            announce('published');
        },

        markPublished: function () {
            state.published = clone(state.model);
            state.saved = clone(state.model);
            announce('published');
        },

        markSaved: function () {
            state.saved = clone(state.model);
            announce('saved');
        },

        unsaved: function () {
            return !same(state.model, state.saved);
        },

        unpublished: function () {
            return !same(state.model, state.published);
        },

        get: function (path) {
            return get(state.model, path);
        },

        /** Runs a mutation on a copy of the model and records it for undo. */
        mutate: function (worker, options) {
            var opts = options || {};
            var next = clone(state.model);
            var outcome = worker(next);
            if (outcome === false) return false;
            if (same(next, state.model)) return false;

            state.past.push(state.model);
            if (state.past.length > LIMIT) state.past.shift();
            state.future = [];
            state.model = next;
            announce('change', { quiet: !!opts.quiet, path: opts.path });
            return true;
        },

        setField: function (path, value, options) {
            return Store.mutate(function (model) {
                set(model, path, value);
            }, options);
        },

        canUndo: function () {
            return state.past.length > 0;
        },

        canRedo: function () {
            return state.future.length > 0;
        },

        undo: function () {
            if (!state.past.length) return false;
            state.future.push(state.model);
            state.model = state.past.pop();
            announce('change', {});
            return true;
        },

        redo: function () {
            if (!state.future.length) return false;
            state.past.push(state.model);
            state.model = state.future.pop();
            announce('change', {});
            return true;
        },

        replace: function (model) {
            state.past.push(state.model);
            state.model = clone(model);
            state.future = [];
            announce('change', {});
        },

        listen: function (fn) {
            state.listeners.push(fn);
        },

        path: { get: get, set: set, parts: parts, clone: clone }
    };

    window.NGStore = Store;
})();
