# Portfolio de Nerea González López

Web del portfolio de Nerea: ilustración, escultura y teatro.
En producción: https://nereagonzalez.art

HTML, CSS y JavaScript sin dependencias ni build. El sitio funciona como
estático; el panel de administración necesita el pequeño servicio de `server/`.

## Estructura

```
index.html         Portada con los tres apartados, descargas, sobre mí y contacto
ilustracion.html   Apartado de ilustración
escultura.html     Apartado de escultura
teatro.html        Apartado de teatro
login.html         Acceso al panel (/login)
dashboard.html     Panel: documentos y datos de la cuenta (/dashboard)
css/styles.css     Estilos
js/data/           Contenido (content.js) y catálogo de imágenes (media.js)
js/                api, render, componentes, carrusel, lightbox, flipbook, auth
server/app.py      API del panel (FastAPI)
images/ video/     Material optimizado (WebP y MP4)
assets/pdf/        CV y portfolios descargables
```

Para cambiar textos, títulos u orden de las secciones se edita
`js/data/content.js`. Las rutas de las imágenes están en `js/data/media.js`.

## Panel

`/login` da paso a `/dashboard`, donde se sustituyen los PDF del currículum y
los portfolios (se guarda copia de los tres últimos archivos reemplazados) y se
cambian el usuario y la contraseña.

La API vive detrás de `/api` y guarda las credenciales fuera del directorio
público, cifradas con scrypt. La sesión es una cookie firmada de 8 horas.

## Despliegue

El sitio se sirve con nginx desde `/var/www/nereagonzalez.art` y la API con
systemd (`nereagonzalez-api.service`) escuchando en `127.0.0.1:8010`.

```
rsync -a --delete --exclude server ./ root@servidor:/var/www/nereagonzalez.art/
scp server/app.py root@servidor:/opt/nereagonzalez/app.py
ssh root@servidor 'systemctl restart nereagonzalez-api'
```

Sin backend (por ejemplo en GitHub Pages) todo el portfolio se ve igual: solo
el panel queda inactivo.
