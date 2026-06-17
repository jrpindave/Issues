# Guitarras (bandas de perfil) en Civil 3D + Dynamo

Dos scripts para Dynamo (nodo **Python Script**), pensados para operar sobre
varias vistas de perfil **seleccionadas a mano**, sin tocar el resto:

1. `AgregarGuitarra_CutData.py` — **agrega** la guitarra `Cut Data_01`.
2. `ModificarPerfil2_ElevPerfil2.py` — **modifica** el Perfil 2 de una guitarra
   existente (`COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03`).

---

## 1) Agregar guitarra "Cut Data_01" a varias vistas de perfil

Script para Dynamo (nodo **Python Script**) que agrega una guitarra de tipo
**Datos de perfil** con estilo **`Cut Data_01`** a varias vistas de perfil
seleccionadas a mano, **sin borrar** las guitarras que ya tengan configuradas.

- Perfil 1: `SF_Terreno Natural`
- Perfil 2: `SF_Proyecto Completo`
- Ubicación: parte inferior de la vista de perfil.

## Entradas del nodo Python

| Puerto | Tipo    | Valor por defecto       | Descripción |
|--------|---------|-------------------------|-------------|
| IN[0]  | string  | `Cut Data_01`           | Nombre del estilo de guitarra |
| IN[1]  | string  | `SF_Terreno Natural`    | Perfil 1 (busca por "contiene") |
| IN[2]  | string  | `SF_Proyecto Completo`  | Perfil 2 (busca por "contiene") |
| IN[3]  | bool    | `False`                 | Disparador: ponelo en `True` para ejecutar |

## Cómo se usa

1. Pegá `AgregarGuitarra_CutData.py` en un nodo **Python Script** de Dynamo.
2. Conectá los 4 inputs (o dejá los valores por defecto en IN[0..2]).
3. Poné IN[3] (RUN) en `True`.
4. Civil 3D te pedirá **seleccionar en pantalla** las vistas de perfil a modificar.
   Seleccioná solo las que quieras: el resto de objetos se ignoran.

## Por qué no borra lo existente

Trabaja de forma aditiva sobre la lista de guitarras de la parte inferior:

```
items = band_set.GetBottomBandItems()   # trae las que YA existen
new   = items.Add(style_id)             # agrega la nueva al final
band_set.SetBottomBandItems(items)      # vuelve a escribir viejas + nueva
```

## Notas

- El emparejado de perfiles es por **coincidencia parcial** del nombre, así que
  funciona aunque el nombre real sea `SF_Terreno Natural - Superficie (119)`.
- Si una vista no encuentra alguno de los dos perfiles en su alineamiento, se
  **omite** y queda registrada en el `OUT` (no rompe el resto del proceso).
- Los intervalos (principal/secundario) y demás formato se heredan del estilo
  `Cut Data_01`.

---

## 2) Cambiar el Perfil 2 de la guitarra "COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03"

Reasigna el **Perfil 2** de esa guitarra (ya existente) de
`…Vialidad Completa` a `…Proyecto Completo`, en las vistas seleccionadas.
**No agrega ni borra** guitarras: solo edita la que coincide por estilo.

### Entradas del nodo Python

| Puerto | Tipo   | Valor por defecto                        | Descripción |
|--------|--------|------------------------------------------|-------------|
| IN[0]  | string | `COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03`| Estilo de la guitarra a editar |
| IN[1]  | string | `Proyecto Completo`                      | Nuevo Perfil 2 (busca por "contiene") |
| IN[2]  | bool   | `False`                                  | Disparador: `True` para ejecutar |

### Cómo se usa

1. Pegá `ModificarPerfil2_ElevPerfil2.py` en un nodo **Python Script**.
2. Conectá los inputs (o dejá los valores por defecto en IN[0..1]).
3. Poné IN[2] (RUN) en `True` y **seleccioná en pantalla** las vistas a modificar.

### Detalles

- Busca la guitarra por **nombre de estilo** y, donde la encuentra, le cambia el
  `Profile2Id`. Recorre guitarras de la parte inferior y superior.
- El `OUT` informa por vista: `OK` (con cantidad actualizada), `SIN CAMBIOS`
  (no tenía esa guitarra) u `OMITIDA` (no encontró el perfil destino).
- El emparejado del perfil destino es por **coincidencia parcial**, así que
  `Proyecto Completo` engancha `F_Proyecto Completo - Superficie (122)`.
