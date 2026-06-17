# -*- coding: utf-8 -*-
# =====================================================================
# Cambiar el PERFIL 2 de una guitarra existente (Datos de perfil) en
# varias vistas de perfil seleccionadas, SIN tocar las demas guitarras.
#
#   Guitarra (por estilo) : COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03
#   Perfil 2  ANTES        : (...) Vialidad Completa
#   Perfil 2  DESPUES      : (...) Proyecto Completo
#
# Uso en Dynamo (nodo Python Script):
#   IN[0] = BAND_STYLE_NAME -> "COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03"
#   IN[1] = NEW_PROF2_NAME  -> "Proyecto Completo"  (busca por "contiene")
#   IN[2] = RUN             -> True/False (Boolean) para disparar
#
# Al ejecutar, Civil 3D te pide SELECCIONAR en pantalla las vistas de
# perfil. Solo modifica la guitarra cuyo estilo coincide; el resto queda igual.
# =====================================================================

import clr
clr.AddReference('AcMgd')
clr.AddReference('AcDbMgd')
clr.AddReference('AcCoreMgd')
clr.AddReference('AeccDbMgd')

from Autodesk.AutoCAD.ApplicationServices import Application as AcApp
from Autodesk.AutoCAD.DatabaseServices import OpenMode, ObjectId
from Autodesk.AutoCAD.EditorInput import PromptStatus
from Autodesk.Civil.ApplicationServices import CivilApplication
from Autodesk.Civil.DatabaseServices import ProfileView

# ----------------------- Parametros de entrada -----------------------
BAND_STYLE_NAME = IN[0] if len(IN) > 0 and IN[0] else "COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03"
NEW_PROF2_NAME  = IN[1] if len(IN) > 1 and IN[1] else "Proyecto Completo"
RUN             = IN[2] if len(IN) > 2 else False

doc = AcApp.DocumentManager.MdiActiveDocument
ed  = doc.Editor
db  = doc.Database
civ = CivilApplication.ActiveDocument

log = []


def find_profile_id(tr, alignment_id, target):
    """ObjectId del perfil cuyo nombre CONTIENE 'target' dentro del alineamiento."""
    align = tr.GetObject(alignment_id, OpenMode.ForRead)
    target = target.strip().lower()
    for pid in align.GetProfileIds():
        prof = tr.GetObject(pid, OpenMode.ForRead)
        if target in prof.Name.strip().lower():
            return pid
    return ObjectId.Null


def style_name_of(tr, band_item):
    """Nombre del estilo de una guitarra a partir de su BandStyleId."""
    try:
        return tr.GetObject(band_item.BandStyleId, OpenMode.ForRead).Name.strip().lower()
    except Exception:
        return ""


def update_collection(tr, items, target_style, new_p2_id):
    """Recorre una coleccion de guitarras y cambia Perfil2 en las que matchean."""
    changed = 0
    target_style = target_style.strip().lower()
    for it in items:
        if target_style in style_name_of(tr, it):
            it.Profile2Id = new_p2_id
            changed += 1
    return changed


if not RUN:
    OUT = "RUN = False. Pone el booleano en True para ejecutar."
else:
    res = ed.GetSelection()
    if res.Status != PromptStatus.OK:
        OUT = "Seleccion cancelada o vacia."
    else:
        with doc.LockDocument():
            with db.TransactionManager.StartTransaction() as tr:
                for so in res.Value:
                    obj = tr.GetObject(so.ObjectId, OpenMode.ForRead)
                    if not isinstance(obj, ProfileView):
                        continue
                    pv = tr.GetObject(so.ObjectId, OpenMode.ForWrite)

                    new_p2 = find_profile_id(tr, pv.AlignmentId, NEW_PROF2_NAME)
                    if new_p2.IsNull:
                        log.append("OMITIDA %s (no encontro perfil '%s')"
                                   % (pv.Name, NEW_PROF2_NAME))
                        continue

                    band_set = pv.Bands
                    total = 0

                    # Guitarras de la parte inferior
                    bottom = band_set.GetBottomBandItems()
                    n_b = update_collection(tr, bottom, BAND_STYLE_NAME, new_p2)
                    if n_b:
                        band_set.SetBottomBandItems(bottom)
                    total += n_b

                    # Guitarras de la parte superior (por las dudas)
                    top = band_set.GetTopBandItems()
                    n_t = update_collection(tr, top, BAND_STYLE_NAME, new_p2)
                    if n_t:
                        band_set.SetTopBandItems(top)
                    total += n_t

                    if total:
                        log.append("OK %s (%d guitarra/s actualizada/s)" % (pv.Name, total))
                    else:
                        log.append("SIN CAMBIOS %s (no tiene la guitarra '%s')"
                                   % (pv.Name, BAND_STYLE_NAME))

                tr.Commit()
                OUT = log or ["No se selecciono ninguna vista de perfil valida."]
