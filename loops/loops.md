# Loops ejecutables (implementados en agentes/core.py::procesar y agentes/loops.py)
## Loop 1: Calidad de negocio
Entrada: texto del pedido. Responsable: ORQ (ejecuta), A4 (mide). Secuencia: generar (A3) → medir (A4: campos, cálculo, fuentes, tope) → diagnosticar (hallazgos) → corregir (acción de retorno: recalcular sin override) → validar. Máx. 3 iteraciones, tiempo límite 5 s, presupuesto USD 0.05/caso. Al agotar: estado `devuelto_agotado`, no se libera.
## Loop 2: Seguridad y costo
Entrada: caso_id y paso solicitado. Responsable: ORQ. Secuencia: evaluar permisos y presupuesto → ejecutar paso autorizado → registrar consumo (costos.csv) → revisar límite → continuar o detener. Máx. 3 iteraciones, presupuesto USD 0.05/caso, acción de retorno: detener. Al agotar: `detenido_presupuesto`.
## Autoevaluación (0-4): claridad 4, secuencia 4, evidencia 4, control 4, utilidad 3 = 19/20
