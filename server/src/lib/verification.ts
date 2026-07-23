/**
 * Compartido: utilidades de verificación IP + MAC
 *
 * Usado tanto por el middleware del servidor Express (server/src/app.ts)
 * como por el plugin de Vite dev server (client/vite.config.ts).
 *
 * ⚠️ Las funciones que dependen de req/res HTTP (getClientIP, getDeviceMAC,
 * setMACCookie) se quedan en cada archivo por tener tipos distintos.
 */

// ─── IP utilities ───────────────────────────────────────────

export function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

export function ipInCIDR(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
}

export function normalizeIP(ip: string): string {
  return ip === '::1' || ip === '::ffff:127.0.0.1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '');
}

export function isIPAllowed(ip: string, allowedIPs: string[]): boolean {
  if (allowedIPs.includes('*')) return true;
  const normalized = normalizeIP(ip);
  return allowedIPs.some(entry => {
    if (entry.includes('/')) return ipInCIDR(normalized, entry);
    return entry === normalized;
  });
}

// ─── MAC utilities ──────────────────────────────────────────

export function isMACAllowed(deviceMAC: string | null, allowedMACs: Set<string>): boolean {
  if (!deviceMAC) return false;
  return allowedMACs.has(deviceMAC) || allowedMACs.has('*');
}

// ─── HTML generators ────────────────────────────────────────

export function getMACFormHTML(): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Verificación de Dispositivo</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;font-family:'Courier New',monospace;padding:20px}
.container{text-align:center;max-width:420px;width:100%}
.icon{font-size:50px;margin-bottom:16px;opacity:.4}
h1{font-size:14px;font-weight:700;color:#eab308;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
p{font-size:11px;color:#a1a1aa;line-height:1.7;margin-bottom:20px}
.bar{width:32px;height:2px;background:#27272a;margin:12px auto}
form{display:flex;flex-direction:column;gap:12px}
.input-wrap{position:relative}
input{padding:14px 16px;background:#18181b;border:1px solid #27272a;border-radius:10px;color:#e4e4e7;font-family:'Courier New',monospace;font-size:15px;text-align:center;letter-spacing:3px;text-transform:uppercase;outline:none;transition:border-color .2s,box-shadow .2s;width:100%}
input:focus{border-color:#eab308;box-shadow:0 0 0 3px rgba(234,179,8,.15)}
input::placeholder{color:#3f3f46;letter-spacing:0;font-size:13px}
input.error{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.15)}
button{padding:14px;background:linear-gradient(135deg,#eab308,#d97706);border:none;border-radius:10px;color:#0a0a0f;font-family:'Courier New',monospace;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;transition:opacity .2s,transform .15s}
button:hover{opacity:.9;transform:scale(1.02)}
button:active{transform:scale(.98)}
button:disabled{opacity:.5;cursor:not-allowed;transform:none}
#errorMsg{color:#ef4444;font-size:10px;min-height:16px;transition:opacity .3s}
.spinner{display:inline-block;width:12px;height:12px;border:2px solid rgba(10,10,15,.3);border-top-color:#0a0a0f;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
.hint{margin-top:16px;font-size:9px;color:#3f3f46}
.success-check{display:none;margin:12px auto;width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,.15);align-items:center;justify-content:center}
.success-check svg{width:24px;height:24px;stroke:#22c55e;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}
</style></head><body><div class="container"><div class="icon">📡</div><h1>Verificación de Dispositivo</h1><div class="bar"></div><p>Ingresa la dirección MAC de tu dispositivo<br>autorizado para acceder al panel.</p><div id="errorMsg"></div><form method="POST" id="macForm" autocomplete="off"><div class="input-wrap"><input type="text" id="macInput" name="mac" placeholder="XX-XX-XX-XX-XX-XX" maxlength="17" autocomplete="off" autofocus spellcheck="false"></div><button type="submit" id="submitBtn">Verificar Dispositivo</button></form><div class="success-check" id="successCheck"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><p class="hint">Solo dispositivos autorizados pueden acceder</p></div><script>
(function(){
const input=document.getElementById('macInput');
const form=document.getElementById('macForm');
const btn=document.getElementById('submitBtn');
const errorEl=document.getElementById('errorMsg');
const successEl=document.getElementById('successCheck');
// Auto-formatear MAC: insertar guiones automáticamente
input.addEventListener('input',function(){
let val=this.value.replace(/[^0-9A-Fa-f]/g,'').toUpperCase();
if(val.length>12)val=val.slice(0,12);
const parts=[];
for(let i=0;i<val.length;i+=2){
if(val.length-i>=2)parts.push(val.slice(i,i+2));
else parts.push(val.slice(i));
}
this.value=parts.join('-');
// Quitar error al escribir
this.classList.remove('error');
errorEl.textContent='';
});
form.addEventListener('submit',async function(e){
e.preventDefault();
const mac=this.querySelector('#macInput').value.trim();
if(mac.length!==17){input.classList.add('error');errorEl.textContent='Ingresa una MAC válida (XX-XX-XX-XX-XX-XX)';return;}
btn.disabled=true;
btn.innerHTML='<span class="spinner"></span> Verificando...';
errorEl.textContent='';
try{
const r=await fetch(window.location.href,{method:'POST',headers:{'Content-Type':'application/json','x-device-mac':mac}});
if(r.ok){
btn.style.display='none';
input.style.display='none';
successEl.style.display='flex';
errorEl.textContent='';
setTimeout(function(){window.location.reload();},600);
}else{
const data=await r.json().catch(function(){return{};});
input.classList.add('error');
errorEl.textContent=data.error||'MAC no autorizada';
btn.disabled=false;
btn.textContent='Verificar Dispositivo';
}
}catch{
input.classList.add('error');
errorEl.textContent='Error de conexión. Verifica el túnel.';
btn.disabled=false;
btn.textContent='Verificar Dispositivo';
}
});
})();
</script></body></html>`;
}

export function getDeniedHTML(ip?: string): string {
  const ipBlock = ip ? `<div class="ip">IP: ${ip}</div>` : '';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Acceso Restringido</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;font-family:'Courier New',monospace;padding:20px}.container{text-align:center;max-width:480px}.lock{font-size:60px;margin-bottom:20px;opacity:.3}h1{font-size:16px;font-weight:700;color:#ef4444;letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px}p{font-size:11px;color:#52525b;line-height:1.8;letter-spacing:.05em}.bar{width:40px;height:2px;background:#27272a;margin:16px auto}.ip{display:inline-block;margin-top:20px;padding:6px 14px;background:#18181b;border:1px solid #27272a;border-radius:8px;font-size:10px;color:#71717a}</style></head><body><div class="container"><div class="lock">🔒</div><h1>Acceso Restringido</h1><div class="bar"></div><p>No tienes autorización para acceder<br>a esta sección del sistema.</p>${ipBlock}</div></body></html>`;
}
