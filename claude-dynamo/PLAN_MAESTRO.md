# Plan maestro — Sistema de gobernanza de datos y herramientas pyRevit

Documento vivo (v0, para discutir). Consolida todo lo acordado para auditar,
unificar y gobernar parámetros compartidos en Revit con una extensión pyRevit
distribuida a todo el equipo.

Entorno: Revit 2024. Motor pyRevit a confirmar (CPython3 o IronPython).

---

## 0. Principios rectores

- **El GUID es sagrado.** Un parámetro compartido se identifica por su GUID, no
  por su nombre. Unificar = migrar a GUIDs canónicos, nunca renombrar.
- **Una sola puerta de alta.** Nadie crea shared parameters a mano; todo pasa
  por la herramienta.
- **Snapshots, no vivo.** Los volcados de geometría y fórmulas son fotos atadas
  a la geometría → se recalculan al terminar de modelar.
- **Tooling + acuerdo de equipo + auditoría periódica.** La herramienta encauza;
  la gobernanza la sostiene el equipo.

---

## 1. Distribución de la extensión (.bat + git)

- La extensión pyRevit (`QA.extension`) vive en un **repo git**.
- `instalar.bat`: clona el repo en la carpeta de extensiones, lo registra
  (`pyrevit extensions paths add`) y recarga (`pyrevit reload`).
- `actualizar.bat`: `git pull` + `pyrevit reload`.
- Ramas: **`main` = estable** (releases probados, lo que usan los modeladores),
  **`dev` = pruebas**.
- Bootstrap: el `.bat` verifica git + pyRevit; si faltan, avisa/instala.
- Opcional: auto-`git pull` al arrancar Revit (solo desde `main`).

---

## 2. Gobernanza de parámetros (workflow de equipo)

**Ciclo de vida:** `PROPUESTO → APROBADO (maestro) → PUBLICADO (.txt)` /
`RECHAZADO → usar existente`.

- **Roles:** Dueño del maestro (BIM manager, único que aprueba y mintea GUIDs) y
  Modeladores (proponen).
- **3 reglas:** (1) nadie crea a mano; (2) buscar antes de crear (anti-duplicado);
  (3) convención de nombres obligatoria (`Disciplina_Concepto_Unidad`).
- **Carril rápido:** parámetros provisionales con prefijo `WIP_` para no bloquear;
  la auditoría los marca y se resuelven en **revisión semanal**.
- **Repositorios:**
  - Maestro `.txt` → **git** (historial) + copia operativa en **OneDrive**.
  - Cola de solicitudes → **Supabase** (tabla `solicitudes_parametros`) o lista
    de SharePoint. *(Pendiente de decidir.)*

---

## 3. Herramientas (botones de la extensión)

**Panel Gobernanza (BIM manager):**
- `Auditar` — inventario + conflictos por GUID → Excel (solo lectura).
- `Reconciliar` — migra valores de duplicados al canónico y los borra (con backup).
- `Proponer/Registrar` — alta controlada con GUID estable, ordena y versiona.
- `Revisar solicitudes` — gestiona la cola + los `WIP_`.
- `Sincronizar` — regenera `.txt` limpio y bindea canónicos al doc/template.

**Panel Modelador:**
- `Proponer parámetro` — busca duplicados, valida nombre, manda a la cola.
- `Cerrar modelado` — vuelca geometría (punto 4) + recalcula fórmulas (punto 5).

---

## 4. Auditoría del modelo

- **Inventario completo:** nombre, GUID, tipo de dato, grupo, compartido/proyecto,
  categorías, instancia/tipo, nº de elementos con valor.
- **Conflictos por GUID:** mismo nombre/distinto GUID y nombres casi-iguales.
- **Borrado de parámetros sin uso:** detectar shared params no usados y eliminarlos.
  ⚠️ *"Sin valor" ≠ "sin uso".* Antes de borrar hay que comprobar si el parámetro
  está referenciado en **schedules, filtros de vista, etiquetas o familias**. Flujo:
  detectar (lectura) → poner en cuarentena → borrar con backup.
- **Mapa de uso en schedules:** qué parámetros entran en cada tabla de
  planificación, para dirimir gobernanza de datos.
  - Caso concreto: `Marca` (Mark) se está usando para filtrar/agrupar. Mark es un
    **identificador único de instancia**, no un campo de clasificación → reemplazar
    por un shared param dedicado (`Clasificacion` / `Grupo_Funcional`) o un sistema
    de clasificación real. Decisión conjunta con el reporte en mano.

---

## 5. Volcado de datos (snapshots — botón "Cerrar modelado")

- **Punto 4 — Geometría nativa → shared params:** por cada categoría, leer el
  built-in nativo (Área, Volumen, Longitud, Perímetro, Espesor…) y escribirlo en
  un shared param de instancia con el *spec* y la unidad correctos
  (`UnitUtils`/`ForgeTypeId`). Dirigido por `mapeo_geometria.json`.
- **Punto 5 — Cálculos de schedule → shared params:** las *calculated values* de
  una schedule **NO se guardan en el elemento y NO se exportan a IFC**. Solución:
  replicar la fórmula en el script y escribir el resultado en un shared param real.
  Dirigido por `formulas.json`.
- Ambos son snapshots → se recalculan al terminar de modelar. Param
  `Ultima_actualizacion` (timestamp) para saber si está fresco.

---

## 6. Template final

- Con el modelo auditado y los canónicos bindeados, generar un **template** con
  los shared params del maestro pre-bindeados a sus categorías.
- Incluir el mapeo IFC (user-defined property sets / convención de nombres) para
  que los shared params salgan en el Pset correcto.

---

## 7. Archivos de configuración (versionados en git)

- `maestro_SP.txt` — shared parameter file (registro canónico).
- `mapeo_geometria.json` — categoría → {nativo → {shared param, unidad}}.
- `formulas.json` — shared param → {expresión, categorías}.

---

## 8. Fases de implementación (riesgo creciente)

1. **Auditar (solo lectura)** — inventario + conflictos + mapa de uso en schedules. *(Arrancamos aquí.)*
2. Distribución `.bat` + extensión base en git.
3. Registrar/sincronizar maestro + workflow de altas.
4. Borrado de no-usados + reconciliación/migración (con backup).
5. Volcado de geometría + fórmulas (botón modelador).
6. Generar template + mapeo IFC.

---

## 9. Decisiones pendientes

- [ ] Motor pyRevit: CPython3 o IronPython. ¿pyRevit ya instalado y versión?
- [ ] Cola de solicitudes: **Supabase** o **SharePoint**.
- [ ] Categoría piloto para el punto 4 (muros, suelos…).
- [ ] 2 fórmulas reales de schedule para calibrar `formulas.json`.
- [ ] Convención de nombres definitiva.
