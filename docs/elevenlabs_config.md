# Configuración documentada del agente de voz (ElevenLabs)

Estado: **IMPLEMENTADO y PROBADO** en la plataforma real (consulta, creación y folio inexistente). Ningún secreto aparece en este archivo.

## 1. Agente
- Agent ID público (el mismo que usa el widget del sitio): `agent_0801m8b8gttrf6mv2nrhaf38rnfc`.
- Rol: asistente de IA de AguaClara (empresa ficticia). Se identifica como IA, pide consentimiento antes de empezar, usa solo datos ficticios y no inventa folios ni precios: todo dato sale de la herramienta `pedidos`.
- Comparte el **mismo registro** que Telegram (n8n): un pedido creado por voz aparece en Telegram para aprobación y se consulta después por voz.

## 2. Herramienta de servidor `pedidos` (webhook)
| Campo | Valor |
|---|---|
| Método / URL | `POST https://jimenoidee.app.n8n.cloud/webhook/aguaclara-voz` |
| Cabecera de autenticación | `x-tool-secret` = **Secret del espacio de trabajo** `AGUACLARA_TOOL_SECRET_2` (el valor nunca se documenta; en n8n solo existe su hash salado) |
| Parámetros del cuerpo | `accion` (string, **enum: `consultar`, `crear`**), `folio` (string), `cliente` (string), `producto` (string), `cantidad` (number), `zona` (string), `fecha` (string AAAA-MM-DD) |

Notas de diseño: los nombres de parámetros van **sin acentos** (`accion`); las descripciones no llevan comillas; el webhook de n8n normaliza `accion` de forma tolerante (acepta `acción`, `action`, variantes como "consultarr", o la deduce si llega `folio` o `cliente`).

## 3. Widget en el sitio
Etiqueta `<elevenlabs-convai agent-id="…">` con solo el Agent ID (público). Dominio permitido en la lista de autorización del agente: `dtcases21-lgtm.github.io`. La API key de ElevenLabs no está en ningún archivo del repositorio ni del ZIP.

## 4. Pruebas en plataforma real
| Prueba | Resultado |
|---|---|
| Consultar `PED-0001` | Estado y total devueltos correctamente (confirmado, 1302.68 MXN simulado) |
| Crear pedido por voz | Creó `PED-0008` (canal voz), llegó a Telegram para `/aprobar PED-0008 2`; confirmado después y consultado por voz |
| Consultar `PED-9999` | Respuesta "folio inexistente", sin inventar datos |
| Ejecuciones n8n asociadas | 19, 20, 22, 24, 25 (ver `evidencias/telegram_ejecuciones.json`) |

## 5. Incidentes resueltos
1. El enum solo tenía `consultar` y el modelo envió `consultarr`: se agregó `crear` al enum y se hizo tolerante el webhook.
2. El parámetro con acento (`acción`) no se enviaba: se renombró a `accion`.
3. El Secret de ElevenLabs no es editable (solo eliminar/compartir): se creó uno nuevo (`…_2`), se apuntó la cabecera a él, se actualizó el hash en n8n (rotación, ejecuciones 24/25) y se eliminó el anterior.

## 6. Cómo recrearlo
1. En ElevenLabs crear el agente y pegar el prompt de `agentes/instrucciones.md` (sección voz).
2. Crear el Secret `AGUACLARA_TOOL_SECRET_2` con un valor aleatorio propio; calcular `sha256('aguaclara:'+valor)` y ponerlo en el nodo de n8n (`<SHA256_SALADO_DEL_SECRETO_DE_LA_HERRAMIENTA>` en el export público).
3. Añadir la herramienta de servidor `pedidos` con los campos de la sección 2 y la cabecera `x-tool-secret` ligada al Secret.
4. Importar `n8n/workflow_aguaclara.json`, publicar y probar con `consultar PED-0001`.
5. Autorizar el dominio del sitio y pegar el widget.

## 7. Límites declarados
- La plataforma no exporta la configuración del agente como archivo; esta guía es la referencia.
- Minutos y costo de voz: **PENDIENTE** de leer del panel de uso de ElevenLabs (`costos/costos.csv` lo marca como estimado).
- Micrófono denegado: solo simulado (el sitio muestra la alternativa por Telegram); no reproducido con un navegador real.
