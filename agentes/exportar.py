"""Exportación sanitizada reproducible: registro privado (SQLite) -> web/data/pedidos.json (sin cliente, sin chat_id, sin conversaciones)."""
import json, os, sys, sqlite3
from pathlib import Path
from datetime import datetime, timezone
ROOT = Path(__file__).resolve().parent.parent
DB = Path(os.environ.get("PEDIDOS_DB", ROOT / "datos" / "privado" / "pedidos.db"))
def main(origen_json=None):
    if origen_json:  # exportación de n8n (ya sanitizada en origen)
        filas = json.loads(Path(origen_json).read_text(encoding="utf-8"))
    else:
        c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
        filas = []
        for r in c.execute("SELECT * FROM casos ORDER BY caso_id"):
            res = json.loads(r["resultado"]) if r["resultado"] else {}
            filas.append({"caso_id": r["caso_id"], "canal": r["canal"], "estado": r["estado"], "fecha": r["creado"][:10], "sku": res.get("sku"), "zona": res.get("zona"),
                          "cantidad": res.get("cantidad"), "total": res.get("total"), "descuento_pct": res.get("descuento_pct"), "costo_usd": round(r["costo_usd"] or 0, 6)})
    out = {"empresa": "AguaClara Distribuciones (ficticia)", "proposito": "Registro de pedidos de agua embotellada", "fuente": "Registro privado de casos (exportación sanitizada)",
           "periodo": "Nov 2026 (datos de prueba)", "actualizado": datetime.now(timezone.utc).isoformat(timespec="seconds"), "ficticio": True, "moneda": "MXN", "pedidos": filas}
    (ROOT / "web" / "data").mkdir(parents=True, exist_ok=True)
    (ROOT / "web" / "data" / "pedidos.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8"); print(len(filas), "pedidos exportados")
if __name__ == "__main__": main(sys.argv[1] if len(sys.argv) > 1 else None)
