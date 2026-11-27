(function(){
"use strict";
var $=function(i){return document.getElementById(i)},DATOS=[],CAT=null,FILTRO={estado:"",canal:"",folio:""},MAX_DIAS=7;
var ORDEN=["confirmado","rechazado","vencido","aclaracion","pendiente_aprobacion"];
var COL={confirmado:"#2563eb",rechazado:"#db2777",vencido:"#0ea5e9",aclaracion:"#6366f1",pendiente_aprobacion:"#f472b6",otro:"#64748b"};
var REDUCIR=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function txt(el,t){el.textContent=t}
function pct(a,b){return b?Math.round(a/b*1000)/10:0}
function cls(k){return "s-"+(COL[k]?k:"otro")}
function mxn(n){return n.toLocaleString("es-MX",{style:"currency",currency:"MXN"})}
function r2(n){return Math.round(n*100)/100}
function estado(msg,c){var e=$("estado");e.className=c||"";txt(e,msg||"")}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}

function contar(el_,fin,suf,dec){
  if(REDUCIR||fin===0){txt(el_,fin.toFixed(dec)+suf);return}
  var t0=performance.now(),D=900;
  (function paso(t){var k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);txt(el_,(fin*e).toFixed(dec)+suf);if(k<1)requestAnimationFrame(paso)})(t0);
}
function render(d){
  txt($("m-proposito"),d.proposito);txt($("m-periodo"),d.periodo);txt($("m-fuente"),d.fuente);txt($("m-actualizado"),d.actualizado);
  DATOS=d.pedidos||[];
  if(!DATOS.length){estado("Sin datos: aún no hay pedidos en la exportación. Crea uno por Telegram (/nuevo) y actualiza los datos.","aviso");return}
  var edad=(Date.now()-new Date(d.actualizado).getTime())/864e5;
  estado(edad>MAX_DIAS?"Datos desactualizados: última actualización hace "+Math.floor(edad)+" días.":"",edad>MAX_DIAS?"aviso":"");
  ["sec-kpi","sec-graf","sec-hist"].forEach(function(i){$(i).hidden=false});
  kpis();dona();filtros();tabla();
}
function kpis(){
  var lib=DATOS.filter(function(p){return ORDEN.indexOf(p.estado)>-1&&p.estado!=="aclaracion"}),
      conf=DATOS.filter(function(p){return p.estado==="confirmado"}).length,
      sinCorr=DATOS.filter(function(p){return !p.correccion}).length,
      comp=DATOS.filter(function(p){return ["confirmado","rechazado","vencido"].indexOf(p.estado)>-1}),
      cu=DATOS.reduce(function(a,p){return a+(p.costo_usd||0)},0),
      a=pct(conf,lib.length),b=pct(sinCorr,DATOS.length),c=comp.length?cu/comp.length:0;
  contar($("k1"),a,"%",1);contar($("k2"),b,"%",1);
  txt($("k3"),c.toFixed(4)+" USD");
  setTimeout(function(){$("b1").style.width=a+"%";$("b2").style.width=b+"%";$("b3").style.width=Math.max(2,Math.min(100,c/0.01*100))+"%"},60);
}
function dona(){
  var cnt={};DATOS.forEach(function(p){var k=COL[p.estado]?p.estado:"otro";cnt[k]=(cnt[k]||0)+1});
  var ks=Object.keys(cnt).sort(function(x,y){return (ORDEN.indexOf(x)<0?9:ORDEN.indexOf(x))-(ORDEN.indexOf(y)<0?9:ORDEN.indexOf(y))});
  var svg=$("donut"),ley=$("leyenda"),tb=$("t-resumen").tBodies[0],N=DATOS.length,R=48,C=2*Math.PI*R,off=0,NS="http://www.w3.org/2000/svg";
  svg.textContent="";ley.textContent="";tb.textContent="";txt($("d-total"),N);
  ks.forEach(function(k){
    var len=cnt[k]/N*C,ci=document.createElementNS(NS,"circle");
    ci.setAttribute("cx",60);ci.setAttribute("cy",60);ci.setAttribute("r",R);ci.setAttribute("stroke",COL[k]);ci.dataset.k=k;
    ci.setAttribute("stroke-dasharray",REDUCIR?(len-1.5)+" "+C:"0 "+C);ci.setAttribute("stroke-dashoffset",-off);
    var t=document.createElementNS(NS,"title");t.textContent=k+": "+cnt[k]+" ("+pct(cnt[k],N)+" %)";ci.append(t);svg.append(ci);
    if(!REDUCIR)setTimeout(function(){ci.style.transition="stroke-dasharray .9s ease,stroke-width .2s,opacity .2s";ci.setAttribute("stroke-dasharray",Math.max(0,len-1.5)+" "+C)},80);
    off+=len;
    var li=el("li"),b=el("button","chip "+cls(k));b.type="button";b.dataset.k=k;b.setAttribute("aria-pressed","false");
    b.append(el("i"),document.createTextNode(k+" · "+cnt[k]+" ("+pct(cnt[k],N)+" %)"));
    b.addEventListener("click",function(){FILTRO.estado=FILTRO.estado===k?"":k;$("f-estado").value=FILTRO.estado;sync();tabla();$("sec-hist").scrollIntoView({behavior:REDUCIR?"auto":"smooth"})});
    b.addEventListener("mouseenter",function(){resalta(k)});b.addEventListener("mouseleave",function(){resalta(FILTRO.estado)});
    li.append(b);ley.append(li);
    var tr=tb.insertRow();[k,cnt[k],pct(cnt[k],N)+" %"].forEach(function(v){tr.insertCell().textContent=v});
  });
  sync();
}
function resalta(k){document.querySelectorAll("#donut circle").forEach(function(c){c.classList.toggle("on",!!k&&c.dataset.k===k);c.classList.toggle("dim",!!k&&c.dataset.k!==k)})}
function sync(){document.querySelectorAll(".chip").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.k===FILTRO.estado))});resalta(FILTRO.estado)}
function opciones(id,campo){
  var s=$(id),vals=Array.from(new Set(DATOS.map(function(p){return p[campo]}).filter(Boolean))).sort();
  s.length=1;vals.forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;s.append(o)});
}
function filtros(){
  opciones("f-estado","estado");opciones("f-canal","canal");
  $("f-estado").onchange=function(){FILTRO.estado=this.value;sync();tabla()};
  $("f-canal").onchange=function(){FILTRO.canal=this.value;tabla()};
  $("f-folio").oninput=function(){FILTRO.folio=this.value.trim().toUpperCase();tabla()};
  $("filtros").onsubmit=function(e){e.preventDefault()};
  $("filtros").onreset=function(){FILTRO={estado:"",canal:"",folio:""};setTimeout(function(){sync();tabla()},0)};
}
function tabla(){
  var tb=$("t-hist").tBodies[0];tb.textContent="";
  var f=DATOS.filter(function(p){return (!FILTRO.estado||p.estado===FILTRO.estado)&&(!FILTRO.canal||p.canal===FILTRO.canal)&&(!FILTRO.folio||String(p.caso_id).toUpperCase().indexOf(FILTRO.folio)>-1)});
  txt($("cuenta"),"Mostrando "+f.length+" de "+DATOS.length+" pedidos");
  $("sin-resultados").hidden=f.length>0;$("t-hist").hidden=!f.length;
  f.forEach(function(p){
    var tr=tb.insertRow();
    [p.caso_id,p.fecha,p.canal,null,p.sku,p.zona,p.cantidad,p.total!=null?mxn(p.total):"—"].forEach(function(v,i){
      var c=tr.insertCell();
      if(i===3){var s=el("span","est "+cls(p.estado),p.estado);c.append(s)}else c.textContent=v==null?"—":v;
    });
  });
}
/* simulador */
function sim(){
  if(!CAT)return;
  var sku=$("s-prod").value,zn=$("s-zona").value,q=parseInt($("s-cant").value,10),
      pr=CAT.productos.find(function(p){return p.sku===sku}),z=CAT.zonas.find(function(x){return x.zona===zn}),
      S=CAT.supuestos,av=$("s-aviso"),dl=$("s-desglose");
  dl.textContent="";av.hidden=true;
  function fila(a,b){var d=el("div");d.append(el("dt",null,a),el("dd",null,b));dl.append(d)}
  var msg="";
  if(!pr||!z)msg="Elige producto y zona.";
  else if(!(q>=1)||q!==q)msg="Escribe una cantidad entera mayor que 0.";
  else if(q<pr.minimo)msg="Cantidad mínima para este producto: "+pr.minimo+".";
  else if(q>pr.existencias)msg="Sin existencias suficientes (disponibles: "+pr.existencias+").";
  else if(!z.cobertura)msg="Zona sin cobertura: el pedido sería rechazado.";
  var cmd="/nuevo cliente: "+($("s-cli").value||"Cliente").replace(/[,:]/g," ").trim()+", producto: "+(pr?pr.nombre.toLowerCase():"")+", cantidad: "+(q||0)+", zona: "+zn.toLowerCase()+($("s-fecha").value?", fecha: "+$("s-fecha").value:"");
  txt($("s-cmd"),cmd);
  if(msg){txt(av,msg);av.hidden=false;txt($("s-total"),"—");txt($("s-dtxt"),"Descuento: —");$("s-dbar").style.width="0";$("s-copiar").disabled=true;return}
  $("s-copiar").disabled=false;
  var base=r2(pr.precio*q),d=0;
  for(var i=0;i<S.descuento_tramos.length;i++){if(q>=S.descuento_tramos[i][0]){d=S.descuento_tramos[i][1];break}}
  d=Math.min(d,S.descuento_tope);
  var dm=r2(base*d),sub=r2(base-dm),envio=base>=S.envio_gratis_desde?0:z.envio,iva=r2((sub+envio)*S.iva),tot=r2(sub+envio+iva);
  fila("Subtotal ("+q+" × "+mxn(pr.precio)+")",mxn(base));fila("Descuento "+Math.round(d*100)+" %","− "+mxn(dm));
  fila("Envío "+zn+(envio===0?" (gratis)":""),mxn(envio));fila("IVA "+Math.round(S.iva*100)+" % (supuesto)",mxn(iva));
  txt($("s-total"),mxn(tot));txt($("s-dtxt"),"Descuento "+Math.round(d*100)+" % (tope "+Math.round(S.descuento_tope*100)+" %)");
  $("s-dbar").style.width=(d/S.descuento_tope*100)+"%";
}
function iniciaSim(c){
  CAT=c;var sp=$("s-prod"),sz=$("s-zona");
  c.productos.forEach(function(p){var o=el("option",null,p.nombre+" — "+mxn(p.precio));o.value=p.sku;sp.append(o)});
  c.zonas.forEach(function(z){var o=el("option",null,z.zona+(z.cobertura?"":" (sin cobertura)"));o.value=z.zona;sz.append(o)});
  var d=new Date();d.setDate(d.getDate()+3);$("s-fecha").value=d.toISOString().slice(0,10);
  $("f-sim").addEventListener("input",sim);$("f-sim").addEventListener("submit",function(e){e.preventDefault()});
  $("s-copiar").addEventListener("click",function(){
    var t=$("s-cmd").textContent,ok=$("s-ok");
    function listo(m){txt(ok,m);setTimeout(function(){txt(ok,"")},3000)}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){listo("Copiado. Pégalo en el bot @jimenoidebot.")},function(){listo("No se pudo copiar; selecciona el texto manualmente.")});
    else listo("Copia manual: selecciona el comando de abajo.");
  });
  sim();
}
/* voz */
function voz(){
  var a=$("voz-alt");function falla(){a.hidden=false}
  window.addEventListener("elevenlabs-agent:error",falla);
  try{if(navigator.permissions&&navigator.permissions.query)navigator.permissions.query({name:"microphone"}).then(function(s){if(s.state==="denied")falla();s.onchange=function(){a.hidden=s.state!=="denied"}},function(){})}catch(e){}
  setTimeout(function(){if(!customElements.get("elevenlabs-convai"))falla()},6000);
}
function reveal(){
  var els=document.querySelectorAll("main section");
  if(!("IntersectionObserver" in window)||REDUCIR)return;
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.08});
  els.forEach(function(s){s.classList.add("rev");io.observe(s)});
}
function json(u){return fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
json("data/pedidos.json").then(render).catch(function(){estado("No se pudieron cargar los datos. Recarga la página; si persiste, el sitio puede estar en mantenimiento.","error")});
json("data/catalogo.json").then(iniciaSim).catch(function(){var a=$("s-aviso");txt(a,"Simulador no disponible: no se cargó el catálogo.");a.hidden=false});
voz();reveal();
})();
