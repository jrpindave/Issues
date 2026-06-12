# Revisión de correos Easywood — Los Ángeles 242

Informe HTML autocontenido (`index.html`) que contrasta la minuta de Easywood con el
registro de correos del proyecto **Los Ángeles 242 / Portal Oriente (242 viviendas)**.

## Estructura

```
index.html    → informe completo (imágenes incrustadas en base64/WebP)
correos/      → correos .msg originales de Outlook, enlazados desde el informe
```

## Decisiones técnicas (cimientos para próximas iteraciones)

- **Design system:** usa los tokens del *Garcia Constructora Design System*
  (repo `Utilidades`): paleta azul `#2871b8` / cafés, tipografías Jost · IBM Plex Sans ·
  IBM Plex Mono, radios tight, marcadores cuadrados, lenguaje "pliego técnico".
  Los tokens están copiados inline en el `<style>` para que el archivo sea autocontenido.
- **Imágenes:** extraídas de los `.msg` y del `.docx` fuente, recomprimidas a WebP
  (calidad 83, máx. 1600 px de ancho) e incrustadas como data-URI. Total ≈ 1 MB.
- **Animaciones:** [AOS 2.3.4](https://github.com/michalsnik/aos) vía CDN — solo
  opacity/transform (no afecta rendimiento), `once: true`, deshabilitado con
  `prefers-reduced-motion`. Si el CDN falla, el contenido queda visible igual.
- **Zoom de imágenes:** lightbox propio sin dependencias. En escritorio, click abre la
  imagen y un segundo click aplica lupa 2× centrada en el cursor; en móvil (≤768 px) la
  imagen ocupa toda la pantalla con borde de 8 px y una **X** fija arriba a la derecha.
  Cierra con X, click en el fondo o tecla Escape.
- **Correos:** cada mención de un archivo entre comillas enlaza al `.msg` en `correos/`
  (atributo `download`), además de un chip de descarga al pie de cada hito.
