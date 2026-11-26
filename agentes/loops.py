"""Evidencia de loops: V1 fallida -> V2 corregida (mismo caso_id) y reutilización en segundo caso. Uso: python agentes/loops.py"""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import core, skill_adapter
def main():
    sk = skill_adapter.cargar_todos(); out = {"skills_cargados": sk}
    t1 = "cliente: Cafe Luna, producto: garrafon 20, cantidad: 30, zona: centro, fecha: 2026-12-01"
    r1 = core.procesar(t1, "u_demo2", canal="cli", forzar_descuento=0.5, skills=sk)  # V1 con descuento indebido -> V2 corregida
    out["caso_1_V1_V2"] = {"caso_id": r1["caso_id"], "estado": r1["estado"], "total": r1["propuesta"]["total"]}
    t2 = "cliente: Oficinas Sol, producto: botella 600, cantidad: 12, zona: norte, fecha: 2026-12-03"
    r2 = core.procesar(t2, "u_demo2", canal="cli", skills=sk); out["caso_2_reutilizacion"] = {"caso_id": r2["caso_id"], "estado": r2["estado"], "total": r2["propuesta"]["total"]}
    print(json.dumps(out, ensure_ascii=False, indent=1))
if __name__ == "__main__": main()
