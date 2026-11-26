# AguaClara · Registro de pedidos con agentes (proyecto final AI Tools)
Empresa **ficticia** de agua embotellada. Proceso: registro de pedidos (solicitud → confirmado / rechazado / vencido). Modo **SIMULADO**: todo dato es ficticio y toda salida dice "resultado simulado".
**Sitio:** https://dtcases21-lgtm.github.io/EXAMEN-ELDA-FINAL/ · **Bot:** @jimenoidebot · **Rama:** `main`

## Arquitectura
Telegram → Telegram Trigger único (n8n Cloud, HTTPS) → Orquestador → A1 intérprete → A2 fuente (catalogo.json) → A3 cálculo determinista → A4 revisor (puede bloquear) → registro (static data de n8n) → aprobación `/aprobar FOLIO VERSION` → notificación. Voz: ElevenLabs → webhook `aguaclara-voz` (cabecera `x-tool-secret`) → mismo orquestador y registro. Datos sanitizados → GitHub Actions (validar) → GitHub Pages.
Dónde corre cada componente: agentes y registro en n8n Cloud; sitio en GitHub Pages; validación en GitHub Actions; voz en ElevenLabs; `agentes/core.py` es la referencia local (misma lógica, para pruebas).

## Estructura
`agentes/` instrucciones, contratos, núcleo Python, adaptador de skills, loops, exportación · `n8n/` workflow exportado y código de nodos · `skills/` 2 SKILL.md · `loops/` reglas · `tests/` pruebas y `pruebas.csv` · `datos/` catálogo y diccionario · `costos/` registro, tarifas, escenarios · `evidencias/` · `web/` sitio · `docs/` informe y configuración · `.github/workflows/deploy.yml`.

## Requisitos y versiones
Python 3.12+, Node 20+ (solo pruebas), cuenta n8n Cloud, bot de Telegram, cuenta ElevenLabs, repo de GitHub con Pages = "GitHub Actions". Sin dependencias externas.

## Credenciales (solo nombres; ver `.env.example`)
`TELEGRAM_BOT_TOKEN` (credencial de n8n "Telegram account"), `TELEGRAM_APPROVER_CHAT_ID` (solo como hash en el nodo), `ELEVENLABS_TOOL_SECRET` (secreto de la herramienta; en n8n solo su hash), `ELEVENLABS_API_KEY`, `GITHUB_TOKEN`. Nunca en el repo.

## Importar y arrancar
1. n8n → Workflows → Import from file → `n8n/workflow_aguaclara.json`.
2. Reemplazar `<SHA256_SALADO_DEL_CHAT_ID_APROBADOR>` y `<SHA256_SALADO_DEL_SECRETO_DE_LA_HERRAMIENTA>` en el nodo "Orquestador y Agentes" (y el segundo en "Exportar sanitizado") por `sha256("aguaclara:" + valor)`.
3. Vincular la credencial de Telegram en "Telegram Trigger" y "Enviar Telegram"; **Publish**. Un solo receptor por bot.
4. Parada: despublicar el workflow.

## Caso de prueba y resultado esperado
En Telegram: `/nuevo cliente: Cafe Luna, producto: garrafon 20, cantidad: 30, zona: centro, fecha: 2026-12-01` → folio PED-000N, total 1302.68 MXN (simulado). Luego `/estado PED-000N`, `/aprobar PED-000N 2` → confirmado. Solicitar acceso: pedir al responsable que agregue tu chat_id (hash) al nodo.

## Validación
`python tests/test_core.py` (11), `node tests/test_n8n.js <codigo_con_hashes>` (18), `python tests/validar.py` (estructura, cálculos, secretos). Actions ejecuta test_core y validar antes de publicar. Actualización de datos: `python agentes/exportar.py <export.json>` → commit → Actions.

## Solución de problemas
Telegram no responde: workflow publicado y un solo receptor. Error 400 de Telegram: `parse_mode` HTML. Pages sin cambios: revisar la corrida de Actions. Voz sin respuesta: revisar secreto y URL de producción del webhook.

Estado de componentes e índice de evidencias: `evidencias/indice.md`.
