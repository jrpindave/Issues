# Guitarras (bandas de perfil) en Civil 3D + Dynamo

Dos scripts para Dynamo (nodo **Python Script**, motor **IronPython 2.7**),
pensados para operar sobre varias vistas de perfil **seleccionadas a mano**,
sin tocar el resto:

1. `AgregarGuitarra_CutData.py` — **agrega** la guitarra `Cut Data_01`.
2. `ModificarPerfil2_ElevPerfil2.py` — **modifica** el Perfil 2 de una guitarra
   existente (`COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03`).

> **Motor:** usar **IronPython 2.7** (paquete `DynamoIronPython2.7` del Package
> Manager). CPython3 da problemas de interop con la API de Civil 3D.

---

## 1) Agregar guitarra "Cut Data_01"

Agrega una guitarra **Datos de perfil** con estilo `Cut Data_01` a la parte
inferior de cada vista seleccionada, **sin borrar** las existentes.

- Perfil 1: `Terreno Natural` · Perfil 2: `Proyecto Completo` · Hueco (Gap): `0`

| Puerto | Tipo   | Default              | Descripción |
|--------|--------|----------------------|-------------|
| IN[0]  | string | `Cut Data_01`        | Estilo de guitarra |
| IN[1]  | string | `Terreno Natural`    | Perfil 1 (match por "contiene") |
| IN[2]  | string | `Proyecto Completo`  | Perfil 2 (match por "contiene") |
| IN[3]  | bool   | `False`              | RUN: `True` para ejecutar |
| IN[4]  | double | `0.0`                | Hueco / Gap |

## 2) Cambiar el Perfil 2 de "COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03"

Reasigna el **Perfil 2** de esa guitarra (de `…Vialidad Completa` a
`…Proyecto Completo`) en las vistas seleccionadas. No agrega ni borra guitarras.

| Puerto | Tipo   | Default                                   | Descripción |
|--------|--------|-------------------------------------------|-------------|
| IN[0]  | string | `COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03` | Estilo a editar (match EXACTO) |
| IN[1]  | string | `Proyecto Completo`                       | Nuevo Perfil 2 (match por "contiene") |
| IN[2]  | bool   | `False`                                   | RUN: `True` para ejecutar |

---

## Cómo se usan

1. Pegá el script en un nodo **Python Script** (motor **IronPython2**).
2. Conectá los inputs (o dejá los defaults).
3. Poné el RUN en `True` y **seleccioná en pantalla** las vistas de perfil.
   Se ignora todo lo que no sea vista de perfil.
4. El `OUT` informa por vista: `OK`, `SIN CAMBIOS` u `OMITIDA`.

## Notas técnicas (lecciones del camino)

- **`get_prop` / `set_prop` por reflexión:** las propiedades de los objetos de
  Civil 3D (`Name`, `Profile1Id`, `Profile2Id`, `Gap`, `BandStyleId`, …) no se
  pueden leer/escribir directo: el getter/setter está en una clase base y queda
  oculto en la derivada. Se resuelve recorriendo la jerarquía de tipos
  (`GetType().BaseType`) y usando `GetGetMethod(True)` / `GetSetMethod(True)`.
- **Colección de estilos:** `civdoc.Styles.BandStyles.ProfileViewProfileDataBandStyles`
  (ojo con el prefijo `ProfileView…`). Se itera, NO se indexa por número ni por
  nombre.
- **Agregar sin borrar:** `items = bs.GetBottomBandItems()` → `items.Add(styleId)`
  → `bs.SetBottomBandItems(items)`. El `Add` puede no retornar el item: se toma
  el último de la colección (`last_item`).
- **Bloqueo/transacción:** `with adoc.LockDocument():` + `with ...StartTransaction()
  as t:` + `t.Commit()`.
