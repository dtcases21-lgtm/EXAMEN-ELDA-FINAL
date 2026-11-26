(function(){
"use strict";
var $=function(i){return document.getElementById(i)},DATOS=[],MAX_DIAS=7;
function txt(el,t){el.textContent=t}
function pct(a,b){return b?Math.round(a/b*1000)/10:0}
function estado(msg,clase){var e=$("estado");e.className=clase||"";txt(e,msg);e.hidden=!msg}
function render(d){
  txt($("m-proposito"),d.proposito);txt($("m-periodo"),d.periodo);txt($("m-fuente"),d.fuente);txt($("m-actualizado"),d.actualizado);
  DATOS=d.pedidos||[];
  if(!DATOS.length){estado("Sin datos: aún no hay pedidos en la exportación. Crea uno por Telegram (/nuevo) y actualiza los datos.","aviso");return}
  var edad=(Date.now()-new Date(d.actualizado).getTime())/864e5;
  if(edad>MAX_DIAS)estado("Datos desactualizados: última actualización hace "+Math.floor(edad)+" días.","aviso");else estado("");
  ["sec-kpi","sec-graf","sec-hist"].forEach(function(i){$(i).hidden=false});
  kpis();grafica();filtros();tabla();
}
function kpis(){
  var lib=DATOS.filter(function(p){return ["confirmado","rechazado","vencido","pendiente_aprobacion"].indexOf(p.estado)>-1}),
      conf=DATOS.filter(function(p){return p.estado==="confirmado"}).length,
      proc=DATOS.length,sinCorr=DATOS.filter(function(p){return !p.correccion}).length,
      comp=DATOS.filter(function(p){return ["confirmado","rechazado","vencido"].indexOf(p.estado)>-1}),
      cu=DATOS.reduce(function(a,p){return a+(p.costo_usd||0)},0);
  txt($("k1"),pct(conf,lib.length)+" %");txt($("k2"),pct(sinCorr,proc)+" %");
  txt($("k3"),comp.length&&cu>0?(cu/comp.length).toFixed(4)+" USD":"NA (consumo no medido)");
}
function grafica(){
  var cnt={};DATOS.forEach(function(p){cnt[p.estado]=(cnt[p.estado]||0)+1});
  var g=$("grafica"),tb=$("t-resumen").tBodies[0];g.textContent="";tb.textContent="";var max=Math.max.apply(null,Object.values(cnt));
  Object.keys(cnt).sort().forEach(function(k){
    var r=document.createElement("div");r.className="barra";
    var a=document.createElement("span");a.className="et";a.textContent=k;
    var b=document.createElement("span");b.className="b "+(["confirmado","rechazado","vencido"].indexOf(k)>-1?k:"otro");b.style.width=Math.max(3,cnt[k]/max*60)+"%";
    var n=document.createElement("span");n.className="n";n.textContent=cnt[k];
    r.append(a,b,n);g.append(r);
    var tr=tb.insertRow();[k,cnt[k],pct(cnt[k],DATOS.length)+" %"].forEach(function(v){tr.insertCell().textContent=v});
  });
}
function opciones(id,campo){
  var s=$(id),vals=Array.from(new Set(DATOS.map(function(p){return p[campo]}).filter(Boolean))).sort();
  s.length=1;vals.forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;s.append(o)});
}
function filtros(){opciones("f-estado","estado");opciones("f-canal","canal")}
function tabla(){
  var e=$("f-estado").value,c=$("f-canal").value,f=$("f-folio").value.trim().toUpperCase(),tb=$("t-hist").tBodies[0];tb.textContent="";
  var rows=DATOS.filter(function(p){return(!e||p.estado===e)&&(!c||p.canal===c)&&(!f||p.caso_id.indexOf(f)>-1)});
  $("sin-resultados").hidden=rows.length>0;$("t-hist").hidden=!rows.length;
  rows.forEach(function(p){
    var tr=tb.insertRow();
    [p.caso_id,p.fecha,p.canal,null,p.sku||"—",p.zona||"—",p.cantidad==null?"—":p.cantidad,p.total==null?"—":p.total.toFixed(2)].forEach(function(v,i){
      var td=tr.insertCell();if(i===3){var s=document.createElement("span");s.className="est "+p.estado;s.textContent=p.estado;td.append(s)}else td.textContent=v});
  });
}
$("filtros").addEventListener("input",tabla);
$("filtros").addEventListener("reset",function(){setTimeout(tabla,0)});
$("filtros").addEventListener("submit",function(e){e.preventDefault()});
fetch("data/pedidos.json",{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(render)
 .catch(function(){estado("Error al cargar los datos. Reintenta más tarde o revisa la conexión.","error")});
// Voz: alternativa textual si el micrófono está denegado o el widget no carga
function altVoz(){$("voz-alt").hidden=false}
if(navigator.permissions&&navigator.permissions.query){navigator.permissions.query({name:"microphone"}).then(function(p){if(p.state==="denied")altVoz();p.onchange=function(){if(p.state==="denied")altVoz()}}).catch(function(){})}
window.addEventListener("elevenlabs-agent:error",altVoz);
setTimeout(function(){if(!window.customElements||!customElements.get("elevenlabs-convai"))altVoz()},6000);
})();
