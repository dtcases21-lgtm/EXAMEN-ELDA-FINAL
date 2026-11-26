"""Ecosistema de agentes de pedidos (AguaClara, ficticia). Python estándar, determinista. Modo SIMULADO."""
import json, os, re, sqlite3, time, csv, hashlib, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAT = json.loads((ROOT / "datos" / "catalogo.json").read_text(encoding="utf-8"))
DB = Path(os.environ.get("PEDIDOS_DB", ROOT / "datos" / "privado" / "pedidos.db"))
COSTOS = Path(os.environ.get("COSTOS_CSV", ROOT / "costos" / "costos.csv"))
TRAZA = Path(os.environ.get("TRAZA_JSONL", ROOT / "evidencias" / "trazas.jsonl"))
USUARIOS = {"u_demo1": "aprobador", "u_demo2": "solicitante"}  # alias; mapeo a chat_id solo en credenciales privadas
TTL_APROBACION_MIN = int(os.environ.get("TTL_MIN", "30"))
PRESUPUESTO_USD = float(os.environ.get("PRESUPUESTO_USD", "0.05"))
MAX_LONG = 500
HEAD = ["fecha","caso_id","llamada_id","etapa","agente","proveedor","modelo","tokens_entrada","tokens_salida","tokens_cache","duracion_voz_s","unidad","tarifa","costo","moneda","estado","reintento","origen"]
INYECCION = re.compile(r"(ignora|olvida|desactiva|omite).{0,30}(reglas|instrucciones|pol[ií]ticas|controles)|revela.{0,20}(clave|token|secret)|api[ _-]?key|system prompt|sk_[a-z0-9]{8,}|\b\d{9,10}:AA[\w-]{20,}", re.I)

def now(): return datetime.now(timezone.utc).isoformat(timespec="seconds")

def db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row
    c.executescript("""CREATE TABLE IF NOT EXISTS casos(caso_id TEXT PRIMARY KEY,canal TEXT,usuario TEXT,estado TEXT,version INT,
      datos TEXT,resultado TEXT,creado TEXT,actualizado TEXT,expira TEXT,costo_usd REAL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS eventos(clave TEXT PRIMARY KEY,caso_id TEXT,creado TEXT);
      CREATE TABLE IF NOT EXISTS seq(k TEXT PRIMARY KEY,v INT);""")
    return c

def folio(c):
    r = c.execute("SELECT v FROM seq WHERE k='f'").fetchone(); n = (r[0] if r else 0) + 1
    c.execute("INSERT OR REPLACE INTO seq VALUES('f',?)", (n,)); return f"PED-{n:04d}"

def traza(caso_id, agente, estado, resultado, **kw):
    TRAZA.parent.mkdir(parents=True, exist_ok=True)
    rec = {"ts": now(), "caso_id": caso_id, "agente": agente, "estado": estado, "resultado": resultado, **kw}
    with open(TRAZA, "a", encoding="utf-8") as f: f.write(json.dumps(rec, ensure_ascii=False) + "\n")

def costo(caso_id, etapa, agente, proveedor="local", modelo="determinista", tin="NA", tout="NA", voz="NA",
          unidad="n/a", tarifa=0.0, usd=0.0, estado="ok", reintento=0, origen="medido"):
    COSTOS.parent.mkdir(parents=True, exist_ok=True)
    nuevo = not COSTOS.exists()
    lid = "L-" + uuid.uuid4().hex[:8]
    with open(COSTOS, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if nuevo: w.writerow(HEAD)
        w.writerow([now(), caso_id, lid, etapa, agente, proveedor, modelo, tin, tout, "NA", voz, unidad, tarifa, usd, "USD", estado, reintento, origen])
    return lid

# ---------- Guardrails ----------
def g_usuario(u): return u in USUARIOS
def g_texto(t):
    if not isinstance(t, str) or not t.strip(): return "vacio"
    if len(t) > MAX_LONG: return "longitud"
    if INYECCION.search(t): return "inyeccion"
    return None
def g_presupuesto(c, caso_id):
    r = c.execute("SELECT costo_usd FROM casos WHERE caso_id=?", (caso_id,)).fetchone()
    return (r["costo_usd"] if r else 0) < PRESUPUESTO_USD

# ---------- Agente 1 ----------
def _norm(s): return re.sub(r"[^a-z0-9ñ ]", "", s.lower().replace("á","a").replace("é","e").replace("í","i").replace("ó","o").replace("ú","u"))
ALIAS = {"GAR20":["garrafon 20","garrafon de 20","garrafones de 20","garrafon"],"GAR10":["garrafon 10","garrafon de 10","garrafones de 10"],
 "BOT1500":["1.5","15 l","botella 15","botellas de 15"],"BOT600":["600"],"BOT355":["355"],"DISP":["dispensador"],"AGUA_ALC":["alcalina"]}
def agente1(caso_id, texto):
    t0 = time.time(); datos = {}; falta = []
    m = re.search(r"cliente\s*[:=]\s*([^,;\n]+)", texto, re.I); datos["cliente"] = m.group(1).strip() if m else None
    m = re.search(r"cantidad\s*[:=]\s*(\d+)", texto, re.I) or re.search(r"\b(\d+)\s*(?:garraf|botell|paquete|dispens|unid)", texto, re.I)
    datos["cantidad"] = int(m.group(1)) if m else None
    m = re.search(r"zona\s*[:=]\s*([A-Za-zÁÉÍÓÚáéíóú]+)", texto, re.I); datos["zona"] = m.group(1).upper() if m else None
    m = re.search(r"fecha\s*[:=]\s*(\d{4}-\d{2}-\d{2})", texto, re.I); datos["fecha"] = m.group(1) if m else None
    m = re.search(r"producto\s*[:=]\s*([^,;\n]+)", texto, re.I); ptxt = _norm(m.group(1)) if m else _norm(texto)
    datos["sku"] = None
    for sku, al in sorted(ALIAS.items(), key=lambda x: -max(len(a) for a in x[1])):
        if m and sku.lower() == ptxt.strip(): datos["sku"] = sku; break
        if any(a in ptxt for a in sorted(al, key=len, reverse=True)): datos["sku"] = sku; break
    if datos["sku"] is None and m:
        for p in CAT["productos"]:
            if p["sku"].lower() == ptxt.strip(): datos["sku"] = p["sku"]
    for k in ["cliente","sku","cantidad","zona","fecha"]:
        if datos[k] is None: falta.append(k)
    if datos["zona"] is not None and datos["fecha"] is not None:
        try: datetime.strptime(datos["fecha"], "%Y-%m-%d")
        except ValueError: falta.append("fecha_valida")
    est = "aclaracion" if falta else "ok"
    return {"caso_id": caso_id, "agente": "A1", "estado": est, "resultado": {"requerimiento": datos, "faltantes": falta},
            "fuentes": [], "advertencias": [], "duracion_ms": int((time.time()-t0)*1000)}

# ---------- Agente 2 ----------
def agente2(caso_id, req):
    t0 = time.time(); r = req["requerimiento"]
    prod = next((p for p in CAT["productos"] if p["sku"] == r["sku"]), None)
    zona = next((z for z in CAT["zonas"] if z["zona"] == r["zona"]), None)
    if not prod or not zona:
        return {"caso_id": caso_id, "agente": "A2", "estado": "insuficiente", "resultado": {"motivo": "producto o zona sin evidencia en catálogo"},
                "fuentes": [], "advertencias": ["declaración de insuficiencia"], "duracion_ms": int((time.time()-t0)*1000)}
    ev = {"producto": prod, "zona": zona, "existencias_ok": prod["existencias"] >= r["cantidad"], "minimo_ok": r["cantidad"] >= prod["minimo"], "cobertura_ok": zona["cobertura"]}
    return {"caso_id": caso_id, "agente": "A2", "estado": "ok", "resultado": ev, "fuentes": ["datos/catalogo.json#" + prod["sku"], "datos/catalogo.json#zona:" + zona["zona"]],
            "advertencias": [], "duracion_ms": int((time.time()-t0)*1000)}

# ---------- Agente 3 (cálculo determinista) ----------
def calcular(precio, cantidad, envio, desc_override=None):
    s = CAT["supuestos"]; sub = round(precio * cantidad, 2)
    pct = 0.0
    for umbral, p in s["descuento_tramos"]:
        if cantidad >= umbral: pct = p; break
    if desc_override is not None: pct = desc_override
    pct = min(pct, s["descuento_tope"]) if desc_override is None else pct
    desc = round(sub * pct, 2); base = sub - desc
    env = 0.0 if base >= s["envio_gratis_desde"] else envio
    iva = round((base + env) * s["iva"], 2)
    return {"subtotal": sub, "descuento_pct": pct, "descuento": desc, "envio": env, "iva": iva, "total": round(base + env + iva, 2)}

def agente3(caso_id, req, ev, desc_override=None):
    t0 = time.time(); r = req["requerimiento"]
    c = calcular(ev["producto"]["precio"], r["cantidad"], ev["zona"]["envio"], desc_override)
    res = {**c, "moneda": "MXN", "supuestos": CAT["supuestos"]["iva_nota"], "etiqueta": "resultado simulado", "sku": r["sku"], "cantidad": r["cantidad"], "zona": r["zona"]}
    return {"caso_id": caso_id, "agente": "A3", "estado": "ok", "resultado": res, "fuentes": ["datos/catalogo.json"], "advertencias": [], "duracion_ms": int((time.time()-t0)*1000)}

# ---------- Agente 4 (revisor independiente) ----------
def agente4(caso_id, req, ev, prop):
    t0 = time.time(); errs = []; p = prop["resultado"]; r = req["requerimiento"]
    prod = next(x for x in CAT["productos"] if x["sku"] == r["sku"]); zona = next(z for z in CAT["zonas"] if z["zona"] == r["zona"])
    if r["cantidad"] > prod["existencias"]: errs.append("existencias_insuficientes")
    if r["cantidad"] < prod["minimo"]: errs.append("bajo_minimo")
    if not zona["cobertura"]: errs.append("zona_sin_cobertura")
    if p["descuento_pct"] > CAT["supuestos"]["descuento_tope"] + 1e-9: errs.append("descuento_sobre_tope")
    ref = calcular(prod["precio"], r["cantidad"], zona["envio"])
    if abs(ref["total"] - p["total"]) > 0.01 or abs(ref["subtotal"] - p["subtotal"]) > 0.01: errs.append("calculo_no_coincide")
    if not prop["fuentes"]: errs.append("sin_fuentes")
    if p.get("etiqueta") != "resultado simulado": errs.append("sin_rotulo_simulacion")
    bloq = {"existencias_insuficientes","bajo_minimo","zona_sin_cobertura"} & set(errs)
    est = "ok" if not errs else ("bloqueado" if bloq else "devuelto")
    return {"caso_id": caso_id, "agente": "A4", "estado": est, "resultado": {"hallazgos": errs, "total_recalculado": ref["total"]},
            "fuentes": ["recalculo independiente"], "advertencias": errs, "duracion_ms": int((time.time()-t0)*1000)}

# ---------- Orquestador ----------
def procesar(texto, usuario, canal="cli", caso_id=None, forzar_descuento=None, skills=None):
    """Crea/actualiza un caso. Devuelve dict con estado y salidas. forzar_descuento simula un fallo V1 del agente 3."""
    c = db()
    if not g_usuario(usuario):
        traza("N/A", "ORQ", "bloqueado", {"motivo": "usuario_no_autorizado", "usuario": usuario}); return {"estado": "bloqueado", "motivo": "usuario no autorizado"}
    g = g_texto(texto)
    if g:
        cid = caso_id or folio(c)
        traza(cid, "ORQ", "bloqueado", {"motivo": g}); c.commit()
        return {"estado": "rechazado", "caso_id": cid, "motivo": g, "mensaje": "Entrada no válida; corrige y reenvía. (resultado simulado)"}
    cid = caso_id or folio(c); ts = now()
    c.execute("INSERT OR IGNORE INTO casos(caso_id,canal,usuario,estado,version,datos,creado,actualizado) VALUES(?,?,?,?,?,?,?,?)", (cid, canal, usuario, "en_proceso", 1, "{}", ts, ts))
    if skills: traza(cid, "ORQ", "skill_cargado", {"skills": skills})
    salidas = []; iter_max = 3; costo_caso = 0.0
    a1 = agente1(cid, texto); salidas.append(a1); traza(cid, "A1", a1["estado"], a1["resultado"]); costo(cid, "agentes", "A1", unidad="regla")
    if a1["estado"] != "ok":
        return _cerrar(c, cid, "aclaracion", salidas, "Faltan datos: " + ", ".join(a1["resultado"]["faltantes"]))
    a2 = agente2(cid, a1["resultado"]); salidas.append(a2); traza(cid, "A2", a2["estado"], {"existencias_ok": a2["resultado"].get("existencias_ok")}); costo(cid, "agentes", "A2", unidad="consulta")
    if a2["estado"] != "ok": return _cerrar(c, cid, "rechazado", salidas, "Sin evidencia en la fuente autorizada")
    override = forzar_descuento; a3 = a4 = None
    for it in range(1, iter_max + 1):
        if not g_presupuesto(c, cid): return _cerrar(c, cid, "detenido_presupuesto", salidas, "Presupuesto agotado")
        a3 = agente3(cid, a1["resultado"], a2["resultado"], override); costo(cid, "agentes", "A3", unidad="funcion", reintento=it-1); traza(cid, "A3", "ok", {"iter": it, "total": a3["resultado"]["total"], "desc_pct": a3["resultado"]["descuento_pct"]})
        a4 = agente4(cid, a1["resultado"], a2["resultado"], a3); costo(cid, "revision", "A4", unidad="regla", reintento=it-1); traza(cid, "A4", a4["estado"], {"iter": it, "hallazgos": a4["resultado"]["hallazgos"]})
        salidas += [a3, a4]
        if a4["estado"] == "ok": break
        if a4["estado"] == "bloqueado": return _cerrar(c, cid, "rechazado", salidas, "Bloqueado por revisor: " + ", ".join(a4["resultado"]["hallazgos"]))
        override = None  # acción de retorno: recalcular sin override
    if a4["estado"] != "ok": return _cerrar(c, cid, "devuelto_agotado", salidas, "No superó revisión en 3 iteraciones")
    exp = (datetime.now(timezone.utc) + timedelta(minutes=TTL_APROBACION_MIN)).isoformat(timespec="seconds")
    c.execute("UPDATE casos SET estado='pendiente_aprobacion',version=version+1,datos=?,resultado=?,actualizado=?,expira=? WHERE caso_id=?",
              (json.dumps(a1["resultado"]["requerimiento"], ensure_ascii=False), json.dumps(a3["resultado"], ensure_ascii=False), now(), exp, cid))
    c.commit(); v = c.execute("SELECT version FROM casos WHERE caso_id=?", (cid,)).fetchone()[0]
    traza(cid, "ORQ", "pendiente_aprobacion", {"version": v, "expira": exp})
    return {"estado": "pendiente_aprobacion", "caso_id": cid, "version": v, "propuesta": a3["resultado"], "expira": exp, "mensaje": "Propuesta lista (resultado simulado)."}

def _cerrar(c, cid, estado, salidas, msg):
    c.execute("UPDATE casos SET estado=?,actualizado=? WHERE caso_id=?", (estado, now(), cid)); c.commit()
    traza(cid, "ORQ", estado, {"mensaje": msg})
    return {"estado": estado, "caso_id": cid, "mensaje": msg + " (resultado simulado)", "salidas": [s["agente"] + ":" + s["estado"] for s in salidas]}

def expirar(c=None):
    c = c or db(); n = 0
    for r in c.execute("SELECT caso_id FROM casos WHERE estado='pendiente_aprobacion' AND expira < ?", (now(),)).fetchall():
        c.execute("UPDATE casos SET estado='vencido',actualizado=? WHERE caso_id=?", (now(), r[0])); traza(r[0], "ORQ", "vencido", {}); n += 1
    c.commit(); return n

def decidir(caso_id, usuario, accion, version, evento=None):
    c = db(); expirar(c)
    if USUARIOS.get(usuario) != "aprobador":
        traza(caso_id, "ORQ", "bloqueado", {"motivo": "sin_permiso_aprobar", "usuario": usuario}); return {"ok": False, "motivo": "usuario sin permiso para aprobar"}
    clave = evento or f"{caso_id}:{usuario}:{accion}:{version}"
    if c.execute("SELECT 1 FROM eventos WHERE clave=?", (clave,)).fetchone(): return {"ok": False, "motivo": "evento duplicado ignorado"}
    r = c.execute("SELECT * FROM casos WHERE caso_id=?", (caso_id,)).fetchone()
    if not r: return {"ok": False, "motivo": "folio inexistente"}
    if r["estado"] != "pendiente_aprobacion": return {"ok": False, "motivo": f"estado actual: {r['estado']}"}
    if int(version) != r["version"]: return {"ok": False, "motivo": "versión no vigente"}
    nuevo = "confirmado" if accion == "aprobar" else "rechazado"
    c.execute("INSERT INTO eventos VALUES(?,?,?)", (clave, caso_id, now()))
    c.execute("UPDATE casos SET estado=?,actualizado=? WHERE caso_id=?", (nuevo, now(), caso_id)); c.commit()
    traza(caso_id, "ORQ", nuevo, {"usuario": usuario, "version": version}); return {"ok": True, "estado": nuevo, "mensaje": "Pedido " + nuevo + " (resultado simulado)"}

def estado(caso_id):
    c = db(); expirar(c); r = c.execute("SELECT * FROM casos WHERE caso_id=?", (caso_id,)).fetchone()
    if not r: return {"ok": False, "motivo": "folio inexistente"}
    return {"ok": True, "caso_id": r["caso_id"], "estado": r["estado"], "version": r["version"], "canal": r["canal"],
            "resultado": json.loads(r["resultado"]) if r["resultado"] else None, "nota": "resultado simulado"}
