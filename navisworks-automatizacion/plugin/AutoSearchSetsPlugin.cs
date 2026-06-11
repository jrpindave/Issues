using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows.Forms;
using Autodesk.Navisworks.Api;
using Autodesk.Navisworks.Api.Plugins;

namespace NavisAutoSearchSets
{
    /// <summary>
    /// Plugin de arranque para Navisworks Manage/Simulate.
    /// Recorre el modelo activo, recolecta los valores distintos de una propiedad
    /// (por defecto "Material") y crea un Conjunto de BÚSQUEDA (dinámico) por cada valor,
    /// todos dentro de una carpeta. Reemplaza el agrupar "nombre a nombre" a mano.
    ///
    /// Identificador del plugin: AddInId = "BIMC" (4 caracteres del desarrollador).
    /// </summary>
    [Plugin(
        "NavisAutoSearchSets.AutoGroup", // nombre interno único
        "BIMC",                          // id de desarrollador (4 chars)
        DisplayName = "Auto Search Sets",
        ToolTip = "Crea conjuntos de búsqueda por propiedad")]
    public class AutoGroupPlugin : AddInPlugin
    {
        // ─── Configura aquí la propiedad por la que quieres agrupar ───
        // Nombre que ves en la columna "Categoría" / "Propiedad" del Buscador de elementos.
        // En ES suelen ser "Elemento" / "Material"; el API usa el DisplayName visible.
        private const string CategoryDisplayName = "Element";
        private const string PropertyDisplayName = "Material";

        public override int Execute(params string[] parameters)
        {
            Document doc = Application.ActiveDocument;
            if (doc == null || doc.Models.Count == 0)
            {
                MessageBox.Show("No hay ningún modelo cargado.", "Auto Search Sets");
                return 0;
            }

            // 1. Recolectar los valores distintos de la propiedad
            var values = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (ModelItem item in doc.Models.RootItemDescendantsAndSelf)
            {
                DataProperty prop = item.PropertyCategories
                    .FindPropertyByDisplayName(CategoryDisplayName, PropertyDisplayName);

                if (prop != null && prop.Value.IsDisplayString)
                {
                    string v = prop.Value.ToDisplayString();
                    if (!string.IsNullOrWhiteSpace(v))
                        values.Add(v.Trim());
                }
            }

            if (values.Count == 0)
            {
                MessageBox.Show(
                    $"Ningún elemento tiene la propiedad '{CategoryDisplayName} > {PropertyDisplayName}'.\n" +
                    "Revisa los nombres exactos en el Buscador de elementos.",
                    "Auto Search Sets");
                return 0;
            }

            // 2. Crear una carpeta contenedora en el panel de Conjuntos
            string folderName = $"{PropertyDisplayName} (auto)";
            var folder = new FolderItem { DisplayName = folderName };
            doc.SelectionSets.AddCopy(folder);

            GroupItem insertedFolder = doc.SelectionSets.Value
                .OfType<GroupItem>()
                .Last(g => g.DisplayName == folderName);

            // 3. Un Conjunto de BÚSQUEDA (dinámico) por cada valor distinto
            int created = 0;
            foreach (string value in values.OrderBy(v => v))
            {
                Search search = new Search();
                search.Selection.SelectAll();
                search.Locations = SearchLocations.DescendantsAndSelf;

                SearchCondition condition = SearchCondition
                    .HasPropertyByDisplayName(CategoryDisplayName, PropertyDisplayName)
                    .EqualValue(VariantData.FromDisplayString(value));
                search.SearchConditions.Add(condition);

                // Pasar un Search (no una colección de items) lo hace dinámico = Search Set.
                var selectionSet = new SelectionSet(search) { DisplayName = value };
                doc.SelectionSets.AddCopy(insertedFolder, selectionSet);
                created++;
            }

            MessageBox.Show(
                $"Creados {created} conjuntos de búsqueda en la carpeta '{folderName}'.",
                "Auto Search Sets");
            return 0;
        }
    }
}
