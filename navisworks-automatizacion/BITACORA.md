# Bitácora — Automatización de coordinación BIM en Navisworks

Resumen de lo trabajado en esta rama (`claude/happy-noether-2cgpui-navisworks`).

## Contexto
Modelo IFC mal parametrizado en Navisworks. Objetivo: dejar de agrupar elementos
**nombre a nombre** con el Buscador de elementos y automatizar el flujo.

## Lo que decidimos

### 1. Estrategia de agrupación (sin programar)
- Usar **Conjuntos de búsqueda** (dinámicos), no de selección (estáticos).
- Aprovechar condiciones amplias: `Contiene`, **comodines**, `No definido` (para auditar
  lo que le falta la propiedad).
- **Exportar/Importar XML** de criterios y conjuntos → plantilla reutilizable de oficina.
- **Appearance Profiler** para colorear/auditar por propiedad.
- Solución de fondo: corregir el **mapeo de Property Sets en el export IFC** (origen).

> Detalle completo en [`README.md`](./README.md).

### 2. Vía programática — API .NET de Navisworks
- El API **no se instala aparte**: viene con Navisworks Manage/Simulate (Freedom NO).
- Requisitos: Visual Studio + .NET Framework (4.7/4.8 según versión) + compilar en **x64**.
- DLL principal: `Autodesk.Navisworks.Api.dll` (en la carpeta de instalación).
- SDK (ADN/APS): aporta **documentación (.chm) y ejemplos**, no DLLs nuevas.

### 3. Plugin de arranque (entregado)
`AutoSearchSets`: recorre el modelo, recolecta valores distintos de una propiedad
(`Element > Material` por defecto) y crea **un conjunto de búsqueda dinámico por cada valor**,
agrupados en una carpeta.

> Código y guía de compilación en [`plugin/`](./plugin/).

## Estado
- ✅ Rama creada y pusheada: `claude/happy-noether-2cgpui-navisworks`
- ✅ SDK descargado e instalado por el usuario
- ⏳ Pendiente: compilar/probar el plugin; confirmar nombres exactos de Categoría/Propiedad
  del IFC (ES/EN).

## Próximos pasos posibles
- Añadir al plugin un **volcado de propiedades** del elemento seleccionado (acertar las
  constantes a la primera).
- Generar **varias agrupaciones en una pasada** (material + nombre + tipo).
- Aplicar **color por código** (estilo Appearance Profiler).
- Exportar los search sets resultantes a **XML** como plantilla de oficina.

## Archivos de la rama
```
navisworks-automatizacion/
├─ BITACORA.md                  ← este resumen
├─ README.md                    ← estrategia de agrupación
└─ plugin/
   ├─ AutoSearchSetsPlugin.cs   ← plugin .NET (AddInPlugin)
   ├─ AutoSearchSets.csproj     ← proyecto x64 / .NET 4.8
   └─ README.md                 ← guía de compilación y despliegue
```
