/* ---------- Hisse karnesi: vade durumu, güçlü destek/direnç, değerleme, bedelsiz ---------- */
const MKT_REF={date:"2026-10-07",fk:11.16,pddd:1.05,note:"BIST 100, son açıklanan dönem, 07.10.2026 piyasa değerleri"};
function srLevels(T){
  const n=T.c.length,i=n-1,p=T.c[i],atr=T.atr[i]||p*0.02,w=3,out=[];
  for(let k=Math.max(w,n-300);k<n-w;k++){let H=true,L=true;for(let j=k-w;j<=k+w;j++){if(j===k)continue;if(T.h[j]>T.h[k])H=false;if(T.l[j]<T.l[k])L=false;}
    const rec=0.5+0.5*(k-(n-300))/300;if(H)out.push({v:T.h[k],wt:rec,k});if(L)out.push({v:T.l[k],wt:rec,k});}
  const tol=Math.max(0.012,0.6*atr/p);out.sort((a,b)=>a.v-b.v);const cl=[];
  for(const x of out){const c=cl[cl.length-1];if(c&&Math.abs(x.v-c.v)/c.v<tol){c.v=(c.v*c.wt+x.v*x.wt)/(c.wt+x.wt);c.wt+=x.wt;c.n++;c.last=Math.max(c.last,x.k);}else cl.push({v:x.v,wt:x.wt,n:1,last:x.k});}
  const n52=Math.min(252,n);const hi52=Math.max(...T.h.slice(-n52)),lo52=Math.min(...T.l.slice(-n52));
  cl.forEach(c=>{if(Math.abs(c.v-hi52)/hi52<tol||Math.abs(c.v-lo52)/lo52<tol)c.wt+=0.75;c.str=c.n>=4||c.wt>=2.6?"Güçlü":c.n>=2?"Orta":"Zayıf";});
  const sup=cl.filter(c=>c.v<p*(1-0.002)).sort((a,b)=>b.v-a.v).slice(0,4),res=cl.filter(c=>c.v>p*(1+0.002)).sort((a,b)=>a.v-b.v).slice(0,4);
  const near=(arr,st)=>arr.filter(c=>c.str===st&&Math.abs(c.v/p-1)<0.2)[0]||null;
  return{p,atr,sup,res,S:near(sup,"Güçlü")||near(sup,"Orta")||sup[0]||null,R:near(res,"Güçlü")||near(res,"Orta")||res[0]||null,hi52,lo52};}
function horizon(T){
  const i=T.c.length-1,c=T.c,p=c[i],r=n=>i>=n?(p/c[i-n]-1)*100:null,sl=(a,n)=>a[i]!=null&&a[i-n]!=null?a[i]-a[i-n]:null;
  const H=(items)=>{const v=items.filter(x=>x[0]!==null);const sc=v.reduce((a,x)=>a+x[0],0)/Math.max(1,v.length);
    const vd=sc>=0.6?["Güçlü pozitif","var(--up)"]:sc>=0.2?["Pozitif","var(--up)"]:sc>-0.2?["Nötr","var(--fg)"]:sc>-0.6?["Negatif","var(--down)"]:["Güçlü negatif","var(--down)"];return{sc,vd,why:v.map(x=>x[1])};};
  const rs=T.rsi[i],mh=T.mac.h?T.mac.h[i]:(T.mac.m[i]-T.mac.sig[i]);
  const s=H([[T.s20[i]==null?null:p>T.s20[i]?1:-1,`Fiyat SMA20'nin ${p>T.s20[i]?"üstünde":"altında"} (${pct((p/T.s20[i]-1)*100)})`],
    [rs==null?null:rs>=55?1:rs<=45?-1:0,`RSI ${fmt(rs,0)}${rs>=70?" · aşırı alım bölgesi":rs<=30?" · aşırı satım bölgesi":""}`],
    [mh==null?null:mh>0?1:-1,`MACD sinyal çizgisinin ${mh>0?"üstünde":"altında"}`],
    [r(5)==null?null:r(5)>1?1:r(5)<-1?-1:0,`1 hafta ${pct(r(5))}`]]);
  const m=H([[T.s50[i]==null?null:p>T.s50[i]?1:-1,`Fiyat SMA50'nin ${p>T.s50[i]?"üstünde":"altında"} (${pct((p/T.s50[i]-1)*100)})`],
    [T.s50[i]==null||T.s20[i]==null?null:T.s20[i]>T.s50[i]?1:-1,`SMA20 ${T.s20[i]>T.s50[i]?">":"<"} SMA50`],
    [sl(T.s50,10)==null?null:sl(T.s50,10)>0?1:-1,`SMA50 eğimi ${sl(T.s50,10)>0?"yukarı":"aşağı"}`],
    [r(63)==null?null:r(63)>3?1:r(63)<-3?-1:0,`3 ay ${pct(r(63))}`]]);
  const n52=Math.min(252,T.c.length),hi=Math.max(...T.h.slice(-n52)),lo=Math.min(...T.l.slice(-n52)),pos=(p-lo)/(hi-lo||1);
  const l=H([[T.s200[i]==null?null:p>T.s200[i]?1:-1,T.s200[i]==null?"SMA200 için geçmiş yetersiz":`Fiyat SMA200'ün ${p>T.s200[i]?"üstünde":"altında"} (${pct((p/T.s200[i]-1)*100)})`],
    [T.s200[i]==null||T.s50[i]==null?null:T.s50[i]>T.s200[i]?1:-1,`SMA50 ${T.s50[i]>T.s200[i]?">":"<"} SMA200 (${T.s50[i]>T.s200[i]?"altın kesişim bölgesi":"ölüm kesişimi bölgesi"})`],
    [sl(T.s200,20)==null?null:sl(T.s200,20)>0?1:-1,`SMA200 eğimi ${sl(T.s200,20)>0?"yukarı":"aşağı"}`],
    [pos>=0.66?1:pos<=0.33?-1:0,`52 hafta aralığının %${fmt(pos*100,0)}'inde`],
    [r(250)==null?null:r(250)>0?1:-1,r(250)==null?`Dönem getirisi ${pct(r(T.c.length-1))}`:`1 yıl ${pct(r(250))}`]]);
  return[s,m,l];}
function renderVade(T){const hs=horizon(T);[...$("ozVade").children].forEach((el,k)=>{const h=hs[k];el.querySelector(".vd").textContent=h.vd[0];el.querySelector(".vd").style.color=h.vd[1];el.querySelector("ul").innerHTML=h.why.map(x=>`<li>${esc(x)}</li>`).join("");});
  S.data.vade={kisa:hs[0].vd[0],orta:hs[1].vd[0],uzun:hs[2].vd[0],gerekceler:{kisa:hs[0].why,orta:hs[1].why,uzun:hs[2].why}};return hs;}
function renderSR(T){const L=srLevels(T),p=L.p,a=L.atr;
  const all=[...L.sup.map(c=>({...c,t:"Destek"})),...L.res.map(c=>({...c,t:"Direnç"}))];
  const lo=Math.min(p,...all.map(c=>c.v))*0.98,hi=Math.max(p,...all.map(c=>c.v))*1.02,X=v=>((v-lo)/(hi-lo)*100).toFixed(2)+"%";
  let zones="";
  if(L.S)zones+=`<span style="left:${X(L.S.v-0.3*a)};width:calc(${X(L.S.v+0.5*a)} - ${X(L.S.v-0.3*a)});background:var(--up)"></span>`;
  if(L.R)zones+=`<span style="left:${X(L.R.v-0.5*a)};width:calc(${X(L.R.v+0.3*a)} - ${X(L.R.v-0.5*a)});background:var(--down)"></span>`;
  $("srBar").innerHTML=zones+all.map(c=>`<i title="${c.t} ${fmt(c.v)} · ${c.str}" style="left:${X(c.v)};background:var(${c.t==="Destek"?"--up":"--down"});width:${c.str==="Güçlü"?4:c.str==="Orta"?2:1}px"></i>`).join("")+`<b style="left:${X(p)}" title="Fiyat ${fmt(p)}"></b>`;
  const buy=L.S?[L.S.v-0.3*a,L.S.v+0.5*a]:null,sell=L.R?[L.R.v-0.5*a,L.R.v+0.3*a]:null,stop=L.S?L.S.v-1.2*a:null;
  const rr=L.R&&stop&&p>stop?(L.R.v-p)/(p-stop):null;
  let where="Fiyat iki bölgenin arasında";if(buy&&p<=buy[1]&&p>=buy[0])where="Fiyat teknik alım bölgesinde";else if(sell&&p>=sell[0]&&p<=sell[1])where="Fiyat teknik satış bölgesinde";else if(stop&&p<stop)where="Fiyat güçlü desteğin altında (destek kırıldı)";else if(L.R&&p>L.R.v)where="Fiyat direncin üzerinde";
  $("srZone").innerHTML=`<div><div class="lbl">Teknik alım bölgesi</div><div class="val" style="color:var(--up)">${buy?fmt(buy[0])+" – "+fmt(buy[1]):"—"}</div><div class="sub">${L.S?`${L.S.str} destek ${fmt(L.S.v)} (${pct((L.S.v/p-1)*100)})`:"Yakında destek yok"}</div></div>
    <div><div class="lbl">Teknik satış / kâr al bölgesi</div><div class="val" style="color:var(--down)">${sell?fmt(sell[0])+" – "+fmt(sell[1]):"—"}</div><div class="sub">${L.R?`${L.R.str} direnç ${fmt(L.R.v)} (${pct((L.R.v/p-1)*100)})`:"Yakında direnç yok (zirvede)"}</div></div>
    <div><div class="lbl">Zarar kes</div><div class="val">${stop?fmt(stop):"—"}</div><div class="sub">Güçlü destek − 1,2 ATR (ATR ${fmt(a)})</div></div>
    <div><div class="lbl">Ödül / risk</div><div class="val">${rr!=null?fmt(rr,1)+" : 1":"—"}</div><div class="sub">${esc(where)}</div></div>`;
  $("srBody").innerHTML=[...L.res.slice().reverse(),{cur:true},...L.sup].map(c=>c.cur?`<tr><td><b>Fiyat</b></td><td class="r num"><b>${fmt(p)}</b></td><td></td><td></td><td></td></tr>`:
    `<tr><td>${c.v>p?"Direnç":"Destek"}</td><td class="r num">${fmt(c.v)}</td><td class="r num">${pct((c.v/p-1)*100)}</td><td class="r num">${c.n}</td><td><span class="pill ${c.str==="Güçlü"?(c.v>p?"neg":"pos"):c.str==="Orta"?"warn":"neu"}">${c.str}</span></td></tr>`).join("");
  $("srStamp").textContent=`${trDate(T.t[T.t.length-1])} kapanışına göre`;
  $("srNote").textContent=`52 hafta aralığı ${fmt(L.lo52)} – ${fmt(L.hi52)}. Test sayısı, fiyatın o bölgede kaç kez dönüş yaptığıdır; 52 hafta zirve/dip seviyeleri ek ağırlık alır. Alım bölgesi güçlü desteğin 0,3 ATR altından 0,5 ATR üstüne, satış bölgesi güçlü direncin 0,5 ATR altından 0,3 ATR üstüne kadardır. Dürüst not: 2025–2026 BIST 100 verisiyle yapılan geriye dönük testte (8.500 olay) bu yöntemin güçlü desteklerinden 1,5 ATR'lik dönüş oranı %57,7, aynı uzaklıktaki rastgele seviyelerde %57,8 çıktı; seviyeler tek başına üstünlük sağlamadı. Bunları giriş sinyali değil, zarar kes ve risk/ödül planı için kullanın.`;
  if(S.charts&&S.charts.candle){(S.charts.srLines||[]).forEach(l=>{try{S.charts.candle.removePriceLine(l);}catch{}});
    S.charts.srLines=[L.S&&S.charts.candle.createPriceLine({price:L.S.v,color:css("--up"),lineWidth:2,lineStyle:0,axisLabelVisible:true,title:"Güçlü destek"}),L.R&&S.charts.candle.createPriceLine({price:L.R.v,color:css("--down"),lineWidth:2,lineStyle:0,axisLabelVisible:true,title:"Güçlü direnç"}),stop&&S.charts.candle.createPriceLine({price:stop,color:css("--faint"),lineWidth:1,lineStyle:2,axisLabelVisible:false,title:"Zarar kes"})].filter(Boolean);}
  S.data.seviyeler={gucluDestek:L.S&&+L.S.v.toFixed(2),gucluDirenc:L.R&&+L.R.v.toFixed(2),alimBolgesi:buy&&buy.map(v=>+v.toFixed(2)),satisBolgesi:sell&&sell.map(v=>+v.toFixed(2)),zararKes:stop&&+stop.toFixed(2),odulRisk:rr&&+rr.toFixed(2),durum:where};
  return L;}
const SECT={};
/* Fiyat geçmişi (düzeltilmiş kapanış × bugünkü pay sayısı = o günkü piyasa değeri) ile her gün o tarihte açıklanmış son raporun kârı/özkaynağı */
function ownHist(d,T,shares){if(!d||!d.hist||!T||!(shares>0))return null;const H=d.hist.filter(h=>h.pub).sort((a,b)=>a.pub<b.pub?-1:1);if(!H.length)return null;
  const fk=[],pb=[];let j=-1;const n=T.live?T.c.length-1:T.c.length;let from=null;
  for(let i=0;i<n;i++){const t=T.t[i];while(j+1<H.length&&H[j+1].pub<t)j++;if(j<0)continue;const r=H[j],m=T.c[i]*shares;if(!from)from=t;if(r.net>0)fk.push(m/r.net);if(r.eq>0)pb.push(m/r.eq);}
  const st=(a,cur)=>{if(a.length<60||!(cur>0))return null;const s=a.slice().sort((x,y)=>x-y),q=f=>s[Math.min(s.length-1,Math.floor(f*s.length))];return{med:q(0.5),lo:q(0.05),hi:q(0.95),pct:100*s.filter(v=>v<=cur).length/s.length};};
  const months=Math.round((Date.parse(T.t[n-1])-Date.parse(from||T.t[0]))/2.63e9);
  return{from,months,fk:st(fk,d.fk),pb:st(pb,d.pddd)};}
async function loadValuation(code){
  const body=$("valBody");try{
    await getLatestFund([code]);if(S.code!==code)return;if(FD.data[code]&&!FD.data[code].none&&!FD.data[code].hist){await getLatestFund([code],true);if(S.code!==code)return;}const d=FD.data[code];
    const own=ownHist(d,S.data.T,S.data.quote&&S.data.quote.odenmis_sermaye);
    let peers=SECT[code];if(!peers){const r=await sql(`SELECT hisse_senedi_kodu FROM hisse_senetleri WHERE sektor_id IN (SELECT sektor_id FROM hisse_senetleri WHERE hisse_senedi_kodu = '${code}') ORDER BY piyasa_degeri DESC LIMIT 25`,`${code} sektör benzerleri`);peers=SECT[code]=r.map(x=>x.hisse_senedi_kodu);}
    if(S.code!==code)return;await getLatestFund(peers);if(S.code!==code)return;
    const med=a=>{a=a.filter(v=>v!=null&&isFinite(v)&&v>0).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;};
    const others=peers.filter(c=>c!==code).map(c=>FD.data[c]).filter(Boolean);const sFk=med(others.map(x=>x.fk)),sPb=med(others.map(x=>x.pddd));const few=others.length<4;const cFk=few?MKT_REF.fk:sFk,cPb=few?MKT_REF.pddd:sPb,cmpN=few?"BIST 100 ortancası":"sektör ortancası",sRoe=(()=>{const a=others.map(x=>x.roe).filter(v=>v!=null).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null;})();
    const an=S.data.analyst,p=S.data.quote&&S.data.quote.son_fiyat,pot=an&&an.medyanHedef&&p?(an.medyanHedef/p-1):null;
    const row=(n,v,sv,mv,f)=>`<tr><td>${n}</td><td class="r num"><b>${f(v)}</b></td><td class="r num">${f(sv)}</td><td class="r num">${f(mv)}</td></tr>`;
    const f1=v=>v==null?"—":v<0?"zarar":fmt(v,1),f2=v=>v==null?"—":fmt(v,2);
    body.innerHTML=(d&&!d.none?row("F/K",d.fk,sFk,MKT_REF.fk,f1)+row("PD/DD",d.pddd,sPb,MKT_REF.pddd,f2)+(own&&own.fk?`<tr><td>F/K, kendi geçmişi<div class="sub">${trDate(own.from)} – bugün, günlük</div></td><td class="r num"><b>${f1(d.fk)}</b></td><td class="r num" colspan="2">ortanca ${fmt(own.fk.med,1)} · aralık ${fmt(own.fk.lo,1)}–${fmt(own.fk.hi,1)} · şimdi %${fmt(own.fk.pct,0)}'lik dilimde</td></tr>`:"")+(own&&own.pb?`<tr><td>PD/DD, kendi geçmişi</td><td class="r num"><b>${f2(d.pddd)}</b></td><td class="r num" colspan="2">ortanca ${fmt(own.pb.med,2)} · aralık ${fmt(own.pb.lo,2)}–${fmt(own.pb.hi,2)} · şimdi %${fmt(own.pb.pct,0)}'lik dilimde</td></tr>`:"")+row("Özkaynak kârlılığı",d.roe,sRoe,null,v=>pctNum(v))+row("Net kâr büyümesi",d.grwNet,null,null,v=>pctNum(v)):`<tr><td colspan="4" class="skel">Finansal tablo verisi bulunamadı.</td></tr>`)+
      `<tr><td>Analist medyan hedef</td><td class="r num"><b>${an&&an.medyanHedef?fmt(an.medyanHedef):"—"}</b></td><td class="r num" colspan="2">${pot!=null?`Potansiyel ${pct(pot*100)} · ${an.kurumSayisi} kurum`:"Son 6 ayda hedef yok"}</td></tr>`;
    let sc=0,k=0;const why=[];
    if(d&&d.fk!=null&&d.fk>0&&cFk){const r=d.fk/cFk;k++;if(r<0.75){sc++;why.push(`F/K ${cmpN}nın %${fmt(r*100,0)}'i: görece ucuz`);}else if(r>1.33){sc--;why.push(`F/K ${cmpN}nın ${fmt(r,1)} katı: görece pahalı`);}else why.push(`F/K ${cmpN}na yakın`);}
    else if(d&&d.net!=null&&d.net<=0){why.push("Son 12 ay zarar: F/K ile değerleme yapılamaz");sc-=0.5;k++;}
    if(d&&d.pddd>0&&cPb){const r=d.pddd/cPb;k++;if(r<0.75){sc++;why.push(`PD/DD ${cmpN}nın %${fmt(r*100,0)}'i`);}else if(r>1.33){sc--;why.push(`PD/DD ${cmpN}nın ${fmt(r,1)} katı`);}else why.push(`PD/DD ${cmpN}na yakın`);}
    if(d&&d.roe!=null&&sRoe!=null&&d.pddd>0&&sPb){if(d.roe>sRoe*1.3&&d.pddd>sPb)why.push("Yüksek PD/DD, sektörden yüksek kârlılıkla kısmen açıklanıyor");}
    if(own&&own.fk&&d.fk>0){k++;const r=d.fk/own.fk.med;if(r<0.8){sc++;why.push(`F/K kendi ${own.months} aylık ortancasının %${fmt(r*100,0)}'i: kendi geçmişine göre ucuz`);}else if(r>1.25){sc--;why.push(`F/K kendi ${own.months} aylık ortancasının ${fmt(r,1)} katı: kendi geçmişine göre pahalı`);}else why.push(`F/K kendi ${own.months} aylık ortancasına yakın`);}
    if(pot!=null){k++;if(pot>0.25){sc++;why.push(`Analist medyan hedefi %${fmt(pot*100,0)} yukarıda`);}else if(pot<0.05){sc--;why.push(pot<0?"Fiyat analist medyan hedefinin üzerinde":"Analist hedefine çok az potansiyel kalmış");}else why.push(`Analist potansiyeli %${fmt(pot*100,0)}`);}
    const v=!k?["Veri yetersiz","var(--fg)"]:sc>=1?["Görece ucuz","var(--up)"]:sc<=-1?["Görece pahalı","var(--down)"]:["Makul fiyatlı","var(--fg)"];
    $("valVd").textContent=v[0];$("valVd").style.color=v[1];
    $("valWhy").innerHTML=why.map(x=>`<li>${esc(x)}</li>`).join("")+`<li>Sektör: ${others.length} benzer hisse${few?" (karşılaştırma için az; karar BIST 100 ortancasına göre)":" (piyasa değerine göre en büyük 25)"} · BIST 100 ortancası ${trDate(MKT_REF.date)} itibarıyla</li>`;
    S.data.degerleme={karar:v[0],gerekceler:why,fk:d&&d.fk,pddd:d&&d.pddd,sektorFK:sFk,sektorPDDD:sPb,bist100FK:MKT_REF.fk,bist100PDDD:MKT_REF.pddd,analistPotansiyel:pot};
    // bedelsiz potansiyeli
    const sh=S.data.quote&&S.data.quote.odenmis_sermaye,eq=d&&d.eq;const t=$("bdTiles").children[0];
    if(sh>0&&eq){const r=eq/sh;t.querySelector(".val").textContent=`%${nf(0).format((r-1)*100)}`;t.querySelector(".sub").textContent=`Özkaynak ${big(eq)} ÷ sermaye ${big(sh)} (${fmt(r,1)} kat) · ${d.per}`;S.data.bedelsizPotansiyeli=+((r-1)*100).toFixed(0);}
  }catch(e){if(S.code===code)body.innerHTML=`<tr><td colspan="4"><div class="note err">${esc(errCopy(e))}</div></td></tr>`;}}
const BD_STAGES=[["Esas Sözleşme","Tescil / esas sözleşme"],["Kullanım Başlangıç","Pay alma hakkı kullanımı (dağıtım)"],["Hak Kullanım","Pay alma hakkı kullanımı (dağıtım)"],["SPK Onay","SPK onayı alındı"],["SPK Başvuru","SPK'ya başvuruldu"],["Yönetim Kurulu","Yönetim kurulu kararı"],["Karar","Yönetim kurulu kararı"]];
async function loadBedelsiz(code){
  const ul=$("bdList"),t=$("bdTiles").children[1];
  try{const r=await call("dokumanlarda_ara",{query:"bedelsiz",filter:`dokuman_tipi = "kap_haberi" AND iliskili_semboller = "${code}" AND kap_bildirim_konu = "Sermaye Artırımı - Azaltımı İşlemlerine İlişkin Bildirim"`,sirala:"yayinlanma_tarihi_utc:desc",sayfa_basi:8,purpose:`${code} bedelsiz sermaye artırımı bildirimleri`});
    if(S.code!==code)return;let p=r.payload;if(typeof p==="string"){try{p=JSON.parse(p);}catch{p=null;}}
    const items=((p&&p.sonuclar)||[]).filter(n=>/bedelsiz/i.test(n.highlight||""));
    const stage=h=>{const x=String(h||"").replace(/<\/?mark>/g,"");for(const [k,v] of BD_STAGES)if(x.includes(k))return v;return"Sermaye artırımı bildirimi";};
    if(!items.length){ul.innerHTML=`<li class="skel">KAP'ta bedelsiz sermaye artırımı bildirimi bulunamadı.</li>`;t.querySelector(".val").textContent="Süreç yok";t.querySelector(".sub").textContent="Bilinen bedelsiz bildirimi yok";S.data.bedelsiz={durum:"bildirim yok"};return;}
    const last=items[0],ld=istDate(last.yayinlanma_tarihi_utc),age=(Date.now()-Date.parse(ld))/864e5,st=stage(last.highlight);
    const done=/Tescil|kullanımı/.test(st);
    t.querySelector(".val").textContent=age>365?"Son 12 ayda yok":done&&age>30?"Tamamlandı":"Süreç devam ediyor";
    t.querySelector(".sub").textContent=`Son adım: ${st} · ${trDate(ld)}`;
    ul.innerHTML=items.map(n=>{const url=/^https:\/\/(www\.)?kap\.org\.tr\//.test(n.dokuman_orijinal_url||"")?n.dokuman_orijinal_url:null;const h=esc(String(n.highlight||"").replace(/<\/?mark>/g,"").replace(/\s+/g," ").replace(/^\s*\.\.\.\s*/,"").slice(0,110));
      return `<li><span class="d">${trDate(istDate(n.yayinlanma_tarihi_utc))}</span><div style="min-width:0">${url?`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(stage(n.highlight))}</a>`:esc(stage(n.highlight))}<div class="sub">${h}</div></div><span></span></li>`;}).join("");
    S.data.bedelsiz={durum:t.querySelector(".val").textContent,sonAdim:st,tarih:ld,bildirimSayisi:items.length};
  }catch(e){if(S.code===code)ul.innerHTML=`<li><div class="note err">${esc(errCopy(e))}</div></li>`;}}
function renderOzet(code){const T=S.data.T;if(T){renderVade(T);renderSR(T);$("ozStamp").textContent=`${trDate(T.t[T.t.length-1])} kapanışı`+(T.live?" (seans içi fiyatla)":"");}
  else{$("srBody").innerHTML=`<tr><td colspan="5" class="skel">Fiyat geçmişi alınamadı.</td></tr>`;}
  loadValuation(code);loadBedelsiz(code);}

