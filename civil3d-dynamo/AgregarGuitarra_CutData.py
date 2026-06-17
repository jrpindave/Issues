# =====================================================================
# Dynamo (nodo Python, motor IronPython 2.7) para Civil 3D
# Agrega la guitarra "Cut Data_01" (Datos de perfil) a varias vistas de
# perfil SELECCIONADAS en pantalla, SIN borrar las guitarras existentes.
#
#   Perfil 1 = Terreno Natural   |   Perfil 2 = Proyecto Completo
#   Hueco (Gap) = 0  (sin separacion)
#
# Inputs:
#   IN[0] = STYLE_NAME  ("Cut Data_01")
#   IN[1] = PROF1_NAME  ("Terreno Natural")  -> match por "contiene"
#   IN[2] = PROF2_NAME  ("Proyecto Completo")
#   IN[3] = RUN         (Boolean) -> True para ejecutar
#   IN[4] = GAP_VALUE   (opcional, default 0.0)
#
# NOTA: las propiedades Name / Profile1Id / Profile2Id de los objetos de
# Civil 3D no se pueden leer/escribir directo (el getter/setter esta en
# una clase base, oculto). Por eso se usan get_prop/set_prop por reflexion,
# recorriendo la jerarquia de tipos. Esto aplica a estilos y a perfiles.
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

STYLE_NAME = IN[0] if len(IN) > 0 and IN[0] else "Cut Data_01"
PROF1_NAME = IN[1] if len(IN) > 1 and IN[1] else "Terreno Natural"
PROF2_NAME = IN[2] if len(IN) > 2 and IN[2] else "Proyecto Completo"
RUN        = IN[3] if len(IN) > 3 else False
GAP_VALUE  = IN[4] if len(IN) > 4 else 0.0

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

def find_band_style_id(t, name):
    coll = civdoc.Styles.BandStyles.ProfileViewProfileDataBandStyles
    target = name.strip().lower()
    for sid in coll:
        st = t.GetObject(sid, OpenMode.ForRead)
        nm = get_prop(st, "Name")
        if nm is not None and nm.strip().lower() == target:
            return sid
    return ObjectId.Null

def find_profile_id(t, alignment_id, target):
    align = t.GetObject(alignment_id, OpenMode.ForRead)
    target = target.strip().lower()
    for pid in align.GetProfileIds():
        prof = t.GetObject(pid, OpenMode.ForRead)
        nm = get_prop(prof, "Name")
        if nm is not None and target in nm.strip().lower():
            return pid
    return ObjectId.Null

def last_item(items):
    last = None
    for it in items:
        last = it
    return last

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
                    style_id = find_band_style_id(t, STYLE_NAME)
                    if style_id.IsNull:
                        OUT = "No se encontro el estilo '%s'." % STYLE_NAME
                    else:
                        for so in res.Value:
                            obj = t.GetObject(so.ObjectId, OpenMode.ForRead)
                            if not isinstance(obj, ProfileView):
                                continue
                            pv = t.GetObject(so.ObjectId, OpenMode.ForWrite)
                            p1 = find_profile_id(t, pv.AlignmentId, PROF1_NAME)
                            p2 = find_profile_id(t, pv.AlignmentId, PROF2_NAME)
                            if p1.IsNull or p2.IsNull:
                                log.append("OMITIDA %s (no encontro Perfil1/Perfil2)" % get_prop(pv, "Name"))
                                continue
                            bs = pv.Bands
                            items = bs.GetBottomBandItems()
                            items.Add(style_id)
                            new = last_item(items)
                            set_prop(new, "Profile1Id", p1)
                            set_prop(new, "Profile2Id", p2)
                            set_prop(new, "Gap", GAP_VALUE)
                            set_prop(new, "LabelAtStartStation", True)
                            set_prop(new, "LabelAtEndStation", True)
                            bs.SetBottomBandItems(items)
                            log.append("OK %s" % get_prop(pv, "Name"))
                        t.Commit()
                        OUT = log if log else ["No se selecciono ninguna vista valida."]
        except:
            OUT = "ERROR REAL:\n" + traceback.format_exc()
