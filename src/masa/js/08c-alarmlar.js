/* ---------- Alarmlar ---------- */
const ALC={cache:{},log:[]};
try{const v=JSON.parse(localStorage.getItem("hm_alarm")||"null");if(v){ALC.cache=v.cache||{};ALC.log=v.log||[];}}catch{}
const saveAL=()=>{try{const cut=new Date(Date.now()-30*864e5).toISOString().slice(0,10);ALC.log=ALC.log.filter(x=>x.d>=cut).slice(-400);localStorage.setItem("hm_alarm",JSON.stringify({cache:ALC.cache,log:ALC.log}));}catch{}};
function alarmsFor(T){const i=T.c.length-1,c=T.c,p=c[i],R=W.rules,a=[];if(i<30)return{a,rsi:null};
  const x=(A,B)=>A[i-1]!=null&&B[i-1]!=null&&A[i]!=null&&B[i]!=null?(A[i-1]<=B[i-1]&&A[i]>B[i]?1:A[i-1]>=B[i-1]&&A[i]<B[i]?-1:0):0;
  const rs=T.rsi[i];if(rs!=null&&rs<=R.rsiLo)a.push(["RSI aşırı satım "+fmt(rs,0),1]);if(rs!=null&&rs>=R.rsiHi)a.push(["RSI aşırı alım "+fmt(rs,0),-1]);
  const cs=x(c,T.s50);if(R.sma&&cs)a.push([cs>0?"SMA50'yi yukarı kesti":"SMA50'yi aşağı kesti",cs]);
  const gc=x(T.s50,T.s200);if(gc)a.push([gc>0?"Altın kesişim (SMA50>SMA200)":"Ölüm kesişimi (SMA50<SMA200)",gc]);
  const mc=x(T.mac.m,T.mac.sig);if(mc)a.push([mc>0?"MACD yukarı kesti":"MACD aşağı kesti",mc]);
  const n52=Math.min(252,c.length);const hi=Math.max(...T.h.slice(-n52,-1)),lo=Math.min(...T.l.slice(-n52,-1));
  if(c.length>=200&&T.h[i]>hi)a.push(["52 hafta zirvesi",1]);if(c.length>=200&&T.l[i]<lo)a.push(["52 hafta dibi",-1]);
  const L=srLevels(T),at=L.atr;if(L.S&&L.S.str==="Güçlü"&&p-L.S.v<=0.6*at&&p>=L.S.v-0.3*at)a.push([`Güçlü destekte (${fmt(L.S.v)})`,1]);if(L.R&&L.R.str==="Güçlü"&&L.R.v-p<=0.6*at)a.push([`Güçlü dirence yakın (${fmt(L.R.v)})`,-1]);
  const V=T.v;if(V.length>55){const v5=V.slice(-5).reduce((s,y)=>s+y,0)/5,v50=V.slice(-55,-5).reduce((s,y)=>s+y,0)/50;if(v50>0&&v5/v50>=2)a.push([`Hacim patlaması (${fmt(v5/v50,1)}×)`,0]);}
  return{a,rsi:rs};}
$("alRun").onclick=async()=>{if(!S.mcp)return;const btn=$("alRun");btn.disabled=true;const prog=$("alProg");prog.hidden=false;prog.firstElementChild.style.width="0%";
  try{const src={};const add=(c,k)=>{(src[c]=src[c]||new Set()).add(k);};
    if($("alP").checked)P.pos.forEach(x=>add(x.c,"Portföy"));if($("alW").checked)W.list.forEach(c=>add(c,"Takip"));
    if($("alB").checked){$("alStatus").textContent="BIST 30 listesi alınıyor…";const r=await sql(`SELECT hisse_senedi_kodu FROM hisse_senetleri WHERE 'XU030' = ANY(endeksler) ORDER BY hisse_senedi_kodu LIMIT 40`,"BIST 30 listesi (alarmlar)");r.forEach(x=>add(x.hisse_senedi_kodu,"BIST 30"));}
    const codes=Object.keys(src).sort();if(!codes.length){$("alStatus").textContent="Kapsamda hisse yok: portföy veya takip listesine hisse ekleyin.";return;}
    const today=istDate(new Date().toISOString()),now=new Date(Date.now()+3*3600e3),closed=now.getUTCHours()*60+now.getUTCMinutes()>=18*60+15||[0,6].includes(now.getUTCDay());
    const from=new Date(Date.now()-460*864e5).toISOString().slice(0,10)+" 00:00:00";const out={};let done=0,fail=0,qn=0;
    const need=codes.filter(c=>{const k=ALC.cache[c];return!(k&&k.day===today&&(k.final||!closed));});
    codes.filter(c=>!need.includes(c)).forEach(c=>out[c]=ALC.cache[c]);
    let ix=0;await Promise.all(Array.from({length:4},async()=>{while(ix<need.length){const c=need[ix++];
      try{qn++;const rows=await sql(`SELECT zaman_utc, acilis, yuksek, dusuk, kapanis, hacim_15_dk_gecikmeli FROM mumlar_gunluk_gh WHERE kod = '${c}' AND zaman_utc >= TIMESTAMP '${from}' ORDER BY zaman_utc DESC LIMIT 300`,`${c} alarm kontrolü`);
        rows.reverse();const T0=buildT(rows,null);if(!T0)throw new Error("geçmiş yok");
        const n=T0.live?T0.c.length-1:T0.c.length;const T=buildT(rows.slice(0,rows.length-(T0.live?1:0)),null);
        const r=alarmsFor(T);out[c]=ALC.cache[c]={day:today,final:closed||!T0.live,last:T.t[T.t.length-1],p:T.c[T.c.length-1],rsi:r.rsi,a:r.a};}
      catch(e){fail++;out[c]={err:errCopy(e)};if(AUTH_CODES.includes(e&&e.code))throw e;}
      done++;prog.firstElementChild.style.width=Math.round(done/need.length*100)+"%";$("alStatus").textContent=`Taranıyor: ${done} / ${need.length}`;}}));
    ALC.res={codes,src,out};
    codes.forEach(c=>{const o=out[c];if(o&&o.a&&o.a.length){const key=c+"|"+o.last;if(!ALC.log.some(x=>x.k===key))ALC.log.push({k:key,d:o.last,c,a:o.a.map(z=>z[0]),s:o.a.reduce((s,z)=>s+z[1],0)});}});
    saveAL();renderAlarms();$("alStatus").textContent=`${codes.length} hisse · ${qn} yeni sorgu${fail?` · ${fail} hata`:""} · ${istDateTime(new Date().toISOString())}`;}
  catch(e){$("alStatus").textContent=errCopy(e);}finally{btn.disabled=false;prog.hidden=true;}};
$("alOnly").addEventListener("change",()=>renderAlarms());
function renderAlarms(){const R=ALC.res;
  const hist=ALC.log.slice().sort((a,b)=>b.d.localeCompare(a.d)||a.c.localeCompare(b.c)).slice(0,60);
  $("alHist").innerHTML=hist.length?hist.map(h=>`<li><span class="d">${trDate(h.d)}</span><div style="min-width:0"><button type="button" class="linkbtn" data-c="${esc(h.c)}">${esc(h.c)}</button> <span class="sub">${esc(h.a.join(" · "))}</span></div><span class="alm-sev" style="background:${h.s>0?"var(--up)":h.s<0?"var(--down)":"var(--faint)"}"></span></li>`).join(""):`<li class="skel">Henüz kayıt yok.</li>`;
  $("alHist").querySelectorAll(".linkbtn").forEach(b=>b.onclick=()=>{$("q").value=b.dataset.c;load(b.dataset.c);});
  if(!R)return;const rows=R.codes.map(c=>({c,...R.out[c]}));let pos=0,neg=0,last="";
  rows.forEach(r=>{(r.a||[]).forEach(z=>{if(z[1]>0)pos++;else if(z[1]<0)neg++;});if(r.last&&r.last>last)last=r.last;});
  const T=$("alTiles").children;T[0].querySelector(".val").textContent=rows.length;T[0].querySelector(".sub").textContent=`${rows.filter(r=>r.a&&r.a.length).length} hissede alarm`;T[1].querySelector(".val").textContent=pos;T[2].querySelector(".val").textContent=neg;T[3].querySelector(".val").textContent=last?trDate(last):"—";
  const show=rows.filter(r=>!$("alOnly").checked||(r.a&&r.a.length)||r.err).sort((a,b)=>((b.a||[]).length-(a.a||[]).length)||a.c.localeCompare(b.c));
  $("alBody").innerHTML=show.length?show.map(r=>`<tr><td><button type="button" class="linkbtn" data-c="${esc(r.c)}">${esc(r.c)}</button></td><td class="sub">${esc([...R.src[r.c]].join(", "))}</td><td class="r num">${r.p!=null?fmt(r.p):"—"}</td><td class="r num">${r.rsi!=null?fmt(r.rsi,0):"—"}</td><td>${r.err?`<span class="sub">${esc(r.err)}</span>`:r.a.length?r.a.map(z=>`<span class="pill ${z[1]>0?"pos":z[1]<0?"neg":"warn"}" style="margin:0 4px 4px 0">${esc(z[0])}</span>`).join(""):'<span class="sub">Yok</span>'}</td></tr>`).join(""):`<tr><td colspan="5" class="skel">Alarm yok.</td></tr>`;
  $("alBody").querySelectorAll(".linkbtn").forEach(b=>b.onclick=()=>{$("q").value=b.dataset.c;load(b.dataset.c);});
  S.alarms=show.slice(0,40).map(r=>({hisse:r.c,kapanis:r.p,rsi:r.rsi&&+r.rsi.toFixed(1),alarmlar:(r.a||[]).map(z=>z[0])}));}
renderAlarms();

