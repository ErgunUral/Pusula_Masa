/* ---------- Son finansal dönem verileri (paylaşılan, 3 gün önbellek) ---------- */
const FD={data:{},TTL:3*864e5};
try{const v=JSON.parse(localStorage.getItem("hm_fund")||"null");if(v&&v.data){const now=Date.now();for(const [k,x] of Object.entries(v.data))if(x&&now-x.at<FD.TTL)FD.data[k]=x;}}catch{}
const saveFD=()=>{try{localStorage.setItem("hm_fund",JSON.stringify({data:FD.data}));}catch{}};
const pctNum=v=>v==null||!isFinite(v)?"—":(v>0?"+":"")+nf(0).format(v*100)+"%";
function fundCells(d){if(!d)return'<td class="r sub">…</td><td class="r sub">…</td><td class="r sub">…</td><td class="r sub">…</td>';
  const c=v=>v==null?"":v>0?"var(--up)":v<0?"var(--down)":"";
  return `<td class="r num" title="Dönem ${esc(d.per||"")}">${d.fk==null?"—":d.fk<0?'<span class="sub">zarar</span>':fmt(d.fk,1)}</td><td class="r num">${d.pddd==null?"—":fmt(d.pddd,2)}</td><td class="r num" style="color:${c(d.roe)}">${pctNum(d.roe)}</td><td class="r num" style="color:${c(d.grwNet)}">${pctNum(d.grwNet)}</td>`;}
function fundBrief(d){if(!d)return{};const r=v=>v==null||!isFinite(v)?null:+v.toFixed(3);return{sonDonem:d.per,fk:r(d.fk),pddd:r(d.pddd),ozkaynakKarliligi:r(d.roe),netKarBuyumesi:r(d.grwNet),satisBuyumesi:r(d.grwRev)};}
let FD_LOCK=Promise.resolve();
function getLatestFund(codes,force){const run=FD_LOCK.then(()=>getLatestFund_(codes,force));FD_LOCK=run.catch(()=>{});return run;}
async function getLatestFund_(codes,force){
  codes=[...new Set(codes)].filter(c=>/^[A-Z0-9]{3,6}$/.test(c));const now=Date.now();
  const need=codes.filter(c=>force||!FD.data[c]||now-FD.data[c].at>FD.TTL);if(!need.length||!S.mcp)return FD.data;
  const Y=Number(istDate(new Date().toISOString()).slice(0,4));const P={};const per=(c,y,a)=>{const k=c+"|"+(y*100+a);return P[k]||(P[k]={c,y,a});};
  const q=await sql(`SELECT hisse_senedi_kodu, odenmis_sermaye, piyasa_degeri FROM hisse_senetleri WHERE hisse_senedi_kodu IN (${inList(need)}) LIMIT 300`,"Son dönem temel veriler: piyasa değeri");
  const mc=Object.fromEntries(q.map(r=>[r.hisse_senedi_kodu,r]));
  const B=(n)=>{const o=[];for(let i=0;i<need.length;i+=n)o.push(need.slice(i,i+n));return o;};
  const jobs=[...B(12).map(g=>async()=>{const rows=await sql(`SELECT g.hisse_senedi_kodu, g.yil, g.ay, f.yayinlanma_tarihi_utc, g.kalem, g.try_ttm FROM hisse_finansal_tablolari_gelir_tablosu_kalemleri g JOIN hisse_finansal_tablolari f ON f.hisse_senedi_kodu = g.hisse_senedi_kodu AND f.yil = g.yil AND f.ay = g.ay WHERE g.hisse_senedi_kodu IN (${inList(g)}) AND g.yil >= ${Y-2} AND g.kalem IN ('Satış Gelirleri','Ana Ortaklık Payları','FAALİYET BRÜT KÂRI') ORDER BY g.hisse_senedi_kodu, g.yil, g.ay LIMIT 300`,"Son dönem temel veriler: gelir tablosu");
      rows.forEach(r=>{const x=per(r.hisse_senedi_kodu,r.yil,r.ay);if(r.yayinlanma_tarihi_utc)x.pub=istDate(r.yayinlanma_tarihi_utc);if(r.kalem==="Satış Gelirleri"||r.kalem==="FAALİYET BRÜT KÂRI"){if(x.rev==null||r.kalem==="Satış Gelirleri")x.rev=r.try_ttm;}else x.net=r.try_ttm;});}),
    ...B(20).map(g=>async()=>{const rows=await sql(`SELECT hisse_senedi_kodu, yil, ay, kalem, try_donemsel FROM hisse_finansal_tablolari_bilanco_kalemleri WHERE hisse_senedi_kodu IN (${inList(g)}) AND yil >= ${Y-1} AND kalem IN ('Ana Ortaklığa Ait Özkaynaklar','ÖZKAYNAKLAR') LIMIT 300`,"Son dönem temel veriler: özkaynak");
      rows.forEach(r=>{const x=per(r.hisse_senedi_kodu,r.yil,r.ay);if(r.kalem==="Ana Ortaklığa Ait Özkaynaklar"||x.eq==null)x.eq=r.try_donemsel;});})];
  let i=0;const errs=[];await Promise.all(Array.from({length:3},async()=>{while(i<jobs.length){const j=jobs[i++];try{await j();}catch(e){if(AUTH.includes(e&&e.code))throw e;errs.push(e);}}}));
  if(errs.length===jobs.length&&errs[0])throw errs[0];
  for(const c of need){const reps=Object.values(P).filter(x=>x.c===c&&x.pub&&(x.net!=null||x.rev!=null)).sort((a,b)=>(a.y*100+a.a)-(b.y*100+b.a));const L=reps[reps.length-1];const m=mc[c]||{};
    if(!L){FD.data[c]={at:now,none:true,mcap:m.piyasa_degeri??null};continue;}
    const prev=P[c+"|"+((L.y-1)*100+L.a)]||{};const eqRow=P[c+"|"+(L.y*100+L.a)];const eq=eqRow&&eqRow.eq!=null?eqRow.eq:null;
    const mcap=m.piyasa_degeri??null;
    FD.data[c]={at:now,per:`${L.y}/${String(L.a).padStart(2,"0")}`,pub:L.pub,net:L.net??null,rev:L.rev??null,eq,revPrev:prev.rev??null,netPrev:prev.net??null,shares:m.odenmis_sermaye??null,mcap,
      fk:mcap&&L.net?mcap/L.net:null,pddd:mcap&&eq>0?mcap/eq:null,roe:L.net!=null&&eq>0?L.net/eq:null,margin:L.net!=null&&L.rev>0?L.net/L.rev:null,
      grwRev:L.rev!=null&&prev.rev>0?L.rev/prev.rev-1:null,grwNet:L.net!=null&&prev.net>0?L.net/prev.net-1:null,
      hist:reps.map(r=>({pub:r.pub,net:r.net??null,eq:(P[c+"|"+(r.y*100+r.a)]||{}).eq??null}))};}
  saveFD();return FD.data;}

/* Temel tarama */
const FT={u:"XU100",rows:[],sort:{k:"score",dir:-1},busy:false};
document.querySelectorAll("#ftU button").forEach(b=>b.onclick=()=>{FT.u=b.dataset.v;document.querySelectorAll("#ftU button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));});
["ftFk","ftPd","ftRoe","ftGr","ftPos"].forEach(id=>$(id).addEventListener("input",()=>renderFT()));
document.querySelectorAll("#ftTable th[data-k]").forEach(th=>th.onclick=()=>{const k=th.dataset.k;FT.sort=FT.sort.k===k?{k,dir:-FT.sort.dir}:{k,dir:["fk","pddd","code","per"].includes(k)?1:-1};renderFT();});
$("ftRun").onclick=async()=>{if(FT.busy||!S.mcp)return;FT.busy=true;$("ftRun").disabled=true;$("ftStatus").textContent="Liste alınıyor…";
  try{const lbl={XU030:"BIST 30",XU050:"BIST 50",XU100:"BIST 100"}[FT.u];
    const u=await sql(`SELECT hisse_senedi_kodu FROM hisse_senetleri WHERE '${FT.u}' = ANY(endeksler) ORDER BY hisse_senedi_kodu LIMIT 120`,`${lbl} listesi (temel tarama)`);
    const codes=u.map(r=>r.hisse_senedi_kodu);$("ftStatus").textContent=`${codes.length} hissenin son dönem verileri alınıyor…`;
    await getLatestFund(codes);
    FT.rows=codes.map(c=>({code:c,...(FD.data[c]||{})}));
    const rank=(k,asc,ok)=>{const v=FT.rows.filter(r=>ok(r[k])).sort((a,b)=>asc?a[k]-b[k]:b[k]-a[k]);v.forEach((r,i)=>{r["_"+k]=v.length>1?100*(1-i/(v.length-1)):50;});};
    rank("fk",true,x=>x!=null&&x>0);rank("pddd",true,x=>x!=null&&x>0);rank("roe",false,x=>x!=null);rank("grwNet",false,x=>x!=null);
    FT.rows.forEach(r=>{const p=["_fk","_pddd","_roe","_grwNet"].map(k=>r[k]).filter(x=>x!=null);r.score=p.length>=3?p.reduce((a,b)=>a+b,0)/p.length:null;});
    const pers=FT.rows.map(r=>r.per).filter(Boolean).sort();$("ftStatus").textContent=`${lbl} · ${FT.rows.filter(r=>r.per).length} hisse · en yeni dönem ${pers[pers.length-1]||"—"} · ${istDateTime(new Date().toISOString())}`;
    renderFT();}
  catch(e){$("ftStatus").textContent=errCopy(e);}finally{FT.busy=false;$("ftRun").disabled=false;}};
function renderFT(){if(!FT.rows.length)return;const num=id=>{const v=$(id).value;return v===""?null:Number(v);};
  const fk=num("ftFk"),pd=num("ftPd"),roe=num("ftRoe"),gr=num("ftGr"),pos=$("ftPos").checked;
  let rows=FT.rows.filter(r=>(!pos||(r.net>0))&&(fk==null||(r.fk>0&&r.fk<=fk))&&(pd==null||(r.pddd>0&&r.pddd<=pd))&&(roe==null||(r.roe!=null&&r.roe*100>=roe))&&(gr==null||(r.grwNet!=null&&r.grwNet*100>=gr)));
  const {k,dir}=FT.sort;rows.sort((a,b)=>{const A=a[k],B=b[k];if(A==null)return 1;if(B==null)return -1;return(typeof A==="string"?A.localeCompare(B,"tr"):A-B)*dir;});
  document.querySelectorAll("#ftTable th[data-k]").forEach(th=>{th.textContent=th.textContent.replace(/ [▲▼]$/,"")+(th.dataset.k===k?(dir>0?" ▲":" ▼"):"");});
  const c=v=>v==null?"":v>0?"var(--up)":v<0?"var(--down)":"";
  $("ftBody").innerHTML=rows.length?rows.map(r=>`<tr><td><button type="button" class="linkbtn" data-c="${esc(r.code)}">${esc(r.code)}</button></td><td class="sub">${esc(r.per||"—")}</td><td class="r num">${big(r.mcap)}</td><td class="r num">${r.fk==null?"—":r.fk<0?'<span class="sub">zarar</span>':fmt(r.fk,1)}</td><td class="r num">${r.pddd==null?"—":fmt(r.pddd,2)}</td><td class="r num" style="color:${c(r.roe)}">${pctNum(r.roe)}</td><td class="r num" style="color:${c(r.margin)}">${pctNum(r.margin)}</td><td class="r num" style="color:${c(r.grwRev)}">${pctNum(r.grwRev)}</td><td class="r num" style="color:${c(r.grwNet)}">${pctNum(r.grwNet)}</td><td class="r num"><b>${r.score==null?"—":fmt(r.score,0)}</b></td><td class="r"><button type="button" class="xbtn ftadd" data-c="${esc(r.code)}" title="Takip listesine ekle" aria-label="${esc(r.code)} takibe al" style="color:var(--accent)">${W.list.includes(r.code)?"✓":"+"}</button></td></tr>`).join(""):`<tr><td colspan="11" class="skel">Filtrelere uyan hisse yok.</td></tr>`;
  $("ftBody").querySelectorAll(".linkbtn").forEach(b=>b.onclick=()=>{$("q").value=b.dataset.c;load(b.dataset.c);scrollTo({top:0,behavior:"smooth"});});
  $("ftBody").querySelectorAll(".ftadd").forEach(b=>b.onclick=()=>{const c=b.dataset.c;if(!W.list.includes(c)&&W.list.length<W_MAX){W.list.push(c);saveW();syncStar();b.textContent="✓";refreshWatch();}});
  S.fundScan=rows.slice(0,40).map(r=>({hisse:r.code,donem:r.per,fk:r.fk&&+r.fk.toFixed(1),pddd:r.pddd&&+r.pddd.toFixed(2),ozkaynakKarliligi:r.roe&&+r.roe.toFixed(3),netKarBuyumesi:r.grwNet&&+r.grwNet.toFixed(3),skor:r.score&&+r.score.toFixed(0)}));}

