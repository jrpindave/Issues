# Mi Casa — Planificador 3D (avance)

Visualizador 3D para explorar y amoblar una casa a partir de su IFC. Dos niveles,
sin cubierta, con biblioteca de muebles paramétricos.

**Producción (auto-actualiza):** https://issues-eight.vercel.app

## Stack
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**, salida estática (`output: "export"`).
- **react-three-fiber 9** + **drei 10** + **three 0.176** para el 3D.
- **web-ifc 0.0.77** (WASM por CDN unpkg) para parsear el IFC en el cliente.
- **zustand 5** (con `persist` en localStorage) para el estado.

## Arquitectura
- `app/` layout + page (renderiza `<Viewer/>`).
- `components/`
  - `Viewer.tsx` — shell (cabecera con versión + fuente IFC, panel, overlay de carga/error).
  - `Scene3D.tsx` — Canvas r3f, luces, OrbitControls, **PanController** (paneo propio por eje),
    **TouchController** (gestos móviles), **GizmoViewcube** (cubo de vista), grilla, sombras.
  - `HouseModel.tsx` — carga el IFC, visibilidad por nivel, **pintura de muros** por habitación.
  - `FurnitureLayer.tsx` — render de muebles, selección, **TransformControls** (Mover/Rotar/Redimensionar), snap.
  - `RightPanel.tsx` — Biblioteca + Inspector. `Toolbar.tsx` — controles flotantes.
- `lib/`
  - `ifc.ts` — carga/tessela el IFC; detecta pisos, niveles (por contención IFC), planos de muro
    (snap), habitaciones (IFCSPACE bbox), y marca muros con vertex-colors para pintar.
  - `store.ts` — estado global + persistencia. `catalog.ts` — catálogo de prismas. `types.ts`.
- `public/Casa.ifc` — IFC embebido (fallback). `scripts/` — subidor a Supabase.

## Carga del IFC
1. Intenta `https://wetwdokwnstjidoceoib.supabase.co/storage/v1/object/public/ifc/casa.ifc` (Supabase).
2. Si falla → usa `public/Casa.ifc` (embebido). Indicador en la cabecera: **IFC: Supabase / local**.
3. Override manual: `localStorage["mi-casa-ifc-url"]`.
- Subida del IFC: `scripts/SubirCarpeta.bat` + `subir-carpeta.ps1` (elige carpeta → sube el `.ifc`
  más reciente como `casa.ifc`; bucket público **`ifc`**, key service_role).

## Coordenadas (clave)
- web-ifc entrega geometría **Y-up**. Se usa `COORDINATE_TO_ORIGIN`.
- Pisos detectados por histograma de superficies horizontales; niveles por elevación de storeys.

## Features
- Niveles (mostrar/ocultar), vista planta/órbita, grilla, cubo de vista.
- Navegación PC: orbitar = click izq. arrastrado, paneo = botón central (H natural / arriba baja
  encuadre), zoom = rueda, derecho inerte (anti-Opera). Móvil: tap = seleccionar, 1 dedo = paneo,
  doble-tap mantenido = orbitar, 2 dedos = zoom/paneo. Viewport bloqueado (sin scroll/zoom de página).
- Biblioteca de prismas paramétricos (incl. **sofá L** y **cilindro Ø**). Inspector: medidas,
  posición X/Z, rotación, color, **enlace a producto**, nivel, duplicar/eliminar.
- Gizmo: **Mover / Rotar (X·Y·Z) / Redimensionar** (crece desde la cara de inicio, no desde el centro).
- **Snap a muros** del IFC. **Pintar muros** por habitación (vertex-colors, recorte por IFCSPACE).
- Persistencia local + **Guardar/Cargar** `.json`.

## Deploy / flujo
- Desarrollo en rama `claude/optimistic-darwin-tvgz7t`.
- Publicación: se hace fast-forward de esa rama a `claude/github-pages-html-819lvi` (rama de
  producción de Vercel) → `issues-eight.vercel.app` se reconstruye solo.
- La cabecera muestra `APP_VERSION` (bump en cada deploy) para confirmar la versión cargada.

## Pendientes / ideas
- Selector de IFC en la app (elegir versión del bucket) — requiere anon key / listado.
- Guardar configuraciones en **tabla de Supabase** (sincronía multi-dispositivo) — requiere anon key + tabla + RLS.
- Render "Nivel 1": materiales PBR + HDRI + (opcional) path-tracer para un JPG fotográfico.
- Pintura solo cara interior estricta (hoy recorta por habitación, ambas caras del muro compartido tintan).
