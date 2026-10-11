(()=>{
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');

  function parseTime(raw){
    const s=String(raw||'').trim().replace(/：/g,':');
    if(!s)return null;
    let h,m;
    if(/^\d{1,2}:\d{1,2}$/.test(s)){
      [h,m]=s.split(':').map(Number);
    }else if(/^\d{3,4}$/.test(s)){
      const digits=s.padStart(4,'0');
      h=Number(digits.slice(0,2));m=Number(digits.slice(2));
    }else if(/^\d{1,2}$/.test(s)){
      h=Number(s);m=0;
    }else return null;
    if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||h>23||m<0||m>59)return null;
    return `${pad(h)}:${pad(m)}`;
  }

  function build(id,pickerId){
    const hidden=$(id),host=$(pickerId);
    if(!hidden||!host)return null;
    const label=id==='bed'?'入睡':'起床';
    const hours=Array.from({length:24},(_,i)=>`<option value="${pad(i)}">${pad(i)}</option>`).join('');
    const minutes=Array.from({length:60},(_,i)=>`<option value="${pad(i)}">${pad(i)}</option>`).join('');
    host.innerHTML=`
      <div class="time-direct-wrap">
        <input class="time-direct" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="5" aria-label="${label}时间" placeholder="HH:MM">
      </div>
      <div class="time-or">或下拉选择</div>
      <div class="time-select">
        <select class="time-hour" aria-label="${label}小时">${hours}</select>
        <span class="time-colon">:</span>
        <select class="time-minute" aria-label="${label}分钟">${minutes}</select>
      </div>
      <div class="time-caption"><span>小时</span><span>:</span><span>分钟</span></div>`;

    const direct=host.querySelector('.time-direct');
    const h=host.querySelector('.time-hour');
    const m=host.querySelector('.time-minute');

    function setAll(value,{emit=false}={}){
      const parsed=parseTime(value)||'00:00';
      const [hh,mm]=parsed.split(':');
      hidden.value=parsed;direct.value=parsed;h.value=hh;m.value=mm;
      direct.classList.remove('invalid');
      if(emit){
        hidden.dispatchEvent(new Event('input',{bubbles:true}));
        hidden.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }

    function fromHidden(){setAll(hidden.value||'00:00')}
    function fromSelect(){setAll(`${h.value}:${m.value}`,{emit:true})}
    function commitDirect(){
      const parsed=parseTime(direct.value);
      if(!parsed){direct.classList.add('invalid');return false}
      setAll(parsed,{emit:true});return true;
    }

    h.addEventListener('change',fromSelect);
    m.addEventListener('change',fromSelect);
    direct.addEventListener('input',()=>direct.classList.remove('invalid'));
    direct.addEventListener('blur',()=>{
      if(!commitDirect())setTimeout(()=>{direct.value=hidden.value;direct.classList.remove('invalid')},600);
    });
    direct.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        if(commitDirect())direct.blur();
      }
    });

    fromHidden();
    return fromHidden;
  }

  const syncBed=build('bed','bedPicker');
  const syncWake=build('wake','wakePicker');
  function sync(){syncBed?.();syncWake?.()}
  window.__syncTimeControls=sync;

  document.addEventListener('click',e=>{
    if(e.target.closest('.history-edit')||e.target.closest('#cancelEdit'))setTimeout(sync,0);
  });
  const form=$('sleepForm');
  if(form)form.addEventListener('submit',()=>setTimeout(sync,0));
  setTimeout(sync,30);
})();