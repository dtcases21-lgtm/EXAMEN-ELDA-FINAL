---
name: revisar-pedido-agua
version: 1.0.0
description: Revisión independiente de una propuesta de pedido antes de liberarla a aprobación humana; puede devolver o bloquear.
---
# Skill de calidad/seguridad: revisar-pedido-agua
**Activador:** existe una propuesta de A3 para un caso_id.
**Objetivo:** impedir la liberación de propuestas incorrectas o fuera de política.
**Entradas:** requerimiento (A1), evidencia (A2), propuesta (A3).
**Fuentes:** `datos/catalogo.json` y recálculo propio; no reutiliza el resultado de A3.
**Pasos:** recalcular → comparar subtotal/total → verificar existencias, mínimo, cobertura, tope de descuento, fuentes y rótulo → decidir.
**Herramientas permitidas:** solo lectura de catálogo y calcular(). Sin escritura de registros.
**Límites:** no modifica la propuesta; solo emite ok/devuelto/bloqueado con hallazgos concretos.
**Salidas:** estado + lista de hallazgos.
**Errores:** propuesta ausente → error; hallazgo bloqueante (existencias, mínimo, cobertura) → bloqueado; corregible (cálculo, tope, rótulo) → devuelto.
**Criterios de aceptación:** cero hallazgos para liberar.
**Ejemplo válido:** propuesta con 5% de descuento y total coincidente → ok.
**Ejemplo rechazable:** descuento de 50% → devuelto (descuento_sobre_tope); 99 dispensadores → bloqueado (existencias_insuficientes).
**Autoevaluación (0-4):** claridad 4, secuencia 4, evidencia 3, control 4, utilidad 4 = 19/20.
