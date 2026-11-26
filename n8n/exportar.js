// Exportación sanitizada: sin cliente, sin chat_id, sin textos. Requiere cabecera x-tool-secret (hash comparado).
const sd = $getWorkflowStaticData('global');
function sha256(s){var r=Math.pow,m=r(2,32),i,j,x='',w=[],a=s=unescape(encodeURIComponent(s)),l=a.length*8,h=[],k=[],p=0,c={};
 for(i=2;p<64;i++){if(!c[i]){for(j=0;j<313;j+=i)c[j]=i;h[p]=(r(i,.5)*m)|0;k[p++]=(r(i,1/3)*m)|0}}
 a+='\x80';while(a.length%64-56)a+='\x00';for(i=0;i<a.length;i++){j=a.charCodeAt(i);w[i>>2]|=j<<((3-i)%4)*8}
 w[w.length]=(l/m)|0;w[w.length]=l;
 for(j=0;j<w.length;){var z=w.slice(j,j+=16),o=h;h=h.slice(0,8);
  for(i=0;i<64;i++){var q=z[i-15],y=z[i-2],b=h[0],e=h[4],t=h[7]+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&h[5])^(~e&h[6]))+k[i]+(z[i]=(i<16)?z[i]:(z[i-16]+(((q>>>7)|(q<<25))^((q>>>18)|(q<<14))^(q>>>3))+z[i-7]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10)))|0);
   h=[(t+(((b>>>2)|(b<<30))^((b>>>13)|(b<<19))^((b>>>22)|(b<<10)))+((b&h[1])^(b&h[2])^(h[1]&h[2])))|0].concat(h);h[4]=(h[4]+t)|0}
  for(i=0;i<8;i++)h[i]=(h[i]+o[i])|0}
 for(i=0;i<8;i++)for(j=3;j+1;j--){var b2=(h[i]>>(j*8))&255;x+=((b2<16)?0:'')+b2.toString(16)}return x}
const j = $input.first().json;
if (sha256('aguaclara:' + (j.headers['x-tool-secret'] || '')) !== '__HASH_TOOL__') return [{json: {ok: false, motivo: 'no autorizado'}}];
const casos = Object.values(sd.casos || {});
const pedidos = casos.map(c => ({caso_id: c.caso_id, canal: c.canal, estado: c.estado, fecha: c.creado.slice(0,10), sku: c.resultado ? c.resultado.sku : null, zona: c.resultado ? c.resultado.zona : null,
  cantidad: c.resultado ? c.resultado.cantidad : null, total: c.resultado ? c.resultado.total : null, descuento_pct: c.resultado ? c.resultado.descuento_pct : null, correccion: !!c.correccion, costo_usd: 0}));
return [{json: {ok: true, pedidos, trazas: (sd.trazas || []).slice(-400), costos: sd.costos || []}}];
