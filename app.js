(()=>{
  const KEY='sleepTracker.v1';
  const GOAL_KEY='sleepTracker.goalHours';
  const $=id=>document.getElementById(id);
  const form=$('sleepForm');
  let records=load();
  let editingId=null;

  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function persist(){localStorage.setItem(KEY,JSON.stringify(records))}
  function today(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
  function mins(t){const[h,m]=String(t).split(':').map(Number);return h*60+m}
  function shiftDate(s,n){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
  function sleepDuration(b,w){let d=mins(w)-mins(b);if(d<=0)d+=1440;return d}
  function deriveDateTimes(date,b,w){const bd=mins(b)>mins(w)?shiftDate(date,-1):date;return{bedDate:bd,wakeDate:date,bedDateTime:`${bd}T${b}:00`,wakeDateTime:`${date}T${w}:00`}}
  function fmtDuration(m){if(!Number.isFinite(m))return'—';return`${Math.floor(Math.abs(m)/60)}小时${String(Math.round(Math.abs(m)%60)).padStart(2,'0')}分`}
  function fmtSignedHours(m){if(!Number.isFinite(m))return'—';const sign=m>0?'+':m<0?'−':'';return `${sign}${(Math.abs(m)/60).toFixed(1)}h`}
  function axis(t){const m=mins(t);return m<720?m+1440:m}
  function axisLabel(m){if(!Number.isFinite(m))return'—';const x=((Math.round(m)%1440)+1440)%1440;return`${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`}
  function circularMeanClock(values){if(!values.length)return NaN;const rad=values.map(v=>((v%1440)/1440)*Math.PI*2);const s=rad.reduce((a,r)=>a+Math.sin(r),0),c=rad.reduce((a,r)=>a+Math.cos(r),0);let a=Math.atan2(s/values.length,c/values.length);if(a<0)a+=Math.PI*2;return a/(Math.PI*2)*1440}
  function sd(a){if(a.length<2)return NaN;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length)}
  function scoreFor(list){if(list.length<3)return NaN;const bs=sd(list.map(r=>axis(r.bed))),ws=sd(list.map(r=>axis(r.wake)));return Math.max(0,Math.min(100,Math.round(100*Math.exp(-(bs+ws)/180))))}
  function sortedAsc(){return[...records].sort((a,b)=>a.date.localeCompare(b.date))}
  function recent(n){return sortedAsc().slice(-n)}
  function fmtShort(m){return!Number.isFinite(m)?'—':m<60?`${Math.round(m)}分`:`${(m/60).toFixed(1)}h`}
  function avg(list,getter){return list.length?list.reduce((s,r)=>s+getter(r),0)/list.length:NaN}
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function isWeekend(date){const d=new Date(date+'T12:00:00').getDay();return d===0||d===6}
  function midpoint(r){const b=axis(r.bed);return b+r.duration/2}
  function midpointClock(r){return ((midpoint(r)%1440)+1440)%1440}
  function groupStats(list){
    if(!list.length)return null;
    return {
      bed:circularMeanClock(list.map(r=>mins(r.bed))),
      wake:circularMeanClock(list.map(r=>mins(r.wake))),
      mid:circularMeanClock(list.map(r=>midpointClock(r))),
      duration:avg(list,r=>r.duration)
    };
  }
  function goalHours(){const v=parseFloat(localStorage.getItem(GOAL_KEY)||$('goalHours')?.value||'8');return Number.isFinite(v)?Math.min(12,Math.max(5,v)):8}

  function recalcPreview(){if(!$('bed').value||!$('wake').value)return;const d=sleepDuration($('bed').value,$('wake').value);$('durationPreview').textContent='预计睡眠：'+fmtDuration(d)}
  function resetForm(){editingId=null;$('formTitle').textContent='登记一次睡眠';$('saveBtn').textContent='保存记录';$('cancelEdit').style.display='none';$('date').value=today();$('bed').value='00:00';$('wake').value='08:00';$('note').value='';recalcPreview()}

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const date=$('date').value,bed=$('bed').value,wake=$('wake').value,note=$('note').value.trim();
    const duration=sleepDuration(bed,wake),dt=deriveDateTimes(date,bed,wake);
    const uid=()=>globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():'r_'+Date.now()+Math.random();
    const item={id:editingId||uid(),date,bed,wake,duration,note,bedDate:dt.bedDate,wakeDate:dt.wakeDate,bedDateTime:dt.bedDateTime,wakeDateTime:dt.wakeDateTime,updatedAt:Date.now()};
    records=records.filter(r=>r.id!==item.id&&r.date!==date);records.push(item);persist();resetForm();render();toast('已保存睡眠记录');
  });
  $('bed').addEventListener('input',recalcPreview);$('wake').addEventListener('input',recalcPreview);$('cancelEdit').onclick=resetForm;
  window.__edit=id=>{const r=records.find(x=>x.id===id);if(!r)return;editingId=id;$('formTitle').textContent='编辑睡眠记录';$('saveBtn').textContent='更新记录';$('cancelEdit').style.display='block';$('date').value=r.date;$('bed').value=r.bed;$('wake').value=r.wake;$('note').value=r.note||'';recalcPreview();scrollTo({top:0,behavior:'smooth'})};
  window.__remove=id=>{if(confirm('删除这条记录？')){records=records.filter(r=>r.id!==id);persist();render();toast('记录已删除')}};
  $('clearBtn').onclick=()=>{if(records.length&&confirm('确定清空全部睡眠记录？此操作无法撤销。')){records=[];persist();render();toast('已清空全部记录')}};

  function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')q=false;else cell+=ch}else{if(ch==='"')q=true;else if(ch===','){row.push(cell);cell=''}else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(ch!=='\r')cell+=ch}}if(cell.length||row.length){row.push(cell);rows.push(row)}return rows.filter(r=>r.some(v=>String(v).trim()!==''))}
  function normalizeTime(t){const m=String(t||'').trim().match(/(\d{1,2}):(\d{2})/);return m?`${String(+m[1]).padStart(2,'0')}:${m[2]}`:''}
  function normalizeDate(d){const m=String(d||'').trim().replace(/[\/.]/g,'-').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);return m?`${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`:''}
  function importCSVText(text){
    const rows=parseCSV(String(text).replace(/^\uFEFF/,''));if(rows.length<2)throw Error('CSV 中没有可导入的数据。');
    const h=rows[0].map(x=>String(x).trim()),ix=n=>h.indexOf(n),old=ix('起床日期')>=0,modern=ix('归属日(起床日)')>=0;if(!old&&!modern)throw Error('无法识别 CSV 格式。');
    let imported=0,skipped=0;const byDate=new Map(records.map(r=>[r.date,r]));
    for(const row of rows.slice(1)){try{let date='',bed='',wake='',note='';if(old){date=normalizeDate(row[ix('起床日期')]);bed=normalizeTime(row[ix('入睡时间')]);wake=normalizeTime(row[ix('起床时间')]);note=ix('备注')>=0?row[ix('备注')]||'':''}else{date=normalizeDate(row[ix('归属日(起床日)')]);const b=String(row[ix('实际入睡日期时间')]||'').replace(' ','T'),w=String(row[ix('实际起床日期时间')]||'').replace(' ','T');bed=(b.match(/T(\d{1,2}:\d{2})/)||[])[1];wake=(w.match(/T(\d{1,2}:\d{2})/)||[])[1];note=ix('备注')>=0?row[ix('备注')]||'':''}if(!date||!bed||!wake){skipped++;continue}const d=deriveDateTimes(date,bed,wake),existing=byDate.get(date);byDate.set(date,{id:existing?.id||('r_'+Date.now()+Math.random()),date,bed,wake,duration:sleepDuration(bed,wake),note,bedDate:d.bedDate,wakeDate:d.wakeDate,bedDateTime:d.bedDateTime,wakeDateTime:d.wakeDateTime,updatedAt:Date.now()});imported++}catch{skipped++}}
    records=[...byDate.values()];persist();render();return{imported,skipped};
  }
  $('importBtn').onclick=()=>$('importFile').click();
  $('importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const r=importCSVText(await f.text());toast(`已导入 ${r.imported} 条${r.skipped?`，跳过 ${r.skipped} 条`:''}`)}catch(err){alert(err.message||'导入失败')}e.target.value=''};
  $('exportBtn').onclick=()=>{if(!records.length)return toast('暂无数据可导出');const rows=[['归属日(起床日)','实际入睡日期时间','实际起床日期时间','睡眠时长(分钟)','备注']];sortedAsc().forEach(r=>{const d=r.bedDateTime?{bedDateTime:r.bedDateTime,wakeDateTime:r.wakeDateTime}:deriveDateTimes(r.date,r.bed,r.wake);rows.push([r.date,d.bedDateTime,d.wakeDateTime,r.duration,r.note||''])});const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`睡眠记录_${today()}.csv`;a.click();URL.revokeObjectURL(a.href)};

  function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1700)}

  function renderStats(){
    const r7=recent(7),r14=recent(14),score=scoreFor(r14),avgDur=avg(r7,r=>r.duration);
    $('avgDuration').textContent=Number.isFinite(avgDur)?(avgDur/60).toFixed(1)+'h':'—';
    $('avgDurationSub').textContent=Number.isFinite(avgDur)?(avgDur>=420&&avgDur<=540?'时长处于常见成人范围':'结合白天状态一起判断'):'暂无数据';
    const bsd=sd(r14.map(r=>axis(r.bed))),wsd=sd(r14.map(r=>axis(r.wake)));$('bedSd').textContent=fmtShort(bsd);$('wakeSd').textContent=fmtShort(wsd);
    const reg=$('regularity');reg.className='value';if(Number.isFinite(score)){reg.textContent=score;const text=score>=85?'非常稳定':score>=70?'较稳定':score>=50?'波动较大':'很不规律';$('regularityText').textContent=text;reg.classList.add(score>=70?'good':score>=50?'warn':'bad')}else{reg.textContent='—';$('regularityText').textContent='需要至少 3 条记录'}
    if(r14.length){$('avgBed').textContent=axisLabel(avg(r14,r=>axis(r.bed)));$('avgWake').textContent=axisLabel(avg(r14,r=>axis(r.wake)));$('minSleep').textContent=(Math.min(...r14.map(r=>r.duration))/60).toFixed(1)+'h';$('maxSleep').textContent=(Math.max(...r14.map(r=>r.duration))/60).toFixed(1)+'h'}else{['avgBed','avgWake','minSleep','maxSleep'].forEach(id=>$(id).textContent='—')}
  }

  function renderAnalytics(){
    const r14=recent(14),r7=recent(7),goal=goalHours(),goalMin=goal*60;
    $('goalHours').value=goal;
    const mid=$('midSleep'),durSd=$('durationSd'),goalRate=$('goalRate'),bal=$('sleepBalance'),wdiff=$('weekendDurationDiff'),sj=$('socialJetlag');
    [mid,durSd,goalRate,bal,wdiff,sj].forEach(el=>el.className='m-value');
    if(r14.length){
      const meanMid=circularMeanClock(r14.map(r=>midpointClock(r)));mid.textContent=axisLabel(meanMid);
      $('midSleepNote').textContent=`近 ${r14.length} 天睡眠中点均值`;
      const dsd=sd(r14.map(r=>r.duration));durSd.textContent=fmtShort(dsd);
      if(Number.isFinite(dsd))durSd.classList.add(dsd<=30?'good':dsd<=60?'warn':'bad');
      const met=r14.filter(r=>r.duration>=goalMin).length;goalRate.textContent=Math.round(met/r14.length*100)+'%';$('goalRateNote').textContent=`${met}/${r14.length} 天达到 ≥ ${goal.toFixed(2).replace(/\.00$/,'')}h`;
      goalRate.classList.add(met/r14.length>=.7?'good':met/r14.length>=.4?'warn':'bad');
    }else{mid.textContent=durSd.textContent=goalRate.textContent='—';$('midSleepNote').textContent='近 14 天';$('goalRateNote').textContent='按个人目标计算'}
    if(r7.length){const balance=r7.reduce((s,r)=>s+(r.duration-goalMin),0);bal.textContent=fmtSignedHours(balance);bal.classList.add(balance>=0?'good':balance>=-180?'warn':'bad')}else bal.textContent='—';

    const weekdays=r14.filter(r=>!isWeekend(r.date)),weekends=r14.filter(r=>isWeekend(r.date)),wds=groupStats(weekdays),wes=groupStats(weekends);
    function setGroup(prefix,s){['Bed','Wake','Mid','Duration'].forEach(k=>$(prefix+k).textContent='—');if(!s)return;$(prefix+'Bed').textContent=axisLabel(s.bed);$(prefix+'Wake').textContent=axisLabel(s.wake);$(prefix+'Mid').textContent=axisLabel(s.mid);$(prefix+'Duration').textContent=(s.duration/60).toFixed(1)+'h'}
    setGroup('weekday',wds);setGroup('weekend',wes);
    if(wds&&wes){
      const diff=wes.duration-wds.duration;wdiff.textContent=fmtSignedHours(diff);$('weekendDurationNote').textContent=diff>0?'周末平均睡得更久':diff<0?'周末平均睡得更短':'两类日期接近';
      const raw=Math.abs(wes.mid-wds.mid),circ=Math.min(raw,1440-raw);sj.textContent=fmtShort(circ);$('socialJetlagNote').textContent=`工作日 ${axisLabel(wds.mid)} vs 周末 ${axisLabel(wes.mid)}`;sj.classList.add(circ<=60?'good':circ<=120?'warn':'bad');
    }else{wdiff.textContent=sj.textContent='—';$('weekendDurationNote').textContent='需要两类日期都有记录';$('socialJetlagNote').textContent='需要工作日和周末记录'}
  }

  function displayDateTimes(r){if(r.bedDateTime&&r.wakeDateTime)return{bed:r.bedDateTime.replace('T',' '),wake:r.wakeDateTime.replace('T',' ')};const d=deriveDateTimes(r.date,r.bed,r.wake);return{bed:d.bedDateTime.replace('T',' '),wake:d.wakeDateTime.replace('T',' ')}}
  function renderHistory(){const host=$('historyBody');if(!records.length){host.innerHTML='<div class="empty">还没有记录。先登记今天的睡眠，图表会自动生成。</div>';return}const rows=[...records].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{const d=displayDateTimes(r);return`<tr><td>${r.date}</td><td>${d.bed}</td><td>${d.wake}</td><td><b>${(r.duration/60).toFixed(1)}h</b></td><td class="muted">${esc(r.note||'—')}</td><td><div class="row-actions"><button class="mini" onclick="__edit('${r.id}')">编辑</button><button class="mini" onclick="__remove('${r.id}')">删除</button></div></td></tr>`}).join('');host.innerHTML=`<div class="table-wrap"><table><thead><tr><th>归属日</th><th>实际入睡日期时间</th><th>实际起床日期时间</th><th>时长</th><th>备注</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`}

  function setupCanvas(id){const c=$(id),dpr=devicePixelRatio||1,r=c.getBoundingClientRect(),w=Math.max(320,r.width),h=Math.max(180,r.height);c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);return{ctx,w,h}}
  function noData(ctx,w,h){ctx.fillStyle='#8d96aa';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('记录更多数据后显示趋势',w/2,h/2)}
  function grid(ctx,w,h,{left=48,right=14,top=18,bottom=34,lines=4}={}){ctx.strokeStyle='#edf0f5';ctx.lineWidth=1;for(let i=0;i<=lines;i++){const y=top+(h-top-bottom)*i/lines;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke()}return{left,right,top,bottom,pw:w-left-right,ph:h-top-bottom}}
  function dateLabels(ctx,data,x,h){ctx.fillStyle='#8a94aa';ctx.textAlign='center';ctx.font='10px system-ui';data.forEach((r,i)=>{if(i===0||i===data.length-1||i%Math.max(1,Math.ceil(data.length/5))===0)ctx.fillText(r.date.slice(5),x(i),h-8)})}

  function drawTime(){const{ctx,w,h}=setupCanvas('timeChart'),data=recent(14);if(data.length<2)return noData(ctx,w,h);const g=grid(ctx,w,h,{left:54,right:14,top:18,bottom:34,lines:5}),vals=data.flatMap(r=>[axis(r.bed),axis(r.wake)]);let minV=Math.floor((Math.min(...vals)-60)/60)*60,maxV=Math.ceil((Math.max(...vals)+60)/60)*60;if(maxV-minV<360){const mid=(maxV+minV)/2;minV=mid-180;maxV=mid+180}const x=i=>g.left+g.pw*i/(data.length-1),y=v=>g.top+g.ph-(v-minV)/(maxV-minV)*g.ph;ctx.font='10px system-ui';ctx.fillStyle='#8590a8';ctx.textAlign='right';for(let i=0;i<=5;i++){const v=minV+(maxV-minV)*(5-i)/5;ctx.fillText(axisLabel(v),g.left-8,g.top+g.ph*i/5+3)}function line(get,color){ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.4;ctx.beginPath();data.forEach((r,i)=>{const px=x(i),py=y(get(r));i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.stroke();data.forEach((r,i)=>{ctx.beginPath();ctx.arc(x(i),y(get(r)),3.4,0,Math.PI*2);ctx.fill()})}line(r=>axis(r.bed),'#6973ef');line(r=>axis(r.wake),'#22a979');dateLabels(ctx,data,x,h)}
  function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
  function drawDuration(){const{ctx,w,h}=setupCanvas('durationChart'),data=recent(14);if(data.length<2)return noData(ctx,w,h);const g=grid(ctx,w,h,{left:48,right:14,top:18,bottom:34,lines:4}),maxH=Math.max(10,Math.ceil(Math.max(...data.map(r=>r.duration/60))+1));ctx.font='10px system-ui';ctx.fillStyle='#8590a8';ctx.textAlign='right';for(let i=0;i<=4;i++){const v=maxH*(4-i)/4;ctx.fillText(v.toFixed(1)+'h',g.left-8,g.top+g.ph*i/4+3)}const barW=Math.max(8,g.pw/data.length*.56),x=i=>g.left+g.pw*(i+.5)/data.length;data.forEach((r,i)=>{const bh=g.ph*(r.duration/60)/maxH,y=g.top+g.ph-bh,grad=ctx.createLinearGradient(0,y,0,g.top+g.ph);grad.addColorStop(0,'#8b5cf6');grad.addColorStop(1,'#6674ef');ctx.fillStyle=grad;roundRect(ctx,x(i)-barW/2,y,barW,bh,5);ctx.fill()});const targetY=g.top+g.ph-(8/maxH)*g.ph;ctx.setLineDash([5,5]);ctx.strokeStyle='#a7afc0';ctx.beginPath();ctx.moveTo(g.left,targetY);ctx.lineTo(w-g.right,targetY);ctx.stroke();ctx.setLineDash([]);dateLabels(ctx,data,i=>x(i),h)}
  function drawScore(){const{ctx,w,h}=setupCanvas('scoreChart'),all=sortedAsc();if(all.length<3)return noData(ctx,w,h);const pts=all.map((r,i)=>({date:r.date,score:scoreFor(all.slice(Math.max(0,i-6),i+1))})).filter(p=>Number.isFinite(p.score)).slice(-30),g=grid(ctx,w,h,{left:45,right:14,top:18,bottom:34,lines:4}),x=i=>g.left+g.pw*i/(Math.max(1,pts.length-1)),y=v=>g.top+g.ph-(v/100)*g.ph;ctx.font='10px system-ui';ctx.fillStyle='#8590a8';ctx.textAlign='right';[100,75,50,25,0].forEach((v,i)=>ctx.fillText(v,g.left-8,g.top+g.ph*i/4+3));ctx.strokeStyle='#5c67f2';ctx.lineWidth=2.5;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.score)):ctx.moveTo(x(i),y(p.score)));ctx.stroke();ctx.fillStyle='#5c67f2';pts.forEach((p,i)=>{ctx.beginPath();ctx.arc(x(i),y(p.score),3.3,0,Math.PI*2);ctx.fill()});dateLabels(ctx,pts,x,h)}
  function drawMidpoint(){const{ctx,w,h}=setupCanvas('midpointChart'),data=recent(14);if(data.length<2)return noData(ctx,w,h);const mids=data.map(r=>axisLabel(midpoint(r)));const vals=data.map(r=>{let v=midpointClock(r);if(v<720)v+=1440;return v});let minV=Math.floor((Math.min(...vals)-45)/60)*60,maxV=Math.ceil((Math.max(...vals)+45)/60)*60;if(maxV-minV<240){const m=(minV+maxV)/2;minV=m-120;maxV=m+120}const g=grid(ctx,w,h,{left:52,right:14,top:18,bottom:34,lines:4}),x=i=>g.left+g.pw*i/(data.length-1),y=v=>g.top+g.ph-(v-minV)/(maxV-minV)*g.ph;ctx.font='10px system-ui';ctx.fillStyle='#8590a8';ctx.textAlign='right';for(let i=0;i<=4;i++){const v=minV+(maxV-minV)*(4-i)/4;ctx.fillText(axisLabel(v),g.left-8,g.top+g.ph*i/4+3)}ctx.strokeStyle='#7b63ee';ctx.fillStyle='#7b63ee';ctx.lineWidth=2.4;ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();vals.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),3.2,0,Math.PI*2);ctx.fill()});dateLabels(ctx,data,x,h)}

  function draw(){drawTime();drawDuration();drawScore();drawMidpoint()}
  function render(){renderStats();renderAnalytics();renderHistory();requestAnimationFrame(draw)}

  $('goalHours').value=localStorage.getItem(GOAL_KEY)||'8';
  $('goalHours').addEventListener('change',e=>{let v=parseFloat(e.target.value);if(!Number.isFinite(v))v=8;v=Math.min(12,Math.max(5,v));e.target.value=v;localStorage.setItem(GOAL_KEY,String(v));render()});
  let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,120)});
  $('date').value=today();recalcPreview();render();
})();