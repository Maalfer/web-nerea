# Portfolio de Nerea González López

Web del portfolio de Nerea: ilustración, escultura y teatro.

HTML, CSS y JavaScript sin dependencias ni build. Se publica directamente en
GitHub Pages (`Settings → Pages → Deploy from a branch → main / root`).

## Estructura

```
index.html         Portada con los tres apartados, descargas, sobre mí y contacto
ilustracion.html   Apartado de ilustración
escultura.html     Apartado de escultura
teatro.html        Apartado de teatro
css/styles.css     Estilos
js/data/           Contenido (content.js) y catálogo de imágenes (media.js)
js/                api, render, componentes, carrusel, lightbox, flipbook
images/ video/     Material optimizado (WebP y MP4)
assets/pdf/        CV y portfolios descargables
```

Para cambiar textos, títulos u orden de las secciones se edita
`js/data/content.js`. Las rutas de las imágenes están en `js/data/media.js`.

## Backend

Las lecturas de datos pasan por `js/api.js`. Si algún día hay servidor, basta
con definir la URL antes de cargar los scripts:

```html
<script>window.API_BASE = 'https://api.ejemplo.com';</script>
```

Entonces la web consulta `/site`, `/pages/:slug` y `/media/:group`, y si el
servidor no responde sigue funcionando con los datos locales.
