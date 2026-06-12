# Informes y presentaciones

Repositorio para publicar informes y presentaciones HTML mediante **GitHub Pages**.

🔗 **Sitio:** https://jrpindave.github.io/Issues/

## Estructura

```
index.html              → página de inicio (índice de todo)
luna-de-miel/           → Propuesta de luna de miel · Islandia · Tenerife · Puglia
revision-easywood-la242/ → Informe de coordinación BIM · revisión correos Easywood · LA242
```

GitHub Pages está configurado en modo **"Deploy from a branch"** sobre la rama
`claude/github-pages-html-819lvi`. Cada push a esa rama vuelve a publicar el sitio
automáticamente, sin necesidad de workflows.

## Cómo agregar una nueva presentación

1. Crea una carpeta nueva, por ejemplo `mi-informe/`, con un `index.html` dentro.
2. Añade una tarjeta enlazándola en el `index.html` de la raíz.
3. Haz commit y push: Pages la publica automáticamente.

Cada presentación queda accesible en `https://jrpindave.github.io/Issues/<carpeta>/`.
