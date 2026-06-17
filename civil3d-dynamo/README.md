# Agregar guitarra "Cut Data_01" a varias vistas de perfil (Civil 3D + Dynamo)

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
