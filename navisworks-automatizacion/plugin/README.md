# AutoSearchSets — plugin .NET de arranque para Navisworks

Crea automáticamente un **Conjunto de búsqueda** (dinámico) por cada valor distinto de una
propiedad (por defecto `Element > Material`), agrupados en una carpeta. Adiós a agrupar a mano.

## Archivos
- `AutoSearchSetsPlugin.cs` — la lógica (`AddInPlugin`).
- `AutoSearchSets.csproj` — proyecto Class Library .NET Framework 4.8.

## Compilar

1. Necesitas **Navisworks Manage o Simulate** instalado (Freedom no vale) y **Visual Studio**.
2. Abre `AutoSearchSets.csproj`.
3. Ajusta dos cosas según tu instalación:
   - `<NavisPath>` → carpeta real de Navisworks (año/edición).
   - `<TargetFrameworkVersion>` → v4.7 o v4.8 según tu versión.
4. Compila en **x64** (Navisworks es 64-bit). El target `DeployPlugin` copia el DLL a
   `…\Navisworks Manage 20XX\Plugins\AutoSearchSets\` automáticamente.
   - Si no tienes permisos en `Program Files`, copia el DLL a mano a
     `%APPDATA%\Autodesk Navisworks Manage 20XX\Plugins\AutoSearchSets\`.

> Importante: la carpeta del plugin debe llamarse **igual que el DLL** (`AutoSearchSets`).

## Ejecutar / depurar
- En *Propiedades del proyecto → Debug → Iniciar programa externo*: `roamer.exe`
  (en la carpeta de Navisworks). F5 abre Navisworks con el plugin cargado.
- Dentro de Navisworks aparece en la pestaña **Complementos (Add-ins)** → *Auto Search Sets*.
- Carga tu IFC y ejecútalo: genera la carpeta `Material (auto)` con un search set por material.

## Personalizar
Cambia en `AutoSearchSetsPlugin.cs`:
```csharp
private const string CategoryDisplayName = "Element";   // p.ej. "Item", "Element"
private const string PropertyDisplayName = "Material";  // p.ej. "Name", "Type", "Layer"
```
Usa los nombres **exactos** que ves en las columnas Categoría/Propiedad del Buscador de
elementos (cuidado con ES/EN según el idioma de la interfaz).

## Notas del API
- `new SelectionSet(search)` → conjunto **dinámico** (search set). Con una `ModelItemCollection`
  sería estático.
- `SearchCondition.HasPropertyByDisplayName(...).EqualValue(...)` construye la condición igual
  que el Buscador de elementos.
- Versionar luego los search sets como XML (Panel Conjuntos → Exportar) para reutilizar.
