# Contratos JSON (v1.0)
## Entrada (orquestador y agentes)
{"caso_id":"PED-0001","canal":"telegram|voz|cli","usuario":"u_demo1","objetivo":"registrar_pedido","datos":{"texto":"..."},"modo":"SIMULADO","limite_costo_usd":0.05}
## Salida (cada agente)
{"caso_id":"PED-0001","agente":"A1|A2|A3|A4|ORQ","estado":"ok|aclaracion|insuficiente|devuelto|bloqueado|error","resultado":{},"fuentes":[],"advertencias":[],"duracion_ms":0,"costo_ref":"llamada_id"}
## Reglas
- Sin secretos ni razonamiento privado en trazas. Modo SIMULADO: toda salida de negocio incluye "resultado simulado".
