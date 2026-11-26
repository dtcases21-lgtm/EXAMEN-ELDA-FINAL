# Diccionario de datos (web/data/pedidos.json, sanitizado)
| Campo | Tipo | Descripción |
|---|---|---|
| caso_id | texto | Folio PED-NNNN, compartido por Telegram, voz, aprobaciones y costos |
| canal | texto | telegram / voz |
| estado | texto | confirmado, rechazado, vencido, aclaracion, pendiente_aprobacion, devuelto_agotado |
| fecha | AAAA-MM-DD | Fecha de creación |
| sku, zona, cantidad | texto/número | Producto, zona y unidades (catálogo ficticio) |
| total | número MXN | Total simulado con IVA 16% (supuesto) |
| descuento_pct | número 0-0.10 | Descuento por volumen, tope 10% |
| correccion | booleano | El revisor devolvió una versión previa |
| costo_usd | número | Costo variable medido (0 si no hay LLM) |
Campos privados (nunca publicados): cliente, chat_id, texto original, trazas detalladas. Muestra: web/data/pedidos.json.
