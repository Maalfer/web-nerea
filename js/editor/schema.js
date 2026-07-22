(function () {
    'use strict';

    var SHAPES = [
        { value: 'auto', label: 'Automática' },
        { value: 'portrait', label: 'Vertical' },
        { value: 'wide', label: 'Apaisada' },
        { value: 'contain', label: 'Completa sin recortar' }
    ];

    var blocks = {

        section: {
            label: 'Sección',
            icon: 'bi-flag',
            hint: 'Encabezado grande que abre un apartado. Todo lo que va debajo pertenece a esta sección.',
            fields: [
                { key: 'eyebrow', label: 'Antetítulo', type: 'text', placeholder: '01 — Cómics' },
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'text', label: 'Descripción', type: 'textarea' },
                { key: 'alt', label: 'Fondo alternativo', type: 'toggle' },
                { key: 'id', label: 'Ancla para enlaces', type: 'text', advanced: true, placeholder: 'comics' }
            ],
            inline: { eyebrow: '.eyebrow', title: 'h2', text: 'p' },
            create: function () {
                return { type: 'section', title: 'Nueva sección', text: '' };
            }
        },

        sub: {
            label: 'Subtítulo',
            icon: 'bi-type-h3',
            hint: 'Encabezado menor para separar trabajos dentro de una sección.',
            fields: [
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'text', label: 'Descripción', type: 'textarea' }
            ],
            inline: { title: 'h3', text: 'p' },
            create: function () {
                return { type: 'sub', title: 'Nuevo apartado', text: '' };
            }
        },

        feature: {
            label: 'Imagen destacada',
            icon: 'bi-image',
            hint: 'Una sola imagen a gran tamaño con pie opcional.',
            fields: [
                { key: 'group', label: 'Álbum', type: 'imageGroup' },
                { key: 'i', label: 'Imagen', type: 'imageIndex' },
                { key: 'caption', label: 'Pie de foto', type: 'text' },
                { key: 'tall', label: 'Altura grande', type: 'toggle' }
            ],
            inline: { caption: 'figcaption' },
            create: function (group) {
                return { type: 'feature', group: group, i: 0, caption: '' };
            }
        },

        strip: {
            label: 'Tira de imágenes',
            icon: 'bi-view-list',
            hint: 'Fila de imágenes con el mismo alto.',
            fields: [
                { key: 'group', label: 'Álbum', type: 'imageGroup' },
                { key: 'items', label: 'Imágenes', type: 'imageItems' },
                {
                    key: 'cols', label: 'Columnas', type: 'select', options: [
                        { value: '', label: 'Automáticas' },
                        { value: 2, label: '2' },
                        { value: 3, label: '3' }
                    ]
                },
                { key: 'shape', label: 'Recorte', type: 'select', options: SHAPES },
                { key: 'note', label: 'Nota sobre la tira', type: 'textarea' }
            ],
            inline: { note: '.project-note' },
            create: function (group) {
                return { type: 'strip', group: group, shape: 'auto' };
            }
        },

        grid: {
            label: 'Cuadrícula',
            icon: 'bi-grid-3x3-gap',
            hint: 'Rejilla de imágenes que se adapta al ancho.',
            fields: [
                { key: 'group', label: 'Álbum', type: 'imageGroup' },
                { key: 'items', label: 'Imágenes', type: 'imageItems' },
                {
                    key: 'variant', label: 'Tamaño', type: 'select', options: [
                        { value: '', label: 'Normal' },
                        { value: 'sm', label: 'Pequeño' },
                        { value: 'lg', label: 'Grande' }
                    ]
                },
                { key: 'shape', label: 'Recorte', type: 'select', options: SHAPES }
            ],
            create: function (group) {
                return { type: 'grid', group: group };
            }
        },

        mosaic: {
            label: 'Mosaico',
            icon: 'bi-columns-gap',
            hint: 'Composición irregular, con las imágenes a distintos tamaños.',
            fields: [
                { key: 'group', label: 'Álbum', type: 'imageGroup' },
                { key: 'items', label: 'Imágenes', type: 'imageItems' }
            ],
            create: function (group) {
                return { type: 'mosaic', group: group };
            }
        },

        carousel: {
            label: 'Carrusel',
            icon: 'bi-arrow-left-right',
            hint: 'Pase de imágenes con flechas y miniaturas.',
            fields: [
                { key: 'group', label: 'Álbum', type: 'imageGroup' },
                { key: 'items', label: 'Imágenes', type: 'imageItems' },
                { key: 'caption', label: 'Pie de foto', type: 'text' }
            ],
            create: function (group) {
                return { type: 'carousel', group: group };
            }
        },

        video: {
            label: 'Vídeo',
            icon: 'bi-play-btn',
            hint: 'Reproduce los vídeos de un álbum de vídeo.',
            fields: [
                { key: 'group', label: 'Álbum de vídeo', type: 'videoGroup' },
                { key: 'note', label: 'Nota sobre el vídeo', type: 'textarea' }
            ],
            inline: { note: '.project-note' },
            create: function (group, media) {
                var groups = Object.keys((media || {}).videos || {});
                return { type: 'video', group: groups[0] || '' };
            }
        },

        links: {
            label: 'Botones',
            icon: 'bi-link-45deg',
            hint: 'Fila de botones o enlaces de descarga.',
            fields: [
                { key: 'items', label: 'Botones', type: 'links' }
            ],
            create: function () {
                return { type: 'links', items: [{ label: 'Ver más', href: '#', primary: true }] };
            }
        },

        split: {
            label: 'Texto con imagen',
            icon: 'bi-layout-split',
            hint: 'Bloque a dos columnas: texto a un lado y una imagen al otro.',
            fields: [
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'sub', label: 'Subtítulo', type: 'text' },
                { key: 'text', label: 'Texto', type: 'textarea' },
                {
                    key: 'side', label: 'Imagen a la', type: 'select', options: [
                        { value: '', label: 'Derecha' },
                        { value: 'right', label: 'Izquierda' }
                    ]
                },
                { key: 'media.group', label: 'Álbum', type: 'imageGroup' },
                { key: 'media.i', label: 'Imagen', type: 'imageIndex', groupKey: 'media.group' },
                { key: 'id', label: 'Ancla para enlaces', type: 'text', advanced: true }
            ],
            inline: { title: '.split-text h3', sub: '.split-text .sub', text: '.split-text p:not(.sub)' },
            create: function (group) {
                return {
                    type: 'split', title: 'Nuevo proyecto', text: '',
                    media: { type: 'feature', group: group, i: 0 }
                };
            }
        },

        flipbook: {
            label: 'Libro hojeable',
            icon: 'bi-book',
            hint: 'Publicación que se pasa página a página, con descarga en PDF.',
            fields: [
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'text', label: 'Descripción', type: 'textarea' },
                { key: 'group', label: 'Álbum de páginas', type: 'imageGroup' },
                { key: 'pdf', label: 'PDF para descargar', type: 'pdf' },
                { key: 'id', label: 'Ancla para enlaces', type: 'text', advanced: true }
            ],
            inline: { title: 'h3', text: '.section-head p' },
            create: function (group) {
                return { type: 'flipbook', title: 'Nueva publicación', group: group };
            }
        },

        project: {
            label: 'Obra de teatro',
            icon: 'bi-mask',
            hint: 'Ficha de una obra: texto, vídeos, galería y reel de Instagram.',
            fields: [
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'subtitle', label: 'Subtítulo', type: 'text' },
                { key: 'text', label: 'Descripción', type: 'textarea' },
                { key: 'flip', label: 'Texto a la derecha', type: 'toggle' },
                { key: 'gallery', label: 'Álbum de fotos', type: 'imageGroup' },
                { key: 'mainCount', label: 'Fotos en la fila principal', type: 'number', min: 0, max: 12 },
                { key: 'videoGroup', label: 'Álbum de vídeo', type: 'videoGroup' },
                { key: 'reel', label: 'Reel de Instagram', type: 'text', placeholder: 'https://www.instagram.com/reel/…' },
                {
                    key: 'reelPosition', label: 'Posición del reel', type: 'select', options: [
                        { value: '', label: 'Arriba' },
                        { value: 'bottom', label: 'Abajo' }
                    ]
                },
                { key: 'id', label: 'Ancla para enlaces', type: 'text', advanced: true }
            ],
            inline: {
                title: '.section-title', subtitle: '.section-subtitle', text: '.project-desc'
            },
            create: function (group) {
                return {
                    id: 'obra-' + Date.now().toString(36),
                    title: 'Nueva obra', subtitle: '', text: '',
                    flip: false, gallery: group, videoGroup: group, mainCount: 4, reel: ''
                };
            }
        }
    };

    var singles = {
        page: {
            label: 'Ajustes de la página',
            icon: 'bi-sliders',
            fields: [
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'subtitle', label: 'Subtítulo', type: 'text' },
                {
                    key: 'hero', label: 'Portada', type: 'hero',
                    when: function (value, path) {
                        return path !== 'pages.teatro';
                    }
                },
                { key: 'index', label: 'Índice de la página', type: 'pageIndex' }
            ],
            inline: { title: 'h1', subtitle: '.page-hero-body p' }
        },

        gate: {
            label: 'Acceso de portada',
            icon: 'bi-door-open',
            fields: [
                { key: 'num', label: 'Número', type: 'text' },
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'text', label: 'Descripción', type: 'textarea' },
                { key: 'href', label: 'Enlace', type: 'text' },
                { key: 'group', label: 'Álbum', type: 'imageGroup' },
                { key: 'index', label: 'Imagen', type: 'imageIndex' }
            ],
            inline: { title: 'h2', text: '.gate-panel-body p' },
            list: 'gates',
            create: function (group) {
                return {
                    num: '04', title: 'Nuevo acceso', text: '',
                    href: 'index.html', group: group, index: 0
                };
            }
        },

        download: {
            label: 'Tarjeta de descarga',
            icon: 'bi-download',
            fields: [
                { key: 'icon', label: 'Icono', type: 'icon' },
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'text', label: 'Descripción', type: 'textarea' },
                { key: 'links', label: 'Botones', type: 'links' }
            ],
            inline: { title: 'h3', text: 'p' },
            list: 'downloads',
            create: function () {
                return {
                    icon: 'bi-download', title: 'Nueva descarga', text: '',
                    links: [{ label: 'Descargar', href: 'assets/pdf/cv-es.pdf', primary: true }]
                };
            }
        },

        about: {
            label: 'Sobre mí',
            icon: 'bi-person',
            fields: [
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'paragraphs', label: 'Párrafos', type: 'list' },
                { key: 'education', label: 'Formación', type: 'list' },
                { key: 'facts', label: 'Datos destacados', type: 'facts' },
                { key: 'group', label: 'Álbum del retrato', type: 'imageGroup' }
            ],
            inline: { title: 'h2' }
        },

        reference: {
            label: 'Referencia',
            icon: 'bi-quote',
            fields: [
                { key: 'name', label: 'Nombre', type: 'text' },
                { key: 'href', label: 'Enlace', type: 'text' },
                { key: 'text', label: 'Texto', type: 'textarea' },
                { key: 'group', label: 'Álbum', type: 'imageGroup' },
                { key: 'index', label: 'Imagen', type: 'imageIndex' }
            ],
            inline: { name: 'h3', text: 'p' },
            list: 'references',
            create: function (group) {
                return {
                    name: 'Nueva referencia', href: 'https://', text: '',
                    group: group, index: 0
                };
            }
        },

        site: {
            label: 'Datos de contacto',
            icon: 'bi-envelope',
            fields: [
                { key: 'name', label: 'Nombre', type: 'text' },
                { key: 'role', label: 'Profesión', type: 'text' },
                { key: 'tagline', label: 'Lema', type: 'text' },
                { key: 'email', label: 'Correo', type: 'text' },
                { key: 'phone', label: 'Teléfono', type: 'text' },
                { key: 'location', label: 'Ubicación', type: 'text' },
                { key: 'instagram', label: 'Instagram', type: 'text' },
                { key: 'linkedin', label: 'LinkedIn', type: 'text' }
            ]
        }
    };

    var pages = {
        home: { label: 'Inicio', file: 'index.html', list: null },
        ilustracion: { label: 'Ilustración', file: 'ilustracion.html', list: 'pages.ilustracion.blocks' },
        escultura: { label: 'Escultura', file: 'escultura.html', list: 'pages.escultura.blocks' },
        teatro: { label: 'Teatro', file: 'teatro.html', list: 'pages.teatro.projects' }
    };

    var palette = {
        home: [
            { kind: 'gate', list: 'gates' },
            { kind: 'download', list: 'downloads' },
            { kind: 'reference', list: 'references' }
        ],
        blocks: ['section', 'sub', 'split', 'feature', 'strip', 'grid', 'mosaic',
            'carousel', 'video', 'links', 'flipbook'],
        projects: ['project']
    };

    function kindForPath(path) {
        if (path === 'site') return 'site';
        if (path === 'about') return 'about';
        if (/^gates\.\d+$/.test(path)) return 'gate';
        if (/^downloads\.\d+$/.test(path)) return 'download';
        if (/^references\.\d+$/.test(path)) return 'reference';
        if (/^pages\.[a-z-]+$/.test(path)) return 'page';
        return null;
    }

    window.NGSchema = {
        blocks: blocks,
        singles: singles,
        pages: pages,
        palette: palette,
        kindForPath: kindForPath,

        /** True for elements that live alone: they cannot be moved, copied or deleted. */
        singleton: function (path) {
            return path === 'site' || path === 'about' || /^pages\.[a-z-]+$/.test(path);
        },

        describe: function (path, value) {
            var kind = kindForPath(path);
            if (kind) return singles[kind];
            if (/^pages\.teatro\.projects\.\d+$/.test(path)) return blocks.project;
            if (value && value.type && blocks[value.type]) return blocks[value.type];
            return null;
        },

        labelFor: function (path, value) {
            var spec = window.NGSchema.describe(path, value);
            if (!spec) return 'Bloque';
            return spec.label;
        }
    };
})();
