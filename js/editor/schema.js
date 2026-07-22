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

        row: {
            label: 'Fila de columnas',
            icon: 'bi-layout-three-columns',
            hint: 'Divide el ancho en dos o tres columnas y coloca dentro los bloques que quieras.',
            fields: [
                {
                    key: 'cols', label: 'Número de columnas', type: 'select', options: [
                        { value: 2, label: '2 columnas' },
                        { value: 3, label: '3 columnas' }
                    ]
                },
                {
                    key: 'ratio', label: 'Proporción', type: 'select', options: [
                        { value: '', label: 'Iguales' },
                        { value: '3367', label: 'Estrecha + ancha' },
                        { value: '6733', label: 'Ancha + estrecha' }
                    ]
                },
                { key: 'gap', label: 'Separación entre columnas', type: 'number', min: 0, max: 100 },
                { key: 'middle', label: 'Centrar verticalmente', type: 'toggle' }
            ],
            create: function () {
                return { type: 'row', cols: 2, gap: 30, columns: [[], []] };
            }
        },

        heading: {
            label: 'Título suelto',
            icon: 'bi-type-h2',
            hint: 'Un título por su cuenta, sin la línea ni el antetítulo de una sección.',
            fields: [
                { key: 'text', label: 'Texto', type: 'text' },
                {
                    key: 'level', label: 'Tamaño', type: 'select', options: [
                        { value: 'h2', label: 'Grande' },
                        { value: 'h3', label: 'Mediano' },
                        { value: 'h4', label: 'Pequeño' }
                    ]
                }
            ],
            inline: { text: ':self' },
            create: function () {
                return { type: 'heading', text: 'Nuevo título', level: 'h2' };
            }
        },

        text: {
            label: 'Texto',
            icon: 'bi-text-paragraph',
            hint: 'Uno o varios párrafos. Deja una línea en blanco para separar párrafos.',
            fields: [
                { key: 'text', label: 'Texto', type: 'textarea' }
            ],
            inline: { text: ':self' },
            create: function () {
                return { type: 'text', text: 'Escribe aquí tu texto.' };
            }
        },

        button: {
            label: 'Botón',
            icon: 'bi-hand-index',
            hint: 'Un botón que lleva a otra página, a un PDF o a un enlace externo.',
            fields: [
                { key: 'label', label: 'Texto del botón', type: 'text' },
                { key: 'href', label: 'Enlace', type: 'pdf' },
                {
                    key: 'variant', label: 'Estilo', type: 'select', options: [
                        { value: '', label: 'Destacado' },
                        { value: 'ghost', label: 'Contorno' }
                    ]
                },
                { key: 'blank', label: 'Abrir en otra pestaña', type: 'toggle' },
                { key: 'download', label: 'Nombre al descargar', type: 'text', advanced: true }
            ],
            inline: { label: 'a' },
            create: function () {
                return { type: 'button', label: 'Ver más', href: '#' };
            }
        },

        spacer: {
            label: 'Espacio',
            icon: 'bi-distribute-vertical',
            hint: 'Hueco vacío para separar dos bloques.',
            fields: [
                { key: 'height', label: 'Altura en píxeles', type: 'number', min: 0, max: 400 }
            ],
            create: function () {
                return { type: 'spacer', height: 40 };
            }
        },

        divider: {
            label: 'Separador',
            icon: 'bi-hr',
            hint: 'Una línea fina que separa contenidos.',
            fields: [
                { key: 'width', label: 'Ancho (%)', type: 'number', min: 5, max: 100 }
            ],
            create: function () {
                return { type: 'divider', width: 100 };
            }
        },

        html: {
            label: 'Código',
            icon: 'bi-code-slash',
            hint: 'Para pegar un incrustado de fuera: un vídeo de YouTube, un mapa, un reel…',
            fields: [
                { key: 'code', label: 'Código HTML', type: 'textarea' }
            ],
            create: function () {
                return { type: 'html', code: '' };
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

        header: {
            label: 'Cabecera y menú',
            icon: 'bi-menu-button-wide',
            hint: 'El nombre de arriba y los enlaces del menú, en todas las páginas. ' +
                'El botón «Acceder» se añade solo.',
            fields: [
                { key: 'brand', label: 'Nombre', type: 'text' },
                { key: 'accent', label: 'Parte en dorado', type: 'text' },
                { key: 'links', label: 'Enlaces del menú', type: 'navLinks' }
            ],
            inline: { brand: '.brand' }
        },

        footer: {
            label: 'Pie de página',
            icon: 'bi-layout-text-window-reverse',
            hint: 'Las tres columnas del final. Los datos de contacto salen de «Datos de contacto».',
            fields: [
                { key: 'aboutTitle', label: 'Título de la 1ª columna', type: 'text' },
                { key: 'about', label: 'Texto de presentación', type: 'textarea' },
                { key: 'portfolioTitle', label: 'Título de la 2ª columna', type: 'text' },
                { key: 'portfolio', label: 'Enlaces del portfolio', type: 'navLinks' },
                { key: 'contactTitle', label: 'Título de la 3ª columna', type: 'text' },
                { key: 'rights', label: 'Aviso de derechos', type: 'text',
                    hint: 'El año se pone solo cada 1 de enero.' }
            ]
        },

        home: {
            label: 'Portada',
            icon: 'bi-house',
            hint: 'El titular grande de la página de inicio.',
            fields: [
                { key: 'title', label: 'Titular', type: 'text' },
                { key: 'accent', label: 'Parte en dorado', type: 'text' },
                { key: 'tagline', label: 'Lema', type: 'text' }
            ],
            inline: { tagline: 'p' }
        },

        homeHead: {
            label: 'Encabezado de sección',
            icon: 'bi-textarea-t',
            hint: 'Antetítulo, título y descripción de este bloque de la portada.',
            fields: [
                { key: 'eyebrow', label: 'Antetítulo', type: 'text' },
                { key: 'title', label: 'Título', type: 'text' },
                { key: 'text', label: 'Descripción', type: 'textarea' }
            ],
            inline: { eyebrow: '.eyebrow', title: 'h2', text: 'p' }
        },

        theme: {
            label: 'Diseño global',
            icon: 'bi-palette2',
            hint: 'Colores y tamaño de letra de toda la web. Afecta a las cuatro páginas a la vez.',
            fields: [
                { key: 'gold', label: 'Color de acento', type: 'colorField', hint: 'Títulos destacados, enlaces y botones.' },
                { key: 'bg', label: 'Fondo principal', type: 'colorField' },
                { key: 'bgAlt', label: 'Fondo alterno', type: 'colorField', hint: 'El de las secciones con fondo distinto.' },
                { key: 'text', label: 'Texto principal', type: 'colorField' },
                { key: 'textDim', label: 'Texto secundario', type: 'colorField' },
                {
                    key: 'scale', label: 'Tamaño general de la letra', type: 'select', options: [
                        { value: '', label: 'Normal' },
                        { value: '0.92', label: 'Más pequeña' },
                        { value: '1.08', label: 'Más grande' },
                        { value: '1.16', label: 'Mucho más grande' }
                    ]
                }
            ]
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
        blocks: ['section', 'sub', 'heading', 'text', 'row', 'split', 'feature', 'strip',
            'grid', 'mosaic', 'carousel', 'video', 'button', 'links', 'divider',
            'spacer', 'flipbook', 'html'],
        projects: ['project']
    };

    function kindForPath(path) {
        if (path === 'header') return 'header';
        if (path === 'footer') return 'footer';
        if (path === 'home') return 'home';
        if (/^home\.(downloads|references|contact)$/.test(path)) return 'homeHead';
        if (path === 'site.theme') return 'theme';
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
            return path === 'site' || path === 'site.theme' || path === 'about' ||
                path === 'header' || path === 'footer' || path.indexOf('home') === 0 ||
                /^pages\.[a-z-]+$/.test(path);
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
