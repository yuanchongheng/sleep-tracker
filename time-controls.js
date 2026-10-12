(()=>{
  const $=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');

  function parseHidden(value){
    const m=String(value||'00:00').match(/^(\d{1,2}):(\d{2})$/);
    let h=m?Number(m[1]):0, min=m?Number(m[2]):0;
    h=Math.min(23,Math.max(0,h));min=Math.min(59,Math.max(0,min));
    return [pad(h),pad(min)];
  }

  function build(id,pickerId){
    const hidden=$(id),host=$(pickerId);
    if(!hidden||!host)return null;
    const label=id==='bed'?'入睡':'起床';

    host.innerHTML=`
      <div class="time-segmented" role="group" aria-label="${label}时间">
        <input class="time-part time-hour-part" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="${label}小时">
        <span class="time-separator">:</span>
        <input class="time-part time-minute-part" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="${label}分钟">
        <span class="time-clock" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25"></circle><path d="M12 7.5v5l3.2 2"></path></svg>
        </span>
      </div>`;

    const hour=host.querySelector('.time-hour-part');
    const minute=host.querySelector('.time-minute-part');
    const wrap=host.querySelector('.time-segmented');
    let syncing=false;

    function emit(){
      hidden.dispatchEvent(new Event('input',{bubbles:true}));
      hidden.dispatchEvent(new Event('change',{bubbles:true}));
    }
    function updateHidden(){
      const h=Number(hour.value),m=Number(minute.value);
      if(hour.value.length===2&&minute.value.length===2&&h>=0&&h<=23&&m>=0&&m<=59){
        hidden.value=`${pad(h)}:${pad(m)}`;
        wrap.classList.remove('invalid');
        emit();
      }
    }
    function fromHidden(){
      syncing=true;
      const [h,m]=parseHidden(hidden.value);
      hour.value=h;minute.value=m;wrap.classList.remove('invalid');
      syncing=false;
    }
    function selectPart(el){requestAnimationFrame(()=>el.select())}
    function normalizePart(el,max){
      if(!el.value){fromHidden();return}
      let n=Number(el.value);
      if(!Number.isFinite(n))n=0;
      n=Math.min(max,Math.max(0,n));
      el.value=pad(n);updateHidden();
    }

    [hour,minute].forEach(el=>{
      el.addEventListener('focus',()=>{wrap.classList.add('focused');selectPart(el)});
      el.addEventListener('click',()=>selectPart(el));
      el.addEventListener('blur',()=>{
        normalizePart(el,el===hour?23:59);
        setTimeout(()=>{if(!wrap.contains(document.activeElement))wrap.classList.remove('focused')},0);
      });
      el.addEventListener('keydown',e=>{
        const max=el===hour?23:59;
        if(e.key==='ArrowUp'||e.key==='ArrowDown'){
          e.preventDefault();
          let n=Number(el.value);if(!Number.isFinite(n))n=0;
          n=e.key==='ArrowUp'?(n>=max?0:n+1):(n<=0?max:n-1);
          el.value=pad(n);updateHidden();selectPart(el);return;
        }
        if((e.key===':'||e.key==='。'||e.key==='.')&&el===hour){e.preventDefault();minute.focus();selectPart(minute);return}
        if(e.key==='ArrowRight'&&el===hour){e.preventDefault();minute.focus();selectPart(minute);return}
        if(e.key==='ArrowLeft'&&el===minute){e.preventDefault();hour.focus();selectPart(hour);return}
      });
      el.addEventListener('input',()=>{
        if(syncing)return;
        const digits=el.value.replace(/\D/g,'').slice(-2);
        el.value=digits;
        const max=el===hour?23:59;
        if(digits.length===2){
          const n=Number(digits);
          if(n<=max){
            el.value=pad(n);updateHidden();
            if(el===hour){minute.focus();selectPart(minute)}
          }else wrap.classList.add('invalid');
        }else wrap.classList.remove('invalid');
      });
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