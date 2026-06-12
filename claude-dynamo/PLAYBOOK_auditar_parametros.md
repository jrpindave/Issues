# Playbook: Auditar y unificar parámetros compartidos en Revit

Caso: un modelo trabajado por varios modeladores, cada uno con archivos de
parámetros compartidos distintos. Objetivo: auditar el caos y unificarlo a un
único estándar, usando BIBIM AI (Claude) dentro de Revit.

---

## ⚠️ La causa raíz: el GUID, no el nombre

Un parámetro **compartido** se identifica por su **GUID**, no por su nombre.
Dos parámetros llamados igual pero creados desde archivos `.txt` distintos
tienen GUIDs distintos → **son parámetros diferentes** aunque se vean iguales.
Esto rompe tablas de planificación, filtros, etiquetas y exportaciones.

**Unificar = elegir UN archivo de parámetros compartidos maestro (un GUID
canónico por concepto) y migrar todo hacia él.** Renombrar no soluciona nada.

| Síntoma del caos | Causa probable |
|------------------|----------------|
| Tablas/filtros incompletos | Mismo nombre, distinto GUID |
| Etiquetas vacías | Valor en un parámetro "pirata", la etiqueta lee el canónico |
| Parámetros que no se pueden programar entre archivos | Es de proyecto, no compartido |
| Variantes "Código / Codigo / CODIGO" | Nombres casi iguales, GUIDs distintos |

---

## Flujo de trabajo (orden correcto)

1. **Copia de seguridad** — trabaja sobre una copia desvinculada, nunca el original.
2. **Inventario** — lista todos los parámetros (nombre, GUID, tipo, grupo,
   compartido/proyecto, categorías, nº de elementos con valor).
3. **Detectar conflictos** — mismo nombre/distinto GUID y nombres casi-iguales.
4. **Definir el maestro** — un solo `.txt` de parámetros compartidos = fuente de verdad.
5. **Migrar valores** — copiar del parámetro "pirata" al canónico (donde el canónico esté vacío).
6. **Limpiar** — eliminar los duplicados ya vacíos.

---

## Prompts para BIBIM AI (pégalos en el panel)

### Inventario
> Exporta a CSV todos los parámetros del proyecto con estas columnas: nombre,
> GUID, tipo de dato, grupo de parámetro, si es compartido o de proyecto,
> categorías asignadas, instancia o tipo, y número de elementos que tienen
> valor. Guárdalo en el Escritorio.

### Detección de conflictos
> Analiza los parámetros y muéstrame una tabla de conflictos: parámetros con el
> mismo nombre pero distinto GUID, y nombres casi duplicados (mayúsculas, tildes
> o espacios). Indica cuántos elementos usa cada variante.

### Cobertura por categoría
> Muéstrame, por categoría (muros, puertas, ventanas, etc.), qué parámetros
> compartidos están asignados y cuántos elementos tienen valor en cada uno.

### Migración de valores (uno por concepto)
> Copia el valor del parámetro 'Código_Muro' con GUID [aaaa] al parámetro
> canónico 'Codigo_Muro' con GUID [bbbb] en todos los elementos donde el primero
> tenga valor y el canónico esté vacío. Muéstrame el Task Plan y los elementos
> afectados antes de aplicar.

### Limpieza
> Lista los parámetros compartidos que quedaron sin uso o duplicados para poder
> eliminarlos, indicando cuáles son seguros de borrar.

---

## Reglas de seguridad
- Revisa **siempre** el *Task Plan / Affected Elements* antes de **Apply Changes**,
  sobre todo en migraciones y borrados.
- Hazlo **por disciplina o por categoría**, no todo de una vez.
- Conserva el CSV de inventario como evidencia "antes/después".
- Acuerda con el equipo el **archivo maestro de parámetros compartidos** y que
  todos lo usen de aquí en adelante (esto evita que el caos vuelva).

---

## Entregable de la auditoría (lo que deberías terminar teniendo)
1. CSV de inventario completo (antes).
2. Tabla de conflictos resuelta (qué GUID se quedó por cada concepto).
3. Archivo `.txt` de parámetros compartidos maestro, único para el equipo.
4. CSV de inventario final (después), limpio.
