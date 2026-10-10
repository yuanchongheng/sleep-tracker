(()=>{
  const KEY='sleepTracker.v1';
  const GOAL_KEY='sleepTracker.goalHours';
  const $=id=>document.getElementById(id);
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function mins(t){const[h,m]=String(t).split(':').map(Number);return h*60+m}
  function axis(t){const m=mins(t);return m<720?m+1440:m}
  function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:NaN}
  function sd(arr){if(arr.length<2)return NaN;const m=avg(arr);return Math.sqrt(arr.reduce((s,x)=>s+(x-m)**2,0)/arr.length)}
  function scoreFor(list){if(list.length<3)return NaN;const bs=sd(list.map(r=>axis(r.bed))),ws=sd(list.map(r=>axis(r.wake)));return Math.max(0,Math.min(100,Math.round(100*Math.exp(-(bs+ws)/180))))}
  function fmtHours(m){return Number.isFinite(m)?(m/60).toFixed(1)+'h':'—'}
  function fmtMin(m){return Number.isFinite(m)?(m<60?Math.round(m)+'分':(m/60).toFixed(1)+'h'):'—'}
  function signed(v,unit='min'){if(!Number.isFinite(v))return'—';const s=v>0?'+':v<0?'−':'';const a=Math.abs(v);return unit==='h'?`${s}${(a/60).toFixed(1)}h`:`${s}${Math.round(a)}分`}
  function goalMin(){const v=parseFloat(localStorage.getItem(GOAL_KEY)||$('goalHours')?.value||'8');return(Math.min(12,Math.max(5,Number.isFinite(v)?v:8)))*60}
  function goalRate(list,g){return list.length?list.filter(r=>r.duration>=g).length/list.length:NaN}

  function metricRow(name,recent,baseline,change,cls){
    return `<div class="improvement-cell metric-name">${name}</div><div class="improvement-cell">${recent}</div><div class="improvement-cell baseline-col">${baseline}</div><div class="improvement-cell change ${cls}">${change}</div>`;
  }

  function render(){
    const host=$('improvementBody');if(!host)return;
    const all=load().sort((a,b)=>a.date.localeCompare(b.date));
    const verdict=$('improvementVerdict'),subtitle=$('improvementSubtitle');
    if(all.length<4){
      verdict.textContent='数据不足';verdict.className='improvement-verdict';
      subtitle.textContent='至少记录 4 天后开始显示近期改善趋势。';
      host.innerHTML='<div class="improvement-summary">继续记录几天后，这里会比较最近 7 条记录和更早的历史基线。</div>';
      return;
    }

    const recent=all.slice(-Math.min(7,all.length));
    let baseline=all.slice(0,Math.max(0,all.length-recent.length));
    let fallback=false;
    if(baseline.length<3){baseline=all;fallback=true}
    const g=goalMin();
    const rDur=avg(recent.map(r=>r.duration)),bDur=avg(baseline.map(r=>r.duration));
    const rBedSd=sd(recent.map(r=>axis(r.bed))),bBedSd=sd(baseline.map(r=>axis(r.bed)));
    const rWakeSd=sd(recent.map(r=>axis(r.wake))),bWakeSd=sd(baseline.map(r=>axis(r.wake)));
    const rDurSd=sd(recent.map(r=>r.duration)),bDurSd=sd(baseline.map(r=>r.duration));
    const rGoal=goalRate(recent,g),bGoal=goalRate(baseline,g);
    const rScore=scoreFor(recent),bScore=scoreFor(baseline);

    let points=0;const reasons=[];
    const durGoalImp=Math.abs(bDur-g)-Math.abs(rDur-g);
    if(durGoalImp>=20){points+=1;reasons.push('平均睡眠时长更接近个人目标')}
    else if(durGoalImp<=-20){points-=1;reasons.push('平均睡眠时长比基线更偏离个人目标')}
    if(Number.isFinite(rBedSd)&&Number.isFinite(bBedSd)){
      if(bBedSd-rBedSd>=15){points+=1;reasons.push('入睡时间更稳定')}
      else if(rBedSd-bBedSd>=20){points-=1;reasons.push('入睡时间波动更大')}
    }
    if(Number.isFinite(rWakeSd)&&Number.isFinite(bWakeSd)){
      if(bWakeSd-rWakeSd>=15){points+=1;reasons.push('起床时间更稳定')}
      else if(rWakeSd-bWakeSd>=20){points-=1;reasons.push('起床时间波动更大')}
    }
    if(Number.isFinite(rDurSd)&&Number.isFinite(bDurSd)){
      if(bDurSd-rDurSd>=15){points+=1;reasons.push('睡眠时长更稳定')}
      else if(rDurSd-bDurSd>=20){points-=1;reasons.push('睡眠时长波动更大')}
    }
    if(Number.isFinite(rGoal)&&Number.isFinite(bGoal)){
      if(rGoal-bGoal>=.15){points+=1;reasons.push('目标达标率提高')}
      else if(bGoal-rGoal>=.15){points-=1;reasons.push('目标达标率下降')}
    }
    if(Number.isFinite(rScore)&&Number.isFinite(bScore)){
      if(rScore-bScore>=8){points+=1;reasons.push('规律性评分提高')}
      else if(bScore-rScore>=8){points-=1;reasons.push('规律性评分下降')}
    }

    let text='基本持平',cls='same';
    if(points>=2){text='有改善';cls='better'}else if(points<=-2){text='有所变差';cls='worse'}
    verdict.textContent=text;verdict.className=`improvement-verdict ${cls}`;
    subtitle.textContent=fallback?`最近 ${recent.length} 条记录 vs 全部记录（历史数据暂时不足，使用回退比较）`:`最近 ${recent.length} 条记录 vs 更早的 ${baseline.length} 条历史记录`;

    const rows=[];
    rows.push('<div class="improvement-cell improvement-headcell">指标</div><div class="improvement-cell improvement-headcell">最近 7 条</div><div class="improvement-cell improvement-headcell baseline-label">历史基线</div><div class="improvement-cell improvement-headcell">变化</div>');
    rows.push(metricRow('平均睡眠时长',fmtHours(rDur),fmtHours(bDur),signed(rDur-bDur,'h'),Math.abs(rDur-g)<=Math.abs(bDur-g)?'good':'bad'));
    rows.push(metricRow('入睡时间波动',fmtMin(rBedSd),fmtMin(bBedSd),signed(rBedSd-bBedSd),Number.isFinite(rBedSd)&&Number.isFinite(bBedSd)?(rBedSd<=bBedSd?'good':'bad'):'neutral'));
    rows.push(metricRow('起床时间波动',fmtMin(rWakeSd),fmtMin(bWakeSd),signed(rWakeSd-bWakeSd),Number.isFinite(rWakeSd)&&Number.isFinite(bWakeSd)?(rWakeSd<=bWakeSd?'good':'bad'):'neutral'));
    rows.push(metricRow('睡眠时长波动',fmtMin(rDurSd),fmtMin(bDurSd),signed(rDurSd-bDurSd),Number.isFinite(rDurSd)&&Number.isFinite(bDurSd)?(rDurSd<=bDurSd?'good':'bad'):'neutral'));
    rows.push(metricRow('目标达标率',Number.isFinite(rGoal)?Math.round(rGoal*100)+'%':'—',Number.isFinite(bGoal)?Math.round(bGoal*100)+'%':'—',Number.isFinite(rGoal)&&Number.isFinite(bGoal)?signed((rGoal-bGoal)*100):'—',Number.isFinite(rGoal)&&Number.isFinite(bGoal)?(rGoal>=bGoal?'good':'bad'):'neutral'));
    rows.push(metricRow('规律性评分',Number.isFinite(rScore)?rScore:'—',Number.isFinite(bScore)?bScore:'—',Number.isFinite(rScore)&&Number.isFinite(bScore)?signed(rScore-bScore):'—',Number.isFinite(rScore)&&Number.isFinite(bScore)?(rScore>=bScore?'good':'bad'):'neutral'));

    host.innerHTML=`<div class="improvement-table">${rows.join('')}</div><div class="improvement-summary"><b>结论：</b>${reasons.length?reasons.join('；'):'最近与历史基线差异不大'}。</div><div class="improvement-foot">这里比较的是“最近记录”和你的个人历史基线，用于观察趋势；不是医学诊断，也不代表单周变化一定具有临床意义。</div>`;
  }

  const history=$('historyBody');if(history)new MutationObserver(render).observe(history,{childList:true,subtree:true});
  const goal=$('goalHours');if(goal)goal.addEventListener('change',render);
  setTimeout(render,0);
})();
