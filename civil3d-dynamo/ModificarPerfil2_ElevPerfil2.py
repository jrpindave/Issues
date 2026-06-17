# =====================================================================
# Dynamo (nodo Python, motor IronPython 2.7) para Civil 3D
# Cambia el PERFIL 2 de la guitarra cuyo estilo es
# "COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03" en varias vistas de perfil
# SELECCIONADAS en pantalla, sin agregar ni borrar otras guitarras.
#
#   Perfil 2  ANTES   : (...) Vialidad Completa
#   Perfil 2  DESPUES : (...) Proyecto Completo
#
# Inputs:
#   IN[0] = BAND_STYLE_NAME ("COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03")  -> match EXACTO
#   IN[1] = NEW_PROF2_NAME  ("Proyecto Completo")  -> match por "contiene"
#   IN[2] = RUN             (Boolean) -> True para ejecutar
#
# NOTA: ver AgregarGuitarra_CutData.py sobre por que se usan get_prop/set_prop
# por reflexion (las propiedades de Civil 3D no se leen/escriben directo).
# =====================================================================

import clr
import traceback
import System
from System.Reflection import BindingFlags

clr.AddReference('AcMgd')
clr.AddReference('AcCoreMgd')
clr.AddReference('AcDbMgd')
clr.AddReference('AecBaseMgd')
clr.AddReference('AecPropDataMgd')
clr.AddReference('AeccDbMgd')

from Autodesk.AutoCAD.ApplicationServices import Application
from Autodesk.AutoCAD.EditorInput import PromptStatus
from Autodesk.AutoCAD.DatabaseServices import OpenMode, ObjectId
from Autodesk.Civil.ApplicationServices import CivilApplication
from Autodesk.Civil.DatabaseServices import ProfileView

BAND_STYLE_NAME = IN[0] if len(IN) > 0 and IN[0] else "COTA TERRENO POR PUNTOS_ELEVPERFIL2_V03"
NEW_PROF2_NAME  = IN[1] if len(IN) > 1 and IN[1] else "Proyecto Completo"
RUN             = IN[2] if len(IN) > 2 else False

adoc   = Application.DocumentManager.MdiActiveDocument
editor = adoc.Editor
civdoc = CivilApplication.ActiveDocument
db     = adoc.Database
log    = []

FLAGS = (BindingFlags.Public | BindingFlags.NonPublic |
         BindingFlags.Instance | BindingFlags.DeclaredOnly)

def get_prop(obj, name):
    ty = obj.GetType()
    while ty is not None:
        pi = ty.GetProperty(name, FLAGS)
        if pi is not None:
            g = pi.GetGetMethod(True)
            if g is not None:
                try:
                    return g.Invoke(obj, None)
                except:
                    pass
        ty = ty.BaseType
    return None

def set_prop(obj, name, value):
    try:
        setattr(obj, name, value)
        return True
    except:
        pass
    ty = obj.GetType()
    while ty is not None:
        pi = ty.GetProperty(name, FLAGS)
        if pi is not None:
            s = pi.GetSetMethod(True)
            if s is not None:
                try:
                    s.Invoke(obj, System.Array[System.Object]([value]))
                    return True
                except:
                    pass
        ty = ty.BaseType
    return False

def find_profile_id(t, alignment_id, target):
    align = t.GetObject(alignment_id, OpenMode.ForRead)
    target = target.strip().lower()
    for pid in align.GetProfileIds():
        prof = t.GetObject(pid, OpenMode.ForRead)
        nm = get_prop(prof, "Name")
        if nm is not None and target in nm.strip().lower():
            return pid
    return ObjectId.Null

def style_name_of(t, it):
    sid = get_prop(it, "BandStyleId")
    if sid is None or sid.IsNull:
        return ""
    st = t.GetObject(sid, OpenMode.ForRead)
    nm = get_prop(st, "Name")
    return nm.strip().lower() if nm else ""

def update_collection(t, items, target_style, new_p2_id):
    target = target_style.strip().lower()
    changed = 0
    for it in items:
        if style_name_of(t, it) == target:        # match EXACTO
            set_prop(it, "Profile2Id", new_p2_id)
            changed += 1
    return changed

if not RUN:
    OUT = "RUN = False. Pone el booleano en True para ejecutar."
else:
    res = editor.GetSelection()
    if res.Status != PromptStatus.OK:
        OUT = "Seleccion cancelada o vacia."
    else:
        try:
            with adoc.LockDocument():
                with db.TransactionManager.StartTransaction() as t:
                    for so in res.Value:
                        obj = t.GetObject(so.ObjectId, OpenMode.ForRead)
                        if not isinstance(obj, ProfileView):
                            continue
                        pv = t.GetObject(so.ObjectId, OpenMode.ForWrite)
                        new_p2 = find_profile_id(t, pv.AlignmentId, NEW_PROF2_NAME)
                        if new_p2.IsNull:
                            log.append("OMITIDA %s (no encontro '%s')"
                                       % (get_prop(pv, "Name"), NEW_PROF2_NAME))
                            continue
                        bs = pv.Bands
                        bottom = bs.GetBottomBandItems()
                        nb = update_collection(t, bottom, BAND_STYLE_NAME, new_p2)
                        if nb:
                            bs.SetBottomBandItems(bottom)
                        top = bs.GetTopBandItems()
                        nt = update_collection(t, top, BAND_STYLE_NAME, new_p2)
                        if nt:
                            bs.SetTopBandItems(top)
                        total = nb + nt
                        if total:
                            log.append("OK %s (%d guitarra/s)" % (get_prop(pv, "Name"), total))
                        else:
                            log.append("SIN CAMBIOS %s" % get_prop(pv, "Name"))
                    t.Commit()
                    OUT = log if log else ["No se selecciono ninguna vista valida."]
        except:
            OUT = "ERROR REAL:\n" + traceback.format_exc()
