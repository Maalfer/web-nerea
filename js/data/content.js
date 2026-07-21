window.CONTENT = {

    site: {
        name: 'Nerea González López',
        role: 'Ilustradora y escultora',
        tagline: 'Ilustración · Escultura · Teatro',
        email: 'nerea0806@gmail.com',
        phone: '+34 689 040 797',
        location: 'Piedras Blancas, Castrillón · Asturias, España',
        instagram: 'https://www.instagram.com/ren_d_vincent/',
        linkedin: 'https://www.linkedin.com/in/nerea-gonz%C3%A1lez-l%C3%B3pez-6a4471132/'
    },

    downloads: [
        {
            icon: 'bi-brush',
            title: 'Ilustración',
            text: 'Currículum y portfolio completo de ilustración, cómic y diseño gráfico.',
            links: [
                { label: 'Portfolio ilustración', href: 'assets/pdf/portfolio-ilustracion.pdf', primary: true },
                { label: 'CV español', href: 'assets/pdf/cv-es.pdf' },
                { label: 'CV english', href: 'assets/pdf/cv-en.pdf' }
            ]
        },
        {
            icon: 'bi-hammer',
            title: 'Escultura',
            text: 'Currículum y portfolio completo de escultura aplicada al espectáculo y la publicidad.',
            links: [
                { label: 'Portfolio escultura', href: 'assets/pdf/portfolio-escultura.pdf', primary: true },
                { label: 'CV español', href: 'assets/pdf/cv-es.pdf' },
                { label: 'CV english', href: 'assets/pdf/cv-en.pdf' }
            ]
        }
    ],

    gates: [
        {
            num: '01',
            title: 'Ilustración',
            text: 'Cómic, álbum ilustrado, arte digital, diseño vectorial y merchandising.',
            href: 'ilustracion.html',
            group: 'ilustracion/hero',
            index: 0
        },
        {
            num: '02',
            title: 'Escultura',
            text: 'Escultura publicitaria en porexpan, dioramas, moldes y reproducciones.',
            href: 'escultura.html',
            group: 'escultura/dragon',
            index: 1
        },
        {
            num: '03',
            title: 'Teatro',
            text: 'Escenografía, utilería y acabados artísticos para ópera y teatro.',
            href: 'teatro.html',
            group: 'teatro/carmen',
            index: 0
        }
    ],

    about: {
        group: 'about',
        title: 'Sobre mí',
        paragraphs: [
            'Soy Nerea González López, artista asturiana con dos vidas que se alimentan la una a la otra: la ilustración y la escultura. Trabajo el poliestireno extruido y expandido, manejo CNC y he creado dioramas y figuras de gran formato para exposiciones; además soy competente en la fabricación de moldes mediante pincelado y colada.',
            'En el campo de la ilustración se me conoce por un estilo expresivo y un enfoque muy versátil: me muevo con soltura entre técnicas clásicas y digitales, y desarrollo tanto diseño gráfico como cómic.'
        ],
        education: [
            'Técnico superior en Ilustración — Escuela de Arte de Oviedo',
            'Técnico superior en Escultura aplicada al espectáculo — Escuela de Arte de Oviedo',
            'Curso de cómic certificado por SUNY Westchester (Peekskill, NY)',
            'Erasmus en la Scuola Internazionale di Comics de Roma'
        ],
        facts: [
            { value: 'HBO', label: 'Cráneo de Valerion' },
            { value: '3', label: 'Disciplinas' },
            { value: '+10', label: 'Proyectos comerciales' }
        ]
    },

    references: [
        {
            name: 'David Abrevaya',
            href: 'https://www.davidabrevaya.com/',
            group: 'referencias', index: 0,
            text: 'I have hired Nerea on several freelance assignments to assist my projects. She is a hard worker and a very skilled professional. I encourage taking a look at her website, where her creativity and technique are on display. Nerea is a warm and mature woman who shows tremendous potential in her commitment to create great art in a variety of mediums.'
        },
        {
            name: 'Proasur',
            href: 'https://www.proasur.com/',
            group: 'referencias', index: 1,
            text: 'Nerea González López ha realizado 100 horas de prácticas en PROASUR, S.L. siendo parte activa de la realización de la decoración para el restaurante Berty’s Burger, la maqueta de grandes dimensiones de Picos de Europa para el Centro de Visitantes de Posada de Valdeón y los elementos escenográficos e interactivos para el Oman Botanic Garden Museum.'
        },
        {
            name: 'MYLIDEAS',
            href: 'https://mylideas.com/',
            group: 'referencias', index: 3,
            text: 'Participación en el tallado y dirección de la policromía de la calavera de Valerion, proyecto encargado por HBO para la promoción de «La casa del dragón», así como en varios proyectos para la franquicia Pitufos y en la fabricación de coches para la Patrulla Canina.'
        },
        {
            name: 'Mario Álvarez',
            href: 'https://elpinguinodemario.es/',
            group: 'referencias', index: 2,
            text: 'Tuve el placer de contar con la ayuda de Nerea en varios de mis proyectos, tanto en mi academia El Rincón del Hacker como en mi canal de YouTube «El Pingüino de Mario», donde su aporte como diseñadora fue clave para mejorar el aspecto visual de mi marca personal.'
        }
    ],

    pages: {

        ilustracion: {
            title: 'Ilustración',
            subtitle: 'Cómic · Álbum ilustrado · Diseño',
            hero: { group: 'ilustracion/hero' },
            index: [
                { label: 'Cómics', href: '#comics' },
                { label: 'Cenicienta', href: '#cenicienta' },
                { label: 'Mural', href: '#mural' },
                { label: 'Platos', href: '#platos' },
                { label: 'Merchandising', href: '#merchandising' },
                { label: 'Diseño', href: '#diseno' },
                { label: 'Arte digital', href: '#digital' },
                { label: 'Vectorial', href: '#vectorial' },
                { label: 'Retratos', href: '#retratos' }
            ],
            blocks: [

                {
                    type: 'section', id: 'comics', eyebrow: '01 — Cómics',
                    title: 'Cómics',
                    text: 'Proyectos de narrativa gráfica: guion visual, entintado, color y diseño de personajes. Cada obra se muestra en el orden en que se lee.'
                },
                {
                    type: 'sub', title: 'Scars: Volumen 0',
                    text: 'Portada, páginas interiores y guardas del primer volumen.'
                },
                { type: 'feature', group: 'ilustracion/scars', i: 0, caption: 'Scars: Volumen 0 — portada', tall: true },
                { type: 'feature', group: 'ilustracion/scars', i: 1, caption: 'Página 1', tall: true },
                { type: 'strip', group: 'ilustracion/scars', from: 2, to: 5, cols: 3 },
                { type: 'strip', group: 'ilustracion/scars', from: 5, to: 7, cols: 2, note: 'Guardas' },
                {
                    type: 'sub', title: 'Diseño de personajes',
                    text: 'Fichas de personaje del universo de Scars.'
                },
                { type: 'carousel', group: 'ilustracion/scars-personajes' },

                {
                    type: 'section', id: 'devil-reign', alt: true,
                    eyebrow: 'Cómic', title: 'Devil Reign',
                    text: 'Trabajo como colorista para el cómic Devil Reign.'
                },
                { type: 'feature', group: 'ilustracion/devil-reign', i: 0, caption: 'Devil Reign — página 18', tall: true },
                { type: 'strip', group: 'ilustracion/devil-reign', from: 1, to: 4, cols: 3 },
                {
                    type: 'links', items: [
                        { label: 'Leer el número completo (PDF)', href: 'assets/pdf/devil-reign-dr4.pdf', primary: true }
                    ]
                },

                {
                    type: 'section', id: 'the-blind', eyebrow: 'Novela gráfica',
                    title: 'The Blind',
                    text: 'Portada y páginas de la novela gráfica The Blind.'
                },
                { type: 'feature', group: 'ilustracion/the-blind', i: 0, caption: 'The Blind — portada', tall: true },
                { type: 'strip', group: 'ilustracion/the-blind', from: 1, to: 3, cols: 2 },

                {
                    type: 'section', id: 'silence', alt: true, eyebrow: 'Cómic',
                    title: 'Silence',
                    text: 'Serie completa de páginas del cómic Silence.'
                },
                { type: 'feature', group: 'ilustracion/silence', i: 0, caption: 'Silence — página 1', tall: true },
                { type: 'grid', group: 'ilustracion/silence', from: 1, to: 6, shape: 'portrait', variant: 'sm' },

                {
                    type: 'section', id: 'cenicienta', eyebrow: '02 — Álbum ilustrado',
                    title: 'Cenicienta',
                    text: 'Diseño e ilustración para el libro de Cenicienta: cubierta, tripa y detalles de maquetación.'
                },
                { type: 'feature', group: 'ilustracion/cenicienta', i: 0, caption: 'Cenicienta — imagen principal' },
                { type: 'carousel', group: 'ilustracion/cenicienta', from: 1 },

                {
                    type: 'section', id: 'mural', alt: true, eyebrow: '03 — Mural',
                    title: 'Mural',
                    text: 'Pintura mural de gran formato realizada para las calles de Avilés dentro de un proyecto comunitario.'
                },
                { type: 'mosaic', group: 'ilustracion/mural' },
                { type: 'video', group: 'ilustracion/mural', note: 'Proceso de trabajo' },

                {
                    type: 'section', id: 'platos', eyebrow: '04 — Cerámica',
                    title: 'Platos ilustrados',
                    text: 'Ilustración aplicada sobre plato cerámico.'
                },
                { type: 'grid', group: 'ilustracion/platos', shape: 'wide' },

                {
                    type: 'section', id: 'merchandising', alt: true, eyebrow: '05 — Producto',
                    title: 'Merchandising',
                    text: 'Diseños llevados a producto: estampación textil, mockups, llaveros y otros artículos de convención.'
                },
                { type: 'mosaic', group: 'ilustracion/merchandising' },

                {
                    type: 'section', id: 'diseno', eyebrow: '06 — Diseño',
                    title: 'Diseño gráfico',
                    text: 'Cartelería, papelería e imagen aplicada.'
                },
                { type: 'mosaic', group: 'ilustracion/diseno' },

                {
                    type: 'section', id: 'digital', alt: true, eyebrow: '07 — Arte digital',
                    title: 'Arte digital',
                    text: 'Ilustración digital: banners de gran formato y diseño de personajes por encargo.'
                },
                { type: 'sub', title: 'Banners' },
                { type: 'grid', group: 'ilustracion/digital-banner', shape: 'wide', variant: 'lg' },
                { type: 'sub', title: 'Personajes' },
                { type: 'grid', group: 'ilustracion/digital-personajes', shape: 'portrait' },

                {
                    type: 'section', id: 'vectorial', eyebrow: '08 — Vectorial',
                    title: 'Diseño vectorial',
                    text: 'Vectorización y diseño de sets gráficos para videojuegos.'
                },
                { type: 'grid', group: 'ilustracion/vectorial', shape: 'contain', variant: 'sm' },

                {
                    type: 'section', id: 'retratos', alt: true, eyebrow: '09 — Encargos',
                    title: 'Retratos y encargos',
                    text: 'Retrato tradicional y encargos personalizados.'
                },
                { type: 'mosaic', group: 'ilustracion/retratos' }
            ]
        },

        escultura: {
            title: 'Escultura',
            subtitle: 'Publicidad · Dioramas · Moldes',
            hero: {
                slides: [
                    { group: 'escultura/dragon', i: 1 },
                    { group: 'escultura/paw-patrol', i: 1 },
                    { group: 'escultura/bertys-burger', i: 1 },
                    { group: 'escultura/pitufos-porex', i: 0 }
                ]
            },
            index: [
                { label: 'Escultura publicitaria', href: '#publicitaria' },
                { label: 'Dragón Valerion', href: '#valerion' },
                { label: 'Paw Patrol', href: '#paw-patrol' },
                { label: 'Berty’s Burger', href: '#bertys' },
                { label: 'Pitufos', href: '#pitufos' },
                { label: 'Dioramas y cursos', href: '#dioramas' },
                { label: 'Moldes y reproducciones', href: '#moldes' }
            ],
            blocks: [

                {
                    type: 'section', id: 'publicitaria', eyebrow: '01 — Sección principal',
                    title: 'Escultura publicitaria',
                    text: 'Esculturas realizadas en porexpan recubierto de poliurea, lijadas y pintadas a mano.'
                },
                {
                    type: 'split', id: 'valerion',
                    title: 'Dragón Valerion',
                    sub: 'Proyecto para HBO',
                    text: 'Cráneo de Valerion, escultura realizada para HBO. Peana hecha con porexpan, velas de epoxi espesada con sílice y cráneo con estructura soldada de metal recubierta de porexpan recubierto de poliurea. Pintado y tallado completamente a mano.',
                    media: { type: 'feature', group: 'escultura/dragon', i: 0, caption: 'Cráneo de Valerion' }
                },
                { type: 'grid', group: 'escultura/dragon', from: 1, to: 6, shape: 'wide' },

                {
                    type: 'section', id: 'paw-patrol', alt: true, eyebrow: 'Escultura publicitaria',
                    title: 'Paw Patrol',
                    text: 'Fabricación de coches interactivos para la Patrulla Canina.'
                },
                { type: 'feature', group: 'escultura/paw-patrol', i: 1, caption: 'Paw Patrol' },
                { type: 'strip', group: 'escultura/paw-patrol', items: [0, 2], cols: 2 },

                {
                    type: 'section', id: 'bertys', eyebrow: 'Escultura publicitaria',
                    title: 'Berty’s Burger',
                    text: 'Cartel publicitario para la cadena de hamburgueserías Berty’s Burger.'
                },
                { type: 'strip', group: 'escultura/bertys-burger', cols: 2 },
                { type: 'sub', title: 'Otros carteles' },
                { type: 'feature', group: 'escultura/pez', i: 0, caption: 'Cartel publicitario', tall: true },

                {
                    type: 'section', id: 'pitufos', alt: true, eyebrow: 'Escultura publicitaria',
                    title: 'Pitufos',
                    text: 'Proyectos para la franquicia Pitufos: displays publicitarios y villas para niños.'
                },
                {
                    type: 'split',
                    title: 'Armani × Pitufos',
                    sub: 'Stand publicitario',
                    text: 'Figura usada como stand publicitario para gafas de Armani en colaboración con la marca Pitufos. La figura original está realizada con impresora 3D de resina; después se realizaron varios moldes por partes de la figura para hacer reproducciones de esta en poliuretano.',
                    media: { type: 'grid', group: 'escultura/armani', shape: 'portrait', variant: 'sm' }
                },
                { type: 'sub', title: 'Esculturas de porexpan' },
                { type: 'grid', group: 'escultura/pitufos-porex', shape: 'wide' },

                {
                    type: 'section', id: 'dioramas', eyebrow: '02 — Sección',
                    title: 'Dioramas y cursos',
                    text: 'Proyecto de diorama de gran formato y cursos de escultura impartidos a alumnos.'
                },
                { type: 'feature', group: 'escultura/diorama-portada', i: 0, caption: 'Diorama — imagen de portada' },
                { type: 'sub', title: 'Estudio previo', text: 'Bocetos y estudio previo del proyecto.' },
                { type: 'strip', group: 'escultura/diorama-estudio', cols: 3 },
                { type: 'sub', title: 'Proceso', text: 'Construcción del diorama paso a paso.' },
                { type: 'mosaic', group: 'escultura/diorama-proceso' },
                {
                    type: 'flipbook', id: 'memoria', title: 'Memoria del proyecto',
                    text: 'Memoria completa del diorama. Haz clic en la portada para abrir el libro y pasa las páginas con las flechas o el teclado.',
                    group: 'escultura/memoria', pages: 76,
                    pdf: 'assets/pdf/memoria-diorama.pdf'
                },

                {
                    type: 'section', id: 'cursos', alt: true, eyebrow: 'Docencia',
                    title: 'Cursos de escultura',
                    text: 'Cursos impartidos a alumnos: cartel, ejemplos de trabajo y proceso en el taller.'
                },
                { type: 'feature', group: 'escultura/cursos', i: 0, caption: 'Cartel del curso', tall: true },
                { type: 'feature', group: 'escultura/cursos', i: 1, caption: 'Ejemplo de pieza' },
                { type: 'sub', title: 'El curso y los alumnos' },
                { type: 'mosaic', group: 'escultura/cursos', from: 2 },
                { type: 'video', group: 'escultura/cursos', note: 'Trabajo de los alumnos' },

                {
                    type: 'section', id: 'moldes', eyebrow: '03 — Sección',
                    title: 'Moldes y reproducciones',
                    text: 'Fabricación de moldes por pincelado y por colada, y reproducciones en distintos materiales.'
                },
                { type: 'mosaic', group: 'escultura/moldes' },

                {
                    type: 'section', id: 'encargos', alt: true, eyebrow: 'Encargos',
                    title: 'Encargos de figurillas',
                    text: 'Piezas pequeñas realizadas por encargo, agrupadas por proyecto.'
                },
                { type: 'sub', title: 'Barco' },
                { type: 'grid', group: 'escultura/encargos', from: 0, to: 1, shape: 'wide', variant: 'lg' },
                { type: 'sub', title: 'San Juanín' },
                { type: 'grid', group: 'escultura/encargos', from: 1, to: 3, shape: 'wide' },
                { type: 'sub', title: 'Figurilla de perro' },
                { type: 'grid', group: 'escultura/encargos', from: 3, to: 8, shape: 'wide' },

                {
                    type: 'section', id: 'other', eyebrow: 'Otros',
                    title: 'Other projects',
                    text: 'Cabezas, máscaras, relieves y policromías.'
                },
                { type: 'mosaic', group: 'escultura/other-projects' }
            ]
        }
    }
};
