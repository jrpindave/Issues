# -*- coding: utf-8 -*-
# =====================================================================
# Agregar una guitarra (banda de datos) "Cut Data_01" a varias
# vistas de perfil seleccionadas, SIN borrar las guitarras existentes.
#
#   Tipo de guitarra : Datos de perfil  (Profile Data)
#   Ubicacion        : Parte inferior   (Bottom)
#   Perfil 1         : SF_Terreno Natural
#   Perfil 2         : SF_Proyecto Completo
#
# Uso en Dynamo (nodo Python Script):
#   IN[0] = STYLE_NAME  -> "Cut Data_01"        (string)
#   IN[1] = PROF1_NAME  -> "SF_Terreno Natural" (string, busca por "contiene")
#   IN[2] = PROF2_NAME  -> "SF_Proyecto Completo"
#   IN[3] = RUN         -> True/False (Boolean) para disparar la ejecucion
#
# Al ejecutar, Civil 3D te pide SELECCIONAR en pantalla las vistas de
# perfil que quieras modificar. Solo procesa las vistas (ignora el resto).
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
STYLE_NAME = IN[0] if len(IN) > 0 and IN[0] else "Cut Data_01"
PROF1_NAME = IN[1] if len(IN) > 1 and IN[1] else "SF_Terreno Natural"
PROF2_NAME = IN[2] if len(IN) > 2 and IN[2] else "SF_Proyecto Completo"
RUN        = IN[3] if len(IN) > 3 else False

doc = AcApp.DocumentManager.MdiActiveDocument
ed  = doc.Editor
db  = doc.Database
civ = CivilApplication.ActiveDocument

log = []


def find_profile_id(tr, alignment_id, target):
    """Devuelve el ObjectId del perfil cuyo nombre CONTIENE 'target'."""
    align = tr.GetObject(alignment_id, OpenMode.ForRead)
    target = target.strip().lower()
    for pid in align.GetProfileIds():
        prof = tr.GetObject(pid, OpenMode.ForRead)
        if target in prof.Name.strip().lower():
            return pid
    return ObjectId.Null


def set_if_exists(obj, attr, value):
    """Setea una propiedad solo si existe (tolera variaciones de version)."""
    try:
        setattr(obj, attr, value)
    except Exception:
        pass


if not RUN:
    OUT = "RUN = False. Pone el booleano en True para ejecutar."
else:
    # 1) Seleccion manual en pantalla -> el usuario elige las vistas
    res = ed.GetSelection()
    if res.Status != PromptStatus.OK:
        OUT = "Seleccion cancelada o vacia."
    else:
        with doc.LockDocument():
            with db.TransactionManager.StartTransaction() as tr:
                # ObjectId del estilo de guitarra (Datos de perfil)
                try:
                    style_id = civ.Styles.BandStyles.ProfileDataBandStyles[STYLE_NAME]
                except Exception:
                    style_id = ObjectId.Null

                if style_id.IsNull:
                    OUT = "No se encontro el estilo de guitarra '%s'." % STYLE_NAME
                else:
                    for so in res.Value:
                        obj = tr.GetObject(so.ObjectId, OpenMode.ForRead)
                        if not isinstance(obj, ProfileView):
                            continue  # ignora todo lo que no sea vista de perfil

                        pv = tr.GetObject(so.ObjectId, OpenMode.ForWrite)

                        # Perfiles por nombre dentro del alineamiento de la vista
                        p1 = find_profile_id(tr, pv.AlignmentId, PROF1_NAME)
                        p2 = find_profile_id(tr, pv.AlignmentId, PROF2_NAME)
                        if p1.IsNull or p2.IsNull:
                            log.append("OMITIDA %s (no encontro Perfil1/Perfil2)" % pv.Name)
                            continue

                        # 2) Agregar la guitarra SIN borrar las existentes:
                        #    Get -> Add -> Set conserva las que ya estaban.
                        band_set = pv.Bands
                        items = band_set.GetBottomBandItems()  # incluye las actuales
                        new_item = items.Add(style_id)         # AGREGA la nueva

                        new_item.Profile1Id = p1
                        new_item.Profile2Id = p2
                        # Etiquetar P.K. inicial / final (como en las otras guitarras)
                        set_if_exists(new_item, "LabelAtStartStation", True)
                        set_if_exists(new_item, "LabelAtEndStation", True)

                        band_set.SetBottomBandItems(items)
                        log.append("OK %s" % pv.Name)

                    tr.Commit()
                    if not log:
                        log.append("No se selecciono ninguna vista de perfil valida.")
                    OUT = log
