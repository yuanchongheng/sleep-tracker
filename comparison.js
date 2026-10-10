(()=>{
  const KEY='sleepTracker.v1';
  const GOAL_KEY='sleepTracker.goalHours';
  const $=id=>document.getElementById(id);

  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function mins(t){const[h,m]=String(t).split(':').map(Number);return h*60+m}
  function axis(t){const m=mins(t);return m<720?m+1440:m}
  function fmtClock(m){const x=((Math.round(m)%1440)+1440)%1440;return`${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`}
  function avg(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN}
  function circularDiff(a,b){let d=Math.abs(a-b)%1440;return Math.min(d,1440-d)}
  function signedMinutes(v){if(!Number.isFinite(v))return'—';const sign=v>0?'+':v<0?'−':'';return`${sign}${Math.round(Math.abs(v))} 分钟`}
  function goalMin(){const v=parseFloat(localStorage.getItem(GOAL_KEY)||$('goalHours')?.value||'8');return(Math.min(12,Math.max(5,Number.isFinite(v)?v:8)))*60}
  function today(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}

  function render(){
    const records=load().sort((a,b)=>a.date.localeCompare(b.date));
    const box=$('dailyCompare');
    if(!box)return;
    if(records.length<2){
      $('compareTitle').textContent='最新睡眠相比之前';
      $('compareSubtitle').textContent='至少需要 2 条记录才能比较。';
      $('compareVerdict').textContent='数据不足';$('compareVerdict').className='compare-verdict';
      ['compareDuration','compareBed','compareWake','compareGoal'].forEach(id=>$(id).textContent='—');
      $('compareReasons').innerHTML='记录更多睡眠后，这里会自动判断最新一晚相较近期基线是更好、基本持平还是更差。';
      return;
    }

    const latest=records.at(-1), baseline=records.slice(Math.max(0,records.length-8),-1);
    const g=goalMin(), baseDur=avg(baseline.map(r=>r.duration));
    const baseBed=avg(baseline.map(r=>axis(r.bed))),baseWake=avg(baseline.map(r=>axis(r.wake)));
    const durDelta=latest.duration-baseDur;
    const latestGoalGap=Math.abs(latest.duration-g),baseGoalGap=Math.abs(baseDur-g);
    const bedDev=Math.abs(axis(latest.bed)-baseBed),wakeDev=Math.abs(axis(latest.wake)-baseWake);
    const baseBedDev=avg(baseline.map(r=>Math.abs(axis(r.bed)-baseBed)));
    const baseWakeDev=avg(baseline.map(r=>Math.abs(axis(r.wake)-baseWake)));

    let score=0;const reasons=[];
    const goalImprove=baseGoalGap-latestGoalGap;
    if(goalImprove>=30){score+=2;reasons.push(`睡眠时长比近期平均更接近目标 ${Math.round(goalImprove)} 分钟`)}
    else if(goalImprove<=-30){score-=2;reasons.push(`睡眠时长比近期平均偏离目标更多 ${Math.round(-goalImprove)} 分钟`)}
    else reasons.push('睡眠时长与目标的接近程度和近期平均差别不大');

    if(bedDev+15<baseBedDev){score+=1;reasons.push('入睡时间比近期通常情况更贴近自己的作息中心')}
    else if(bedDev>Math.max(60,baseBedDev+30)){score-=1;reasons.push(`入睡时间较近期中心偏离约 ${Math.round(bedDev)} 分钟`)}

    if(wakeDev+15<baseWakeDev){score+=1;reasons.push('起床时间比近期通常情况更贴近自己的作息中心')}
    else if(wakeDev>Math.max(60,baseWakeDev+30)){score-=1;reasons.push(`起床时间较近期中心偏离约 ${Math.round(wakeDev)} 分钟`)}

    let verdict='基本持平',cls='same';
    if(score>=2){verdict='更好';cls='better'}
    else if(score<=-2){verdict='更差';cls='worse'}

    $('compareTitle').textContent=latest.date===today()?'今天的睡眠相比之前':`最新睡眠（${latest.date}）相比之前`;
    $('compareSubtitle').textContent=`基线：之前 ${baseline.length} 条记录；目标：${(g/60).toFixed(2).replace(/\.00$/,'')} 小时。`;
    $('compareVerdict').textContent=verdict;$('compareVerdict').className=`compare-verdict ${cls}`;

    $('compareDuration').textContent=(latest.duration/60).toFixed(1)+'h';
    $('compareDurationNote').textContent=`较近期平均 ${signedMinutes(durDelta)}`;
    $('compareBed').textContent=latest.bed;
    $('compareBedNote').textContent=`近期中心约 ${fmtClock(baseBed)} · 偏离 ${Math.round(bedDev)} 分钟`;
    $('compareWake').textContent=latest.wake;
    $('compareWakeNote').textContent=`近期中心约 ${fmtClock(baseWake)} · 偏离 ${Math.round(wakeDev)} 分钟`;
    $('compareGoal').textContent=latestGoalGap<=15?'接近目标':latest.duration<g?'偏短':'偏长';
    $('compareGoalNote').textContent=`与目标相差 ${Math.round(latestGoalGap)} 分钟`;
    $('compareReasons').innerHTML=`<b>判断依据：</b>${reasons.join('；')}。这个结论只比较“时长是否更接近个人目标 + 作息是否更贴近近期规律”，不代表睡眠质量或医学诊断。`;
  }

  const history=$('historyBody');
  if(history)new MutationObserver(()=>render()).observe(history,{childList:true,subtree:true});
  const goal=$('goalHours');if(goal)goal.addEventListener('change',render);
  document.addEventListener('DOMContentLoaded',render);
  setTimeout(render,0);
})();
