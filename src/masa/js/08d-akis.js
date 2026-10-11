/* ---------- Alan / satan: para akışı tahmini, içeriden işlemler, geri alımlar, fon değişimleri ---------- */
const AK={code:null};
const trN=t=>{t=String(t||"").trim();if(!t)return NaN;t=t.replace(/\./g,"").replace(",",".");return Number(t);};
async function docSearch(input){const r=await call("dokumanlarda_ara",input);let p=r.payload;if(typeof p==="string"){try{p=JSON.parse(p);}catch{p=null;}}return(p&&p.sonuclar)||[];}
async function chunks(ids,purpose){if(!ids.length)return[];const r=await call("dokuman_chunk_yukle",{ids,purpose});let p=r.payload;if(typeof p==="string"){try{p=JSON.parse(p);}catch{p=null;}}return Array.isArray(p)?p:(p&&p.sonuclar)||[];}
function sparkSVG(vals,{w=520,h=110,bars=false,labels=null}={}){if(!vals.length)return'<div class="skel">Veri yok.</div>';
  const mx=Math.max(...vals.map(Math.abs),1),y0=h/2,sc=(h/2-8)/mx,up=css("--up"),dn=css("--down"),ln=css("--line");
  if(bars){const bw=w/vals.length;return`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Günlük net akış"><line x1="0" x2="${w}" y1="${y0}" y2="${y0}" stroke="${ln}"/>${vals.map((v,i)=>`<rect x="${(i*bw+1).toFixed(1)}" y="${(v>=0?y0-v*sc:y0).toFixed(1)}" width="${Math.max(1,bw-2).toFixed(1)}" height="${Math.abs(v*sc).toFixed(1)}" fill="${v>=0?up:dn}" opacity=".85"><title>${labels?esc(labels[i])+": ":""}${big(v)}</title></rect>`).join("")}</svg>`;}
  const st=w/Math.max(1,vals.length-1),pts=vals.map((v,i)=>`${(i*st).toFixed(1)},${(y0-v*sc).toFixed(1)}`).join(" ");const last=vals[vals.length-1];
  return`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Birikimli para akışı"><line x1="0" x2="${w}" y1="${y0}" y2="${y0}" stroke="${ln}"/><polyline points="${pts}" fill="none" stroke="${last>=0?up:dn}" stroke-width="2"/></svg>`;}
async function loadAkis(code){
  if(!S.mcp||AK.code===code)return;AK.code=code;const T=$("akTiles").children,setT=(i,v,sub,col)=>{const e=T[i].querySelector(".val");e.textContent=v;e.style.color=col||"";if(sub!=null)T[i].querySelector(".sub").textContent=sub;};
  for(let i=0;i<4;i++)setT(i,"…",null);$("akIntra").innerHTML='<div class="skel">Yükleniyor…</div>';$("akIns").innerHTML='<tr><td colspan="7" class="skel">Yükleniyor…</td></tr>';$("akBuy").innerHTML='<tr><td colspan="5" class="skel">Yükleniyor…</td></tr>';$("akFundUp").innerHTML=$("akFundDn").innerHTML="";$("akBuySum").textContent="";
  const res={};
  // A) 5 dk para akışı
  const pA=(async()=>{try{const from=new Date(Date.now()-9*864e5).toISOString().slice(0,10)+" 00:00:00";
    const rows=await sql(`SELECT zaman_utc, acilis, kapanis, hacim_15_dk_gecikmeli FROM mumlar_5dk_gh WHERE kod = '${code}' AND zaman_utc >= TIMESTAMP '${from}' ORDER BY zaman_utc DESC LIMIT 300`,`${code} 5 dakikalık mumlar (para akışı tahmini)`);
    if(AK.code!==code)return;rows.reverse();const D={};let prev=null,pd=0;
    rows.forEach(r=>{const d=istDate(r.zaman_utc);if(!d||!(r.kapanis>0))return;let dir=prev==null?Math.sign(r.kapanis-r.acilis):Math.sign(r.kapanis-prev);if(!dir)dir=Math.sign(r.kapanis-r.acilis)||pd;pd=dir;prev=r.kapanis;
      const v=r.hacim_15_dk_gecikmeli||0;const x=(D[d]=D[d]||{net:0,buy:0,tot:0,cum:[]});x.net+=dir*v;if(dir>0)x.buy+=v;x.tot+=v;x.cum.push(x.net);});
    const days=Object.keys(D).sort();if(!days.length){$("akIntra").innerHTML='<div class="skel">5 dakikalık veri yok.</div>';setT(0,"—","");setT(1,"—");return;}
    const ld=days[days.length-1],L=D[ld];res.intra={gun:ld,netTL:Math.round(L.net),aliciPayi:+(L.buy/L.tot*100).toFixed(1)};
    setT(0,big(L.net),`${trDate(ld)}${days.length>1?` · önceki gün ${big(D[days[days.length-2]].net)}`:""}`,L.net>0?"var(--up)":L.net<0?"var(--down)":"");
    setT(1,`%${fmt(L.buy/L.tot*100,0)}`,`Toplam hacim ${big(L.tot)}`,L.buy/L.tot>0.55?"var(--up)":L.buy/L.tot<0.45?"var(--down)":"");
    $("akIntra").innerHTML=sparkSVG(L.cum)+`<div class="sub" style="font-size:.78rem">${trDate(ld)} · ${L.cum.length} mum · gün sonu ${big(L.net)}</div>`;
  }catch(e){if(AK.code===code){$("akIntra").innerHTML=`<div class="note err">${esc(errCopy(e))}</div>`;setT(0,"—","");}}})();
  // günlük (T'den, ek sorgu yok)
  const Td=S.data.T;if(Td){const n=Td.c.length,k0=Math.max(0,n-20),vals=[],lab=[];let s=0,v=0;
    for(let i=k0;i<n;i++){const hl=Td.h[i]-Td.l[i],mfm=hl>0?((Td.c[i]-Td.l[i])-(Td.h[i]-Td.c[i]))/hl:0;vals.push(mfm*Td.v[i]);lab.push(trDate(Td.t[i]));s+=mfm*Td.v[i];v+=Td.v[i];}
    $("akDaily").innerHTML=sparkSVG(vals,{bars:true,labels:lab});const cmf=v>0?s/v:0;setT(2,big(s),`CMF ${fmt(cmf,2)} · ${cmf>0.05?"birikim":cmf<-0.05?"dağıtım":"dengeli"}`,s>0?"var(--up)":s<0?"var(--down)":"");res.gun20={netTL:Math.round(s),cmf:+cmf.toFixed(3)};}
  // B) içeriden işlemler
  const pB=(async()=>{try{const notes=await docSearch({query:"",filter:`dokuman_tipi = "kap_haberi" AND iliskili_semboller = "${code}" AND kap_bildirim_konu = "Pay Alım Satım Bildirimi"`,sirala:"yayinlanma_tarihi_utc:desc",sayfa_basi:12,purpose:`${code} pay alım satım bildirimleri`});
    if(AK.code!==code)return;if(!notes.length){$("akIns").innerHTML='<tr><td colspan="7" class="skel">KAP\'ta içeriden pay alım satım bildirimi yok.</td></tr>';setT(3,"Yok","Bildirim bulunamadı");res.iceriden=[];return;}
    const ids=[...new Set(notes.map(n=>n.kap_bildirim_id))];
    const att=await docSearch({query:"",filter:`dokuman_tipi = "kap_haber_eki" AND kap_bildirim_id IN [${ids.join(",")}] AND sayfa_no = 1`,sayfa_basi:30,purpose:`${code} pay alım satım bildirim ekleri`});
    const byN={};att.forEach(a=>{(byN[a.kap_bildirim_id]=byN[a.kap_bildirim_id]||[]).push(a.id);});
    const ck=await chunks([...att.map(a=>a.id),...notes.filter(n=>!byN[n.kap_bildirim_id]).map(n=>n.id)].slice(0,30),`${code} içeriden işlem detayları`);if(AK.code!==code)return;
    const txt={};ck.forEach(c=>{txt[c.id]=c.content||"";});
    const rows=[];notes.forEach(n=>{const parts=(byN[n.kap_bildirim_id]||[n.id]).map(id=>txt[id]||"");const t=parts.join("\n");
      const name=(t.match(/Ad Soyad\s*\/\s*Ticaret Ünvanı\s*:\s*([^\n:]+)/)||t.match(/((?:[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü.&'-]*\s+){1,5})tarafından/)||[])[1];
      const sumRe=re=>{let s=0,f=false;for(const m of t.matchAll(re)){const v=trN(m[1]);if(isFinite(v)){s+=v;f=true;}}return f?s:null;};
      const buy=sumRe(/Alım İşlemine Konu Payların Toplam Nominal Tutarı \(TL\)\s*=\s*([\d.,]+)/g),sell=sumRe(/Satım İşlemine Konu Payların Toplam Nominal Tutarı \(TL\)\s*=\s*([\d.,]+)/g);
      const ends=[...t.matchAll(/Gün Sonu Bakiyesinin Sermayeye Oranı \(%\)\s*=\s*([\d.,]+)/g)];const endPct=ends.length?trN(ends[ends.length-1][1]):null;
      const pm=t.match(/([\d.]+,\d+)\s+([\d.]+,\d+)\s+[\d.]+\s+toplam nominal tutarlı alış/)||t.match(/([\d.]+,\d+)\s*-\s*([\d.]+,\d+)\s*TL/);const pr=pm?(trN(pm[1])+trN(pm[2]))/2:null;
      const dm=t.match(/(\d\d\/\d\d\/\d{4}),\s*Alım/);const d=dm?dm[1].split("/").reverse().join("-"):istDate(n.yayinlanma_tarihi_utc);
      const net=buy!=null||sell!=null?(buy||0)-(sell||0):null;let px=pr;if(!px&&Td){const ix=Td.t.indexOf(d);if(ix>=0)px=Td.c[ix];}
      const url=/^https:\/\/(www\.)?kap\.org\.tr\//.test(n.dokuman_orijinal_url||"")?n.dokuman_orijinal_url:null;
      rows.push({d,name:(name||"—").trim().slice(0,60),buy,sell,net,px,val:net!=null&&px?net*px:null,endPct,url});});
    $("akIns").innerHTML=rows.map(r=>`<tr><td class="num">${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${trDate(r.d)}</a>`:trDate(r.d)}</td><td>${esc(r.name)}</td><td>${r.net==null?'<span class="sub">ayrıntı ekte</span>':r.net>0?'<span class="pill pos">Alım</span>':r.net<0?'<span class="pill neg">Satım</span>':'<span class="pill neu">Alım + satım</span>'}</td><td class="r num">${r.net==null?"—":nf(0).format(Math.abs(r.net))}</td><td class="r num">${r.px?fmt(r.px):"—"}</td><td class="r num">${r.val!=null?big(Math.abs(r.val)):"—"}</td><td class="r num">${r.endPct!=null?"%"+fmt(r.endPct,2):"—"}</td></tr>`).join("");
    const f=rows[0];setT(3,f.net>0?"Alım":f.net<0?"Satım":"Bildirim",`${trDate(f.d)} · ${f.name}${f.net!=null?` · ${nf(0).format(Math.abs(f.net))} lot`:""}`,f.net>0?"var(--up)":f.net<0?"var(--down)":"");
    res.iceriden=rows.slice(0,8).map(r=>({tarih:r.d,kim:r.name,netLot:r.net,fiyat:r.px&&+r.px.toFixed(2),gunSonuPayYuzde:r.endPct}));
  }catch(e){if(AK.code===code)$("akIns").innerHTML=`<tr><td colspan="7"><div class="note err">${esc(errCopy(e))}</div></td></tr>`;}})();
  // C) geri alımlar
  const pC=(async()=>{try{const notes=await docSearch({query:"",filter:`dokuman_tipi = "kap_haberi" AND iliskili_semboller = "${code}" AND kap_bildirim_konu = "Payların Geri Alınmasına İlişkin Bildirim"`,sirala:"yayinlanma_tarihi_utc:desc",sayfa_basi:4,purpose:`${code} pay geri alım bildirimleri`});
    if(AK.code!==code)return;if(!notes.length){$("akBuy").innerHTML='<tr><td colspan="5" class="skel">Pay geri alım bildirimi yok.</td></tr>';res.geriAlim=[];return;}
    const ck=await chunks(notes.map(n=>n.id),`${code} geri alım detayları`);if(AK.code!==code)return;const M={};
    ck.forEach(c=>{for(const m of String(c.content||"").matchAll(/\|[^|\n]*\|\s*(\d\d\.\d\d\.\d{4})\s*\|\s*([\d.]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|/g)){const d=m[1].split(".").reverse().join("-");M[d]={d,lot:trN(m[2]),pct:trN(m[3]),px:trN(m[4])};}});
    const R=Object.values(M).sort((a,b)=>b.d.localeCompare(a.d));
    if(!R.length){$("akBuy").innerHTML=`<tr><td colspan="5" class="skel">Son bildirim ${trDate(istDate(notes[0].yayinlanma_tarihi_utc))}; işlem tablosu okunamadı.</td></tr>`;return;}
    $("akBuy").innerHTML=R.slice(0,12).map(r=>`<tr><td class="num">${trDate(r.d)}</td><td class="r num">${nf(0).format(r.lot)}</td><td class="r num">${fmt(r.px)}</td><td class="r num">${big(r.lot*r.px)}</td><td class="r num">%${fmt(r.pct,4)}</td></tr>`).join("");
    const cut=new Date(Date.now()-30*864e5).toISOString().slice(0,10),L=R.filter(r=>r.d>=cut);const lot=L.reduce((a,r)=>a+r.lot,0),val=L.reduce((a,r)=>a+r.lot*r.px,0);
    $("akBuySum").textContent=L.length?`Son 30 günde ${L.length} işlem günü · ${nf(0).format(lot)} lot · ≈ ${big(val)}`:`Son 30 günde geri alım yok (son işlem ${trDate(R[0].d)}).`;
    res.geriAlim=R.slice(0,10).map(r=>({tarih:r.d,lot:r.lot,fiyat:r.px}));
  }catch(e){if(AK.code===code)$("akBuy").innerHTML=`<tr><td colspan="5"><div class="note err">${esc(errCopy(e))}</div></td></tr>`;}})();
  // D) fon değişimleri
  const pD=(async()=>{try{for(let k=0;k<40&&!S.data._own&&AK.code===code;k++)await new Promise(r=>setTimeout(r,250));
    const O=S.data._own;if(!O||!O.cur||!O.prev){$("akFundStamp").textContent="Fon raporu verisi yok.";return;}
    const J=`FROM fon_portfoy_dagilim_raporu_sembol_agirliklari a JOIN fon_portfoy_dagilim_raporlari r ON r.fon_portfoy_dagilim_raporu_id = a.fon_portfoy_dagilim_raporu_id LEFT JOIN fonlar f ON f.fon_kodu = r.fon_kodu`;
    const q=m=>sql(`SELECT r.fon_kodu, f.unvan, a.fondaki_lot ${J} WHERE a.fon_kodu = '${code}' AND r.yil = ${m.yil} AND r.ay = ${m.ay} LIMIT 300`,`${code} fon pozisyonları ${m.yil}/${m.ay}`);
    const [c,p]=await Promise.all([q(O.cur),q(O.prev)]);if(AK.code!==code)return;const A={};
    c.forEach(x=>{const o=(A[x.fon_kodu]=A[x.fon_kodu]||{f:x.fon_kodu,u:x.unvan,c:0,p:0});o.c+=x.fondaki_lot||0;});p.forEach(x=>{const o=(A[x.fon_kodu]=A[x.fon_kodu]||{f:x.fon_kodu,u:x.unvan,c:0,p:0});o.p+=x.fondaki_lot||0;});
    const L=Object.values(A).map(o=>({...o,d:o.c-o.p})).filter(o=>o.d!==0);const up=L.filter(o=>o.d>0).sort((a,b)=>b.d-a.d).slice(0,8),dn=L.filter(o=>o.d<0).sort((a,b)=>a.d-b.d).slice(0,8);
    const li=o=>`<li title="${esc(o.u||"")}"><span><b class="num">${esc(o.f)}</b> <span class="sub">${esc((o.u||"").slice(0,26))}</span></span><span class="num" style="color:${o.d>0?"var(--up)":"var(--down)"}">${o.d>0?"+":"−"}${nf(0).format(Math.abs(o.d))}${o.p===0?" (yeni)":o.c===0?" (çıktı)":""}</span></li>`;
    $("akFundUp").innerHTML=up.length?up.map(li).join(""):'<li class="sub">Yok</li>';$("akFundDn").innerHTML=dn.length?dn.map(li).join(""):'<li class="sub">Yok</li>';
    const net=L.reduce((a,o)=>a+o.d,0);$("akFundStamp").textContent=`${O.prev.yil}/${String(O.prev.ay).padStart(2,"0")} → ${O.cur.yil}/${String(O.cur.ay).padStart(2,"0")} · ${up.length?L.filter(o=>o.d>0).length:0} fon artırdı, ${L.filter(o=>o.d<0).length} fon azalttı · net ${net>0?"+":"−"}${nf(0).format(Math.abs(net))} lot`;
    res.fonlar={donem:`${O.cur.yil}/${O.cur.ay}`,artiran:up.slice(0,5).map(o=>({fon:o.f,lot:o.d})),azaltan:dn.slice(0,5).map(o=>({fon:o.f,lot:o.d})),netLot:net};
  }catch(e){if(AK.code===code)$("akFundStamp").textContent=errCopy(e);}})();
  await Promise.allSettled([pA,pB,pC,pD]);if(AK.code!==code)return;
  $("akStamp").textContent=`${istDateTime(new Date().toISOString())} itibarıyla`;S.data.alanSatan=res;}

