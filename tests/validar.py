"""Controles previos a publicar: estructura de datos, cálculos, reglas, archivos requeridos y búsqueda de secretos. Falla con exit 1."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent; errs = []
sys.path.insert(0, str(ROOT / "agentes"))
for f in ["README.md","web/index.html","web/app.js","web/styles.css","web/data/pedidos.json","datos/catalogo.json","skills/cotizar-pedido-agua/SKILL.md","skills/revisar-pedido-agua/SKILL.md","loops/loops.md","costos/costos.csv","tests/pruebas.csv",".env.example"]:
    if not (ROOT / f).exists(): errs.append("archivo faltante: " + f)
try:
    d = json.loads((ROOT / "web/data/pedidos.json").read_text(encoding="utf-8"))
    for k in ["empresa","proposito","fuente","periodo","actualizado","ficticio","pedidos"]:
        if k not in d: errs.append("pedidos.json sin campo " + k)
    if d.get("ficticio") is not True: errs.append("falta rótulo ficticio")
    cat = json.loads((ROOT / "datos/catalogo.json").read_text(encoding="utf-8")); skus = {p["sku"]: p for p in cat["productos"]}; tope = cat["supuestos"]["descuento_tope"]
    for p in d["pedidos"]:
        for prohibido in ["nombre","chat_id","texto","telefono","correo","email"]:
            if prohibido in p: errs.append(f"{p.get('caso_id')}: campo privado '{prohibido}' en datos públicos")
        cl = p.get("cliente")
        if cl is not None and (len(cl) > 40 or "@" in cl or re.search(r"\d{7,}", cl) or re.search(r"https?:", cl)): errs.append(f"{p.get('caso_id')}: cliente no parece un alias ficticio")
        if p.get("descuento_pct") is not None and p["descuento_pct"] > tope + 1e-9: errs.append(f"{p['caso_id']}: descuento sobre tope")
        if p.get("estado") == "confirmado" and p.get("total") is not None and p["total"] <= 0: errs.append(f"{p['caso_id']}: total inválido")
        if p.get("sku") and p["sku"] not in skus: errs.append(f"{p['caso_id']}: sku desconocido")
    import core
    if core.calcular(38.0, 30, 40.0)["total"] != 1302.68: errs.append("cálculo determinista no coincide (1302.68)")
except Exception as e: errs.append("error de validación: " + str(e))
pat = re.compile(r"(\b\d{8,10}:AA[\w-]{30,}|sk_[a-f0-9]{30,}|ghp_[A-Za-z0-9]{30,}|github_pat_\w{20,}|xi-api-key\s*[:=]\s*\S{20,})")
for p in ROOT.rglob("*"):
    if p.is_file() and ".git" not in p.parts and p.suffix in {".py",".js",".json",".html",".css",".md",".csv",".yml",".txt",".jsonl"}:
        if pat.search(p.read_text(encoding="utf-8", errors="ignore")): errs.append("posible secreto en " + str(p.relative_to(ROOT)))
if errs: print("VALIDACIÓN FALLIDA:\n- " + "\n- ".join(errs)); sys.exit(1)
print("VALIDACIÓN OK")
