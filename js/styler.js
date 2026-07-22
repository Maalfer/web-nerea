(function () {
    'use strict';

    var DEVICES = [
        { key: 'base', query: null },
        { key: 'tablet', query: '(max-width: 980px)' },
        { key: 'mobile', query: '(max-width: 700px)' }
    ];

    var TEXT_TAGS = 'h1,h2,h3,h4,h5,p,span,strong,em,li,a,figcaption,blockquote';

    var BOX = [
        ['mt', 'margin-top', 'px'],
        ['mb', 'margin-bottom', 'px'],
        ['pt', 'padding-top', 'px'],
        ['pb', 'padding-bottom', 'px'],
        ['pl', 'padding-left', 'px'],
        ['pr', 'padding-right', 'px'],
        ['maxw', 'max-width', 'px'],
        ['bg', 'background-color', ''],
        ['radius', 'border-radius', 'px'],
        ['bw', 'border-width', 'px'],
        ['bc', 'border-color', '']
    ];

    var TEXT = [
        ['color', 'color', ''],
        ['size', 'font-size', 'px'],
        ['weight', 'font-weight', ''],
        ['ls', 'letter-spacing', 'px'],
        ['lh', 'line-height', ''],
        ['align', 'text-align', '']
    ];

    var SHADOWS = {
        soft: '0 10px 26px rgba(0,0,0,.35)',
        strong: '0 22px 60px rgba(0,0,0,.6)',
        glow: '0 0 0 1px rgba(240,183,0,.35), 0 18px 44px rgba(240,183,0,.12)'
    };

    var counter = 0;
    var buffer = [];

    function newId() {
        counter += 1;
        return 'b' + counter.toString(36) + Math.floor(Math.random() * 46656).toString(36);
    }

    function declarations(values, map) {
        var out = [];
        map.forEach(function (rule) {
            var value = values[rule[0]];
            if (value === undefined || value === null || value === '') return;
            out.push(rule[1] + ':' + value + rule[2] + ' !important');
        });
        return out;
    }

    function rulesFor(uid, values) {
        var pieces = [];
        var box = declarations(values, BOX);

        if (values.bw != null && values.bw !== '') box.push('border-style:solid !important');
        if (values.shadow && SHADOWS[values.shadow]) {
            box.push('box-shadow:' + SHADOWS[values.shadow] + ' !important');
        }
        if (values.shadow === 'none') box.push('box-shadow:none !important');
        if (values.maxw) box.push('margin-left:auto !important', 'margin-right:auto !important');
        if (values.hide) box.push('display:none !important');

        var text = declarations(values, TEXT);
        if (box.length) pieces.push('[data-ng-uid="' + uid + '"]{' + box.join(';') + '}');
        if (text.length) {
            var selector = TEXT_TAGS.split(',').map(function (tag) {
                return '[data-ng-uid="' + uid + '"] ' + tag;
            }).join(',');
            pieces.push('[data-ng-uid="' + uid + '"]{' + text.join(';') + '}');
            pieces.push(selector + '{' + text.join(';') + '}');
        }
        return pieces.join('');
    }

    function collect(uid, style) {
        if (!style) return;
        DEVICES.forEach(function (device) {
            var values = style[device.key];
            if (!values) return;
            var body = rulesFor(uid, values);
            if (!body) return;
            buffer.push(device.query ? '@media ' + device.query + '{' + body + '}' : body);
        });
    }

    function flush(doc) {
        var target = doc || document;
        var tag = target.getElementById('ng-block-style');
        if (!tag) {
            tag = target.createElement('style');
            tag.id = 'ng-block-style';
            target.head.appendChild(tag);
        }
        tag.textContent = buffer.join('\n');
        buffer = [];
    }

    function reset() {
        buffer = [];
    }

    /** Stamps the node so the generated rules reach it, then queues them. */
    function apply(node, block) {
        if (!node || !block || !block.style) return node;
        if (!block.uid) block.uid = newId();
        node.setAttribute('data-ng-uid', block.uid);
        collect(block.uid, block.style);
        return node;
    }

    function globals(site) {
        var theme = (site || {}).theme;
        if (!theme) return;
        var pairs = [
            ['gold', '--gold'],
            ['bg', '--bg'],
            ['bgAlt', '--bg-alt'],
            ['text', '--text'],
            ['textDim', '--text-dim']
        ];
        var out = [];
        pairs.forEach(function (pair) {
            if (theme[pair[0]]) out.push(pair[1] + ':' + theme[pair[0]]);
        });
        if (theme.scale) out.push('--ng-scale:' + theme.scale);
        if (out.length) buffer.push(':root{' + out.join(';') + '}');
        if (theme.scale && theme.scale !== 1) {
            buffer.push('body{font-size:calc(1rem * ' + theme.scale + ')}');
        }
    }

    window.Styler = {
        apply: apply,
        flush: flush,
        reset: reset,
        globals: globals,
        newId: newId,
        devices: DEVICES,
        shadows: Object.keys(SHADOWS)
    };
})();
