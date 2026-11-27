# Evidencia de voz/texto con el agente de ElevenLabs (sanitizada)
Probado en el chat de prueba de ElevenLabs y vía webhook de producción de n8n (ejecuciones 19, 20, 22).
1. 'Consulta el pedido PED-0001' -> herramienta pedidos(consultar) -> confirmado, 1302.68 MXN.
2. 'Crea un pedido para Cafe Luna, 12 botellas de 600 ml, zona norte, fecha 2026-12-03' -> pedidos(crear) -> PED-0008, 1079.08 MXN, pendiente de aprobación humana.
3. 'Consulta el pedido PED-9999' -> 'Folio inexistente'; el agente informa que no existe.
4. PED-0008 aprobado en Telegram con /aprobar PED-0008 2 -> confirmado.
Incidente: el enum de la herramienta solo incluía 'consultar' y el modelo escribió 'consultarr'; se corrigió el enum (consultar, crear) y el webhook tolera variantes.
