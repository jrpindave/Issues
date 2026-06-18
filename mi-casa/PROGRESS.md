# Mi Casa — Planificador 3D (avance)

Visualizador 3D para explorar y amoblar una casa desde su IFC. Dos niveles, sin
cubierta, con biblioteca de muebles paramétricos, costos y mediciones.

- **Producción (auto-actualiza):** https://issues-eight.vercel.app
- **Versión actual:** v34 (la cabecera muestra `APP_VERSION` para confirmar el build cargado).

## Ramas / deploy
- **Desarrollo:** `claude/optimistic-darwin-tvgz7t`.
- **Producción (Vercel):** `claude/github-pages-html-819lvi`. Publicar = fast-forward de
  desarrollo → producción y push (Vercel reconstruye solo).
- Build estático: `output: "export"`; `vercel.json` en la raíz compila `mi-casa/` y sirve `mi-casa/out`.

## Stack
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**, export estático.
- **react-three-fiber 9** + **drei 10** + **three 0.176**.
- **web-ifc 0.0.77** (WASM por CDN unpkg) — parseo del IFC en el cliente.
- **zustand 5** (`persist` en localStorage) para el estado. Cliente Supabase por `fetch` (anon key).

## Archivos clave
- `app/` layout + page → `<Viewer/>`.
- `components/`
  - `Viewer.tsx` — shell (cabecera: versión, fuente IFC, selector de IFC; barra de estado de medición).
  - `Scene3D.tsx` — Canvas, luces, OrbitControls, **PanController** (paneo por eje), **TouchController**
    (gestos móviles), **MeasureController** (medición), **GizmoViewcube**, grilla, sombras.
  - `HouseModel.tsx` — carga IFC (Supabase→fallback local), visibilidad por nivel, **pintura de muros**.
  - `FurnitureLayer.tsx` — muebles, selección, **TransformControls** (Mover/Rotar/Redimensionar), snap, CTRL.
  - `RightPanel.tsx` — pestañas Biblioteca / Inspector / **Costos**. `CostPanel.tsx` — tabla + comparador.
  - `MeasureView.tsx` — cotas + marcador de snap. `IfcSelector.tsx` — selector de IFC. `Toolbar.tsx`.
- `lib/`
  - `ifc.ts` — tessela IFC; pisos/niveles, planos de snap (solo muros), habitaciones (IFCSPACE),
    vertex-colors en muros para pintar.
  - `store.ts` — estado + persistencia. `supabase.ts` — IFCs del bucket + tabla `configs`.
  - `hoverStore.ts` — hover de medición (no persistido). `catalog.ts`, `types.ts`.
- `public/Casa.ifc` — IFC embebido (fallback). `scripts/` — subidor a Supabase (`.bat` + `.ps1`).

## Datos en Supabase (proyecto `wetwdokwnstjidoceoib`)
- **Storage** bucket público `ifc`: objeto `casa.ifc` = última versión; además cada IFC con su nombre
  (para el selector). Subida: `scripts/SubirCarpeta.bat` + `subir-carpeta.ps1` (key service_role).
- **Tabla `configs`** (name PK, data jsonb, updated_at) con RLS anon — guarda muebles + precios + colores.

## Features
- **Carga IFC:** Supabase (selector de versiones) con fallback embebido; indicador en cabecera.
  Override `localStorage["mi-casa-ifc-url"]`.
- **Navegación PC:** orbitar = click izq. arrastrado, paneo = botón central (H natural / arriba baja
  encuadre), zoom = rueda, derecho inerte. **Móvil:** tap=seleccionar, 1 dedo=paneo, doble-tap mantenido=
  orbitar, 2 dedos=zoom/paneo. Viewport bloqueado; pinch solo afecta el 3D. **Cubo de vista**.
- **Muebles:** biblioteca de prismas (incl. sofá L y cilindro Ø). Inspector: medidas, posición X/Z,
  rotación, color, **enlace + precio**, nivel.
- **Gizmo:** Mover / Rotar (X·Y·Z) / Redimensionar (crece desde la cara de inicio). **Snap a muros**
  del IFC; **CTRL** lo desactiva al arrastrar (movimiento libre, sin grilla).
- **Pintar muros:** por entidad IFC (clic = muro completo). Para per-room real, segmentar muros por cuarto.
- **Medir:** modo Medir → hover muestra snap (esquina/superficie) + barra de estado; clic fija el punto;
  cota con distancia. Solo geometría visible.
- **Costos:** precio por pieza → tabla de la config actual + **comparador de 2 configuraciones** (nube).
- **Guardado:** 💾 Guardar (quick-save a config activa), Guardar como (con lista), ☁ Cargar,
  Exportar/Importar JSON. Persistencia local + nube (sincroniza entre dispositivos).

## Pendientes / ideas
- **Pintura per-room** exacta: requiere muros segmentados por habitación en el IFC.
- **Render "Nivel 1"**: materiales PBR + HDRI + (opcional) path-tracer para un JPG fotográfico.
- Snap de medición a **puntos medios de aristas**; mostrar componentes X/Y/Z.
- Exportar costos a CSV/Excel; gráfico comparativo.
