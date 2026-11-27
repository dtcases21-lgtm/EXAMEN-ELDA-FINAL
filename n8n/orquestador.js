// Orquestador + agentes A1-A4 (n8n Code node). Registro persistente: workflow static data (solo workflows activos).
const sd = $getWorkflowStaticData('global');
sd.seq = sd.seq || 0; sd.casos = sd.casos || {}; sd.eventos = sd.eventos || {}; sd.trazas = sd.trazas || []; sd.costos = sd.costos || [];
function sha256(s){var r=Math.pow,m=r(2,32),i,j,x='',w=[],a=s=unescape(encodeURIComponent(s)),l=a.length*8,h=[],k=[],p=0,c={};
 for(i=2;p<64;i++){if(!c[i]){for(j=0;j<313;j+=i)c[j]=i;h[p]=(r(i,.5)*m)|0;k[p++]=(r(i,1/3)*m)|0}}
 a+='\x80';while(a.length%64-56)a+='\x00';for(i=0;i<a.length;i++){j=a.charCodeAt(i);w[i>>2]|=j<<((3-i)%4)*8}
 w[w.length]=(l/m)|0;w[w.length]=l;
 for(j=0;j<w.length;){var z=w.slice(j,j+=16),o=h;h=h.slice(0,8);
  for(i=0;i<64;i++){var q=z[i-15],y=z[i-2],b=h[0],e=h[4],t=h[7]+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&h[5])^(~e&h[6]))+k[i]+(z[i]=(i<16)?z[i]:(z[i-16]+(((q>>>7)|(q<<25))^((q>>>18)|(q<<14))^(q>>>3))+z[i-7]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10)))|0);
   h=[(t+(((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)))+((b&h[1])^(b&h[2])^(h[1]&h[2])))|0].concat(h);h[4]=(h[4]+t)|0}
  for(i=0;i<8;i++)h[i]=(h[i]+o[i])|0}
 for(i=0;i<8;i++)for(j=3;j+1;j--){var b2=(h[i]>>(j*8))&255;x+=((b2<16)?0:'')+b2.toString(16)}return x}
const H = v => sha256('aguaclara:' + v);
// Hashes (no se publican ids): aprobador y secreto de la herramienta de voz
const USERS = {}; USERS['__HASH_APROBADOR__'] = ['u_demo1','aprobador'];
const TOOL_HASH = '__HASH_TOOL__';
const CAT = __CATALOGO__;
const MAXLEN = 500, TTL_DEF = 30, PRESUP = 0.05;
const INY = /(ignora|olvida|desactiva|omite).{0,30}(reglas|instrucciones|pol[ií]ticas|controles)|revela.{0,20}(clave|token|secret)|api[ _-]?key|system prompt|sk_[a-z0-9]{8,}|\b\d{9,10}:AA[\w-]{20,}/i;
const now = () => new Date().toISOString().slice(0,19) + 'Z';
const SIM = ' (resultado simulado)';
function traza(c, ag, est, res){ sd.trazas.push({ts: now(), caso_id: c, agente: ag, estado: est, resultado: res}); if (sd.trazas.length > 800) sd.trazas.shift(); }
let nl = 0;
function costo(c, etapa, ag, unidad, reint){ sd.costos.push({fecha: now(), caso_id: c, llamada_id: 'L-' + (sd.costos.length + 1), etapa, agente: ag, proveedor: 'n8n', modelo: 'determinista', tokens_entrada: 'NA', tokens_salida: 'NA', tokens_cache: 'NA', duracion_voz_s: 'NA', unidad, tarifa: 0, costo: 0, moneda: 'USD', estado: 'ok', reintento: reint || 0, origen: 'medido'}); }
function norm(s){ return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9ñ. ]/g,''); }
const ALIAS = {GAR20:['garrafon 20','garrafon de 20','garrafones de 20','garrafon'],GAR10:['garrafon 10','garrafon de 10','garrafones de 10'],BOT1500:['1.5','botella 15','botellas de 15'],BOT600:['600'],BOT355:['355'],DISP:['dispensador'],AGUA_ALC:['alcalina']};
function calcular(precio, cant, envio, ov){ const s = CAT.supuestos; const sub = Math.round(precio*cant*100)/100; let pct = 0;
  for (const [u,p] of s.descuento_tramos){ if (cant >= u){ pct = p; break; } }
  if (ov != null) pct = ov; else pct = Math.min(pct, s.descuento_tope);
  const desc = Math.round(sub*pct*100)/100, base = sub - desc, env = base >= s.envio_gratis_desde ? 0 : envio, iva = Math.round((base+env)*s.iva*100)/100;
  return {subtotal: sub, descuento_pct: pct, descuento: desc, envio: env, iva, total: Math.round((base+env+iva)*100)/100}; }
function A1(c, t){ const d = {}; let m;
  m = t.match(/cliente\s*[:=]\s*([^,;\n]+)/i); d.cliente = m ? m[1].trim() : null;
  m = t.match(/cantidad\s*[:=]\s*(\d+)/i) || t.match(/\b(\d+)\s*(?:garraf|botell|paquete|dispens|unid)/i); d.cantidad = m ? parseInt(m[1],10) : null;
  m = t.match(/zona\s*[:=]\s*([A-Za-zÁÉÍÓÚáéíóú]+)/i); d.zona = m ? norm(m[1]).toUpperCase() : null;
  m = t.match(/fecha\s*[:=]\s*(\d{4}-\d{2}-\d{2})/i); d.fecha = m ? m[1] : null;
  m = t.match(/producto\s*[:=]\s*([^,;\n]+)/i); const pt = norm(m ? m[1] : t).trim(); d.sku = null;
  const ord = Object.entries(ALIAS).sort((a,b) => Math.max(...b[1].map(x=>x.length)) - Math.max(...a[1].map(x=>x.length)));
  for (const [sku, al] of ord){ if (m && sku.toLowerCase() === pt){ d.sku = sku; break; } if (al.slice().sort((a,b)=>b.length-a.length).some(a => pt.includes(a))){ d.sku = sku; break; } }
  if (!d.sku && m){ const p = CAT.productos.find(p => p.sku.toLowerCase() === pt); if (p) d.sku = p.sku; }
  const f = ['cliente','sku','cantidad','zona','fecha'].filter(k => d[k] == null);
  if (d.fecha && isNaN(Date.parse(d.fecha))) f.push('fecha_valida');
  return {caso_id: c, agente: 'A1', estado: f.length ? 'aclaracion' : 'ok', resultado: {requerimiento: d, faltantes: f}, fuentes: [], advertencias: []}; }
function A2(c, req){ const r = req.requerimiento, p = CAT.productos.find(x => x.sku === r.sku), z = CAT.zonas.find(x => x.zona === r.zona);
  if (!p || !z) return {caso_id: c, agente: 'A2', estado: 'insuficiente', resultado: {motivo: 'producto o zona sin evidencia en catálogo'}, fuentes: [], advertencias: ['insuficiencia']};
  return {caso_id: c, agente: 'A2', estado: 'ok', resultado: {producto: p, zona: z, existencias_ok: p.existencias >= r.cantidad, minimo_ok: r.cantidad >= p.minimo, cobertura_ok: z.cobertura}, fuentes: ['catalogo#' + p.sku, 'catalogo#zona:' + z.zona], advertencias: []}; }
function A3(c, req, ev, ov){ const r = req.requerimiento, k = calcular(ev.producto.precio, r.cantidad, ev.zona.envio, ov);
  return {caso_id: c, agente: 'A3', estado: 'ok', resultado: Object.assign({}, k, {moneda: 'MXN', supuestos: CAT.supuestos.iva_nota, etiqueta: 'resultado simulado', sku: r.sku, cantidad: r.cantidad, zona: r.zona}), fuentes: ['catalogo'], advertencias: []}; }
function A4(c, req, ev, prop){ const e = [], p = prop.resultado, r = req.requerimiento, prod = CAT.productos.find(x => x.sku === r.sku), z = CAT.zonas.find(x => x.zona === r.zona);
  if (r.cantidad > prod.existencias) e.push('existencias_insuficientes'); if (r.cantidad < prod.minimo) e.push('bajo_minimo'); if (!z.cobertura) e.push('zona_sin_cobertura');
  if (p.descuento_pct > CAT.supuestos.descuento_tope + 1e-9) e.push('descuento_sobre_tope');
  const ref = calcular(prod.precio, r.cantidad, z.envio); if (Math.abs(ref.total - p.total) > 0.01 || Math.abs(ref.subtotal - p.subtotal) > 0.01) e.push('calculo_no_coincide');
  if (!prop.fuentes.length) e.push('sin_fuentes'); if (p.etiqueta !== 'resultado simulado') e.push('sin_rotulo_simulacion');
  const bloq = e.filter(x => ['existencias_insuficientes','bajo_minimo','zona_sin_cobertura'].includes(x)).length;
  return {caso_id: c, agente: 'A4', estado: !e.length ? 'ok' : (bloq ? 'bloqueado' : 'devuelto'), resultado: {hallazgos: e, total_recalculado: ref.total}, fuentes: ['recalculo independiente'], advertencias: e}; }
function expirar(){ let n = 0; for (const id in sd.casos){ const c = sd.casos[id]; if (c.estado === 'pendiente_aprobacion' && c.expira <= now()){ c.estado = 'vencido'; c.actualizado = now(); traza(id, 'ORQ', 'vencido', {}); n++; } } return n; }
function cerrar(id, est, msg){ const c = sd.casos[id]; c.estado = est; c.actualizado = now(); traza(id, 'ORQ', est, {mensaje: msg}); return {caso_id: id, estado: est, mensaje: msg + SIM}; }
function procesar(texto, uid, canal, chatId, opts){
  const g = typeof texto !== 'string' || !texto.trim() ? 'vacio' : texto.length > MAXLEN ? 'longitud' : INY.test(texto) ? 'inyeccion' : null;
  const id = 'PED-' + String(++sd.seq).padStart(4,'0'); const ts = now();
  sd.casos[id] = {caso_id: id, canal, usuario: uid, estado: 'en_proceso', version: 1, datos: null, resultado: null, creado: ts, actualizado: ts, expira: null, correccion: false, chat: chatId || null};
  if (g){ traza(id, 'ORQ', 'bloqueado', {motivo: g}); return Object.assign(cerrar(id, 'rechazado', 'Entrada no válida (' + g + '); corrige y reenvía'), {motivo: g}); }
  if (opts.skills) traza(id, 'ORQ', 'skill_cargado', {skills: ['cotizar-pedido-agua@1.0.0', 'revisar-pedido-agua@1.0.0']});
  const a1 = A1(id, texto); traza(id, 'A1', a1.estado, a1.resultado); costo(id, 'agentes', 'A1', 'regla');
  if (a1.estado !== 'ok') return cerrar(id, 'aclaracion', 'Faltan datos: ' + a1.resultado.faltantes.join(', '));
  const a2 = A2(id, a1.resultado); traza(id, 'A2', a2.estado, {existencias_ok: a2.resultado.existencias_ok, fuentes: a2.fuentes}); costo(id, 'agentes', 'A2', 'consulta');
  if (a2.estado !== 'ok') return cerrar(id, 'rechazado', 'Sin evidencia en la fuente autorizada');
  let ov = opts.forzar_descuento != null ? opts.forzar_descuento : null, a3, a4;
  for (let it = 1; it <= 3; it++){
    a3 = A3(id, a1.resultado, a2.resultado, ov); traza(id, 'A3', 'ok', {iter: it, total: a3.resultado.total, descuento_pct: a3.resultado.descuento_pct}); costo(id, 'agentes', 'A3', 'funcion', it-1);
    a4 = A4(id, a1.resultado, a2.resultado, a3); traza(id, 'A4', a4.estado, {iter: it, hallazgos: a4.resultado.hallazgos}); costo(id, 'revision', 'A4', 'regla', it-1);
    if (a4.estado === 'ok') break; sd.casos[id].correccion = true;
    if (a4.estado === 'bloqueado') return cerrar(id, 'rechazado', 'Bloqueado por revisor: ' + a4.resultado.hallazgos.join(', '));
    ov = null; }
  if (a4.estado !== 'ok') return cerrar(id, 'devuelto_agotado', 'No superó la revisión en 3 iteraciones');
  const c = sd.casos[id]; c.estado = 'pendiente_aprobacion'; c.version = 2; c.datos = a1.resultado.requerimiento; c.resultado = a3.resultado;
  c.expira = new Date(Date.now() + (opts.ttl != null ? opts.ttl : TTL_DEF) * 60000).toISOString().slice(0,19) + 'Z'; c.actualizado = now(); traza(id, 'ORQ', 'pendiente_aprobacion', {version: c.version, expira: c.expira});
  return {caso_id: id, estado: c.estado, version: c.version, propuesta: c.resultado, expira: c.expira, mensaje: 'Propuesta lista' + SIM}; }
function resumen(r){ if (r.estado !== 'pendiente_aprobacion') return r.mensaje; const p = r.propuesta;
  return `${r.caso_id}: ${p.cantidad} x ${p.sku} a ${p.zona}\nSubtotal ${p.subtotal} | desc ${p.descuento_pct*100}% | envío ${p.envio} | IVA ${p.iva}\nTOTAL ${p.total} MXN (resultado simulado)\nVence: ${r.expira}\nAprobador: /aprobar ${r.caso_id} ${r.version}  o  /rechazar ${r.caso_id} ${r.version}`; }
function decidir(id, uid, rol, accion, ver, evento){ expirar();
  if (rol !== 'aprobador'){ traza(id, 'ORQ', 'bloqueado', {motivo: 'sin_permiso_aprobar', usuario: uid}); return 'No tienes permiso para aprobar o rechazar.'; }
  const clave = evento || `${id}:${uid}:${accion}:${ver}`; if (sd.eventos[clave]) return '';
  const c = sd.casos[id]; if (!c) return 'Folio inexistente.'; if (c.estado !== 'pendiente_aprobacion') return `No se puede ${accion}: estado actual ${c.estado}.`;
  if (parseInt(ver,10) !== c.version) return `Versión no vigente (vigente: ${c.version}).`;
  sd.eventos[clave] = now(); sd.eventos[`${id}:${accion}:${ver}`] = now(); c.estado = accion === 'aprobar' ? 'confirmado' : 'rechazado'; c.actualizado = now(); traza(id, 'ORQ', c.estado, {usuario: uid, version: ver});
  return `Pedido ${id} ${c.estado}. (resultado simulado)`; }
function estadoTxt(id){ expirar(); const c = sd.casos[id]; if (!c) return 'Folio inexistente.'; return `${id}: ${c.estado} (v${c.version}, canal ${c.canal})` + (c.resultado ? `\nTotal ${c.resultado.total} MXN` : '') + ' (resultado simulado)'; }
const AYUDA = 'Comandos:\n/nuevo cliente: X, producto: garrafon 20, cantidad: 30, zona: centro, fecha: 2026-12-01\n/estado PED-0001\n/aprobar PED-0001 2 | /rechazar PED-0001 2 (solo aprobador)\nTodo es un resultado simulado.';
const j = $input.first().json; const out = [];
if (j.message || j.edited_message){ // ---- Telegram
  const m = j.message || j.edited_message, chat = String(m.chat.id), ev = 'tg:' + (j.update_id != null ? j.update_id : m.message_id);
  const u = USERS[H(chat)];
  const reply = t => out.push({json: {canal: 'telegram', chat_id: chat, respuesta: t}});
  if (!u){ traza('N/A', 'ORQ', 'bloqueado', {motivo: 'usuario_no_autorizado'}); reply('No autorizado. Solicita acceso al responsable del proyecto.'); }
  else if (sd.eventos[ev]){ /* duplicado: sin segunda operación */ traza('N/A', 'ORQ', 'duplicado', {evento: ev}); }
  else {
    sd.eventos[ev] = now(); if (u[1] === 'aprobador') sd.aprobador_chat = chat; expirar();
    const t = (m.text || '').trim(); const mm = t.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
    if (mm && ['start','ayuda','help'].includes(mm[1])) reply(AYUDA);
    else if (mm && mm[1] === 'estado') reply(estadoTxt((mm[2] || '').trim().toUpperCase()));
    else if (mm && (mm[1] === 'aprobar' || mm[1] === 'rechazar')){ const p = mm[2].trim().split(/\s+/); const r = decidir((p[0] || '').toUpperCase(), u[0], u[1], mm[1], p[1]); if (r) reply(r); }
    else { let texto = mm ? (mm[1] === 'nuevo' ? mm[2] : null) : t, opts = {skills: true};
      if (texto === null) reply(AYUDA); else {
        const mt = texto.match(/\bttl\s*[:=]\s*(\d+)/i); if (mt && u[1] === 'aprobador'){ opts.ttl = parseInt(mt[1],10); texto = texto.replace(mt[0], ''); }
        const mf = texto.match(/\bforzar_descuento\s*[:=]\s*([\d.]+)/i); if (mf && u[1] === 'aprobador'){ opts.forzar_descuento = parseFloat(mf[1]); texto = texto.replace(mf[0], ''); }
        if (!texto.trim()) reply('Envía los datos del pedido.\n' + AYUDA); else { const r = procesar(texto, u[0], 'telegram', chat, opts); reply(resumen(r)); } } } }
} else if (j.body !== undefined && j.headers){ // ---- Voz (webhook autenticado)
  const sec = j.headers['x-tool-secret'] || ''; const b = j.body || {};
  if (H(sec) !== TOOL_HASH){ traza('N/A', 'ORQ', 'bloqueado', {motivo: 'herramienta_sin_autorizacion'}); out.push({json: {canal: 'voz', ok: false, motivo: 'no autorizado'}}); }
  else {
    expirar(); const acc = String(b.accion || b['acción'] || b.action || (b.folio ? 'consultar' : (b.cliente ? 'crear' : ''))).toLowerCase().trim().replace(/^consul\w*/,'consultar').replace(/^cre\w*/,'crear');
    if (acc === 'consultar'){ const id = String(b.folio || '').toUpperCase(); const c = sd.casos[id];
      out.push({json: {canal: 'voz', ok: !!c, folio: id, estado: c ? c.estado : null, total: c && c.resultado ? c.resultado.total : null, mensaje: c ? `El pedido ${id} está ${c.estado.replace(/_/g,' ')} (resultado simulado)` : 'Folio inexistente. No tengo registro de ese folio.'}}); }
    else if (acc === 'crear'){ const texto = `cliente: ${b.cliente || ''}, producto: ${b.producto || ''}, cantidad: ${b.cantidad || ''}, zona: ${b.zona || ''}, fecha: ${b.fecha || ''}`.replace(/(cliente|producto|cantidad|zona|fecha): ,?/g, '').trim();
      const full = ['cliente','producto','cantidad','zona','fecha'].filter(k => b[k]).map(k => `${k}: ${b[k]}`).join(', ');
      const r = procesar(full, 'u_voz', 'voz', null, {skills: true});
      out.push({json: {canal: 'voz', ok: r.estado === 'pendiente_aprobacion', folio: r.caso_id, estado: r.estado, total: r.propuesta ? r.propuesta.total : null, mensaje: r.estado === 'pendiente_aprobacion' ? `Creé el pedido ${r.caso_id} por ${r.propuesta.total} pesos. Queda pendiente de aprobación humana (resultado simulado)` : r.mensaje}});
      if (r.estado === 'pendiente_aprobacion' && sd.aprobador_chat) out.push({json: {canal: 'telegram', chat_id: sd.aprobador_chat, respuesta: 'Pedido creado por VOZ\n' + resumen(r)}}); }
    else out.push({json: {canal: 'voz', ok: false, motivo: 'accion no soportada'}}); }
} else if (j.query && j.query.q !== undefined || (j.headers && j.method === 'GET')){ out.push({json: {}}); }
if (!out.length) out.push({json: {canal: 'telegram', chat_id: '', respuesta: ''}});
return out;
