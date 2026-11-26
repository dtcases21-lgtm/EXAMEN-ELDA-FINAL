"""Adaptador: lee SKILL.md, extrae nombre/versión/hash y deja la carga en la traza del caso."""
import hashlib, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
def cargar(nombre):
    p = ROOT / "skills" / nombre / "SKILL.md"; t = p.read_text(encoding="utf-8")
    ver = re.search(r"^version:\s*(\S+)", t, re.M).group(1)
    return {"skill": nombre, "version": ver, "sha256": hashlib.sha256(t.encode()).hexdigest()[:12], "criterios": re.search(r"\*\*Criterios de aceptación:\*\*(.*)", t).group(1).strip()}
def cargar_todos(): return [cargar("cotizar-pedido-agua"), cargar("revisar-pedido-agua")]
